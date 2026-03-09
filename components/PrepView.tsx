import React, { useState } from 'react';
import { Wind, Lightbulb, Music, ArrowRight, Sparkles } from 'lucide-react';

interface PrepViewProps {
  onConfirm: () => void;
  onCancel: () => void;
}

const PrepView: React.FC<PrepViewProps> = ({ onConfirm, onCancel }) => {
  const [scent, setScent] = useState('White Tea');
  const [mood, setMood] = useState('Zenith');

  return (
    <div className="fixed inset-0 bg-[#FFF0F1] z-[110] flex items-start md:items-center justify-center p-4 md:p-8 animate-fade overflow-y-auto">
      <div className="glass-card max-w-4xl w-full p-8 md:p-20 rounded-[2rem] md:rounded-[4rem] space-y-8 md:space-y-16 relative overflow-hidden border border-white my-4 md:my-0">
        <div className="absolute top-0 right-0 p-6 md:p-10 opacity-10">
          <Sparkles size={80} className="md:w-[120px] md:h-[120px]" />
        </div>
        
        <div className="text-center space-y-2 md:space-y-4">
          <p className="text-[#D4AF37] font-bold uppercase tracking-[0.4em] md:tracking-[0.6em] text-[8px] md:text-[10px]">PREPARATION RITUAL</p>
          <h2 className="text-3xl md:text-6xl serif-heading text-[#3C2A21]">检测准备</h2>
          <p className="text-xs md:text-sm text-[#3C2A21]/50 italic serif-heading">在开始检测前，请确认环境设置</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
           {/* 香氛选择 */}
           <div className="space-y-4 md:space-y-6">
              <div className="flex items-center gap-3 text-[#E29595]">
                <Wind size={16} className="md:w-[18px] md:h-[18px]" />
                <span className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase">香薰选择 / Scent</span>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-1 gap-2 md:gap-3">
                 {['White Tea', 'Sandalwood', 'Rosewood'].map(s => (
                   <button 
                    key={s}
                    onClick={() => setScent(s)}
                    className={`py-3 md:py-4 px-2 md:px-6 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-bold tracking-widest uppercase transition-all border ${scent === s ? 'bg-[#E29595] text-white border-[#E29595]' : 'bg-white/40 text-[#3C2A21]/40 border-transparent hover:border-[#E29595]/20'}`}
                   >
                     {s.split(' ')[0]}
                   </button>
                 ))}
              </div>
           </div>

           {/* 氛围灯光 */}
           <div className="space-y-4 md:space-y-6">
              <div className="flex items-center gap-3 text-[#D4AF37]">
                <Lightbulb size={16} className="md:w-[18px] md:h-[18px]" />
                <span className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase">氛围灯光 / Mood</span>
              </div>
              <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-4">
                 {['Zenith', 'Velvet', 'Dusk'].map(m => (
                   <button 
                    key={m}
                    onClick={() => setMood(m)}
                    className={`w-14 h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center text-[7px] md:text-[8px] font-bold tracking-widest uppercase transition-all border-2 ${mood === m ? 'border-[#D4AF37] scale-105 md:scale-110 shadow-lg' : 'border-transparent bg-white/40 opacity-40'}`}
                   >
                     {m}
                   </button>
                 ))}
              </div>
           </div>

           {/* 冥想音乐 */}
           <div className="space-y-4 md:space-y-6">
              <div className="flex items-center gap-3 text-[#3C2A21]/60">
                <Music size={16} className="md:w-[18px] md:h-[18px]" />
                <span className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase">音频调谐 / Audio</span>
              </div>
              <div className="p-4 md:p-6 bg-white/40 rounded-2xl md:rounded-3xl border border-white/50 italic text-[9px] md:text-[10px] text-[#3C2A21]/40 leading-relaxed">
                正在播放: "Silken Horizon" - 实验室定制白噪音。已开启空间降噪模式。
              </div>
           </div>
        </div>

        {/* 拍照要求 */}
        <div className="p-6 md:p-10 bg-[#3C2A21]/5 rounded-[2rem] border border-[#3C2A21]/10 space-y-6">
          <div className="flex items-center gap-3 text-[#3C2A21]">
            <Sparkles size={16} className="md:w-[18px] md:h-[18px]" />
            <span className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase">影像采集要求 / Image Requirements</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '光线充足', desc: '避免背光或阴影' },
              { label: '面部居中', desc: '正对摄像头' },
              { label: '移除遮挡', desc: '摘掉眼镜与碎发' },
              { label: '超清对焦', desc: '确保毛孔清晰' }
            ].map((req, i) => (
              <div key={i} className="flex flex-col items-center text-center space-y-2">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-[#D4AF37] border border-[#D4AF37]/20">
                  {i + 1}
                </div>
                <p className="text-[10px] font-bold text-[#3C2A21]">{req.label}</p>
                <p className="text-[8px] text-[#3C2A21]/40 uppercase tracking-tighter">{req.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 md:gap-6 pt-6 md:pt-10">
           <button 
             onClick={onCancel}
             className="order-2 sm:order-1 flex-1 py-4 md:py-7 rounded-full border border-[#D4AF37]/20 text-[9px] md:text-[10px] font-bold tracking-[0.4em] uppercase text-[#3C2A21]/30 hover:bg-white transition-all"
           >
             取消
           </button>
           <button 
             onClick={onConfirm}
             className="order-1 sm:order-2 flex-[2] py-4 md:py-7 bg-[#3C2A21] text-white rounded-full flex items-center justify-center gap-4 md:gap-6 shadow-2xl hover:bg-black transition-all group"
           >
              <span className="text-[10px] md:text-[11px] font-bold tracking-[0.3em] md:tracking-[0.5em] uppercase">准备就绪，开始检测</span>
              <ArrowRight size={18} className="md:w-5 md:h-5 group-hover:translate-x-2 transition-transform" />
           </button>
        </div>
      </div>
    </div>
  );
};

export default PrepView;