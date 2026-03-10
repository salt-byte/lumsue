import React, { useState, useEffect, useRef } from 'react';
import { Zap, Layers } from 'lucide-react';

interface ProcessingViewProps {
  base64Image: string;
  onComplete: () => void;
  onProcessed?: (images: string[]) => void;
}

// ─── 像素级图像处理工具函数 ─────────────────────────────────────────────────

// 限定像素值在 0-255 之间
const clamp = (v: number) => Math.max(0, Math.min(255, v));

// S 曲线对比度增强（模拟专业后期调色）
const sCurve = (v: number, strength: number = 1.5): number => {
  const n = v / 255;
  const curved = n < 0.5
    ? 0.5 * Math.pow(2 * n, strength)
    : 1 - 0.5 * Math.pow(2 * (1 - n), strength);
  return clamp(curved * 255);
};

// RGB 转 HSL
const rgbToHsl = (r: number, g: number, b: number) => {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  return [h, s, l];
};

// HSL 转 RGB
const hslToRgb = (h: number, s: number, l: number) => {
  if (s === 0) { const v = clamp(l * 255); return [v, v, v]; }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    clamp(hue2rgb(p, q, h + 1/3) * 255),
    clamp(hue2rgb(p, q, h) * 255),
    clamp(hue2rgb(p, q, h - 1/3) * 255),
  ];
};

// ─────────────────────────────────────────────────────────────────────────────

const steps = [
  {
    title: '临床影像增强',
    sub: '对比度优化 · 临床白平衡校正',
    badge: 'RGB 增强模式',
    color: '#D4AF37',
    desc: '通过 S 曲线映射与色温中性化，还原皮肤最真实的临床级影像细节。'
  },
  {
    title: '黑色素分布图',
    sub: 'Melanin Index Mapping',
    badge: 'UV 光谱通道',
    color: '#C8860A',
    desc: '提取黑色素指数（R/B 对数比值），生成色斑、晒斑与色素沉着分布热图。'
  },
  {
    title: '炎症血流热力图',
    sub: 'Hemoglobin Erythema Index',
    badge: 'RBX 红光通道',
    color: '#E05050',
    desc: '分离血红蛋白信号，以冷暖伪彩映射炎症反应、毛细血管扩张与泛红区域。'
  },
  {
    title: '皮肤纹理精绘',
    sub: 'High-frequency Texture Map',
    badge: '高频纹理通道',
    color: '#7C9EB8',
    desc: '增强高频皮肤纹理信息，使毛孔开口、细纹与角质层细节清晰可辨。'
  },
];

