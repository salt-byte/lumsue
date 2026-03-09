import React, { useState } from 'react';
import { SkinReport, MetricScore, RecommendedProduct } from '../types';
import {
  Droplets, Activity, Sparkles, ChevronRight, Share2, RefreshCw,
  Award, ShoppingBag, ExternalLink, LayoutGrid, List, AlertCircle,
  Thermometer, Sun, Zap, Target, Eye, Info, Languages, FlaskConical,
  Shield, Flame, Gauge, Wind, Layers
} from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

import { Language, translations } from '../src/i18n';

interface ReportViewProps {
  report: SkinReport;
  onBack: () => void;
  language: Language;
  onToggleLanguage: () => void;
}

const MetricBar: React.FC<{ label: string; score: number; italicLabel: string }> = ({ label, score, italicLabel }) => (
  <div className="space-y-3 animate-fade">
    <div className="flex justify-between items-end gap-4">
      <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-[#2D2422] opacity-80">{label}</span>
      <span className="text-xs md:text-sm font-serif italic text-[#AF9B60] whitespace-nowrap">{italicLabel}</span>
    </div>
    <div className="w-full h-8 md:h-10 bg-white rounded-full flex items-center px-1.5 shadow-inner border border-[#E5E4E2]/50">
      <div
        className="h-5 md:h-7 rounded-full bg-gradient-to-r from-[#FDE2E4] via-[#E89B93] to-[#AF9B60] shadow-sm transition-all duration-1000 ease-out"
        style={{ width: `${score}%` }}
      ></div>
    </div>
  </div>
);

// 临床指标评分条（带分析文字）
const ClinicalMetricRow: React.FC<{ metricKey: string; label: string; enLabel: string; data: MetricScore }> = ({ metricKey, label, enLabel, data }) => {
  const scoreColor = data.score >= 75 ? '#AF9B60' : data.score >= 50 ? '#E89B93' : '#E29595';
  return (
    <div className="py-5 border-b border-[#E5E4E2]/60 last:border-0">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D2422]">{label}</span>
          <span className="text-[9px] text-slate-400 ml-2 font-medium">{enLabel}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xl font-serif" style={{ color: scoreColor }}>{data.score}</span>
          <span className="text-[9px] text-slate-400">/100</span>
        </div>
      </div>
      <div className="w-full h-2 bg-[#F5F3F0] rounded-full mb-3">
        <div
          className="h-2 rounded-full transition-all duration-1000"
          style={{ width: `${data.score}%`, backgroundColor: scoreColor }}
        />
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed font-serif-sc">{data.analysis}</p>
      {data.clinicalNote && (
        <p className="text-[10px] text-[#AF9B60] mt-1.5 italic font-serif">临床批注：{data.clinicalNote}</p>
      )}
    </div>
  );
};

const fitzpatrickLabels: Record<number, { name: string; desc: string; color: string }> = {
  1: { name: 'Type I', desc: '极浅肤色，易晒伤', color: '#FDEBD0' },
  2: { name: 'Type II', desc: '浅肤色，偶尔晒伤', color: '#F5CBA7' },
  3: { name: 'Type III', desc: '中等肤色，轻度晒伤', color: '#E59866' },
  4: { name: 'Type IV', desc: '橄榄肤色，不易晒伤', color: '#CA6F1E' },
  5: { name: 'Type V', desc: '棕色肤色，很少晒伤', color: '#784212' },
  6: { name: 'Type VI', desc: '深棕/黑色肤色', color: '#2E1503' },
};

const CLINICAL_METRICS = [
  { key: 'hydration',   label: '水分含量',   en: 'Hydration' },
  { key: 'oilBalance',  label: '油脂平衡',   en: 'Oil Balance' },
  { key: 'smoothness',  label: '光滑细腻度', en: 'Smoothness' },
  { key: 'pores',       label: '毛孔状态',   en: 'Pore Condition' },
  { key: 'evenness',    label: '肤色匀净度', en: 'Evenness' },
  { key: 'elasticity',  label: '弹性与紧致', en: 'Elasticity' },
  { key: 'sensitivity', label: '敏感耐受性', en: 'Sensitivity' },
  { key: 'gloss',       label: '光泽透亮度', en: 'Luminosity' },
  { key: 'barrier',     label: '皮肤屏障',   en: 'Barrier Integrity' },
  { key: 'glycation',   label: '糖化程度',   en: 'Glycation' },
  { key: 'inflammation',label: '炎症反应',   en: 'Inflammation' },
] as const;

