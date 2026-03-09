import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Sparkles, ShieldCheck, Sun, Target, Zap, ZapOff, Eye } from 'lucide-react';

interface ScannerViewProps {
  onCapture: (base64: string) => void;
  onCancel: () => void;
}

const ScannerView: React.FC<ScannerViewProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSpectralMode, setIsSpectralMode] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [detectionStatus, setDetectionStatus] = useState<'searching' | 'aligning' | 'counting' | 'captured' | 'too_close' | 'too_far' | 'low_light'>('searching');
  const [countdown, setCountdown] = useState(3);
  const [alignmentProgress, setAlignmentProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // ─── 手电筒（Torch）────────────────────────────────────────────────────────
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const setTorch = useCallback(async (on: boolean) => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: on } as any] });
      setTorchOn(on);
    } catch {
      // 不支持时静默失败
    }
  }, [stream]);

  // ─── 语音引导 ──────────────────────────────────────────────────────────────
  // iOS Safari 需要在用户直接点击的同步代码中触发 speechSynthesis，
  // 否则会被自动播放策略屏蔽。用 audioUnlocked ref 记录是否已解锁。
  const audioUnlocked = useRef(false);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window) || !audioUnlocked.current) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 0.8;
    window.speechSynthesis.speak(utterance);
  }, []);

  // 用户点击"开始扫描"时解锁音频（iOS 要求必须在直接手势事件中调用）
  const unlockAudio = useCallback(() => {
    if (audioUnlocked.current || !('speechSynthesis' in window)) return;
    // 用空语音解锁 iOS AudioContext
    const unlock = new SpeechSynthesisUtterance('');
    unlock.volume = 0;
    window.speechSynthesis.speak(unlock);
    audioUnlocked.current = true;
  }, []);

  // ─── 摄像头初始化 ──────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    let currentStream: MediaStream | null = null;

    const initCamera = async () => {
      await new Promise(r => setTimeout(r, 300));
      if (!mounted) return;

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("您的浏览器不支持摄像头访问，请使用 Chrome 或 Safari。");
        return;
      }

      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });

        if (!mounted) { s.getTracks().forEach(t => t.stop()); return; }

        currentStream = s;
        setStream(s);

        // 检测是否支持手电筒（仅后置摄像头）
        const track = s.getVideoTracks()[0];
        const capabilities = track?.getCapabilities?.() as any;
        if (capabilities?.torch) setTorchSupported(true);

        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(e => {
            if (e.name !== 'AbortError') console.error('Video play error:', e);
          });
        }
      } catch (err) {
        if (mounted) setError("无法访问摄像头，请确保已授予权限并使用 HTTPS 连接。");
      }
    };

    initCamera();
    return () => {
      mounted = false;
      currentStream?.getTracks().forEach(t => t.stop());
      // 关闭手电筒
      setTorchOn(false);
    };
  }, [facingMode]);

  // ─── 检测逻辑 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isReady && detectionStatus !== 'captured') {
      let step = 0;
      interval = setInterval(() => {
        setDetectionStatus(prev => {
          step++;
          if (step === 1)  { speak("正在初始化传感器，请正对镜头"); return 'searching'; }
          if (step === 5)  { speak("请离镜头远一点"); return 'too_close'; }
          if (step === 10) { speak("光线有点暗，请移动到明亮处"); return 'low_light'; }
          if (step === 15) { speak("非常好，请保持不动"); setAlignmentProgress(0); return 'aligning'; }
          if (prev === 'aligning') {
            setAlignmentProgress(p => Math.min(p + 5, 100));
          }
          return prev;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isReady, detectionStatus === 'captured', speak]);

  useEffect(() => {
    if (alignmentProgress === 100 && detectionStatus === 'aligning') {
      setDetectionStatus('counting');
      speak("准备拍摄，请轻闭双眼，三，二，一");
      setCountdown(3);
    }
  }, [alignmentProgress, speak]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (detectionStatus === 'counting' && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (detectionStatus === 'counting' && countdown === 0) {
      handleCapture();
    }
    return () => clearTimeout(timer);
  }, [detectionStatus, countdown]);

  // ─── 拍摄 ──────────────────────────────────────────────────────────────────
  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || detectionStatus === 'captured') return;
    setDetectionStatus('captured');
    speak("拍摄完成，正在生成报告");

    // 拍摄时短暂开启手电筒补光（如果支持）
    if (torchSupported && facingMode === 'environment') {
      await setTorch(true);
    }

    setIsFlashing(true);
    setTimeout(async () => {
      const video = videoRef.current!;
      const canvas = canvasRef.current!;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.save();
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        onCapture(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]);
      }
      setIsFlashing(false);
      // 关闭手电筒
      if (torchOn) await setTorch(false);
    }, 150);
  };

  const toggleCamera = () => {
    setTorch(false);
    setTorchSupported(false);
    setTorchOn(false);
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setIsReady(false);
    setDetectionStatus('searching');
    setAlignmentProgress(0);
  };

  const toggleTorch = () => setTorch(!torchOn);

  return (
    <div className="fixed inset-0 bg-[#FFF0F1] flex flex-col font-sans z-[100] h-[100dvh] overflow-hidden">
      {/* 拍摄闪光效果 */}
      {isFlashing && <div className="fixed inset-0 bg-white z-[200] animate-pulse" />}

      {/* 顶部状态条 */}
      <div className="h-16 lg:h-24 px-6 lg:px-12 flex items-center justify-between bg-white/30 backdrop-blur-md border-b border-white/20">
        <div className="flex items-center gap-2 lg:gap-4">
          <ShieldCheck size={16} className={detectionStatus === 'counting' ? 'text-green-500' : 'text-[#AF9B60]'} />
          <span className="text-[8px] lg:text-[10px] font-medium tracking-[0.2em] uppercase text-[#2D2422]/60 italic truncate max-w-[120px] lg:max-w-none">
            {detectionStatus === 'counting' ? '锁定成功 - 准备拍摄' :
             detectionStatus === 'aligning' ? '正在校准面部位置' : '正在初始化传感器'}
          </span>
        </div>
        <div className="flex items-center gap-2 lg:gap-4">
          {/* 手电筒按钮（仅后置且支持时显示） */}
          {facingMode === 'environment' && torchSupported && (
            <button
              onClick={toggleTorch}
              className={`px-3 py-1.5 rounded-full text-[8px] font-bold tracking-widest uppercase transition-all border flex items-center gap-1.5 ${
                torchOn ? 'bg-[#D4AF37] text-white border-[#D4AF37]' : 'bg-white/40 text-[#3C2A21]/60 border-transparent'
              }`}
            >
              <Zap size={12} />
              {torchOn ? '手电筒关' : '手电筒开'}
            </button>
          )}
          <button
            onClick={toggleCamera}
            className="px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-[8px] lg:text-[10px] font-bold tracking-widest uppercase transition-all border bg-white/40 text-[#3C2A21]/60 border-transparent hover:bg-white/60"
          >
            {facingMode === 'user' ? '切换后置 (推荐)' : '切换前置'}
          </button>
          <button
            onClick={() => setIsSpectralMode(!isSpectralMode)}
            className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-[8px] lg:text-[10px] font-bold tracking-widest uppercase transition-all border ${
              isSpectralMode ? 'bg-[#D4AF37] text-white border-[#D4AF37]' : 'bg-white/40 text-[#3C2A21]/40 border-transparent'
            }`}
          >
            {isSpectralMode ? 'UV 光谱' : '标准模式'}
          </button>
          <button onClick={onCancel} className="p-2 lg:p-3 hover:bg-white/50 rounded-full transition-all text-[#3C2A21]/40">
            <X size={20} className="lg:w-6 lg:h-6" />
          </button>
        </div>
      </div>

      {/* 相机视图 */}
      <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
        {!isReady && !error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 bg-black">
            <div className="w-16 h-16 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin" />
            <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-[0.4em] animate-pulse">正在激活光学传感器...</p>
          </div>
        )}

        {/* iOS 音频解锁提示：摄像头就绪后，首次需要用户点击 */}
        {isReady && !audioUnlocked.current && (
          <div
            className="absolute inset-0 z-20 flex items-end justify-center pb-40 cursor-pointer"
            onClick={() => { unlockAudio(); speak("语音引导已开启，请正对镜头"); }}
          >
            <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-full px-8 py-4 flex items-center gap-3 animate-bounce">
              <span className="text-[11px] text-white font-medium tracking-widest uppercase">点击屏幕开启语音引导</span>
            </div>
          </div>
        )}

        {error ? (
          <div className="flex flex-col items-center gap-6 px-12 text-center">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-white/40">
              <ShieldCheck size={40} />
            </div>
            <div className="space-y-2">
              <p className="text-white font-serif italic text-xl">权限受限</p>
              <p className="text-white/40 text-xs leading-relaxed max-w-[240px]">{error}</p>
            </div>
            <div className="flex gap-4">
              <button onClick={onCancel} className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-full text-[10px] font-bold tracking-widest uppercase transition-all">返回首页</button>
              <button onClick={() => window.location.reload()} className="px-8 py-3 bg-[#D4AF37] text-white rounded-full text-[10px] font-bold tracking-widest uppercase transition-all shadow-lg">刷新重试</button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay playsInline muted
              onCanPlay={() => setIsReady(true)}
              className={`w-full h-full object-cover transition-all duration-500 ${isSpectralMode ? 'contrast-150 saturate-125 brightness-110' : ''}`}
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />

            {isSpectralMode && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="w-full h-1 bg-[#D4AF37]/50 shadow-[0_0_15px_#D4AF37] absolute top-0 animate-[scan_3s_linear_infinite]" />
              </div>
            )}

            <div
              className="absolute inset-0 pointer-events-none backdrop-blur-[20px] bg-white/10"
              style={{
                maskImage: 'radial-gradient(ellipse 220px 300px at center, transparent 75%, black 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 220px 300px at center, transparent 75%, black 100%)'
              }}
            />

            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              <div className={`w-full max-w-[300px] lg:max-w-[440px] aspect-[3/4] lg:h-[600px] border-2 rounded-[60px] lg:rounded-[140px] relative transition-all duration-500 ${
                detectionStatus === 'counting' ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]' :
                detectionStatus === 'too_close' || detectionStatus === 'low_light' ? 'border-red-400 shadow-[0_0_30px_rgba(248,113,113,0.3)]' :
                detectionStatus === 'aligning' ? 'border-[#AF9B60]/50' : 'border-white/20'
              }`}>
                {detectionStatus === 'aligning' && (
                  <svg className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] pointer-events-none">
                    <rect x="2" y="2" width="calc(100% - 4px)" height="calc(100% - 4px)"
                      rx="62" ry="62" fill="none" stroke="#AF9B60" strokeWidth="4"
                      strokeDasharray="2000"
                      strokeDashoffset={2000 - (2000 * alignmentProgress / 100)}
                      className="transition-all duration-300"
                    />
                  </svg>
                )}
                <div className="absolute inset-[-2px] border-[2px] lg:border-[3px] border-white/20 rounded-[62px] lg:rounded-[142px]" />

                <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-full text-center space-y-4">
                  {detectionStatus === 'counting' ? (
                    <div className="text-6xl font-serif italic text-white animate-bounce">{countdown}</div>
                  ) : (
                    <>
                      <p className={`text-white text-sm font-serif italic tracking-widest ${detectionStatus === 'too_close' || detectionStatus === 'low_light' ? 'text-red-300' : ''}`}>
                        {detectionStatus === 'searching' && '正在寻找面部...'}
                        {detectionStatus === 'too_close' && '请离镜头远一点'}
                        {detectionStatus === 'low_light' && '光线太暗，请移动到明亮处'}
                        {detectionStatus === 'aligning' && '请保持不动，正在校准'}
                      </p>
                      <div className="flex justify-center gap-4">
                        <span className="text-[8px] text-white/60 uppercase tracking-widest flex items-center gap-1">
                          <div className={`w-1 h-1 rounded-full ${detectionStatus !== 'low_light' && detectionStatus !== 'searching' ? 'bg-green-400' : 'bg-white/20'}`} /> 光线充足
                        </span>
                        <span className="text-[8px] text-white/60 uppercase tracking-widest flex items-center gap-1">
                          <div className={`w-1 h-1 rounded-full ${alignmentProgress > 50 ? 'bg-green-400' : 'bg-white/20'}`} /> 对焦清晰
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-3xl flex items-center justify-around">
              {[
                { icon: <Sun size={14} />, label: '光线充足' },
                { icon: <Target size={14} />, label: '正对镜头' },
                { icon: <Sparkles size={14} />, label: '移除遮挡' },
                { icon: <Eye size={14} />, label: '轻闭双眼' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-white/80">
                  <div className="text-[#D4AF37]">{item.icon}</div>
                  <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 底部操作面板 */}
      <div className="bg-white px-6 lg:px-12 py-4 lg:py-10 border-t border-[#FDE2E4] shadow-[0_-20px_50px_rgba(0,0,0,0.05)] safe-area-bottom">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 lg:gap-0">
          <div className="flex gap-8 lg:gap-12 w-full sm:w-auto justify-around sm:justify-start">
            <div className="space-y-0.5 lg:space-y-1">
              <p className="text-[7px] lg:text-[9px] font-bold text-[#3C2A21]/40 tracking-widest uppercase">光感 · Luminosity</p>
              <p className="text-base lg:text-xl serif-heading italic text-[#D4AF37]">优质</p>
            </div>
            <div className="space-y-0.5 lg:space-y-1">
              <p className="text-[7px] lg:text-[9px] font-bold text-[#3C2A21]/40 tracking-widest uppercase">含水量 · Hydration</p>
              <p className="text-base lg:text-xl serif-heading italic text-[#D4AF37]">74%</p>
            </div>
          </div>

          <div className="w-full sm:w-auto flex flex-col items-center gap-2">
            <div className="px-10 lg:px-20 py-4 lg:py-6 bg-[#2D2422] text-white rounded-full flex items-center justify-center gap-4 lg:gap-6 shadow-2xl">
              <span className="text-xs lg:text-sm font-medium tracking-[0.4em] uppercase">
                {detectionStatus === 'counting' ? '即将拍摄' :
                 detectionStatus === 'too_close' ? '距离过近' :
                 detectionStatus === 'low_light' ? '光线不足' :
                 detectionStatus === 'aligning' ? '检测中...' : '等待对齐'}
              </span>
              {(detectionStatus === 'aligning' || detectionStatus === 'searching') && (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              )}
            </div>
            <p className="text-[8px] lg:text-[10px] text-[#2D2422]/40 uppercase tracking-widest font-medium">
              {facingMode === 'environment' ? '后置模式 · 请根据语音提示操作' : '系统将自动捕捉最清晰的瞬间'}
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-8">
            <button className="flex flex-col items-center gap-1 group">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] group-hover:bg-[#D4AF37] group-hover:text-white transition-all">
                <Sparkles size={18} className="lg:w-5 lg:h-5" />
              </div>
              <span className="text-[8px] font-bold tracking-widest uppercase opacity-40">仪式</span>
            </button>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default ScannerView;
