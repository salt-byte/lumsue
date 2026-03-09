
import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, Zap, Layers } from 'lucide-react';

const LoadingView: React.FC = () => {
  const [step, setStep] = useState(0);
  const steps = [
    { icon: <Zap size={20} />, text: "光谱增强处理...", desc: "正在应用 UV 与交叉偏振算法，提取皮下特征" },
    { icon: <Layers size={20} />, text: "多层深度扫描...", desc: "正在分析表皮层、真皮层与基底层数据" },
    { icon: <ShieldCheck size={20} />, text: "AI 模型分析中...", desc: "正在识别色素分布、油脂分区、屏障完整性等核心指标" },
    { icon: <Sparkles size={20} />, text: "生成专属报告...", desc: "正在为您构建个性化护肤方案与临床指标评分" }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % steps.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade">
      <div className="relative mb-12">
        {/* 核心动画 */}
        <div className="w-32 h-32 rounded-full border border-[#D4AF37]/20 flex items-center justify-center relative">
          <div className="absolute inset-0 rounded-full border-t-2 border-[#D4AF37] animate-spin"></div>
          <div className="w-24 h-24 rounded-full bg-white shadow-xl flex items-center justify-center overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#D4AF37]/10 to-transparent animate-[scan_2s_linear_infinite]"></div>
             <Sparkles size={32} className="text-[#D4AF37] animate-pulse" />
          </div>
        </div>
        
        {/* 装饰性光晕 */}
        <div className="absolute -inset-8 bg-[#D4AF37]/5 blur-2xl rounded-full -z-10 animate-pulse"></div>
      </div>

      <div className="text-center space-y-6 max-w-sm">
        <div className="bg-white/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/50 shadow-sm min-h-[120px] flex flex-col justify-center transition-all duration-500">
           <div className="flex items-center gap-3 mb-2 text-[#D4AF37] animate-fade">
             {steps[step].icon}
             <span className="text-xs font-bold tracking-widest">{steps[step].text}</span>
           </div>
           <p className="text-[10px] text-[#3C2A21]/50 leading-relaxed italic animate-fade">
             {steps[step].desc}
           </p>
        </div>

        <div className="flex justify-center gap-1.5">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-1 rounded-full transition-all duration-500 ${i === step ? 'w-6 bg-[#D4AF37]' : 'w-1.5 bg-[#D4AF37]/20'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingView;
