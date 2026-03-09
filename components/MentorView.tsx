import React, { useState, useEffect, useRef } from 'react';
import { View, SkinReport, ChatMessage } from '../types';
import { mentorChat } from '../services/geminiService';
import { 
  Send, Sparkles, User, Bot, ArrowRight, 
  Scan, History, ShieldCheck, Zap, ShoppingBag, 
  MessageSquare, LayoutDashboard, Heart, Languages
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language, translations } from '../src/i18n';

interface MentorViewProps {
  isNewUser: boolean;
  lastReport: SkinReport | null;
  onNavigate: (view: View) => void;
  onStartScan: () => void;
  language: Language;
  onToggleLanguage: () => void;
}

const MENTOR_AVATAR = "https://i.postimg.cc/52TSzTqX/Generated-Image-March-07-2026-2-08PM.png";

const MentorView: React.FC<MentorViewProps> = ({ isNewUser, lastReport, onNavigate, onStartScan, language, onToggleLanguage }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const t = translations[language];

  // 初始化欢迎语
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMsg: ChatMessage = {
        id: '1',
        role: 'assistant',
        content: isNewUser 
          ? "您好，我是 Éclat 实验室的首席护肤导师。很高兴能为您提供专业的皮肤学咨询。在开始深度诊断前，我们需要通过 AI 临床级扫描获取您的底层皮肤数据。您准备好开启首次肤质检测了吗？"
          : `欢迎回来。我是 Éclat，您的私人皮肤专家。我一直在关注您的皮肤屏障修复进度。今天，您是想针对具体的皮肤问题进行深度咨询，还是希望通过最新的扫描数据来优化您的护肤方案？`,
        timestamp: Date.now(),
        options: isNewUser 
          ? ["开始扫描", "了解 App 功能"] 
          : ["咨询皮肤问题", "更新皮肤状态", "查看美肤档案"]
      };
      setMessages([welcomeMsg]);
    }
  }, [isNewUser]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // 处理特殊指令
    if (text === "开始扫描" || text === "更新皮肤状态") {
      setTimeout(() => {
        onStartScan();
        setIsTyping(false);
      }, 1000);
      return;
    }

    if (text === "查看历史记录" || text === "查看美肤档案") {
      setTimeout(() => {
        onNavigate(View.History);
        setIsTyping(false);
      }, 1000);
      return;
    }

    try {
      const response = await mentorChat([...messages, userMsg], lastReport);
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response || "抱歉，我现在无法回应，请稍后再试。",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "抱歉，连接实验室服务器时出了点小状况。请检查您的网络连接，或稍后再试。",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderMessageContent = (content: string) => {
    // 匹配 "1. 动作名称：简短描述" 或 "1. 动作名称: 简短描述"
    const actionRegex = /(\d+)\.\s*([^：:]+)[：:]\s*([^0-9\n]+)/g;
    const actions: { id: string, title: string, description: string }[] = [];
    let match;

    while ((match = actionRegex.exec(content)) !== null) {
      actions.push({
        id: match[1],
        title: match[2].trim(),
        description: match[3].trim()
      });
    }

    if (actions.length === 0) return content;

    // 提取主要文本（列表之前的部分）
    const mainText = content.split(/\d+\.\s*[^：:]+[：:]/)[0].trim();
    // 提取列表之后的部分（如果有）
    const parts = content.split(/\d+\.\s*[^：:]+[：:][^0-9\n]+/);
    const trailingText = parts[parts.length - 1]?.trim();

    return (
      <div className="space-y-6 w-full">
        {mainText && <p className="leading-relaxed">{mainText}</p>}
        <div className="flex flex-col gap-3">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => {
                if (action.title.includes("修复") || action.title.includes("修护")) onNavigate(View.Repair);
                else if (action.title.includes("扫描") || action.title.includes("检测")) onStartScan();
                else if (action.title.includes("档案") || action.title.includes("记录")) onNavigate(View.History);
                else handleSend(action.title);
              }}
              className="flex items-center gap-4 p-4 bg-white/60 hover:bg-[#AF9B60]/10 border border-[#AF9B60]/20 rounded-2xl transition-all group text-left shadow-sm w-full"
            >
              <div className="w-8 h-8 rounded-full bg-[#AF9B60] text-white text-xs flex items-center justify-center font-bold shrink-0 shadow-sm">
                {action.id}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-[#2D2422] whitespace-nowrap overflow-hidden text-ellipsis">{action.title}</div>
                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 font-serif-sc italic opacity-80">{action.description}</p>
              </div>

              <div className="w-8 h-8 rounded-full bg-[#AF9B60]/5 flex items-center justify-center text-[#AF9B60] group-hover:bg-[#AF9B60] group-hover:text-white transition-all shrink-0">
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          ))}
        </div>
        {trailingText && trailingText !== mainText && <p className="leading-relaxed">{trailingText}</p>}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-transparent animate-fade">
      {/* Header - Integrated */}
      <div className="py-2 px-4 lg:py-3 lg:px-8 flex items-center justify-between border-b border-[#E5E4E2]/30 bg-white/40 backdrop-blur-xl">
        <div className="flex items-center gap-3 lg:gap-4">
          <div className="relative">
            <img 
              src={MENTOR_AVATAR} 
              className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg object-cover shadow-lg border-2 border-white"
              alt="Éclat"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
          </div>
          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg lg:text-xl font-serif italic text-[#2D2422] leading-tight">{t.mentorName}</h2>
            <p className="text-[7px] lg:text-[8px] text-[#AF9B60] uppercase tracking-[0.1em] font-bold opacity-70">{t.mentorTagline}</p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-8 lg:px-12 py-8 space-y-10 scroll-smooth"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-6 ${msg.role === 'user' ? 'max-w-[90%] lg:max-w-[80%] flex-row-reverse' : 'max-w-[95%] lg:max-w-[85%] flex-row w-full sm:w-auto'}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md overflow-hidden ${msg.role === 'user' ? 'bg-[#E29595] text-white' : 'bg-white border border-[#E5E4E2]'}`}>
                  {msg.role === 'user' ? <User size={20} /> : <img src={MENTOR_AVATAR} className="w-full h-full object-cover" />}
                </div>
                <div className="space-y-6">
                  <div className={`p-6 lg:p-8 rounded-[2.5rem] text-sm lg:text-base leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-[#E29595] text-white rounded-tr-none font-light' 
                      : 'bg-white/80 backdrop-blur-md text-slate-700 border border-white rounded-tl-none font-serif-sc font-light'
                  }`}>
                    {msg.role === 'assistant' ? renderMessageContent(msg.content) : msg.content}
                  </div>
                  
                  {msg.options && (
                    <div className="flex flex-wrap gap-4">
                      {msg.options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => handleSend(opt)}
                          className="px-6 py-2.5 bg-white/90 backdrop-blur-md border border-[#AF9B60]/30 rounded-full text-[10px] lg:text-[11px] font-medium text-[#AF9B60] uppercase tracking-[0.2em] hover:bg-[#AF9B60] hover:text-white transition-all shadow-sm"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="flex gap-6 items-center">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#E5E4E2] flex items-center justify-center overflow-hidden">
                <img src={MENTOR_AVATAR} className="w-full h-full object-cover" />
              </div>
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-[#AF9B60] rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-[#AF9B60] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 bg-[#AF9B60] rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 lg:p-6 bg-white/20 border-t border-white/10">
        <div className="relative flex items-center max-w-xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
            placeholder={t.inputPlaceholder}
            className="w-full pl-8 pr-20 py-4 bg-white/90 border border-white rounded-full text-sm focus:outline-none focus:ring-4 focus:ring-[#AF9B60]/10 transition-all shadow-xl"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isTyping}
            className="absolute right-3 p-3 bg-[#2D2422] text-white rounded-full hover:bg-black transition-all disabled:opacity-50 shadow-2xl"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MentorView;
