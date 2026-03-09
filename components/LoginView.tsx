import React, { useState } from 'react';
import { ArrowRight, Sparkles, Mail, Lock, Eye, EyeOff, Chrome, UserRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signIn, signUp, signInWithGoogle } from '../services/supabaseService';

interface LoginViewProps {
  onEnter: (mode: 'user' | 'guest') => void;
}

type AuthMode = 'login' | 'signup';

const LoginView: React.FC<LoginViewProps> = ({ onEnter }) => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('请填写邮箱和密码'); return; }
    setLoading(true);
    setError(null);
    try {
      if (authMode === 'login') {
        await signIn(email, password);
        onEnter('user');
      } else {
        await signUp(email, password);
        setSuccessMsg('注册成功！请检查邮箱完成验证，然后登录。');
        setAuthMode('login');
      }
    } catch (err: any) {
      const msg = err?.message ?? '操作失败，请稍后重试';
      if (msg.includes('Invalid login credentials')) setError('邮箱或密码不正确');
      else if (msg.includes('already registered')) setError('该邮箱已注册，请直接登录');
      else if (msg.includes('Password should be')) setError('密码至少 6 位');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // OAuth 会跳转，不需要手动 onEnter
    } catch (err: any) {
      setError(err?.message ?? 'Google 登录失败');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF0F1] flex items-center justify-center relative overflow-hidden font-sans selection:bg-[#E29595] selection:text-white">
      <div className="absolute inset-0 silk-overlay opacity-30 pointer-events-none" />
      <div className="absolute top-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-[#FDE2E4] rounded-full blur-[160px] opacity-70" />

      <div className="container max-w-7xl mx-auto px-6 lg:px-16 relative z-10 py-12 lg:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-0 items-center">

          {/* 左侧品牌文字 */}
          <motion.div
            className="lg:col-span-7 lg:pr-24 lg:text-left flex flex-col justify-center space-y-8 lg:space-y-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <div className="space-y-6 lg:space-y-10">
              <div className="flex items-center justify-center lg:justify-start gap-3 lg:gap-4 text-[#AF9B60]">
                <Sparkles size={24} strokeWidth={1} />
                <span className="text-xs lg:text-sm uppercase tracking-[0.4em] lg:tracking-[0.6em] font-light text-[#2D2422]">光彩艺术</span>
              </div>
              <div className="flex flex-col items-center lg:items-start">
                <h1 className="text-6xl md:text-8xl lg:text-[10rem] serif-heading leading-tight lg:leading-[1] text-[#2D2422]">
                  <span className="text-[#E29595] italic font-normal">LUMSUE</span>
                </h1>
                <div className="flex items-center justify-center lg:justify-start gap-4 lg:gap-6 mt-4">
                  <div className="w-8 lg:w-12 h-[1px] bg-[#AF9B60]" />
                  <span className="text-[10px] lg:text-[12px] uppercase tracking-[0.4em] lg:tracking-[0.5em] font-medium text-[#2D2422]/60">AI 肤质实验室</span>
                  <div className="w-8 lg:w-12 h-[1px] bg-[#AF9B60]" />
                </div>
              </div>
              <p className="max-w-md mx-auto lg:mx-0 text-sm lg:text-base serif-heading italic font-light leading-relaxed text-[#2D2422]/80 lg:text-left text-center">
                AI 驱动的专业肤质检测与个性化护肤方案。
              </p>
            </div>
          </motion.div>

          {/* 右侧登录卡片 */}
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="lg:col-span-5 flex justify-center lg:justify-end"
          >
            <div className="glass-card w-full max-w-md p-8 lg:p-12 rounded-[3rem] lg:rounded-[4rem] relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#FDE2E4] rounded-full blur-[80px] opacity-50" />

              <div className="relative z-10 space-y-8">
                {/* 标题 + 模式切换 */}
                <div className="text-center">
                  <h2 className="text-2xl lg:text-3xl serif-heading text-[#2D2422] mb-2 font-light">
                    {authMode === 'login' ? '会员登录' : '创建账户'}
                  </h2>
                  <div className="w-10 lg:w-12 h-[1px] bg-[#AF9B60] mx-auto mb-4" />
                  <div className="flex justify-center gap-1 bg-white/60 rounded-full p-1 w-fit mx-auto">
                    <button
                      onClick={() => { setAuthMode('login'); setError(null); setSuccessMsg(null); }}
                      className={`px-5 py-1.5 rounded-full text-[10px] font-medium uppercase tracking-widest transition-all ${authMode === 'login' ? 'bg-[#2D2422] text-white shadow' : 'text-[#2D2422]/40 hover:text-[#2D2422]'}`}
                    >
                      登录
                    </button>
                    <button
                      onClick={() => { setAuthMode('signup'); setError(null); setSuccessMsg(null); }}
                      className={`px-5 py-1.5 rounded-full text-[10px] font-medium uppercase tracking-widest transition-all ${authMode === 'signup' ? 'bg-[#2D2422] text-white shadow' : 'text-[#2D2422]/40 hover:text-[#2D2422]'}`}
                    >
                      注册
                    </button>
                  </div>
                </div>

                {/* 反馈消息 */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="text-[11px] text-[#E29595] text-center bg-[#FDE2E4]/50 rounded-2xl px-4 py-3"
                    >
                      {error}
                    </motion.p>
                  )}
                  {successMsg && (
                    <motion.p
                      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="text-[11px] text-[#AF9B60] text-center bg-[#AF9B60]/10 rounded-2xl px-4 py-3"
                    >
                      {successMsg}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* 表单 */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="border-b border-[#2D2422]/15 pb-2 flex items-center gap-3">
                    <Mail size={14} className="text-[#2D2422]/30 shrink-0" />
                    <div className="flex-1">
                      <label className="text-[8px] lg:text-[9px] uppercase tracking-[0.3em] font-medium text-[#2D2422]/50 mb-1 block">MEMBER ID</label>
                      <input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 italic placeholder:opacity-30"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="border-b border-[#2D2422]/15 pb-2 flex items-center gap-3">
                    <Lock size={14} className="text-[#2D2422]/30 shrink-0" />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[8px] lg:text-[9px] uppercase tracking-[0.3em] font-medium text-[#2D2422]/50">SECURITY KEY</label>
                        {authMode === 'login' && (
                          <button type="button" className="text-[8px] uppercase tracking-widest text-[#AF9B60]">FORGOTTEN?</button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 placeholder:opacity-30"
                          autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                        />
                        <button type="button" onClick={() => setShowPassword(p => !p)} className="text-[#2D2422]/30 hover:text-[#2D2422]/60">
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-5 btn-luxe rounded-full serif-heading text-base tracking-[0.2em] shadow-xl flex items-center justify-center gap-4 group font-light disabled:opacity-60"
                  >
                    {loading ? '处理中...' : authMode === 'login' ? '进入系统' : '创建账户'}
                    {!loading && <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />}
                  </button>
                </form>

                {/* 分割线 */}
                <div className="relative flex items-center">
                  <div className="flex-grow border-t border-[#2D2422]/10" />
                  <span className="mx-6 text-[8px] uppercase tracking-[0.4em] opacity-30 italic">or</span>
                  <div className="flex-grow border-t border-[#2D2422]/10" />
                </div>

                {/* Google 登录 */}
                <button
                  onClick={handleGoogle}
                  disabled={loading}
                  className="w-full py-4 bg-white border border-[#E5E4E2] rounded-full text-[11px] font-medium tracking-widest text-[#2D2422] shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-60"
                >
                  <Chrome size={16} className="text-[#E29595]" />
                  使用 Google 账号登录
                </button>

                {/* 游客模式 */}
                <button
                  onClick={() => onEnter('guest')}
                  className="w-full py-3 rounded-full text-[10px] font-medium uppercase tracking-widest text-[#2D2422]/40 hover:text-[#2D2422]/70 transition-all flex items-center justify-center gap-2"
                >
                  <UserRound size={14} />
                  游客体验 · Demo 模式
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <footer className="fixed bottom-6 lg:bottom-10 left-0 right-0 text-center z-10 px-6">
        <p className="text-[8px] lg:text-[9px] uppercase tracking-[0.3em] lg:tracking-[0.5em] text-[#2D2422]/40 font-medium">
          © 2025 — LUMSUE EDITORIAL — LUXURY SMART RESTORATION
        </p>
      </footer>
    </div>
  );
};

export default LoginView;
