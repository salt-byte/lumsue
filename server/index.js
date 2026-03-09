import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Type } from '@google/genai';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ─── 中间件 ───────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  // 生产环境：从环境变量读取前端地址（支持多个，逗号分隔）
  ...(process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(u => u.trim())
    : [])
];

app.use(cors({
  origin: (origin, callback) => {
    // 允许无 origin 的请求（如服务端直接调用、Render health check）
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: 不允许的来源 ${origin}`));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '20mb' })); // base64 图片约 5-10MB

// ─── Gemini 配置 ──────────────────────────────────────────────────────────────
const GEMINI_MODEL = 'gemini-2.0-flash-exp';

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 未配置，请在 server/.env 中设置');
  }
  return new GoogleGenAI({ apiKey });
}

// ─── 肤质分析 Schema ──────────────────────────────────────────────────────────
const METRIC_PROPS = {
  type: Type.OBJECT,
  properties: {
    score:        { type: Type.NUMBER },
    label:        { type: Type.STRING },
    analysis:     { type: Type.STRING },
    clinicalNote: { type: Type.STRING }
  },
  required: ['score', 'label', 'analysis']
};

const SKIN_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    totalScore: { type: Type.NUMBER },
    baumannType: {
      type: Type.OBJECT,
      properties: {
        code:        { type: Type.STRING },
        name:        { type: Type.STRING },
        description: { type: Type.STRING }
      },
      required: ['code', 'name', 'description']
    },
    fitzpatrickType: { type: Type.NUMBER },
    radarMetrics: {
      type: Type.OBJECT,
      properties: {
        health:    { type: Type.NUMBER },
        texture:   { type: Type.NUMBER },
        oilDry:    { type: Type.NUMBER },
        evenness:  { type: Type.NUMBER },
        youth:     { type: Type.NUMBER },
        tolerance: { type: Type.NUMBER }
      },
      required: ['health', 'texture', 'oilDry', 'evenness', 'youth', 'tolerance']
    },
    detailedAnalysis: {
      type: Type.OBJECT,
      properties: {
        zonalOil: {
          type: Type.OBJECT,
          properties: {
            cheeks: { type: Type.NUMBER },
            tZone:  { type: Type.NUMBER },
            chin:   { type: Type.NUMBER }
          },
          required: ['cheeks', 'tZone', 'chin']
        },
        skinTone:           { type: Type.STRING, enum: ['冷色调', '中性色调', '暖色调'] },
        smoothnessMetaphor: { type: Type.STRING, enum: ['剥壳鸡蛋', '蛋壳', '蛋黄', '煎蛋'] },
        darkCircles: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            percentages: {
              type: Type.OBJECT,
              properties: {
                pigmented:  { type: Type.NUMBER },
                vascular:   { type: Type.NUMBER },
                structural: { type: Type.NUMBER }
              },
              required: ['pigmented', 'vascular', 'structural']
            }
          },
          required: ['type', 'percentages']
        },
        acne: {
          type: Type.OBJECT,
          properties: {
            level:    { type: Type.NUMBER },
            count:    { type: Type.NUMBER },
            severity: { type: Type.STRING }
          },
          required: ['level', 'count', 'severity']
        },
        blackheads: {
          type: Type.OBJECT,
          properties: {
            count:    { type: Type.NUMBER },
            severity: { type: Type.STRING }
          },
          required: ['count', 'severity']
        },
        pores: {
          type: Type.OBJECT,
          properties: {
            level:       { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ['level', 'description']
        },
        redness: {
          type: Type.OBJECT,
          properties: {
            severity: { type: Type.STRING },
            areas:    { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['severity', 'areas']
        }
      },
      required: ['zonalOil', 'skinTone', 'smoothnessMetaphor', 'darkCircles', 'acne', 'blackheads', 'pores', 'redness']
    },
    areaScores: {
      type: Type.OBJECT,
      properties: {
        eyes:     { type: Type.NUMBER },
        nose:     { type: Type.NUMBER },
        cheeks:   { type: Type.NUMBER },
        lips:     { type: Type.NUMBER },
        forehead: { type: Type.NUMBER }
      },
      required: ['eyes', 'nose', 'cheeks', 'lips', 'forehead']
    },
    metrics: {
      type: Type.OBJECT,
      properties: {
        hydration:   METRIC_PROPS,
        oilBalance:  METRIC_PROPS,
        smoothness:  METRIC_PROPS,
        pores:       METRIC_PROPS,
        evenness:    METRIC_PROPS,
        elasticity:  METRIC_PROPS,
        sensitivity: METRIC_PROPS,
        gloss:       METRIC_PROPS,
        barrier:     METRIC_PROPS,
        glycation:   METRIC_PROPS,
        inflammation: METRIC_PROPS
      }
    },
    problems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title:      { type: Type.STRING },
          cause:      { type: Type.STRING },
          suggestion: { type: Type.STRING },
          actives:    { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    },
    lightTherapy: {
      type: Type.OBJECT,
      properties: {
        wavelength: { type: Type.STRING },
        duration:   { type: Type.STRING },
        frequency:  { type: Type.STRING },
        color:      { type: Type.STRING },
        hex:        { type: Type.STRING }
      }
    },
    skincareRoutine: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    recommendations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id:          { type: Type.STRING },
          name:        { type: Type.STRING },
          brand:       { type: Type.STRING },
          category:    { type: Type.STRING },
          imageUrl:    { type: Type.STRING },
          price:       { type: Type.STRING },
          matchReason: { type: Type.STRING },
          buyUrl:      { type: Type.STRING },
          tags:        { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['id', 'name', 'brand', 'category', 'imageUrl', 'price', 'matchReason', 'buyUrl']
      }
    }
  },
  required: [
    'totalScore', 'baumannType', 'fitzpatrickType', 'radarMetrics',
    'detailedAnalysis', 'areaScores', 'metrics', 'problems',
    'lightTherapy', 'skincareRoutine', 'recommendations'
  ]
};

// ─── 路由：健康检查 ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ─── 路由：肤质分析 ────────────────────────────────────────────────────────────
// POST /api/analyze
// Body: { image: string }  // base64 编码的 JPEG 图片（不含 data URL 前缀）
// Returns: SkinReport
app.post('/api/analyze', async (req, res) => {
  const { image } = req.body;

  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: '请传入 base64 编码的图片（字段名：image）' });
  }

  try {
    const ai = getGeminiClient();

    const systemInstruction = `You are LUMSUE, a clinical AI dermatologist.
    Perform a deep facial spectral analysis.
    Analyze sub-surface features like deep pigmentation, vascularity, and micro-texture.
    Provide a comprehensive analysis including:
    1. Total Score (0-100).
    2. Radar Metrics: Health, Texture, Oil/Dry Balance, Evenness, Youthfulness, Tolerance.
    3. Detailed Analysis:
       - Zonal Oiliness (0-100 for Cheeks, T-zone, Chin).
       - Skin Tone (Cool, Neutral, Warm).
       - Smoothness Metaphor (Peeled Egg, Eggshell, Egg Yolk, Fried Egg).
       - Dark Circles: Type (Pigmented/Vascular/Structural) and percentages.
       - Acne: Severity level (0-5), count, and description.
       - Blackheads: Count and severity.
       - Pores: Level and description.
       - Redness: Severity and specific areas.
    4. Area Scores (0-100 for Eyes, Nose, Cheeks, Lips, Forehead).
    5. Clinical-level scores for 11 dimensions including Barrier Integrity, Glycation, and Inflammation.
    6. Use the Baumann Skin Typing System.
    7. Recommend 3-4 specific skincare products from premium brands.
    Output strict JSON.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          parts: [
            { text: "Analyze this user's facial skin with high clinical precision for a LUMSUE laboratory report." },
            { inlineData: { data: image, mimeType: 'image/jpeg' } }
          ]
        }
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: SKIN_ANALYSIS_SCHEMA,
        temperature: 0.1
      }
    });

    const rawJson = JSON.parse(response.text);

    const skinReport = {
      ...rawJson,
      id:        randomUUID(),
      timestamp: Date.now(),
      imageUrl:  `data:image/jpeg;base64,${image}`
    };

    res.json(skinReport);
  } catch (err) {
    console.error('[/api/analyze] 错误:', err);

    if (err.message?.includes('GEMINI_API_KEY')) {
      return res.status(500).json({ error: 'API 密钥未配置，请在 server/.env 中设置 GEMINI_API_KEY' });
    }
    if (err.message?.includes('API key not valid')) {
      return res.status(401).json({ error: 'Gemini API Key 无效，请检查配置' });
    }

    res.status(500).json({ error: '肤质分析失败，请稍后重试', detail: err.message });
  }
});

