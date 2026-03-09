import React, { useState, useEffect, useRef } from 'react';
import { Zap, Layers } from 'lucide-react';

interface ProcessingViewProps {
  base64Image: string;
  onComplete: () => void;
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

const ProcessingView: React.FC<ProcessingViewProps> = ({ base64Image, onComplete }) => {
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

      // ── Step 1：临床影像增强 ─────────────────────────────────────────────
      // S 曲线对比度 + 色温中性化 + 轻微锐化感（通过对比度实现）
      ctx.drawImage(img, 0, 0);
      const d1 = ctx.getImageData(0, 0, W, H);
      const p1 = d1.data;
      for (let i = 0; i < p1.length; i += 4) {
        // S 曲线增强对比度
        const r = sCurve(p1[i], 1.6);
        const g = sCurve(p1[i + 1], 1.6);
        const b = sCurve(p1[i + 2], 1.6);
        // 轻微提高饱和度 (HSL 调色)
        const [h, s, l] = rgbToHsl(r, g, b);
        const [nr, ng, nb] = hslToRgb(h, Math.min(1, s * 1.25), l);
        p1[i] = nr; p1[i + 1] = ng; p1[i + 2] = nb;
      }
      ctx.putImageData(d1, 0, 0);
      // 叠加一次高对比度 filter 增加锐利感
      ctx.filter = 'contrast(1.15) brightness(1.05)';
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = 'none';
      images.push(canvas.toDataURL('image/jpeg', 0.9));

      // ── Step 2：黑色素分布图 ─────────────────────────────────────────────
      // 黑色素指数 = log(R/(B+1))，映射到琥珀/棕褐伪彩
      ctx.drawImage(img, 0, 0);
      const d2 = ctx.getImageData(0, 0, W, H);
      const p2 = d2.data;
      for (let i = 0; i < p2.length; i += 4) {
        const r = p2[i], g = p2[i + 1], b = p2[i + 2];
        // 亮度作为基础
        const lum = r * 0.299 + g * 0.587 + b * 0.114;
        // 黑色素指数：R/B 对比，对数拉伸
        const mIdx = clamp(Math.log((r / (b + 1)) + 1) * 85 + lum * 0.15);
        // 映射到暖色调：高黑色素=深棕，低黑色素=象牙白
        p2[i]     = clamp(mIdx * 1.05);   // R: 暖橙
        p2[i + 1] = clamp(mIdx * 0.72);   // G: 中等
        p2[i + 2] = clamp(mIdx * 0.22);   // B: 压低 → 棕褐
      }
      ctx.putImageData(d2, 0, 0);
      images.push(canvas.toDataURL('image/jpeg', 0.85));

      // ── Step 3：炎症热力图 ───────────────────────────────────────────────
      // 血红蛋白/红斑指数：RBX 红光分离
      // 使用冷→暖伪彩（蓝=无炎症，绿=轻度，黄=中度，红=高炎症）
      ctx.drawImage(img, 0, 0);
      const d3 = ctx.getImageData(0, 0, W, H);
      const p3 = d3.data;
      for (let i = 0; i < p3.length; i += 4) {
        const r = p3[i], g = p3[i + 1], b = p3[i + 2];
        // 红斑指数：突出 R 相对于 G/B 的超出量
        const ery = clamp((r * 1.5 - g * 0.8 - b * 0.4) * 1.4);
        // 冷暖色彩映射
        let hr: number, hg: number, hb: number;
        if (ery < 60) {
          // 低 → 深蓝/紫
          hr = clamp(ery * 0.5);
          hg = clamp(ery * 0.3);
          hb = clamp(80 + ery * 1.5);
        } else if (ery < 140) {
          // 中 → 蓝绿过渡
          const t = (ery - 60) / 80;
          hr = clamp(ery * t * 0.8);
          hg = clamp(60 + t * 130);
          hb = clamp(160 - t * 140);
        } else if (ery < 210) {
          // 中高 → 黄绿
          const t = (ery - 140) / 70;
          hr = clamp(100 + t * 155);
          hg = clamp(200 - t * 30);
          hb = clamp(20 - t * 10);
        } else {
          // 高 → 红
          hr = 255;
          hg = clamp(200 - (ery - 210) * 2.5);
          hb = clamp(10 - (ery - 210) * 0.3);
        }
        p3[i] = hr; p3[i + 1] = hg; p3[i + 2] = hb;
      }
      ctx.putImageData(d3, 0, 0);
      images.push(canvas.toDataURL('image/jpeg', 0.85));

      // ── Step 4：皮肤纹理精绘 ─────────────────────────────────────────────
      // 高频纹理提取：灰度 + 极限对比 + 亮度反转 → 毛孔/细纹可见
      // 用两步：先做灰度高对比，再叠加边缘感
      ctx.drawImage(img, 0, 0);
      const d4 = ctx.getImageData(0, 0, W, H);
      const p4 = d4.data;
      // 第一步：灰度 + S 曲线极端对比
      for (let i = 0; i < p4.length; i += 4) {
        const lum = clamp(p4[i] * 0.299 + p4[i + 1] * 0.587 + p4[i + 2] * 0.114);
        // 极端 S 曲线，让暗部更暗，亮部更亮，凸显纹理
        const t = sCurve(lum, 2.2);
        p4[i] = t; p4[i + 1] = t; p4[i + 2] = t;
      }
      ctx.putImageData(d4, 0, 0);
      // 第二步：通过 CSS filter 叠加超高对比度，增强皮肤纹理深度
      ctx.filter = 'contrast(4) brightness(0.85) invert(1)';
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = 'none';
      // 第三步：叠加淡蓝色调，模拟专业纹理分析仪的蓝光通道
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(80, 120, 180, 0.12)';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      images.push(canvas.toDataURL('image/jpeg', 0.85));

      setProcessedImages(images);
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
          <span className="text-[9px] font-bold uppercase tracking-[0.5em]">LUMSUE 临床影像实验室</span>
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
