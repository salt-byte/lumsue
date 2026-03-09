import React, { useState } from 'react';
import { SkinReport } from '../types';
import HistoryView from './HistoryView';
import RepairView from './RepairView';
import { motion, AnimatePresence } from 'motion/react';
import { History, Zap, Sparkles } from 'lucide-react';

import { Language, translations } from '../src/i18n';

interface ArchivesViewProps {
  reports: SkinReport[];
  onViewReport: (report: SkinReport) => void;
  onDeleteReport: (id: string) => void;
  onBack: () => void;
  initialTab?: 'history' | 'repair';
  language: Language;
}

const ArchivesView: React.FC<ArchivesViewProps> = ({ reports, onViewReport, onDeleteReport, onBack, initialTab = 'history', language }) => {
  const [activeTab, setActiveTab] = useState<'history' | 'repair'>(initialTab);
  const t = translations[language];

  return (
    <div className="flex flex-col gap-10 animate-fade pb-20">
      {/* Tabs Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#AF9B60]/20 pb-6">
        <div className="flex p-1.5 bg-white/40 backdrop-blur-xl rounded-full border border-[#AF9B60]/10 shadow-inner">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-3 px-8 py-3 rounded-full text-[10px] font-medium uppercase tracking-widest transition-all ${
              activeTab === 'history' 
                ? 'bg-[#AF9B60] text-white shadow-lg' 
                : 'text-slate-400 hover:text-[#AF9B60]'
            }`}
          >
            <History size={16} />
            {t.history}
          </button>
          <button
            onClick={() => setActiveTab('repair')}
            className={`flex items-center gap-3 px-8 py-3 rounded-full text-[10px] font-medium uppercase tracking-widest transition-all ${
              activeTab === 'repair' 
                ? 'bg-[#AF9B60] text-white shadow-lg' 
                : 'text-slate-400 hover:text-[#AF9B60]'
            }`}
          >
            <Zap size={16} />
            {t.repair}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {activeTab === 'history' ? (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <HistoryView 
                reports={reports} 
                onView={onViewReport} 
                onDelete={onDeleteReport} 
                onBack={onBack} 
              />
            </motion.div>
          ) : (
            <motion.div
              key="repair"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <RepairView 
                lastReport={reports[0] || null} 
                language={language}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Decoration */}
      <div className="mt-20 flex flex-col items-center gap-4 opacity-20">
        <Sparkles size={24} className="text-[#AF9B60]" />
        <div className="w-24 h-px bg-[#AF9B60]"></div>
        <p className="text-[10px] uppercase tracking-[0.5em] text-[#AF9B60] font-medium">Éclat Aesthetics</p>
      </div>
    </div>
  );
};

export default ArchivesView;
