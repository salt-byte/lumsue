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

// ─── 百度 AI 配置 ─────────────────────────────────────────────────────────────
const BAIDU_TOKEN_URL = 'https://aip.baidubce.com/oauth/2.0/token';
const BAIDU_FACE_URL  = 'https://aip.baidubce.com/rest/2.0/face/v3/detect';

let _baiduToken  = null;
let _baiduExpiry = 0;

async function getBaiduToken() {
  if (_baiduToken && Date.now() < _baiduExpiry) return _baiduToken;
  const apiKey    = process.env.BAIDU_API_KEY;
  const secretKey = process.env.BAIDU_SECRET_KEY;
  if (!apiKey || !secretKey) return null;
  try {
    const res  = await fetch(`${BAIDU_TOKEN_URL}?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`);
    const data = await res.json();
    _baiduToken  = data.access_token;
    _baiduExpiry = Date.now() + (data.expires_in - 300) * 1000; // 提前 5 分钟刷新
    return _baiduToken;
  } catch { return null; }
}

// 百度人脸检测：返回肤质类型、年龄等结构化数据（约 0.3-0.8s）
async function baiduSkinDetect(imageBase64) {
  try {
    const token = await getBaiduToken();
    if (!token) return null;

    const body = new URLSearchParams({
      image:      imageBase64,
      image_type: 'BASE64',
      face_field: 'skin_type,age,beauty,complexion'
    });

    const res  = await fetch(`${BAIDU_FACE_URL}?access_token=${token}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
      signal:  AbortSignal.timeout(5000)
    });
    const data = await res.json();
    if (data.error_code || !data.result?.face_list?.[0]) return null;

    const face = data.result.face_list[0];
    const skinTypeMap = { 0: '油性', 1: '干性', 2: '中性', 3: '混合性' };
    return {
      skinType:    skinTypeMap[face.skin_type?.type] ?? '混合性',
      skinProb:    (face.skin_type?.probability * 100).toFixed(0),
      age:         face.age,
      beauty:      face.beauty,
      complexion:  face.complexion?.type  // 0=白皙 1=偏白 2=中等 3=偏黑
    };
  } catch { return null; }
}

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

    // ── 百度和 Gemini 准备并行执行 ─────────────────────────────────────────────
    // 百度约 0.5s 返回结构化皮肤数据，Gemini 同步开始准备
    const [baiduResult] = await Promise.allSettled([
      baiduSkinDetect(image)
    ]);
    const baidu = baiduResult.status === 'fulfilled' ? baiduResult.value : null;
    console.log('[/api/analyze] 百度检测结果:', baidu ?? '未返回（已忽略）');

    // 百度数据注入 prompt：让 Gemini 基于已知基础信息做深度分析，减少猜测时间
    const baiduContext = baidu
      ? `\n【参考数据·来自百度AI人脸检测，置信度 ${baidu.skinProb}%】\n- 基础肤质：${baidu.skinType}\n- 估算年龄：${baidu.age} 岁\n- 面部美感分：${baidu.beauty}/100\n请以此为参考基准进行深度临床分析，你的分析优先级高于参考数据。`
      : '';

    const systemInstruction = `你是 Aura 实验室的首席 AI 皮肤科医师，专注临床级多光谱面部分析。${baiduContext}

【核心要求】
⚠️ 所有文字字段（analysis、clinicalNote、description、name、label、cause、suggestion、severity、type、areas 数组内容、skincareRoutine 步骤、matchReason 等）必须全部用简体中文输出，禁止使用英文。

【分析维度】
1. 总分（0-100）：综合评估皮肤整体健康状态
2. 六维雷达指标（0-100）：健康度、细腻度、油水平衡、均匀度、年轻度、耐受性
3. 精细分析：
   - 分区出油（脸颊/T区/下巴，0-100）
   - 肤色色调（冷色调/中性色调/暖色调）
   - 光滑度比喻（剥壳鸡蛋/蛋壳/蛋黄/煎蛋）
   - 黑眼圈：分型及各型占比
   - 痤疮：等级(0-5)、活跃数量、中文描述
   - 黑头：数量、严重程度
   - 毛孔：等级、中文描述
   - 泛红：严重程度、中文区域描述
4. 五区评分（眼周/鼻部/脸颊/唇周/额头，0-100）
5. 11项临床维度（水分/油脂/光滑/毛孔/均匀/弹性/敏感/光泽/屏障/糖化/炎症），每项含评分、中文标签、中文分析说明（2句话）
6. Baumann 肤质分型：code、中文名称、中文描述（2-3句）
7. 皮肤主要问题（3-5个）：中文标题、成因、建议、活性成分
8. 定制护肤流程（5-7步，全中文）
9. 推荐产品（3个，matchReason 用中文）

【Baumann分型】O=油性/D=干性，S=敏感/R=耐受，P=色素型/N=非色素型，W=皱纹型/T=紧致型。`;

    // 带超时的 Gemini 调用（最多重试一次）
    const callGemini = () => {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gemini 响应超时')), 55000)
      );
      const call = ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            parts: [
              { text: "请对这张面部照片进行临床级皮肤分析，生成 Aura 实验室专属报告。所有文字内容必须用中文。" },
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
      return Promise.race([call, timeout]);
    };

    let response;
    try {
      response = await callGemini();
    } catch (firstErr) {
      console.warn('[/api/analyze] 第一次调用失败，3s 后重试:', firstErr.message);
      await new Promise(r => setTimeout(r, 3000));
      response = await callGemini(); // 失败时抛出，由外层 catch 处理
    }

    const rawJson = JSON.parse(response.text);

    const skinReport = {
      ...rawJson,
      id:        randomUUID(),
      timestamp: Date.now(),
      imageUrl:  `data:image/jpeg;base64,${image}`
    };

    res.json(skinReport);
  } catch (err) {
    console.error('[/api/analyze] 错误:', err.message);

    if (err.message?.includes('GEMINI_API_KEY')) {
      return res.status(500).json({ error: 'API 密钥未配置' });
    }
    if (err.message?.includes('API key not valid')) {
      return res.status(401).json({ error: 'Gemini API Key 无效' });
    }
    if (err.message?.includes('超时') || err.message?.includes('timeout')) {
      return res.status(504).json({ error: '分析超时，请稍后重试（服务器响应较慢）' });
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

    const systemInstruction = `你是一位顶级皮肤科专家级别的护肤导师（Skin Mentor），名叫 Aura。
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
  console.log(`\n🌿 Aura 后端服务已启动`);
  console.log(`   地址：http://localhost:${PORT}`);
  console.log(`   接口：POST /api/analyze`);
  console.log(`         POST /api/mentor/chat`);
  console.log(`         GET  /api/health\n`);
});