const ReportView: React.FC<ReportViewProps> = ({ report, onBack, language, onToggleLanguage }) => {
  const [activePage, setActivePage] = useState<1 | 2>(1);
  const t = translations[language];

  const radarData = [
    { subject: '健康度', A: report.radarMetrics.health, fullMark: 100 },
    { subject: '细腻度', A: report.radarMetrics.texture, fullMark: 100 },
    { subject: '干油性', A: report.radarMetrics.oilDry, fullMark: 100 },
    { subject: '匀净度', A: report.radarMetrics.evenness, fullMark: 100 },
    { subject: '年轻度', A: report.radarMetrics.youth, fullMark: 100 },
    { subject: '耐受性', A: report.radarMetrics.tolerance, fullMark: 100 },
  ];

  const darkCircleData = [
    { name: '色素型', value: report.detailedAnalysis.darkCircles.percentages.pigmented, color: '#AF9B60' },
    { name: '血管型', value: report.detailedAnalysis.darkCircles.percentages.vascular, color: '#E29595' },
    { name: '结构型', value: report.detailedAnalysis.darkCircles.percentages.structural, color: '#2D2422' },
  ];

  const fitz = fitzpatrickLabels[report.fitzpatrickType] ?? fitzpatrickLabels[3];

  // 动态 AI 洞察：从真实指标中提炼
  const weakMetrics = CLINICAL_METRICS
    .filter(m => report.metrics[m.key]?.score < 60)
    .slice(0, 2);
  const strongMetrics = CLINICAL_METRICS
    .filter(m => report.metrics[m.key]?.score >= 80)
    .slice(0, 1);
  const barrierScore = report.metrics.barrier?.score ?? 0;
  const inflammationScore = report.metrics.inflammation?.score ?? 0;

  return (
    <div className="animate-fade space-y-12 pb-24">
      {/* 顶部控制栏 */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="flex bg-white/50 backdrop-blur-md p-1.5 rounded-full border border-white shadow-sm">
          <button
            onClick={() => setActivePage(1)}
            className={`px-8 py-3 rounded-full text-[10px] font-medium uppercase tracking-widest transition-all flex items-center gap-2 ${activePage === 1 ? 'bg-[#2D2422] text-white shadow-lg' : 'text-[#2D2422]/40 hover:text-[#2D2422]'}`}
          >
            <LayoutGrid size={14} /> {t.comprehensiveReport}
          </button>
          <button
            onClick={() => setActivePage(2)}
            className={`px-8 py-3 rounded-full text-[10px] font-medium uppercase tracking-widest transition-all flex items-center gap-2 ${activePage === 2 ? 'bg-[#2D2422] text-white shadow-lg' : 'text-[#2D2422]/40 hover:text-[#2D2422]'}`}
          >
            <List size={14} /> {t.deepDetails}
          </button>
        </div>
        <div className="flex gap-4 items-center">
          <button
            onClick={onToggleLanguage}
            className="px-3 py-1.5 bg-white border border-[#E5E4E2] rounded-full text-[8px] lg:text-[10px] font-bold tracking-widest text-[#AF9B60] shadow-sm hover:shadow-md transition-all flex items-center gap-2"
          >
            <Languages size={14} /> {language === 'zh' ? 'EN' : '中文'}
          </button>
          <button className="p-4 bg-white rounded-full border border-[#E5E4E2] text-[#2D2422] hover:text-[#AF9B60] transition-all shadow-sm">
            <Share2 size={18} />
          </button>
          <button
            onClick={onBack}
            className="px-8 py-4 bg-[#2D2422] text-white rounded-full font-medium uppercase tracking-widest text-[10px] shadow-xl hover:bg-black transition-all flex items-center gap-3"
          >
            <RefreshCw size={14} /> {t.reScan}
          </button>
        </div>
      </div>

      {activePage === 1 ? (
        <div className="grid grid-cols-12 gap-8 lg:gap-12">
          {/* 左侧：核心视觉与雷达图 */}
          <div className="col-span-12 lg:col-span-5 space-y-8">
            <div className="glass-card p-8 lg:p-12 rounded-[3rem] border-2 border-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Sparkles size={120} />
              </div>
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h3 className="text-3xl font-serif italic text-[#2D2422]">{t.comprehensiveScore}</h3>
                  <p className="text-[10px] text-[#AF9B60] font-medium uppercase tracking-widest mt-1">Comprehensive Score</p>
                </div>
                <div className="text-6xl font-serif text-[#2D2422]">{report.totalScore}</div>
              </div>

              <div className="h-64 lg:h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#E5E4E2" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#2D2422', fontSize: 10, fontWeight: '400' }} />
                    <Radar name="Skin" dataKey="A" stroke="#AF9B60" fill="#AF9B60" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-4 border-t border-[#E5E4E2] pt-8">
                <div className="text-center">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">肤色类型</p>
                  <p className="text-sm font-serif italic text-[#2D2422] mt-1">{report.detailedAnalysis.skinTone}</p>
                </div>
                <div className="text-center border-x border-[#E5E4E2]">
                  <p className="text-[8px] font-medium text-slate-400 uppercase tracking-widest">光滑度</p>
                  <p className="text-sm font-serif italic text-[#2D2422] mt-1">{report.detailedAnalysis.smoothnessMetaphor}</p>
                </div>
                <div className="text-center">
                  <p className="text-[8px] font-medium text-slate-400 uppercase tracking-widest">Baumann</p>
                  <p className="text-sm font-serif italic text-[#E89B93] mt-1">{report.baumannType.code}</p>
                </div>
              </div>
            </div>

            {/* Baumann 详细解读 */}
            <div className="glass-card p-8 rounded-[3rem] border-2 border-white shadow-xl space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <FlaskConical size={16} className="text-[#AF9B60]" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#2D2422]">Baumann 肤质解读</h3>
              </div>
              <p className="text-xl font-serif italic text-[#E89B93]">{report.baumannType.code} — {report.baumannType.name}</p>
              <p className="text-xs text-slate-500 leading-relaxed font-serif-sc">{report.baumannType.description}</p>
              {/* Fitzpatrick */}
              <div className="flex items-center gap-4 pt-4 border-t border-[#E5E4E2]">
                <div className="w-8 h-8 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: fitz.color }} />
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Fitzpatrick {fitz.name}</p>
                  <p className="text-xs text-[#2D2422] font-serif-sc">{fitz.desc}</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-8 rounded-[3rem] border-2 border-white shadow-xl space-y-8">
              <h3 className="text-xl font-serif italic text-[#2D2422]">出油分布 / Oil Distribution</h3>
              <div className="space-y-6">
                <MetricBar label="T区 (T-Zone)" score={report.detailedAnalysis.zonalOil.tZone} italicLabel={report.detailedAnalysis.zonalOil.tZone > 60 ? "偏油" : "平衡"} />
                <MetricBar label="脸颊 (Cheeks)" score={report.detailedAnalysis.zonalOil.cheeks} italicLabel={report.detailedAnalysis.zonalOil.cheeks > 60 ? "偏油" : "平衡"} />
                <MetricBar label="下巴 (Chin)" score={report.detailedAnalysis.zonalOil.chin} italicLabel={report.detailedAnalysis.zonalOil.chin > 60 ? "偏油" : "平衡"} />
              </div>
            </div>
          </div>

          {/* 右侧：详细指标与建议 */}
          <div className="col-span-12 lg:col-span-7 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card p-8 rounded-[2.5rem] border border-white shadow-lg">
                <div className="flex items-center gap-3 text-[#E29595] mb-4">
                  <AlertCircle size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">黑眼圈分析</span>
                </div>
                <p className="text-xl font-serif italic text-[#2D2422] mb-2">{report.detailedAnalysis.darkCircles.type}</p>
                <p className="text-xs text-slate-500 leading-relaxed font-serif-sc">
                  主要由{report.detailedAnalysis.darkCircles.percentages.pigmented > 40 ? '黑色素沉着' : '血管扩张'}引起，建议针对性修护。
                </p>
              </div>
              <div className="glass-card p-8 rounded-[2.5rem] border border-white shadow-lg">
                <div className="flex items-center gap-3 text-[#AF9B60] mb-4">
                  <Target size={18} />
                  <span className="text-[10px] font-medium uppercase tracking-widest">痤疮/痘痘状态</span>
                </div>
                <p className="text-xl font-serif italic text-[#2D2422] mb-2">Level {report.detailedAnalysis.acne.level}</p>
                <p className="text-xs text-slate-500 leading-relaxed font-serif-sc">
                  检测到 {report.detailedAnalysis.acne.count} 处活跃区域。状态：{report.detailedAnalysis.acne.severity}。
                </p>
              </div>
            </div>

            {/* 核心问题 + 成因 */}
            <div className="glass-card p-10 rounded-[3rem] border-2 border-white shadow-xl">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 bg-[#2D2422] rounded-2xl flex items-center justify-center text-white">
                  <Sparkles size={24} />
                </div>
                <h3 className="text-2xl font-serif italic text-[#2D2422]">护肤专家建议</h3>
              </div>
              <div className="space-y-8">
                {report.problems.map((p, i) => (
                  <div key={i} className="border-l-2 border-[#AF9B60] pl-6 py-2">
                    <h4 className="text-lg font-serif italic text-[#2D2422] mb-1">{p.title}</h4>
                    <p className="text-[10px] text-[#E29595] mb-2 font-medium uppercase tracking-widest">成因 — {p.cause}</p>
                    <p className="text-xs text-slate-500 mb-4 font-serif-sc">{p.suggestion}</p>
                    <div className="flex flex-wrap gap-2">
                      {p.actives.map(a => (
                        <span key={a} className="px-3 py-1 bg-[#FDE2E4]/30 rounded-full text-[8px] font-medium text-[#E29595] uppercase tracking-widest">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 推荐产品 */}
            {report.recommendations && (
              <div className="space-y-6">
                <div className="flex items-center justify-between px-4">
                  <h3 className="text-xl font-serif italic text-[#2D2422]">专属配方推荐</h3>
                  <ShoppingBag size={20} className="text-[#AF9B60]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {report.recommendations.slice(0, 4).map(product => (
                    <div key={product.id} className="bg-white p-6 rounded-[2.5rem] border border-[#FDE2E4] shadow-md flex gap-4 items-center">
                      <img src={product.imageUrl} className="w-20 h-20 rounded-2xl object-cover" alt={product.name} referrerPolicy="no-referrer" />
                      <div className="flex-1">
                        <p className="text-[8px] font-medium text-[#AF9B60] uppercase tracking-widest">{product.brand}</p>
                        <h4 className="text-sm font-serif text-[#2D2422] line-clamp-1">{product.name}</h4>
                        <p className="text-xs text-[#E89B93] mt-0.5">{product.price}</p>
                        <p className="text-[9px] text-slate-400 mt-1 line-clamp-2 font-serif-sc">{product.matchReason}</p>
                        <a href={product.buyUrl} className="text-[8px] font-medium text-[#2D2422] uppercase tracking-widest mt-1 block underline">立即选购</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── 第二页：深度细节 ── */
        <div className="grid grid-cols-12 gap-8 lg:gap-12">
          {/* 左列 */}
          <div className="col-span-12 lg:col-span-6 space-y-8">
            {/* 区域评分地图 */}
            <div className="glass-card p-10 rounded-[3rem] border-2 border-white shadow-2xl relative overflow-hidden">
              <h3 className="text-2xl font-serif italic text-[#2D2422] mb-10">区域评分地图 / Area Map</h3>
              <div className="relative aspect-square max-w-sm mx-auto">
                <div className="absolute inset-0 bg-[#FDE2E4]/20 rounded-full flex items-center justify-center">
                  <div className="relative w-full h-full">
                    <div className="absolute top-[15%] left-1/2 -translate-x-1/2 text-center">
                      <div className="text-2xl font-serif text-[#2D2422]">{report.areaScores.forehead}</div>
                      <div className="text-[8px] font-medium text-[#AF9B60] uppercase tracking-widest">额头</div>
                    </div>
                    <div className="absolute top-[35%] left-[25%] text-center">
                      <div className="text-2xl font-serif text-[#2D2422]">{report.areaScores.eyes}</div>
                      <div className="text-[8px] font-medium text-[#AF9B60] uppercase tracking-widest">眼周</div>
                    </div>
                    <div className="absolute top-[35%] right-[25%] text-center">
                      <div className="text-2xl font-serif text-[#2D2422]">{report.areaScores.eyes}</div>
                      <div className="text-[8px] font-medium text-[#AF9B60] uppercase tracking-widest">眼周</div>
                    </div>
                    <div className="absolute top-[45%] left-1/2 -translate-x-1/2 text-center">
                      <div className="text-2xl font-serif text-[#2D2422]">{report.areaScores.nose}</div>
                      <div className="text-[8px] font-medium text-[#AF9B60] uppercase tracking-widest">鼻部</div>
                    </div>
                    <div className="absolute top-[55%] left-[15%] text-center">
                      <div className="text-2xl font-serif text-[#2D2422]">{report.areaScores.cheeks}</div>
                      <div className="text-[8px] font-medium text-[#AF9B60] uppercase tracking-widest">左脸</div>
                    </div>
                    <div className="absolute top-[55%] right-[15%] text-center">
                      <div className="text-2xl font-serif text-[#2D2422]">{report.areaScores.cheeks}</div>
                      <div className="text-[8px] font-medium text-[#AF9B60] uppercase tracking-widest">右脸</div>
                    </div>
                    <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 text-center">
                      <div className="text-2xl font-serif text-[#2D2422]">{report.areaScores.lips}</div>
                      <div className="text-[8px] font-medium text-[#AF9B60] uppercase tracking-widest">唇周</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 黑眼圈深度解析 */}
            <div className="glass-card p-10 rounded-[3rem] border-2 border-white shadow-xl">
              <h3 className="text-xl font-serif italic text-[#2D2422] mb-8">黑眼圈深度解析</h3>
              <div className="flex flex-col md:flex-row items-center gap-10">
                <div className="w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={darkCircleData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                        {darkCircleData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-4">
                  {darkCircleData.map(d => (
                    <div key={d.name} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                        <span className="text-xs font-medium text-[#2D2422]">{d.name}</span>
                      </div>
                      <span className="text-sm font-serif italic">{d.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 泛红 + 毛孔 */}
            <div className="glass-card p-10 rounded-[3rem] border-2 border-white shadow-xl space-y-10">
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-[#E29595]">
                  <Thermometer size={18} />
                  <h4 className="text-sm font-bold uppercase tracking-widest">泛红与敏感区域</h4>
                </div>
                <div className="flex flex-wrap gap-3">
                  {report.detailedAnalysis.redness.areas.map(area => (
                    <span key={area} className="px-5 py-2 bg-white rounded-full border border-[#FDE2E4] text-[10px] font-bold text-[#3C2A21] shadow-sm">
                      {area}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-500 italic font-serif-sc">严重程度：{report.detailedAnalysis.redness.severity}</p>
              </div>
              <div className="h-[1px] bg-[#E5E4E2] w-full" />
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-[#AF9B60]">
                  <Sun size={18} />
                  <h4 className="text-sm font-medium uppercase tracking-widest">黑头与毛孔分析</h4>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 bg-slate-50 rounded-3xl">
                    <p className="text-[8px] font-medium text-slate-400 uppercase tracking-widest mb-1">黑头数量</p>
                    <p className="text-2xl font-serif text-[#2D2422]">{report.detailedAnalysis.blackheads.count}</p>
                    <p className="text-[8px] text-[#AF9B60] font-medium uppercase mt-1">{report.detailedAnalysis.blackheads.severity}</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-3xl">
                    <p className="text-[8px] font-medium text-slate-400 uppercase tracking-widest mb-1">毛孔等级</p>
                    <p className="text-2xl font-serif text-[#2D2422]">{report.detailedAnalysis.pores.level}</p>
                    <p className="text-[8px] text-[#AF9B60] font-medium uppercase mt-1">Pore Grade</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-serif-sc italic">
                  {report.detailedAnalysis.pores.description}
                </p>
              </div>
            </div>
          </div>

          {/* 右列 */}
          <div className="col-span-12 lg:col-span-6 space-y-8">
            {/* 11项临床维度评分 — 核心新增 */}
            <div className="glass-card p-10 rounded-[3rem] border-2 border-white shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 bg-[#AF9B60] rounded-2xl flex items-center justify-center text-white">
                  <Gauge size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-serif italic text-[#2D2422]">11项临床维度评分</h3>
                  <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">Clinical Metric Panel</p>
                </div>
              </div>
              <div className="divide-y divide-[#E5E4E2]/40">
                {CLINICAL_METRICS.map(m => (
                  report.metrics[m.key] && (
                    <ClinicalMetricRow
                      key={m.key}
                      metricKey={m.key}
                      label={m.label}
                      enLabel={m.en}
                      data={report.metrics[m.key]}
                    />
                  )
                ))}
              </div>
            </div>

            {/* 护肤流程 */}
            {report.skincareRoutine && report.skincareRoutine.length > 0 && (
              <div className="glass-card p-10 rounded-[3rem] border-2 border-white shadow-xl">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-10 h-10 bg-[#FDE2E4] rounded-2xl flex items-center justify-center">
                    <Layers size={20} className="text-[#E29595]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif italic text-[#2D2422]">定制护肤流程</h3>
                    <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">Personalized Routine</p>
                  </div>
                </div>
                <ol className="space-y-4">
                  {report.skincareRoutine.map((step, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <span className="w-6 h-6 rounded-full bg-[#2D2422] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed font-serif-sc">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* AI 深度洞察（动态数据） */}
            <div className="bg-[#2D2422] p-10 rounded-[3rem] text-white space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Zap size={60} />
              </div>
              <h3 className="text-xl font-serif italic">AI 深度洞察</h3>
              <div className="space-y-4">
                {barrierScore < 60 && (
                  <div className="flex items-start gap-3">
                    <Shield size={14} className="text-[#E29595] mt-0.5 shrink-0" />
                    <p className="text-sm text-white/80 leading-relaxed font-serif-sc">
                      皮肤屏障评分仅 {barrierScore}，处于受损状态。当前护肤重心应转向屏障修护，建议优先使用神经酰胺（Ceramide）与烟酰胺（Niacinamide）类成分。
                    </p>
                  </div>
                )}
                {inflammationScore < 60 && (
                  <div className="flex items-start gap-3">
                    <Flame size={14} className="text-[#E89B93] mt-0.5 shrink-0" />
                    <p className="text-sm text-white/80 leading-relaxed font-serif-sc">
                      炎症指数偏高（{inflammationScore}），提示皮肤处于亚健康炎症状态。建议规避含酒精、人工香料的产品，并加强抗炎成分的摄入。
                    </p>
                  </div>
                )}
                {weakMetrics.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Activity size={14} className="text-[#AF9B60] mt-0.5 shrink-0" />
                    <p className="text-sm text-white/80 leading-relaxed font-serif-sc">
                      重点改善方向：{weakMetrics.map(m => m.label).join('、')}。
                      {weakMetrics[0] && report.metrics[weakMetrics[0].key]?.analysis}
                    </p>
                  </div>
                )}
                {strongMetrics.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Award size={14} className="text-[#AF9B60] mt-0.5 shrink-0" />
                    <p className="text-sm text-white/70 leading-relaxed font-serif-sc">
                      优势维度：{strongMetrics[0].label}表现良好，继续保持当前护理方式。
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportView;
