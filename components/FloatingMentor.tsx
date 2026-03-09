import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { mentorChat } from '../services/geminiService';
import { SkinReport, ChatMessage } from '../types';

const MENTOR_AVATAR = "https://i.postimg.cc/52TSzTqX/Generated-Image-March-07-2026-2-08PM.png";

interface FloatingMentorProps {
  lastReport: SkinReport | null;
  // 外部可直接传入一个问题（如报告页选中文字后触发）
  pendingQuestion?: string;
  onClearPending?: () => void;
}

const FloatingMentor: React.FC<FloatingMentorProps> = ({ lastReport, pendingQuestion, onClearPending }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 选中文字浮标
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
  const selectionTimer = useRef<NodeJS.Timeout>();

  // 监听文字选中
  useEffect(() => {
    const handleSelectionChange = () => {
      clearTimeout(selectionTimer.current);
      selectionTimer.current = setTimeout(() => {
        const sel = window.getSelection();
        const text = sel?.toString().trim();
        if (!text || text.length < 4) { setSelection(null); return; }
        const range = sel!.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelection({
          text,
          x: rect.left + rect.width / 2,
          y: rect.top - 12
        });
      }, 300);
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      clearTimeout(selectionTimer.current);
    };
  }, []);

  // 接收外部传入的待提问内容（如报告页点击某指标）
  useEffect(() => {
    if (pendingQuestion) {
      setOpen(true);
      sendMessage(pendingQuestion);
      onClearPending?.();
    }
  }, [pendingQuestion]);

  // 自动滚到底
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setSelection(null);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };
    setMessages(prev => {
      const next = [...prev, userMsg];
      // 异步发送，需要用 next
      (async () => {
        setIsTyping(true);
        try {
          const reply = await mentorChat(
            next.map(m => ({ role: m.role, content: m.content })),
            lastReport
          );
          setMessages(p => [...p, {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: reply,
            timestamp: Date.now()
          }]);
        } catch {
          setMessages(p => [...p, {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: '抱歉，连接实验室时出了点状况，请稍后再试。',
            timestamp: Date.now()
          }]);
        } finally {
          setIsTyping(false);
        }
      })();
      return next;
    });
    setInput('');
  }, [lastReport]);

  const handleSend = () => sendMessage(input);

  const handleAskSelection = () => {
    if (!selection) return;
    const question = `请帮我解读报告中的这段内容：「${selection.text}」`;
    setOpen(true);
    sendMessage(question);
  };

  return (
    <>
      {/* 选中文字后的浮动提示气泡 */}
      <AnimatePresence>
        {selection && !open && (
          <motion.button
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={handleAskSelection}
            className="fixed z-[300] -translate-x-1/2 -translate-y-full bg-[#2D2422] text-white text-[11px] font-medium px-4 py-2 rounded-full shadow-xl flex items-center gap-2 whitespace-nowrap"
            style={{ left: selection.x, top: selection.y }}
          >
            <img src={MENTOR_AVATAR} className="w-4 h-4 rounded-full object-cover" />
            询问 LUMSUE
          </motion.button>
        )}
      </AnimatePresence>

      {/* 悬浮球 */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-28 lg:bottom-10 right-5 lg:right-10 z-[200] w-14 h-14 rounded-full shadow-2xl overflow-hidden border-2 border-white/80 hover:scale-110 transition-transform"
            title="询问 LUMSUE 导师"
          >
            <img src={MENTOR_AVATAR} className="w-full h-full object-cover" />
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* 对话面板 */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-28 lg:bottom-10 right-5 lg:right-10 z-[200] w-[calc(100vw-2.5rem)] max-w-sm bg-white rounded-[2rem] shadow-2xl border border-[#E5E4E2] flex flex-col overflow-hidden"
            style={{ height: 480 }}
          >
            {/* 头部 */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[#F5F3F0] bg-gradient-to-r from-[#FFF0F1] to-white">
              <img src={MENTOR_AVATAR} className="w-9 h-9 rounded-full object-cover border-2 border-white shadow" />
              <div className="flex-1">
                <p className="text-sm font-serif italic text-[#2D2422]">LUMSUE 护肤导师</p>
                <p className="text-[9px] text-green-500 font-medium uppercase tracking-widest">● 在线咨询</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-full hover:bg-[#F5F3F0] text-[#2D2422]/40">
                <X size={16} />
              </button>
            </div>

            {/* 消息区 */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#FAFAFA]">
              {messages.length === 0 && (
                <div className="text-center pt-8 space-y-3">
                  <img src={MENTOR_AVATAR} className="w-16 h-16 rounded-full mx-auto object-cover border-4 border-white shadow-lg" />
                  <p className="text-sm font-serif italic text-[#2D2422]">您好，我是 LUMSUE</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed px-4">您可以直接选中报告中的任意文字询问我，或在此输入您的护肤问题。</p>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {msg.role === 'assistant' && (
                    <img src={MENTOR_AVATAR} className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5 border border-white shadow" />
                  )}
                  <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[12px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#2D2422] text-white rounded-tr-sm'
                      : 'bg-white text-[#2D2422] rounded-tl-sm shadow-sm border border-[#F0EEEC]'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-2 items-center">
                  <img src={MENTOR_AVATAR} className="w-7 h-7 rounded-full object-cover shrink-0 border border-white shadow" />
                  <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-[#F0EEEC] flex gap-1.5">
                    {[0, 0.15, 0.3].map(d => (
                      <div key={d} className="w-1.5 h-1.5 bg-[#AF9B60] rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 输入框 */}
            <div className="px-4 py-3 border-t border-[#F0EEEC] bg-white flex gap-2 items-end">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="输入护肤问题，或选中报告文字直接询问…"
                rows={1}
                className="flex-1 resize-none text-[12px] text-[#2D2422] placeholder:text-slate-300 bg-[#FAFAFA] border border-[#E5E4E2] rounded-xl px-3 py-2 focus:outline-none focus:border-[#AF9B60]"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="w-9 h-9 bg-[#2D2422] rounded-xl flex items-center justify-center text-white disabled:opacity-30 shrink-0"
              >
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingMentor;