// ─── 路由：导师对话 ────────────────────────────────────────────────────────────
// POST /api/mentor/chat
// Body: {
//   messages: Array<{ role: 'user'|'assistant', content: string }>,
//   lastReport?: SkinReport  // 可选，上次检测报告
// }
// Returns: { reply: string }
app.post('/api/mentor/chat', async (req, res) => {
  const { messages, lastReport } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: '请传入对话记录（字段名：messages）' });
  }

  try {
    const ai = getGeminiClient();

    let contextInfo = '';
    if (lastReport) {
      const scanDate = new Date(lastReport.timestamp).toLocaleDateString('zh-CN');
      const mainProblems = (lastReport.problems || []).map(p => p.title).join('、');
      contextInfo = `用户上次检测时间是 ${scanDate}。
      上次的总分是 ${lastReport.totalScore}。
      皮肤类型是 ${lastReport.baumannType?.name} (${lastReport.baumannType?.code})。
      主要问题包括：${mainProblems}。
      屏障健康度评分：${lastReport.metrics?.barrier?.score}。`;
    }

    const systemInstruction = `你是一位顶级皮肤科专家级别的护肤导师（Skin Mentor），名叫 LUMSUE。
    你的目标是通过专业的对话，精准诊断用户的皮肤问题，提供深度的皮肤学知识，并仅在必要时引导用户使用 App 功能。

    上下文信息：
    ${contextInfo}

    核心原则：
    1. 专家人设：你拥有深厚的皮肤学背景。对话时要展现出专业性，例如解释皮肤屏障（Skin Barrier）、皮脂膜（Hydrolipidic Film）、炎症因子（Inflammatory Factors）等概念。
    2. 诊断流程：不要急于给出结论。当用户提到皮肤问题时，先进行"问诊"。询问诱因、持续时间、痛痒感、过敏史及目前的护肤流程。
    3. 说话风格：专业、严谨、优雅且富有同理心。严禁使用 ** 加粗符号，严禁使用 [ ] 方括号。直接用纯文本表达，保持排版整洁。
    4. 引导策略（克制使用）：
       - 严禁在每次回复中都列出 App 功能。
       - 仅在以下情况使用"数字. 动作名称：简短描述"格式引导：
         a. 对话开始时，引导用户进行初次扫描。
         b. 经过充分沟通后，认为需要通过"肤质扫描"获取客观数据。
         c. 诊断出具体问题后，推荐前往"修复中心"获取光疗方案。
         d. 用户主动要求查看报告或记录时。
    5. 互动性：每次回复保持简洁（约 100-150 字），以提问或深度分析结束，鼓励用户继续交流。

    请展现你的专业知识，让用户感受到你是一个真实的、懂皮肤的专家，而不是一个只会发链接的机器人。`;

    const contents = messages.map(m => ({
      role:  m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });

      clearTimeout(timeoutId);
      const reply = response.text || '抱歉，我现在无法回应，请稍后再试。';
      res.json({ reply });
    } catch (innerErr) {
      clearTimeout(timeoutId);
      throw innerErr;
    }
  } catch (err) {
    console.error('[/api/mentor/chat] 错误:', err);

    if (err.name === 'AbortError' || err.message?.includes('timed out')) {
      return res.status(504).json({ error: '请求超时，请稍后重试' });
    }
    if (err.message?.includes('GEMINI_API_KEY')) {
      return res.status(500).json({ error: 'API 密钥未配置' });
    }
    if (err.message?.includes('API key not valid')) {
      return res.status(401).json({ error: 'Gemini API Key 无效' });
    }

    res.status(500).json({ error: '导师对话失败，请稍后重试', detail: err.message });
  }
});

// ─── 启动服务 ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌿 LUMSUE 后端服务已启动`);
  console.log(`   地址：http://localhost:${PORT}`);
  console.log(`   接口：POST /api/analyze`);
  console.log(`         POST /api/mentor/chat`);
  console.log(`         GET  /api/health\n`);
});
