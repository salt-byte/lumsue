import React from 'react';
import { SkinReport } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar, Info } from 'lucide-react';

interface HistoryViewProps {
  reports: SkinReport[];
  onView: (report: SkinReport) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ reports, onView, onDelete, onBack }) => {
  // 准备图表数据：按时间升序排列
  const chartData = [...reports]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(r => ({
      date: new Date(r.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      hydration: r.metrics.hydration.score,
      gloss: r.metrics.gloss.score,
      elasticity: r.metrics.elasticity.score,
    }));

  return (
    <div className="animate-fade-in space-y-12">
      <div className="flex flex-col md:flex-row justify-end items-start md:items-baseline gap-6 lg:gap-4 border-b border-[#c9a96e]/10 pb-8 h-8">
      </div>

      {reports.length > 1 && (
        <div className="bg-white/40 backdrop-blur-md p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-white/50 shadow-sm animate-fade">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 lg:mb-8 gap-4 sm:gap-0">
            <div className="flex items-center gap-3">
              <TrendingUp size={16} className="text-[#AF9B60] lg:w-[18px] lg:h-[18px]" />
              <h3 className="text-base lg:text-lg serif-heading italic text-[#2D2422]">肤质演变趋势</h3>
            </div>
            <div className="flex gap-4">
               <div className="flex items-center gap-2">
                 <div className="w-1.5 lg:w-2 h-1.5 lg:h-2 rounded-full bg-[#E29595]"></div>
                 <span className="text-[8px] lg:text-[9px] font-medium text-slate-400 uppercase tracking-widest">含水量</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-1.5 lg:w-2 h-1.5 lg:h-2 rounded-full bg-[#AF9B60]"></div>
                 <span className="text-[8px] lg:text-[9px] font-medium text-slate-400 uppercase tracking-widest">光泽度</span>
               </div>
            </div>
          </div>

          <div className="h-48 lg:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorHydration" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E29595" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#E29595" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorGloss" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#AF9B60" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#AF9B60" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E4E2" opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#9a8f85' }}
                  dy={10}
                />
                <YAxis 
                  domain={[0, 100]} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#9a8f85' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    borderRadius: '16px', 
                    border: 'none',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                    fontSize: '10px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="hydration" 
                  stroke="#E29595" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorHydration)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="gloss" 
                  stroke="#AF9B60" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorGloss)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="space-y-6 lg:space-y-8">
        <div className="flex items-center gap-3 lg:gap-4">
          <Calendar size={18} className="text-[#AF9B60] lg:w-5 lg:h-5" />
          <h3 className="text-lg lg:text-xl serif-heading italic text-[#2D2422]">历史档案</h3>
        </div>
        
        {reports.length === 0 ? (
          <div className="text-center py-24 lg:py-40 border-2 border-dashed border-[#AF9B60]/10 rounded-[2rem] lg:rounded-[3rem]">
            <p className="font-serif italic text-xl lg:text-2xl text-[#8a7e74]">尚无扫描记录</p>
            <p className="text-xs lg:text-sm text-[#9a8f85] mt-2 lg:mt-4 font-serif-sc">开启您的第一次 AI 肤质诊断，建立专属档案</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
            {reports.map((report) => (
              <div 
                key={report.id} 
                className="bg-white border border-[#AF9B60]/10 group hover:shadow-2xl hover:border-[#AF9B60]/30 transition-all duration-500 overflow-hidden flex flex-col rounded-[2rem]"
              >
                <div 
                  className="relative aspect-[3/4] overflow-hidden cursor-pointer"
                  onClick={() => onView(report)}
                >
                  <img 
                    src={report.imageUrl} 
                    className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" 
                    alt="Scan" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                     <div className="text-white font-serif text-xs tracking-[3px] uppercase">查看详情 →</div>
                  </div>
                  <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-md px-3 py-1 text-[10px] font-serif tracking-[2px] text-[#2D2422] rounded-full">
                     {report.baumannType.code}
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-serif text-xl text-[#2D2422] group-hover:text-[#AF9B60] transition-colors">{report.baumannType.name}</h3>
                      <p className="text-[10px] uppercase tracking-widest text-[#9a8f85] mt-1 font-medium">
                        {new Date(report.timestamp).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto pt-6 border-t border-[#AF9B60]/10 flex justify-between items-center">
                     <div className="flex gap-2">
                        <div 
                          className="w-4 h-4 rounded-full border border-[#AF9B60]/20" 
                          style={{ backgroundColor: report.lightTherapy.hex }}
                          title={`推荐: ${report.lightTherapy.color}`}
                        ></div>
                        <span className="text-[9px] uppercase tracking-widest text-[#9a8f85] font-medium">Type {report.fitzpatrickType}</span>
                     </div>
                     <button 
                       onClick={(e) => { e.stopPropagation(); onDelete(report.id); }}
                       className="text-[9px] uppercase tracking-[3px] text-red-300 hover:text-red-500 transition-colors font-medium"
                     >
                       删除
                     </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-24 text-center opacity-20">
        <div className="w-16 h-px bg-[#AF9B60] mx-auto mb-4"></div>
        <p className="font-serif text-[10px] tracking-[10px] uppercase text-[#AF9B60] font-medium">档案终点</p>
      </div>
    </div>
  );
};

export default HistoryView;