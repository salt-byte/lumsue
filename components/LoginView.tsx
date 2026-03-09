import React, { useState, useEffect } from 'react';
import { Fingerprint, ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginViewProps {
  onEnter: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onEnter }) => {
  const [step, setStep] = useState<'intro' | 'login'>('intro');

  useEffect(() => {
    const timer = setTimeout(() => {
      setStep('login');
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#FFF0F1] flex items-center justify-center relative overflow-hidden font-sans selection:bg-[#E29595] selection:text-white">
      {/* Background Decor */}
      <div className="absolute inset-0 silk-overlay opacity-30 pointer-events-none"></div>
      <div className="absolute top-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-[#FDE2E4] rounded-full blur-[160px] opacity-70"></div>
      
      {/* Main Content Grid */}
      <div className="container max-w-7xl mx-auto px-6 lg:px-16 relative z-10 py-12 lg:py-0">
        <div className={`grid grid-cols-1 ${step === 'login' ? 'lg:grid-cols-12' : 'lg:grid-cols-1'} gap-10 lg:gap-0 items-center transition-all duration-1000 ease-in-out`}>
          
          {/* Left Side: Editorial Headline */}
          <div className={`${step === 'login' ? 'lg:col-span-7 lg:pr-24 lg:text-left' : 'lg:col-span-12 text-center'} flex flex-col justify-center space-y-8 lg:space-y-16 text-center transition-all duration-1000 ease-in-out`}>
            <motion.div 
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="space-y-6 lg:space-y-10"
            >
              <div className={`flex items-center justify-center ${step === 'login' ? 'lg:justify-start' : 'lg:justify-center'} gap-3 lg:gap-4 text-[#AF9B60] transition-all duration-1000`}>
                <Sparkles size={24} className="lg:w-8 lg:h-8" strokeWidth={1} />
                <span className="text-xs lg:text-sm uppercase tracking-[0.4em] lg:tracking-[0.6em] font-light text-[#2D2422]">光彩艺术</span>
              </div>
              <div className={`flex flex-col items-center ${step === 'login' ? 'lg:items-start' : 'lg:items-center'}`}>
                <h1 className="text-6xl md:text-8xl lg:text-[10rem] serif-heading leading-tight lg:leading-[1] text-[#2D2422]">
                  <span className="text-[#E29595] italic font-normal">LUMSUE</span>
                </h1>
                <div className={`flex items-center justify-center ${step === 'login' ? 'lg:justify-start' : 'lg:justify-center'} gap-4 lg:gap-6 transition-all duration-1000 mt-4`}>
                  <div className="w-8 lg:w-12 h-[1px] bg-[#AF9B60]"></div>
                  <span className="text-[10px] lg:text-[12px] uppercase tracking-[0.4em] lg:tracking-[0.5em] font-medium text-[#2D2422]/60">AI 肤质实验室</span>
                  <div className="w-8 lg:w-12 h-[1px] bg-[#AF9B60]"></div>
                </div>
              </div>
              <div className={`max-w-md mx-auto ${step === 'login' ? 'lg:mx-0' : 'lg:mx-auto'} space-y-6 lg:space-y-8 transition-all duration-1000`}>
                <p className={`text-sm lg:text-base serif-heading italic font-light leading-relaxed text-[#2D2422]/80 ${step === 'login' ? 'lg:text-left' : 'text-center'}`}>
                  AI 驱动的专业肤质检测与个性化护肤方案。
                </p>
              </div>
            </motion.div>
          </div>

          {/* Right Side: Login Card */}
          <AnimatePresence>
            {step === 'login' && (
              <motion.div 
                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="lg:col-span-5 flex justify-center lg:justify-end"
              >
                <div className="glass-card w-full max-w-md p-8 lg:p-16 rounded-[3rem] lg:rounded-[4rem] relative overflow-hidden">
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#FDE2E4] rounded-full blur-[80px] opacity-50"></div>
                  
                  <div className="relative z-10 space-y-8 lg:space-y-12">
                    <div className="text-center">
                      <h2 className="text-2xl lg:text-3xl serif-heading text-[#2D2422] mb-2 font-light">会员登录</h2>
                      <div className="w-10 lg:w-12 h-[1px] bg-[#AF9B60] mx-auto mb-4"></div>
                      <p className="text-[8px] lg:text-[10px] tracking-[0.3em] uppercase text-[#2D2422]/40">身份验证</p>
                    </div>

                    {/* Biometric Scan Circle */}
                    <div className="flex flex-col items-center gap-4 lg:gap-6">
                      <button 
                        onClick={onEnter}
                        className="w-24 h-24 lg:w-28 lg:h-28 rounded-full bg-gradient-to-br from-white via-[#FDE2E4] to-[#D4C5B3] p-[1px] group transition-all duration-700 hover:scale-105 shadow-sm"
                      >
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                          <Fingerprint size={40} strokeWidth={1} className="lg:w-12 lg:h-12 text-[#E29595] group-hover:text-[#AF9B60] transition-colors" />
                        </div>
                      </button>
                      <span className="text-[8px] lg:text-[10px] uppercase tracking-[0.2em] font-medium text-[#2D2422]/60">指纹登录</span>
                    </div>

                    <div className="relative flex items-center py-2">
                      <div className="flex-grow border-t border-[#2D2422]/10"></div>
                      <span className="flex-shrink mx-4 lg:mx-8 text-[8px] uppercase tracking-[0.4em] lg:tracking-[0.5em] opacity-30 italic">Editorial Access</span>
                      <div className="flex-grow border-t border-[#2D2422]/10"></div>
                    </div>

                    <div className="space-y-8 lg:space-y-10">
                      <div className="space-y-6 lg:space-y-8">
                         <div className="border-b border-[#2D2422]/15 pb-2">
                           <label className="text-[8px] lg:text-[9px] uppercase tracking-[0.3em] font-medium text-[#2D2422]/50 mb-1 block">MEMBER ID</label>
                           <input type="text" placeholder="Email or Identity Token" className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 italic placeholder:opacity-30" />
                         </div>
                         <div className="border-b border-[#2D2422]/15 pb-2">
                           <div className="flex justify-between items-center mb-1">
                             <label className="text-[8px] lg:text-[9px] uppercase tracking-[0.3em] font-medium text-[#2D2422]/50">SECURITY KEY</label>
                             <a href="#" className="text-[8px] uppercase tracking-widest text-[#AF9B60]">FORGOTTEN KEY?</a>
                           </div>
                           <input type="password" placeholder="••••••••" className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 placeholder:opacity-30" />
                         </div>
                      </div>

                      <button 
                        onClick={onEnter}
                        className="w-full py-5 lg:py-6 btn-luxe rounded-full serif-heading text-base lg:text-lg tracking-[0.2em] shadow-xl flex items-center justify-center gap-4 group font-light"
                      >
                        进入系统
                        <ArrowRight size={18} className="lg:w-5 lg:h-5 group-hover:translate-x-2 transition-transform" />
                      </button>
                    </div>

                    <div className="text-center">
                      <p className="text-[10px] lg:text-[11px] font-light italic text-[#2D2422]/50">
                        Awaiting an invitation? 
                        <a href="#" className="text-[#2D2422] not-italic font-medium block mt-2 lg:mt-3 uppercase tracking-[0.2em] text-[8px] lg:text-[9px]">Apply for Membership</a>
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <footer className="fixed bottom-6 lg:bottom-10 left-0 right-0 text-center z-10 px-6">
        <p className="text-[8px] lg:text-[9px] uppercase tracking-[0.3em] lg:tracking-[0.5em] text-[#2D2422]/40 font-medium">
          © 2024 — ROSE & PEARL EDITORIAL — LUXURY SMART RESTORATION
        </p>
      </footer>
    </div>
  );
};

export default LoginView;