import React, { useState, useEffect } from 'react';
import { View, SkinReport } from './types';
import { analyzeSkin } from './services/geminiService';
import { Sparkles, LayoutDashboard, History, Scan, Sun, Bell, Heart, MessageSquare, Zap, Languages } from 'lucide-react';
import { Language, translations } from './src/i18n';

// Components
import LoginView from './components/LoginView';
import HomeView from './components/HomeView';
import ScannerView from './components/ScannerView';
import LoadingView from './components/LoadingView';
import ReportView from './components/ReportView';
import HistoryView from './components/HistoryView';
import PrepView from './components/PrepView';
import ProcessingView from './components/ProcessingView';
import MentorView from './components/MentorView';
import RepairView from './components/RepairView';
import ArchivesView from './components/ArchivesView';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Login);
  const [reports, setReports] = useState<SkinReport[]>([]);
  const [currentReport, setCurrentReport] = useState<SkinReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysisPromise, setAnalysisPromise] = useState<Promise<SkinReport> | null>(null);
  const [isNewUser, setIsNewUser] = useState(true); // 新增：是否是新用户
  const [hasConsulted, setHasConsulted] = useState(false); // 新增：是否已咨询
  const [language, setLanguage] = useState<Language>('zh');

  const t = translations[language];

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'zh' ? 'en' : 'zh');
  };

  useEffect(() => {
    const saved = localStorage.getItem('aura_history');
    const isReturning = localStorage.getItem('aura_returning_user');
    
    if (isReturning) {
      setIsNewUser(false);
      setHasConsulted(true);
    }

    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setReports(parsed);
          return;
        }
      } catch (e) {}
    }
    
    // 如果没有保存的数据，初始化一些模拟数据用于展示成长曲线
    const mockReports: SkinReport[] = [
      {
        id: 'mock-1',
        timestamp: Date.now() - 86400000 * 12, // 12天前
        imageUrl: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?q=80&w=1000&auto=format&fit=crop',
        totalScore: 68,
        baumannType: { code: 'OSPW', name: '油性敏感色素性皱纹型', description: '需要控油与屏障修护' },
        fitzpatrickType: 3,
        radarMetrics: {
          health: 60,
          texture: 55,
          oilDry: 40,
          evenness: 50,
          youth: 65,
          tolerance: 45
        },
        detailedAnalysis: {
          zonalOil: { cheeks: 75, tZone: 85, chin: 80 },
          skinTone: '中性色调',
          smoothnessMetaphor: '蛋壳',
          darkCircles: {
            type: '血管型',
            percentages: { pigmented: 30, vascular: 60, structural: 10 }
          },
          acne: { level: 3, count: 12, severity: '中度炎症' },
          blackheads: { count: 45, severity: '明显' },
          pores: { level: 'T3', description: '毛孔明显扩张，伴有油脂堆积' },
          redness: { severity: '中度', areas: ['两颊', '鼻翼'] }
        },
        areaScores: { eyes: 62, nose: 55, cheeks: 58, lips: 70, forehead: 65 },
        metrics: {
          hydration: { score: 45, label: '干燥', analysis: '角质层水分流失严重' },
          oilBalance: { score: 85, label: '极油', analysis: '皮脂腺分泌旺盛' },
          smoothness: { score: 50, label: '粗糙', analysis: '纹理明显' },
          pores: { score: 40, label: '粗大', analysis: '毛孔明显' },
          evenness: { score: 55, label: '不均', analysis: '局部暗沉' },
          elasticity: { score: 60, label: '一般', analysis: '紧致度尚可' },
          sensitivity: { score: 80, label: '高敏', analysis: '屏障受损' },
          gloss: { score: 40, label: '暗淡', analysis: '缺乏光泽' },
          barrier: { score: 35, label: '受损', analysis: '屏障薄弱' },
          glycation: { score: 65, label: '较高', analysis: '糖化反应明显' },
          inflammation: { score: 70, label: '活跃', analysis: '有泛红迹象' }
        },
        problems: [{ title: '屏障受损', cause: '过度清洁', suggestion: '停用强力洁面，加强补水', actives: ['神经酰胺', '角鲨烷'] }],
        lightTherapy: { wavelength: '633nm', duration: '15min', frequency: '每日', color: 'Red', hex: '#FF0000' },
        skincareRoutine: ['温和洁面', '修护精华', '舒缓面霜'],
        recommendations: [
          {
            id: 'p1',
            name: '修丽可 CE 复合修护精华液',
            brand: 'SkinCeuticals',
            category: '精华',
            imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1000&auto=format&fit=crop',
            price: '¥1490',
            matchReason: '针对您的 OSPW 分型，高浓度维C能有效对抗氧化压力，改善色素沉着并提升屏障抵御力。',
            buyUrl: '#',
            tags: ['抗氧', '提亮', '专业线']
          }
        ]
      },
      {
        id: 'mock-2',
        timestamp: Date.now() - 86400000 * 8, // 8天前
        imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1000&auto=format&fit=crop',
        totalScore: 75,
        baumannType: { code: 'OSPW', name: '油性敏感色素性皱纹型', description: '持续修护中' },
        fitzpatrickType: 3,
        radarMetrics: {
          health: 70,
          texture: 65,
          oilDry: 55,
          evenness: 65,
          youth: 70,
          tolerance: 60
        },
        detailedAnalysis: {
          zonalOil: { cheeks: 60, tZone: 75, chin: 65 },
          skinTone: '中性色调',
          smoothnessMetaphor: '蛋壳',
          darkCircles: {
            type: '血管型',
            percentages: { pigmented: 25, vascular: 65, structural: 10 }
          },
          acne: { level: 2, count: 5, severity: '轻度炎症' },
          blackheads: { count: 25, severity: '中度' },
          pores: { level: 'T2', description: '毛孔有所收敛' },
          redness: { severity: '轻度', areas: ['鼻翼'] }
        },
        areaScores: { eyes: 68, nose: 65, cheeks: 70, lips: 75, forehead: 72 },
        metrics: {
          hydration: { score: 58, label: '改善', analysis: '水分开始回升' },
          oilBalance: { score: 70, label: '偏油', analysis: '油分有所控制' },
          smoothness: { score: 55, label: '一般', analysis: '纹理略有平滑' },
          pores: { score: 45, label: '一般', analysis: '毛孔略有收敛' },
          evenness: { score: 60, label: '改善', analysis: '肤色趋于均匀' },
          elasticity: { score: 65, label: '良好', analysis: '弹性提升' },
          sensitivity: { score: 60, label: '中敏', analysis: '泛红减少' },
          gloss: { score: 55, label: '一般', analysis: '光泽度回升' },
          barrier: { score: 50, label: '修护中', analysis: '屏障正在重建' },
          glycation: { score: 60, label: '中等', analysis: '糖化减缓' },
          inflammation: { score: 50, label: '稳定', analysis: '炎症消退' }
        },
        problems: [{ title: '水分不足', cause: '环境干燥', suggestion: '增加补水面膜频率', actives: ['透明质酸', '泛醇'] }],
        lightTherapy: { wavelength: '633nm', duration: '10min', frequency: '隔日', color: 'Red', hex: '#FF0000' },
        skincareRoutine: ['氨基酸洁面', '玻尿酸精华', '修护乳液'],
        recommendations: [
          {
            id: 'p3',
            name: '雅诗兰黛 特润修护肌活精华露 (小棕瓶)',
            brand: 'Estée Lauder',
            category: '精华',
            imageUrl: 'https://images.unsplash.com/photo-1594465919760-441fe5908ab0?q=80&w=1000&auto=format&fit=crop',
            price: '¥660',
            matchReason: '您的水分回升趋势良好，小棕瓶能进一步强化夜间修护，维持水油平衡。',
            buyUrl: '#',
            tags: ['修护', '维稳', '经典']
          }
        ]
      },
      {
        id: 'mock-3',
        timestamp: Date.now() - 86400000 * 3, // 3天前
        imageUrl: 'https://images.unsplash.com/photo-1552668693-d07cba4621d0?q=80&w=1000&auto=format&fit=crop',
        totalScore: 88,
        baumannType: { code: 'ONPW', name: '油性耐受色素性皱纹型', description: '状态趋于稳定' },
        fitzpatrickType: 3,
        radarMetrics: {
          health: 85,
          texture: 88,
          oilDry: 80,
          evenness: 85,
          youth: 90,
          tolerance: 82
        },
        detailedAnalysis: {
          zonalOil: { cheeks: 50, tZone: 60, chin: 55 },
          skinTone: '中性色调',
          smoothnessMetaphor: '剥壳鸡蛋',
          darkCircles: {
            type: '轻微',
            percentages: { pigmented: 20, vascular: 20, structural: 60 }
          },
          acne: { level: 0, count: 0, severity: '无' },
          blackheads: { count: 5, severity: '极轻微' },
          pores: { level: 'T1', description: '毛孔细致' },
          redness: { severity: '无', areas: [] }
        },
        areaScores: { eyes: 85, nose: 82, cheeks: 88, lips: 90, forehead: 86 },
        metrics: {
          hydration: { score: 72, label: '充足', analysis: '水分状态理想' },
          oilBalance: { score: 55, label: '平衡', analysis: '水油趋于平衡' },
          smoothness: { score: 70, label: '细腻', analysis: '皮肤触感平滑' },
          pores: { score: 65, label: '细致', analysis: '毛孔不明显' },
          evenness: { score: 75, label: '均匀', analysis: '肤色透亮' },
          elasticity: { score: 80, label: '优秀', analysis: '饱满有弹性' },
          sensitivity: { score: 30, label: '耐受', analysis: '屏障功能健全' },
          gloss: { score: 78, label: '透亮', analysis: '自然光泽感' },
          barrier: { score: 82, label: '健康', analysis: '屏障强韧' },
          glycation: { score: 40, label: '低', analysis: '抗糖化效果显著' },
          inflammation: { score: 20, label: '极低', analysis: '肤态非常稳定' }
        },
        problems: [{ title: '维持现状', cause: '作息规律', suggestion: '保持当前护肤习惯', actives: ['维C', '烟酰胺'] }],
        lightTherapy: { wavelength: '590nm', duration: '5min', frequency: '每周', color: 'Yellow', hex: '#FFFF00' },
        skincareRoutine: ['常规清洁', '抗氧精华', '清爽面霜'],
        recommendations: [
          {
            id: 'p4',
            name: 'SK-II 护肤精华露 (神仙水)',
            brand: 'SK-II',
            category: '精华',
            imageUrl: 'https://images.unsplash.com/photo-1617897903246-719242758050?q=80&w=1000&auto=format&fit=crop',
            price: '¥1540',
            matchReason: '您的肌肤已进入健康平衡态，Pitera成分能维持晶莹剔透的质感，保持屏障强韧。',
            buyUrl: '#',
            tags: ['晶莹', '平衡', '贵妇']
          }
        ]
      }
    ];
    setReports(mockReports);
  }, []);

  useEffect(() => {
    localStorage.setItem('aura_history', JSON.stringify(reports));
  }, [reports]);

  const handleStartScan = () => {
    if (!hasConsulted && !isNewUser) {
      setError("在扫描前，请先与 LUMSUE 进行简短咨询。");
      setCurrentView(View.Mentor);
      return;
    }
    setCurrentView(View.Prep);
  };
  const handleViewHistory = () => setCurrentView(View.History);
  const handleBackToHome = () => setCurrentView(View.Mentor);
  const handleLogin = () => {
    setCurrentView(View.Mentor);
    localStorage.setItem('aura_returning_user', 'true');
  };

  const handleScanComplete = (base64Image: string) => {
    setCapturedImage(base64Image);
    // 立即开始分析，与动画并行
    setAnalysisPromise(analyzeSkin(base64Image));
    setCurrentView(View.Processing);
  };

  const handleProcessingComplete = async () => {
    if (!analysisPromise) return;
    setIsLoading(true);
    setCurrentView(View.Loading);
    try {
      const report = await analysisPromise;
      setReports(prev => [report, ...prev]);
      setCurrentReport(report);
      setCurrentView(View.Report);
    } catch (err) {
      setError("临床分析暂时受阻，请确保光线均匀并重试。");
      setCurrentView(View.Mentor);
    } finally {
      setIsLoading(false);
      setCapturedImage(null);
      setAnalysisPromise(null);
    }
  };

  if (currentView === View.Login) return <LoginView onEnter={handleLogin} />;
  if (currentView === View.Prep) return <PrepView onConfirm={() => setCurrentView(View.Scanner)} onCancel={handleBackToHome} />;
  if (currentView === View.Scanner) return <ScannerView onCapture={handleScanComplete} onCancel={handleBackToHome} />;

  return (
    <div className="flex h-screen w-full bg-[#FFF0F1] overflow-hidden font-sans selection:bg-[#E29595] selection:text-white flex-col lg:flex-row">
      {/* Sidebar Navigation - Desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-[#E5E4E2] bg-white/60 backdrop-blur-2xl z-50">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#AF9B60] to-[#D4C5B3] rounded-full flex items-center justify-center text-white shadow-lg shadow-[#AF9B60]/20">
            <Sparkles size={20} />
          </div>
          <span className="text-xl font-serif italic tracking-wider text-[#2D2422]">LUMSUE</span>
        </div>
        
        <nav className="flex-1 px-5 space-y-3 pt-8">
          <button 
            onClick={() => setCurrentView(View.Mentor)}
            className={`w-full flex items-center gap-5 px-6 py-4 rounded-2xl transition-all ${currentView === View.Mentor ? 'bg-white shadow-lg border-platinum text-[#AF9B60]' : 'text-slate-400 hover:text-[#AF9B60]'}`}
          >
            <MessageSquare size={20} />
            <span className="text-sm font-medium uppercase tracking-[0.2em]">护肤导师</span>
          </button>
          <button 
            onClick={handleStartScan}
            className={`w-full flex items-center gap-5 px-6 py-4 rounded-2xl transition-all ${currentView === View.Scanner || currentView === View.Prep || currentView === View.Loading ? 'bg-white shadow-lg border-platinum text-[#AF9B60]' : 'text-slate-400 hover:text-[#AF9B60]'}`}
          >
            <Scan size={20} />
            <span className="text-sm font-medium uppercase tracking-[0.2em]">肤质扫描</span>
          </button>
          <button 
            onClick={handleViewHistory}
            className={`w-full flex items-center gap-5 px-6 py-4 rounded-2xl transition-all ${currentView === View.History || currentView === View.Repair ? 'bg-white shadow-lg border-platinum text-[#AF9B60]' : 'text-slate-400 hover:text-[#AF9B60]'}`}
          >
            <History size={20} />
            <span className="text-sm font-medium uppercase tracking-[0.2em]">美肤档案</span>
          </button>
        </nav>

        <div className="p-6 mt-auto border-t border-[#E5E4E2]/50">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/40 border border-[#AF9B60]/20">
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FEE9E9] to-[#D4C5B3] flex items-center justify-center text-white text-[10px] font-medium border-2 border-white shadow-sm">SC</div>
             <div>
               <p className="text-[10px] font-semibold text-[#2D2422]">Sophia Chen</p>
               <p className="text-[8px] text-slate-400 uppercase tracking-widest font-medium">Atelier Elite</p>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col relative overflow-y-auto pb-24 lg:pb-0">
        {currentView !== View.Mentor && (
          <header className="h-20 lg:h-24 px-6 lg:px-12 flex items-center justify-between sticky top-0 bg-[#FFF4F4]/80 backdrop-blur-xl z-40 border-b border-[#E5E4E2]/30">
             <div className="animate-fade">
               <h1 className="text-xl lg:text-3xl font-serif text-[#2D2422] italic">
                 {currentView === View.Mentor ? '护肤导师' : (currentView === View.History || currentView === View.Repair) ? '美肤档案' : currentView === View.Loading ? '分析中' : '检测报告'}
               </h1>
               <p className="text-[8px] lg:text-[10px] text-[#AF9B60] uppercase tracking-[0.4em] mt-1 font-medium">
                 {new Date().toLocaleDateString('zh-CN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
               </p>
             </div>
             <div className="flex items-center gap-3 lg:gap-6">
               <button 
                 onClick={toggleLanguage}
                 className="px-3 py-1.5 bg-white border border-[#E5E4E2] rounded-full text-[8px] lg:text-[10px] font-bold tracking-widest text-[#AF9B60] shadow-sm hover:shadow-md transition-all flex items-center gap-2"
               >
                 <Languages size={14} /> {language === 'zh' ? 'EN' : '中文'}
               </button>
               <button className="p-2 lg:p-3 rounded-full hover:bg-white transition-all text-[#AF9B60]"><Sun size={18} className="lg:w-5 lg:h-5" /></button>
               <button className="p-2 lg:p-3 rounded-full hover:bg-white transition-all text-slate-400"><Bell size={18} className="lg:w-5 lg:h-5" /></button>
               <div className="h-6 lg:h-8 w-px bg-[#E5E4E2]"></div>
               <button className="px-4 lg:px-6 py-2 lg:py-2.5 bg-white border border-[#E5E4E2] rounded-full text-[8px] lg:text-[10px] font-medium tracking-[0.2em] text-[#AF9B60] shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                 <Heart size={12} fill="currentColor" className="opacity-50 lg:w-3.5 lg:h-3.5" /> <span className="hidden sm:inline">尊享权益</span>
               </button>
             </div>
          </header>
        )}

        <div className={`flex-1 ${currentView === View.Mentor ? 'p-0' : 'p-6 lg:p-12'} max-w-7xl mx-auto w-full h-full flex flex-col`}>
           {currentView === View.Processing && capturedImage && <ProcessingView base64Image={capturedImage} onComplete={handleProcessingComplete} />}
           {currentView === View.Loading && <LoadingView />}
           {currentView === View.Mentor && <MentorView isNewUser={isNewUser} lastReport={reports[0]} onNavigate={setCurrentView} onStartScan={handleStartScan} language={language} onToggleLanguage={toggleLanguage} />}
           {(currentView === View.History || currentView === View.Repair) && (
             <ArchivesView 
               reports={reports} 
               onViewReport={(r) => { setCurrentReport(r); setCurrentView(View.Report); }} 
               onDeleteReport={(id) => setReports(prev => prev.filter(r => r.id !== id))} 
               onBack={handleBackToHome} 
               initialTab={currentView === View.Repair ? 'repair' : 'history'}
               language={language}
             />
           )}
           {currentView === View.Report && currentReport && (
             <ReportView 
               report={currentReport} 
               onBack={handleBackToHome} 
               language={language} 
               onToggleLanguage={toggleLanguage}
             />
           )}
        </div>
      </main>

      {/* Bottom Navigation - Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-2xl border-t border-[#E5E4E2]/50 flex items-center justify-around px-6 z-50">
        <button 
          onClick={() => setCurrentView(View.Mentor)}
          className={`flex flex-col items-center gap-1 transition-all ${currentView === View.Mentor ? 'text-[#AF9B60]' : 'text-slate-400'}`}
        >
          <MessageSquare size={20} />
          <span className="text-[8px] font-medium uppercase tracking-widest">导师</span>
        </button>
        <button 
          onClick={handleStartScan}
          className={`flex flex-col items-center gap-1 transition-all ${currentView === View.Scanner || currentView === View.Prep || currentView === View.Loading ? 'text-[#AF9B60]' : 'text-slate-400'}`}
        >
          <div className="w-12 h-12 bg-gradient-to-br from-[#AF9B60] to-[#D4C5B3] rounded-full flex items-center justify-center text-white shadow-lg -mt-10 border-4 border-[#FFF4F4]">
            <Scan size={20} />
          </div>
          <span className="text-[8px] font-medium uppercase tracking-widest">扫描</span>
        </button>
        <button 
          onClick={handleViewHistory}
          className={`flex flex-col items-center gap-1 transition-all ${currentView === View.History || currentView === View.Repair ? 'text-[#AF9B60]' : 'text-slate-400'}`}
        >
          <History size={20} />
          <span className="text-[8px] font-medium uppercase tracking-widest">档案</span>
        </button>
      </nav>

      {error && (
        <div className="fixed bottom-24 lg:bottom-12 right-6 lg:right-12 bg-white/95 backdrop-blur-xl border-l-4 border-[#AF9B60] px-6 lg:px-8 py-4 lg:py-5 rounded shadow-2xl z-[200] animate-fade max-w-[calc(100vw-3rem)]">
          <p className="text-[8px] lg:text-[10px] font-medium uppercase tracking-widest mb-1 text-[#AF9B60]">系统提示</p>
          <p className="text-xs lg:text-sm font-serif-sc text-slate-700">{error}</p>
          <button onClick={() => setError(null)} className="mt-3 text-[8px] lg:text-[10px] underline uppercase tracking-widest font-medium text-[#AF9B60]">确认</button>
        </div>
      )}
    </div>
  );
};

export default App;