export enum View {
  Login,
  Mentor,     // 护肤导师 (首页/对话引导)
  Repair,     // 修复中心 (光疗与推荐)
  History,    // 记录查询
  Scanner,    // 扫描
  Prep,       // 扫描准备
  Processing, // 扫描中
  Loading,    // 分析中
  Report      // 报告
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  options?: string[]; // 快捷选项
}

export interface MetricScore {
  score: number;
  label: string;
  analysis: string;
  clinicalNote?: string; // 临床批注
}

export interface SkinReport {
  id: string;
  timestamp: number;
  imageUrl: string;
  totalScore: number;
  baumannType: {
    code: string;
    name: string;
    description: string;
  };
  fitzpatrickType: number;
  radarMetrics: {
    health: number;
    texture: number;
    oilDry: number;
    evenness: number;
    youth: number;
    tolerance: number;
  };
  detailedAnalysis: {
    zonalOil: {
      cheeks: number;
      tZone: number;
      chin: number;
    };
    skinTone: '冷色调' | '中性色调' | '暖色调';
    smoothnessMetaphor: '剥壳鸡蛋' | '蛋壳' | '蛋黄' | '煎蛋';
    darkCircles: {
      type: string;
      percentages: {
        pigmented: number;
        vascular: number;
        structural: number;
      };
    };
    acne: {
      level: number;
      count: number;
      severity: string;
    };
    blackheads: {
      count: number;
      severity: string;
    };
    pores: {
      level: string;
      description: string;
    };
    redness: {
      severity: string;
      areas: string[];
    };
  };
  areaScores: {
    eyes: number;
    nose: number;
    cheeks: number;
    lips: number;
    forehead: number;
  };
  metrics: {
    hydration: MetricScore;
    oilBalance: MetricScore;
    smoothness: MetricScore;
    pores: MetricScore;
    evenness: MetricScore;
    elasticity: MetricScore;
    sensitivity: MetricScore;
    gloss: MetricScore;
    barrier: MetricScore;
    glycation: MetricScore;
    inflammation: MetricScore;
  };
  problems: Array<{
    title: string;
    cause: string;
    suggestion: string;
    actives: string[];
  }>;
  lightTherapy: {
    wavelength: string;
    duration: string;
    frequency: string;
    color: 'Red' | 'Blue' | 'Yellow' | 'Mixed';
    hex: string;
  };
  skincareRoutine: string[];
  recommendations?: RecommendedProduct[];
}

export interface RecommendedProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string;
  price: string;
  matchReason: string;
  buyUrl: string;
  tags: string[];
}
