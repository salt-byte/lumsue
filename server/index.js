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
const GEMINI_MODEL = 'gemini-3.1-pro-preview';

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

    const systemInstruction = `你是 LUMSUE 实验室的首席 AI 皮肤科医师，专注临床级多光谱面部分析。

【核心要求】
⚠️ 所有文字字段（analysis、clinicalNote、description、name、label、cause、suggestion、severity、type、areas 数组内容、skincareRoutine 步骤、matchReason 等）必须全部用简体中文输出，禁止使用英文。

【分析维度】
1. 总分（0-100）：综合评估皮肤整体健康状态
2. 六维雷达指标（0-100）：健康度、细腻度、油水平衡、均匀度、年轻度、耐受性
3. 精细分析：
   - 分区出油（脸颊/T区/下巴，0-100）
   - 肤色色调（冷色调/中性色调/暖色调）
   - 光滑度比喻（剥壳鸡蛋/蛋壳/蛋黄/煎蛋）
   - 黑眼圈：分型（色素型/血管型/结构型混合）及各型占比
   - 痤疮：等级(0-5)、活跃数量、中文描述（如"轻度粉刺为主"）
   - 黑头：数量、中文严重程度（如"少量"/"中等"/"较多"）
   - 毛孔：等级（如"细腻"/"轻度扩张"/"明显扩张"）、中文描述
   - 泛红：严重程度（如"轻度"/"中度"）、中文区域描述（如"两侧鼻翼"）
4. 五区评分（眼周/鼻部/脸颊/唇周/额头，0-100）
5. 11项临床维度（水分/油脂/光滑/毛孔/均匀/弹性/敏感/光泽/屏障/糖化/炎症），每项包括评分、中文标签、中文分析说明（2-3句话）、可选临床批注
6. Baumann 肤质分型：code（如 OSPT）、中文名称（如"油性敏感色素型紧致肌"）、中文详细描述（3-4句话解释该肤质特点及日常注意事项）
7. 皮肤主要问题（3-5个），每项包含：中文标题、中文成因、中文建议、活性成分列表（可用成分英文名）
8. 定制护肤流程（5-7个步骤，全中文）
9. 推荐产品（3-4个，可推荐国际或国产品牌，matchReason 用中文）

【Baumann分型说明】代码含义：O=油性/D=干性，S=敏感/R=耐受，P=色素型/N=非色素型，W=皱纹型/T=紧致型。示例：OSPT=油性敏感色素型紧致型。`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          parts: [
            { text: "请对这张面部照片进行高精度临床级皮肤分析，生成 LUMSUE 实验室专属报告。所有文字内容必须用中文。" },
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