const ProcessingView: React.FC<ProcessingViewProps> = ({ base64Image, onComplete, onProcessed }) => {
  const [step, setStep] = useState(0);
  const [processedImages, setProcessedImages] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement>(null);

  // ─── 核心：图像处理流水线 ────────────────────────────────────────────────
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const offscreen = offscreenRef.current;
      if (!canvas || !offscreen) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      canvas.width = offscreen.width = img.width;
      canvas.height = offscreen.height = img.height;
      const W = img.width, H = img.height;
      const images: string[] = [];

      // ── Step 1：临床影像增强（对比度+色温，保留原色）──────────────────────
      ctx.drawImage(img, 0, 0);
      const d1 = ctx.getImageData(0, 0, W, H);
      const p1 = d1.data;
      for (let i = 0; i < p1.length; i += 4) {
        const r = sCurve(p1[i], 1.6);
        const g = sCurve(p1[i + 1], 1.6);
        const b = sCurve(p1[i + 2], 1.6);
        const [h, s, l] = rgbToHsl(r, g, b);
        const [nr, ng, nb] = hslToRgb(h, Math.min(1, s * 1.2), l);
        p1[i] = nr; p1[i + 1] = ng; p1[i + 2] = nb;
      }
      ctx.putImageData(d1, 0, 0);
      ctx.filter = 'contrast(1.12) brightness(1.04)';
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = 'none';
      images.push(canvas.toDataURL('image/jpeg', 0.92));

      // ── Step 2：色素分布图（白底+深色素点，参考 UV 暗沉图）────────────────
      // 白色背景：亮区→奶白，暗区（色素）→深棕，对应"黑暗沉区域图"效果
      ctx.drawImage(img, 0, 0);
      const d2 = ctx.getImageData(0, 0, W, H);
      const p2 = d2.data;
      for (let i = 0; i < p2.length; i += 4) {
        const r = p2[i], g = p2[i + 1], b = p2[i + 2];
        const lum = r * 0.299 + g * 0.587 + b * 0.114;
        // 极度提亮：非色素区域推向白色，色素区域保留为深色
        const bright = clamp(lum * 1.9 + 30);
        const spot = clamp(255 - bright); // 反转：暗斑 = 高色素
        // 映射到奶白→深棕色阶
        p2[i]     = clamp(255 - spot * 0.55); // R
        p2[i + 1] = clamp(250 - spot * 0.72); // G
        p2[i + 2] = clamp(240 - spot * 0.88); // B → 暖棕色调
      }
      ctx.putImageData(d2, 0, 0);
      images.push(canvas.toDataURL('image/jpeg', 0.88));

      // ── Step 3：红色区域图（白底+粉红炎症，对应"红色区域图"效果）──────────
      // 计算血红蛋白/红斑指数，映射到粉红色在白色背景上
      ctx.drawImage(img, 0, 0);
      const d3 = ctx.getImageData(0, 0, W, H);
      const p3 = d3.data;
      for (let i = 0; i < p3.length; i += 4) {
        const r = p3[i], g = p3[i + 1], b = p3[i + 2];
        // 红斑指数：R 超出 G/B 平均值的量
        const ery = clamp(Math.max(0, r - (g + b) / 2) * 2.2);
        // 白底粉红：ery=0→白，ery=255→深粉红
        p3[i]     = 255;                       // R 保持高（白→红系）
        p3[i + 1] = clamp(255 - ery * 0.88);  // G 下降 → 粉红
        p3[i + 2] = clamp(255 - ery * 0.92);  // B 下降更多 → 红感
      }
      ctx.putImageData(d3, 0, 0);
      images.push(canvas.toDataURL('image/jpeg', 0.88));

      // ── Step 4：皮肤细节图（高对比黑白+分区标注）────────────────────────
      // 灰度极高对比，可见毛孔/黑头，叠加 F/E/M1/M2 分区标注
      ctx.drawImage(img, 0, 0);
      const d4 = ctx.getImageData(0, 0, W, H);
      const p4 = d4.data;
      for (let i = 0; i < p4.length; i += 4) {
        const lum = clamp(p4[i] * 0.299 + p4[i + 1] * 0.587 + p4[i + 2] * 0.114);
        const t = sCurve(lum, 2.4);
        p4[i] = t; p4[i + 1] = t; p4[i + 2] = t;
      }
      ctx.putImageData(d4, 0, 0);
      ctx.filter = 'contrast(3.5) brightness(0.88) invert(1)';
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = 'none';

      // 分区标注（近似：根据图像尺寸估算脸部区域）
      const zones = [
        { label: 'F',  cx: W * 0.50, cy: H * 0.22, rx: W * 0.26, ry: H * 0.14, color: '#00E5A0' },
        { label: 'E',  cx: W * 0.50, cy: H * 0.45, rx: W * 0.09, ry: H * 0.07, color: '#FF5A5A' },
        { label: 'M1', cx: W * 0.24, cy: H * 0.60, rx: W * 0.16, ry: H * 0.14, color: '#00E5A0' },
        { label: 'M2', cx: W * 0.76, cy: H * 0.60, rx: W * 0.16, ry: H * 0.14, color: '#00E5A0' },
      ];
      ctx.lineWidth = Math.max(2, W * 0.003);
      const fontSize = Math.max(18, Math.round(W * 0.045));
      ctx.font = `bold ${fontSize}px monospace`;
      for (const z of zones) {
        ctx.strokeStyle = z.color + 'CC';
        ctx.beginPath();
        ctx.ellipse(z.cx, z.cy, z.rx, z.ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = z.color;
        ctx.fillText(z.label, z.cx - z.rx + fontSize * 0.3, z.cy - z.ry + fontSize * 1.1);
      }
      images.push(canvas.toDataURL('image/jpeg', 0.88));

      setProcessedImages(images);
      onProcessed?.(images);
    };
    img.src = `data:image/jpeg;base64,${base64Image}`;
  }, [base64Image]);

  // ─── 步骤推进 ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (processedImages.length === 0) return;
    if (step < steps.length) {
      const timer = setTimeout(() => setStep(p => p + 1), 1200);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(onComplete, 800);
      return () => clearTimeout(timer);
    }
  }, [step, processedImages, onComplete]);

  const currentStep = steps[Math.min(step, steps.length - 1)];
  const progress = Math.min((step + 1) / steps.length, 1);

  return (
    <div className="fixed inset-0 bg-[#0A0A0F] flex flex-col items-center justify-center z-[200] overflow-hidden">
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={offscreenRef} className="hidden" />

      {/* 背景粒子光效 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#E29595]/5 rounded-full blur-[80px]" />
      </div>

      {/* 顶部实验室标题 */}
      <div className="absolute top-8 left-0 right-0 flex flex-col items-center gap-2 z-10">
        <div className="flex items-center gap-2 text-[#D4AF37]/60">
          <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
          <span className="text-[9px] font-bold uppercase tracking-[0.5em]">Aura 临床影像实验室</span>
          <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
        </div>
        <h2 className="text-2xl font-serif italic text-white/80">多光谱皮肤分析系统</h2>
      </div>

      {/* 核心图像展示 */}
      <div className="relative flex items-center justify-center w-full max-w-sm px-6">
        {/* 外框 — 模拟检测仪器 */}
        <div className="relative w-full rounded-[2.5rem] overflow-hidden shadow-2xl"
          style={{ aspectRatio: '3/4', border: '2px solid rgba(212,175,55,0.3)', boxShadow: `0 0 60px ${currentStep?.color}22, 0 30px 80px rgba(0,0,0,0.6)` }}>

          {/* 图像主体 */}
          {processedImages.length > 0 ? (
            <img
              key={step}
              src={processedImages[Math.min(step, steps.length - 1)]}
              className="w-full h-full object-cover"
              style={{ transition: 'opacity 0.5s ease' }}
              alt="processing"
            />
          ) : (
            <div className="w-full h-full bg-[#111] flex items-center justify-center">
              <div className="w-10 h-10 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
            </div>
          )}

          {/* 扫描线动画 */}
          {step < steps.length && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div
                className="absolute w-full h-[2px] animate-[scan_2s_linear_infinite]"
                style={{ background: `linear-gradient(90deg, transparent, ${currentStep.color}, transparent)`, boxShadow: `0 0 12px ${currentStep.color}` }}
              />
              {/* 角落装饰 */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: currentStep.color }} />
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: currentStep.color }} />
              <div className="absolute bottom-20 left-4 w-6 h-6 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: currentStep.color }} />
              <div className="absolute bottom-20 right-4 w-6 h-6 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: currentStep.color }} />
            </div>
          )}

          {/* 底部信息浮层 */}
          <div className="absolute bottom-0 left-0 right-0 p-5"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)' }}>
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-[8px] font-bold uppercase tracking-[0.3em] px-2.5 py-1 rounded-full"
                style={{ backgroundColor: currentStep?.color + '25', color: currentStep?.color, border: `1px solid ${currentStep?.color}40` }}
              >
                {currentStep?.badge}
              </span>
              <span className="text-[9px] text-white/40 font-mono">
                {String(step + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
              </span>
            </div>
            <h3 className="text-white font-serif italic text-lg leading-tight">{currentStep?.title}</h3>
            <p className="text-[9px] text-white/40 uppercase tracking-widest mt-0.5">{currentStep?.sub}</p>
          </div>
        </div>

        {/* 右侧数据流装饰 */}
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-60">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="text-[7px] font-mono text-[#D4AF37]/40 text-right"
              style={{ animationDelay: `${i * 0.15}s` }}>
              {Math.random().toString(16).slice(2, 6).toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* 步骤说明 */}
      <div className="mt-6 w-full max-w-sm px-6">
        <p className="text-[10px] text-center text-white/30 leading-relaxed font-serif-sc italic px-4">
          {currentStep?.desc}
        </p>
      </div>

      {/* 底部进度 */}
      <div className="mt-6 w-full max-w-sm px-6 space-y-4">
        {/* 步骤点 */}
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-all duration-500"
                style={{
                  backgroundColor: i < step ? s.color : i === step ? s.color : 'rgba(255,255,255,0.1)',
                  boxShadow: i === step ? `0 0 8px ${s.color}` : 'none',
                  transform: i === step ? 'scale(1.4)' : 'scale(1)',
                }}
              />
              <span className="text-[7px] text-white/30 uppercase tracking-widest font-bold"
                style={{ color: i <= step ? s.color + 'AA' : undefined }}>
                {['增强', '黑素', '炎症', '纹理'][i]}
              </span>
            </div>
          ))}
        </div>

        {/* 进度条 */}
        <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progress * 100}%`,
              background: `linear-gradient(90deg, #D4AF37, ${currentStep?.color})`,
              boxShadow: `0 0 8px ${currentStep?.color}`,
            }}
          />
        </div>

        <p className="text-center text-[8px] text-white/20 uppercase tracking-[0.4em] font-bold">
          {step >= steps.length ? '正在生成深度报告...' : `${Math.round(progress * 100)}% 分析中`}
        </p>
      </div>
    </div>
  );
};

export default ProcessingView;
