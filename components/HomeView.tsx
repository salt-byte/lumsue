import React from 'react';
import { SkinReport } from '../types';
import { Wind, Lightbulb, Activity, Info, ShoppingBag, ArrowRight, Sparkles, Sliders, ConciergeBell, Droplets, Zap, TrendingUp, CloudSun } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface HomeViewProps {
  onStart: () => void;
  lastReport?: SkinReport;
}

const MOCK_TREND_DATA = [
  { day: 'Mon', score: 82 },
  { day: 'Tue', score: 84 },
  { day: 'Wed', score: 83 },
  { day: 'Thu', score: 85 },
  { day: 'Fri', score: 87 },
  { day: 'Sat', score: 86 },
  { day: 'Sun', score: 88 },
];

const HomeView: React.FC<HomeViewProps> = ({ onStart, lastReport }) => {
  return (
    <div className="flex flex-col gap-12 animate-fade">
      
      {/* 顶部：环境简介 */}
      <div className="flex flex-col md:flex-row md:items-end justify-end border-b border-[#D4AF37]/20 pb-6 lg:pb-10">
        <div className="flex flex-col items-start md:items-end gap-3 mt-6 md:mt-0">
          <div className="flex items-center gap-3 lg:gap-4 bg-[#FDE2E4]/30 px-4 lg:px-6 py-2 lg:py-3 rounded-full border border-[#E29595]/20">
             <CloudSun size={16} className="text-[#E29595] lg:w-[18px] lg:h-[18px]" />
             <div className="text-left md:text-right">
                <p className="text-[8px] lg:text-[9px] font-bold uppercase tracking-widest text-[#3C2A21]/60">今日环境 / Environment</p>
                <p className="text-[9px] lg:text-[10px] text-[#3C2A21] font-serif-sc italic">湿度 45% · 紫外线 中等</p>
             </div>
          </div>
          <p className="max-w-md text-left md:text-right text-[9px] lg:text-[10px] text-[#3C2A21]/50 italic leading-relaxed font-serif-sc">
            欢迎回到您的私人美学空间。这里汇集了皮肤指标、环境控制与 LUMSUE 护肤建议。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* 第一部分：核心仪式区 (7/12) - 最直观的扫描入口 */}
        <section className="lg:col-span-7 flex flex-col gap-6 lg:gap-10">
           <div 
             onClick={onStart}
             className="relative group overflow-hidden rounded-[2rem] lg:rounded-[3rem] border border-[#FDE2E4] bg-white shadow-xl h-[350px] lg:h-[500px] cursor-pointer"
           >
              <img 
                src={lastReport?.imageUrl || "https://images.unsplash.com/photo-1596704017254-9b121068fb31?q=80&w=1974&auto=format&fit=crop"} 
                className="w-full h-full object-cover opacity-80 transition-transform duration-1000 group-hover:scale-105" 
                alt="Last Scan" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
              
              {/* 状态悬浮标签 */}
              <div className="absolute top-4 lg:top-8 left-4 lg:left-8 flex items-center gap-2 lg:gap-3 bg-white/90 backdrop-blur-md px-3 lg:px-5 py-2 lg:py-3 rounded-full shadow-sm border border-[#D4AF37]/20">
                 <div className="w-1.5 lg:w-2 h-1.5 lg:h-2 bg-[#D4AF37] rounded-full animate-pulse"></div>
                 <span className="text-[8px] lg:text-[10px] font-bold tracking-[0.3em] uppercase text-[#3C2A21]">上次分析: {lastReport ? new Date(lastReport.timestamp).toLocaleDateString() : '暂无记录'}</span>
              </div>

              {/* 核心 CTA - 移除冗余按钮，改为引导性文字 */}
              <div className="absolute bottom-6 lg:bottom-10 left-6 lg:left-10 right-6 lg:right-10 flex flex-col items-center">
                 <div className="flex items-center gap-3 text-[#3C2A21] mb-2 group-hover:translate-y-[-4px] transition-transform">
                    <span className="text-xs lg:text-sm font-bold tracking-[0.4em] uppercase">点击开启实时光谱扫描</span>
                    <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform lg:w-5 lg:h-5" />
                 </div>
                 <p className="text-[8px] lg:text-[10px] text-[#3C2A21]/40 uppercase tracking-[0.5em] font-bold text-center">Initiate Real-time Spectral Scan</p>
              </div>
           </div>

           {/* 皮肤旅程图表 (Skin Journey) - 填补左侧空间 */}
           <div className="glass-card p-6 lg:p-10 rounded-[2rem] lg:rounded-[3rem] border-gold-luxe space-y-6 lg:space-y-8">
              <div className="flex justify-between items-center">
                 <div className="flex items-center gap-2 lg:gap-3">
                    <TrendingUp size={16} className="text-[#D4AF37] lg:w-[18px] lg:h-[18px]" />
                    <h3 className="text-[10px] lg:text-xs tracking-[0.3em] font-bold uppercase text-[#3C2A21]/60">皮肤旅程 / Skin Journey</h3>
                 </div>
                 <div className="flex gap-3 lg:gap-4">
                    <span className="text-[8px] lg:text-[9px] font-bold text-[#D4AF37] uppercase tracking-widest">近 7 日</span>
                    <span className="text-[8px] lg:text-[9px] font-bold text-slate-300 uppercase tracking-widest hidden sm:inline">近 30 日</span>
                 </div>
              </div>
              <div className="h-32 lg:h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={MOCK_TREND_DATA}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 8, fill: '#94a3b8' }} 
                      dy={10}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', fontSize: '10px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#D4AF37" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorScore)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </div>

           {/* 快速指标简报 */}
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
              <div className="glass-card p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] flex items-center gap-4 lg:gap-6 border-gold-luxe">
                 <div className="w-12 h-12 lg:w-14 lg:h-14 bg-[#E29595]/10 rounded-xl lg:rounded-2xl flex items-center justify-center text-[#E29595]">
                   <Droplets size={20} className="lg:w-6 lg:h-6" />
                 </div>
                 <div>
                   <p className="text-[8px] lg:text-[9px] font-bold uppercase tracking-widest text-slate-400">平均含水量</p>
                   <p className="text-xl lg:text-2xl serif-heading italic text-[#3C2A21]">{lastReport?.metrics.hydration.score || 74}% <span className="text-[10px] not-italic text-[#E29595] ml-1 lg:ml-2 font-bold">Optimal</span></p>
                 </div>
              </div>
              <div className="glass-card p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] flex items-center gap-4 lg:gap-6 border-gold-luxe">
                 <div className="w-12 h-12 lg:w-14 lg:h-14 bg-[#D4AF37]/10 rounded-xl lg:rounded-2xl flex items-center justify-center text-[#D4AF37]">
                   <Sparkles size={20} className="lg:w-6 lg:h-6" />
                 </div>
                 <div>
                   <p className="text-[8px] lg:text-[9px] font-bold uppercase tracking-widest text-slate-400">皮层透明度</p>
                   <p className="text-xl lg:text-2xl serif-heading italic text-[#3C2A21]">高 (High) <span className="text-[10px] not-italic text-[#D4AF37] ml-1 lg:ml-2 font-bold">Refined</span></p>
                 </div>
              </div>
           </div>
        </section>

        {/* 第二部分：数据与环境区 (5/12) - 侧边功能面板 */}
        <aside className="lg:col-span-5 flex flex-col gap-10">
            {/* 1. 皮肤洞察卡片 (Skin Intelligence) */}
            <div className="bg-white p-6 lg:p-10 rounded-[2.5rem] lg:rounded-[3rem] border border-[#FDE2E4] shadow-sm flex flex-col items-center">
               <div className="w-full flex justify-between items-center mb-6 lg:mb-10">
                 <div className="flex items-center gap-3">
                   <Activity size={16} className="text-[#E29595] lg:w-[18px] lg:h-[18px]" />
                   <h3 className="text-[10px] lg:text-xs tracking-[0.3em] font-bold uppercase text-[#3C2A21]/60">健康指标</h3>
                 </div>
                 <Info size={14} className="text-slate-200 lg:w-4 lg:h-4" />
               </div>
               <div className="relative w-36 h-36 lg:w-48 lg:h-48 flex items-center justify-center">
                 <svg className="w-full h-full -rotate-90">
                   <circle cx="72" cy="72" r="68" fill="none" stroke="#F8FAFC" strokeWidth="2" className="lg:hidden"></circle>
                   <circle cx="96" cy="96" r="88" fill="none" stroke="#F8FAFC" strokeWidth="2.5" className="hidden lg:block"></circle>
                   
                   <circle cx="72" cy="72" r="68" fill="none" stroke="#D4AF37" strokeWidth="3" strokeDasharray="427" strokeDashoffset={427 - (427 * 0.87)} strokeLinecap="round" className="lg:hidden transition-all duration-1000 ease-out"></circle>
                   <circle cx="96" cy="96" r="88" fill="none" stroke="#D4AF37" strokeWidth="4" strokeDasharray="552" strokeDashoffset={552 - (552 * 0.87)} strokeLinecap="round" className="hidden lg:block transition-all duration-1000 ease-out"></circle>
                 </svg>
                 <div className="absolute flex flex-col items-center">
                   <span className="text-5xl lg:text-7xl serif-heading italic text-[#3C2A21]">87</span>
                   <span className="text-[8px] lg:text-[10px] text-[#D4AF37] uppercase tracking-widest font-bold mt-1 lg:mt-2">健康状态</span>
                 </div>
               </div>
               <div className="mt-8 lg:mt-10 grid grid-cols-2 w-full gap-3 lg:gap-4">
                  <div className="bg-slate-50 p-3 lg:p-4 rounded-xl lg:rounded-2xl text-center">
                    <p className="text-[7px] lg:text-[8px] font-bold text-slate-400 uppercase tracking-widest">屏障强度</p>
                    <p className="text-xs lg:text-sm font-bold text-[#3C2A21] mt-0.5 lg:mt-1">92%</p>
                  </div>
                  <div className="bg-slate-50 p-3 lg:p-4 rounded-xl lg:rounded-2xl text-center">
                    <p className="text-[7px] lg:text-[8px] font-bold text-slate-400 uppercase tracking-widest">抗氧水平</p>
                    <p className="text-xs lg:text-sm font-bold text-[#3C2A21] mt-0.5 lg:mt-1">78%</p>
                  </div>
               </div>
               <p className="mt-6 lg:mt-8 text-center text-[9px] lg:text-[10px] text-slate-400 leading-relaxed font-serif-sc italic px-4 lg:px-6">
                 您的皮肤状态目前处于“黄金平衡”。建议配合使用<span className="text-[#D4AF37]">「修护精华液」</span>。
               </p>
            </div>
 
           {/* 2. 实验室环境控制 (Laboratory Ambient) */}
           <div className="glass-card p-6 lg:p-10 rounded-[2.5rem] lg:rounded-[3rem] space-y-8 lg:space-y-10 border-gold-luxe">
              <div className="flex items-center gap-3 mb-2 lg:mb-4">
                 <Sliders size={16} className="text-[#D4AF37] lg:w-[18px] lg:h-[18px]" />
                 <h3 className="text-[10px] lg:text-xs tracking-[0.3em] font-bold uppercase text-[#3C2A21]/60">环境调节</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
                <div className="space-y-3 lg:space-y-4">
                  <p className="text-[8px] lg:text-[9px] uppercase tracking-widest text-slate-400 font-bold">室内香氛 / SCENT</p>
                  <div className="flex items-center gap-3 lg:gap-4">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#FDE2E4] rounded-xl lg:rounded-2xl flex items-center justify-center">
                      <Wind size={18} className="text-[#E29595] lg:w-5 lg:h-5" />
                    </div>
                    <div>
                      <p className="text-xs serif-heading italic text-[#3C2A21]">白茶与佛手柑</p>
                      <p className="text-[8px] text-[#E29595] font-bold">强度 03</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 lg:space-y-4">
                  <p className="text-[8px] lg:text-[9px] uppercase tracking-widest text-slate-400 font-bold">光谱氛围 / LIGHT</p>
                  <div className="flex gap-2">
                     <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-[#AF9B60] shadow-lg border border-white"></div>
                     <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-[#FCEAEA] shadow-sm border border-white"></div>
                     <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-[#E5E4E2] shadow-sm border border-white"></div>
                  </div>
                </div>
              </div>

              <div className="h-[1px] bg-[#3C2A21]/5 w-full"></div>

              <div className="space-y-6">
                 <div className="flex justify-between items-center">
                    <h4 className="text-[9px] tracking-[0.3em] font-bold uppercase text-slate-400">配方卡槽状态 / CARTRIDGES</h4>
                    <span className="text-[8px] px-3 py-1 bg-[#D4AF37]/10 text-[#D4AF37] rounded-full font-bold">ACTIVE</span>
                 </div>
                 <div className="space-y-5">
                    {[
                      { name: '透明质酸精华', level: 75 },
                      { name: '高活性维C亮肤', level: 12, alert: true },
                    ].map(item => (
                      <div key={item.name} className="space-y-3">
                         <div className="flex justify-between items-end">
                            <p className={`text-[10px] font-bold tracking-widest ${item.alert ? 'text-[#E29595]' : 'text-[#3C2A21]/60'}`}>{item.name}</p>
                            <span className="text-xs serif-heading italic">{item.level}%</span>
                         </div>
                         <div className="h-[2px] w-full bg-slate-50 overflow-hidden rounded-full">
                            <div className={`h-full ${item.alert ? 'bg-[#E29595]' : 'bg-[#D4AF37]/40'}`} style={{ width: `${item.level}%` }}></div>
                         </div>
                         {item.alert && (
                           <p className="text-[8px] text-[#E29595] font-bold uppercase tracking-tighter flex items-center gap-2">
                              <ShoppingBag size={10} /> 存量偏低，建议开启尊享补给
                           </p>
                         )}
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* 3. 尊享礼宾入口 */}
           <button className="w-full py-6 rounded-[2rem] border-2 border-[#D4AF37] text-[10px] font-bold tracking-[0.4em] uppercase text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white transition-all flex items-center justify-center gap-4">
              <ConciergeBell size={18} />
              联系客服
           </button>

        </aside>
      </div>

      {/* 底部：快速导航与修护提醒 */}
      <div className="bg-[#3C2A21] rounded-[2rem] lg:rounded-[3rem] p-6 lg:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-6 lg:gap-10 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-48 lg:w-64 h-48 lg:h-64 bg-[#E29595] rounded-full blur-[80px] lg:blur-[100px] opacity-20 -mr-24 lg:-mr-32 -mt-24 lg:-mt-32"></div>
         <div className="relative z-10 flex items-center gap-4 lg:gap-8">
            <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-[#D4AF37]">
               <Zap size={24} className="lg:w-[30px] lg:h-[30px]" fill="currentColor" />
            </div>
            <div>
               <h3 className="text-xl lg:text-2xl serif-heading italic">护肤提醒 <span className="text-xs lg:text-sm not-italic opacity-40 ml-1 lg:ml-2">Next Session</span></h3>
               <p className="text-[8px] lg:text-[10px] uppercase tracking-[0.4em] text-[#E29595] mt-1 font-bold">建议今晚 22:30 进行护肤</p>
            </div>
         </div>
         <button className="w-full md:w-auto relative z-10 px-8 lg:px-10 py-3 lg:py-4 border border-white/20 rounded-full text-[8px] lg:text-[10px] font-bold tracking-[0.4em] uppercase hover:bg-white hover:text-[#3C2A21] transition-all">
            预约提醒
         </button>
      </div>
    </div>
  );
};

export default HomeView;