import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Zap, Layers, ShieldCheck, ArrowRight } from 'lucide-react';

interface ProcessingViewProps {
  base64Image: string;
  onComplete: () => void;
}

const ProcessingView: React.FC<ProcessingViewProps> = ({ base64Image, onComplete }) => {
  const [step, setStep] = useState(0);
  const [processedImages, setProcessedImages] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const steps = [
    { title: "原始影像采集", desc: "Standard Image Acquisition", label: "RGB 标准模式" },
    { title: "数字发色团分离", desc: "Digital Chromophore Separation", label: "Melanin 黑色素提取" },
    { title: "血红蛋白识别", desc: "Hemoglobin Isolation", label: "Vascularity 炎症分布" },
    { title: "微细纹理扫描", desc: "Micro-texture Analysis", label: "Texture 纹理深度扫描" }
  ];

  useEffect(() => {
    // 预处理所有图像
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;

      const images: string[] = [];
      
      // 1. 原始图
      ctx.drawImage(img, 0, 0);
      images.push(canvas.toDataURL('image/jpeg', 0.8));

      // 2. 黑色素提取 (Melanin)
      const imageDataM = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const dataM = imageDataM.data;
      for (let i = 0; i < dataM.length; i += 4) {
        const r = dataM[i], g = dataM[i+1], b = dataM[i+2];
        const melanin = Math.log(r / (b + 1) + 1) * 128;
        dataM[i] = melanin * 0.8;
        dataM[i+1] = melanin * 0.7;
        dataM[i+2] = melanin * 1.2;
      }
      ctx.putImageData(imageDataM, 0, 0);
      images.push(canvas.toDataURL('image/jpeg', 0.8));

      // 3. 血红蛋白识别 (Hemoglobin)
      ctx.drawImage(img, 0, 0);
      const imageDataH = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const dataH = imageDataH.data;
      for (let i = 0; i < dataH.length; i += 4) {
        const r = dataH[i], g = dataH[i+1];
        const hemoglobin = Math.max(0, r - g) * 2.5;
        dataH[i] = hemoglobin;
        dataH[i+1] = hemoglobin * 0.2;
        dataH[i+2] = hemoglobin * 0.2;
      }
      ctx.putImageData(imageDataH, 0, 0);
      images.push(canvas.toDataURL('image/jpeg', 0.8));

      // 4. 纹理深度扫描 (Texture)
      ctx.drawImage(img, 0, 0);
      ctx.filter = 'grayscale(1) contrast(3) brightness(0.8) invert(1)';
      ctx.drawImage(canvas, 0, 0);
      images.push(canvas.toDataURL('image/jpeg', 0.8));

      setProcessedImages(images);
    };
    img.src = `data:image/jpeg;base64,${base64Image}`;
  }, [base64Image]);

  useEffect(() => {
    if (processedImages.length === 0) return;
    
    if (step < steps.length) {
      const timer = setTimeout(() => {
        setStep(prev => prev + 1);
      }, 800); // 进一步缩短每个步骤的展示时间，从 1.2s 减为 0.8s
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        onComplete();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [step, processedImages, onComplete]);

  return (
    <div className="fixed inset-0 bg-[#FFF4F4] flex flex-col items-center justify-center z-[200] overflow-hidden">
      <canvas ref={canvasRef} className="hidden" />
      
      {/* 顶部状态 */}
      <div className="absolute top-12 left-0 right-0 flex flex-col items-center animate-fade">
         <div className="flex items-center gap-3 text-[#D4AF37] mb-2">
            <Zap size={18} className="animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.5em]">自动化多维度处理中</span>
         </div>
         <h2 className="text-3xl font-serif italic text-[#3C2A21]">AURA 数字化实验室</h2>
      </div>

      {/* 核心展示区 */}
      <div className="relative w-full max-w-lg aspect-[3/4] px-8">
        <div className="relative w-full h-full rounded-[3rem] overflow-hidden border-[12px] border-white shadow-2xl bg-black">
          {processedImages.length > 0 && (
            <img 
              src={processedImages[Math.min(step, steps.length - 1)]} 
              className="w-full h-full object-cover transition-all duration-700"
              alt="Processing"
            />
          )}
          
          {/* 扫描线动画 */}
          {step < steps.length && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="w-full h-1 bg-[#D4AF37] shadow-[0_0_20px_#D4AF37] absolute top-0 animate-[scan_2s_linear_infinite]"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#D4AF37]/5 to-transparent animate-pulse"></div>
            </div>
          )}

          {/* 浮动标签 */}
          <div className="absolute bottom-10 left-10 right-10">
            <div className="bg-white/90 backdrop-blur-xl p-6 rounded-[2rem] border border-white shadow-xl animate-fade">
               <div className="flex justify-between items-center mb-2">
                  <p className="text-[9px] font-bold text-[#D4AF37] uppercase tracking-widest">
                    {step < steps.length ? `Step 0${step + 1} / 04` : 'Processing Complete'}
                  </p>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === step ? 'bg-[#D4AF37] scale-125' : 'bg-[#D4AF37]/20'}`} />
                    ))}
                  </div>
               </div>
               <h3 className="text-xl font-serif italic text-[#3C2A21]">
                 {step < steps.length ? steps[step].title : '正在生成深度光谱报告...'}
               </h3>
               <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">
                 {step < steps.length ? steps[step].desc : 'AI 引擎正在进行高维度计算...'}
               </p>
            </div>
          </div>
        </div>
      </div>

      {/* 底部进度条 */}
      <div className="mt-12 w-full max-w-xs space-y-4">
         <div className="h-1 w-full bg-[#D4AF37]/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#D4AF37] transition-all duration-1000 ease-out"
              style={{ width: `${(Math.min(step + 1, steps.length) / steps.length) * 100}%` }}
            ></div>
         </div>
         <div className="flex justify-between text-[9px] font-bold text-[#D4AF37] uppercase tracking-widest">
            <span>采集</span>
            <span>处理</span>
            <span>分析</span>
            <span>报告</span>
         </div>
      </div>

      {/* 装饰性背景 */}
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#D4AF37]/5 rounded-full blur-[100px] -z-10"></div>
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#E29595]/5 rounded-full blur-[100px] -z-10"></div>
    </div>
  );
};

export default ProcessingView;
