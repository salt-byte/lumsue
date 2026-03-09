import React, { useRef, useState, useEffect } from 'react';
import { X, Sparkles, ArrowRight, ShieldCheck, Sun, Target } from 'lucide-react';

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

  // 语音引导函数
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // 取消之前的语音
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.9; // 稍微慢一点，更从容
      utterance.pitch = 1.1; // 音调稍微高一点，更温柔
      utterance.volume = 0.8; // 音量适中
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    let mounted = true;
    let currentStream: MediaStream | null = null;

    const initCamera = async () => {
      // 延迟一小会儿确保 DOM 已就绪
      await new Promise(r => setTimeout(r, 500));
      if (!mounted) return;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("您的浏览器不支持摄像头访问，请尝试使用 Chrome 或 Safari。");
        return;
      }

      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
        
        if (!mounted) {
          s.getTracks().forEach(track => track.stop());
          return;
        }

        currentStream = s;
        setStream(s);
        
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          // 处理 play() 异步调用，防止被中断报错
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(e => {
              if (e.name !== 'AbortError') {
                console.error("Video play error:", e);
              }
            });
          }
        }
      } catch (err) {
        if (mounted) {
          console.error("Camera access error:", err);
          setError("无法访问摄像头，请确保已授予权限并使用 HTTPS 连接。");
        }
      }
    };

    initCamera();

    return () => {
      mounted = false;
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  // 模拟环境与距离检测逻辑
  useEffect(() => {
    let detectionInterval: NodeJS.Timeout;
    if (isReady && detectionStatus !== 'captured') {
      let step = 0;
      detectionInterval = setInterval(() => {
        setDetectionStatus(prev => {
          step++;
          if (step === 1) {
            speak("正在初始化传感器，请正对镜头");
            return 'searching';
          }
          if (step === 5) {
            speak("请离镜头远一点");
            return 'too_close';
          }
          if (step === 10) {
            speak("光线有点暗，请移动到明亮处");
            return 'low_light';
          }
          if (step === 15) {
            speak("非常好，请保持不动");
            setAlignmentProgress(0);
            return 'aligning';
          }
          
          if (prev === 'aligning') {
            setAlignmentProgress(p => {
              if (p >= 100) return 100;
              return p + 5;
            });
          }
          return prev;
        });
      }, 500);
    }

    return () => {
      if (detectionInterval) clearInterval(detectionInterval);
    };
  }, [isReady, detectionStatus === 'captured']);

  // 处理对齐完成后的倒计时
  useEffect(() => {
    if (alignmentProgress === 100 && detectionStatus === 'aligning') {
      setDetectionStatus('counting');
      speak("准备拍摄，三，二，一");
      setCountdown(3);
    }
  }, [alignmentProgress]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (detectionStatus === 'counting' && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (detectionStatus === 'counting' && countdown === 0) {
      handleCapture();
    }
    return () => clearTimeout(timer);
  }, [detectionStatus, countdown]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current && detectionStatus !== 'captured') {
      setDetectionStatus('captured');
      speak("拍摄完成，正在生成报告");
      setIsFlashing(true);
      setTimeout(() => {
        const video = videoRef.current!;
        const canvas = canvasRef.current!;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.save();
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // 我们始终将原始图像传给 ProcessingView，由它负责展示自动化处理过程
          ctx.restore();
          onCapture(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]);
        }
        setIsFlashing(false);
      }, 150);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setIsReady(false);
    setDetectionStatus('searching');
    setAlignmentProgress(0);
  };

  return (
    <div className="fixed inset-0 bg-[#FFF0F1] flex flex-col font-sans z-[100] h-[100dvh] overflow-hidden">
      {/* 闪光灯模拟层 */}
      {isFlashing && (
        <div className="fixed inset-0 bg-white z-[200] animate-pulse"></div>
      )}

      {/* 顶部状态条 - 独立空间 */}
      <div className="h-16 lg:h-24 px-6 lg:px-12 flex items-center justify-between bg-white/30 backdrop-blur-md border-b border-white/20">
        <div className="flex items-center gap-2 lg:gap-4">
           <ShieldCheck size={16} className={detectionStatus === 'counting' ? 'text-green-500' : 'text-[#AF9B60]'} />
           <span className="text-[8px] lg:text-[10px] font-medium tracking-[0.2em] lg:tracking-[0.4em] uppercase text-[#2D2422]/60 italic truncate max-w-[120px] lg:max-w-none">
             {detectionStatus === 'counting' ? '锁定成功 - 准备拍摄' : detectionStatus === 'aligning' ? '正在校准面部位置' : '正在初始化传感器'}
           </span>
        </div>
        <div className="flex items-center gap-2 lg:gap-4">
          <button 
            onClick={toggleCamera}
            className="px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-[8px] lg:text-[10px] font-bold tracking-widest uppercase transition-all border bg-white/40 text-[#3C2A21]/60 border-transparent hover:bg-white/60"
          >
            {facingMode === 'user' ? '切换后置 (推荐)' : '切换前置'}
          </button>
          <button 
            onClick={() => setIsSpectralMode(!isSpectralMode)}
            className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-[8px] lg:text-[10px] font-bold tracking-widest uppercase transition-all border ${isSpectralMode ? 'bg-[#D4AF37] text-white border-[#D4AF37]' : 'bg-white/40 text-[#3C2A21]/40 border-transparent'}`}
          >
            {isSpectralMode ? 'UV 光谱' : '标准模式'}
          </button>
          <button onClick={onCancel} className="p-2 lg:p-3 hover:bg-white/50 rounded-full transition-all text-[#3C2A21]/40">
             <X size={20} className="lg:w-6 lg:h-6" />
          </button>
        </div>
      </div>

      {/* 相机视图容器 - 弹性填充 */}
      <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
        {!isReady && !error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 bg-black">
            <div className="w-16 h-16 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin"></div>
            <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-[0.4em] animate-pulse">正在激活光学传感器...</p>
          </div>
        )}
        {error ? (
          <div className="flex flex-col items-center gap-6 px-12 text-center">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-white/40">
              <ShieldCheck size={40} />
            </div>
            <div className="space-y-2">
              <p className="text-white font-serif italic text-xl">权限受限</p>
              <p className="text-white/40 text-xs leading-relaxed max-w-[240px]">
                {error}
              </p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={onCancel}
                className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-full text-[10px] font-bold tracking-widest uppercase transition-all"
              >
                返回首页
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-[#D4AF37] text-white rounded-full text-[10px] font-bold tracking-widest uppercase transition-all shadow-lg"
              >
                刷新重试
              </button>
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
            
            {/* 光谱扫描动效 */}
            {isSpectralMode && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="w-full h-1 bg-[#D4AF37]/50 shadow-[0_0_15px_#D4AF37] absolute top-0 animate-[scan_3s_linear_infinite]"></div>
              </div>
            )}
            
            {/* 蒙版层 - 保证中心清晰 */}
            <div 
              className="absolute inset-0 pointer-events-none backdrop-blur-[20px] bg-white/10"
              style={{
                maskImage: 'radial-gradient(ellipse 220px 300px at center, transparent 75%, black 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 220px 300px at center, transparent 75%, black 100%)'
              }}
            ></div>

            {/* 扫描线/框 */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
               <div className={`w-full max-w-[300px] lg:max-w-[440px] aspect-[3/4] lg:h-[600px] border-2 rounded-[60px] lg:rounded-[140px] relative transition-all duration-500 ${
                 detectionStatus === 'counting' ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]' : 
                 detectionStatus === 'too_close' || detectionStatus === 'too_far' || detectionStatus === 'low_light' ? 'border-red-400 shadow-[0_0_30px_rgba(248,113,113,0.3)]' :
                 detectionStatus === 'aligning' ? 'border-[#AF9B60]/50' : 'border-white/20'
               }`}>
                  {/* 进度条环绕 */}
                  {detectionStatus === 'aligning' && (
                    <svg className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] pointer-events-none">
                      <rect 
                        x="2" y="2" 
                        width="calc(100% - 4px)" height="calc(100% - 4px)" 
                        rx="62" ry="62"
                        fill="none" 
                        stroke="#AF9B60" 
                        strokeWidth="4"
                        strokeDasharray="2000"
                        strokeDashoffset={2000 - (2000 * alignmentProgress / 100)}
                        className="transition-all duration-300"
                      />
                    </svg>
                  )}

                  <div className="absolute inset-[-2px] border-[2px] lg:border-[3px] border-white/20 rounded-[62px] lg:rounded-[142px]"></div>
                  
                  {/* 实时提示 */}
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
                            <div className={`w-1 h-1 rounded-full ${detectionStatus !== 'low_light' && detectionStatus !== 'searching' ? 'bg-green-400' : 'bg-white/20'}`}></div> 光线充足
                          </span>
                          <span className="text-[8px] text-white/60 uppercase tracking-widest flex items-center gap-1">
                            <div className={`w-1 h-1 rounded-full ${alignmentProgress > 50 ? 'bg-green-400' : 'bg-white/20'}`}></div> 对焦清晰
                          </span>
                        </div>
                      </>
                    )}
                  </div>
               </div>
            </div>

            {/* 顶部拍摄要求浮层 */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-3xl flex items-center justify-around">
               {[
                 { icon: <Sun size={14} />, label: '光线充足' },
                 { icon: <Target size={14} />, label: '正对镜头' },
                 { icon: <Sparkles size={14} />, label: '移除遮挡' }
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

      {/* 底部操作面板 - 物理隔离，杜绝重叠 */}
      <div className="bg-white px-6 lg:px-12 py-4 lg:py-10 border-t border-[#FDE2E4] shadow-[0_-20px_50px_rgba(0,0,0,0.05)] safe-area-bottom">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 lg:gap-0">
          
          {/* 左侧指标 */}
          <div className="flex gap-8 lg:gap-12 w-full sm:w-auto justify-around sm:justify-start">
            <div className="space-y-0.5 lg:space-y-1">
              <p className="text-[7px] lg:text-[9px] font-bold text-[#3C2A21]/40 tracking-widest uppercase">Luminosity</p>
              <p className="text-base lg:text-xl serif-heading italic text-[#D4AF37]">Premium</p>
            </div>
            <div className="space-y-0.5 lg:space-y-1">
              <p className="text-[7px] lg:text-[9px] font-bold text-[#3C2A21]/40 tracking-widest uppercase">Hydration</p>
              <p className="text-base lg:text-xl serif-heading italic text-[#D4AF37]">74%</p>
            </div>
          </div>

          {/* 中央提示 */}
          <div className="w-full sm:w-auto flex flex-col items-center gap-2">
            <div className="px-10 lg:px-20 py-4 lg:py-6 bg-[#2D2422] text-white rounded-full flex items-center justify-center gap-4 lg:gap-6 shadow-2xl transition-all">
              <span className="text-xs lg:text-sm font-medium tracking-[0.4em] uppercase">
                {detectionStatus === 'counting' ? '即将拍摄' : 
                 detectionStatus === 'too_close' ? '距离过近' :
                 detectionStatus === 'low_light' ? '光线不足' :
                 detectionStatus === 'aligning' ? '检测中...' : '等待对齐'}
              </span>
              {(detectionStatus === 'aligning' || detectionStatus === 'searching') && (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              )}
            </div>
            <p className="text-[8px] lg:text-[10px] text-[#2D2422]/40 uppercase tracking-widest font-medium">
              {facingMode === 'environment' ? '后置摄像头模式：请根据 LUMSUE 语音提示操作' : '系统将自动捕捉最清晰的瞬间'}
            </p>
          </div>

          {/* 右侧功能 */}
          <div className="hidden sm:flex items-center gap-8">
            <button className="flex flex-col items-center gap-1 group">
               <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] group-hover:bg-[#D4AF37] group-hover:text-white transition-all">
                  <Sparkles size={18} className="lg:w-5 lg:h-5" />
               </div>
               <span className="text-[8px] font-bold tracking-widest uppercase opacity-40">Ritual</span>
            </button>
          </div>

        </div>
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default ScannerView;