import React, { useRef, useState, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { X, Sparkles, ShieldCheck, Sun, Target, Zap } from 'lucide-react';

interface ScannerViewProps {
  onCapture: (base64: string) => void;
  onCancel: () => void;
}

type DetectionStatus =
  | 'loading_model'  // 模型加载中
  | 'no_face'        // 未检测到人脸
  | 'too_close'      // 距离过近
  | 'too_far'        // 距离过远
  | 'low_light'      // 光线不足
  | 'aligning'       // 对齐中（所有条件满足）
  | 'counting'       // 倒计时
  | 'captured';      // 已拍摄

const OVAL_W_RATIO = 0.62;  // 椭圆宽度占视频宽的比例
const OVAL_H_RATIO = 0.78;  // 椭圆高度占视频高的比例

// 人脸宽度占视频宽度的理想范围
const FACE_MIN_RATIO = 0.28;
const FACE_MAX_RATIO = 0.70;

// 亮度判断阈值（0-255）
const BRIGHTNESS_MIN = 60;

const ScannerView: React.FC<ScannerViewProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>('loading_model');
  const [countdown, setCountdown] = useState(3);
  const [alignmentProgress, setAlignmentProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);

  // 检测条件明细
  const [lightOk, setLightOk] = useState(false);
  const [faceOk, setFaceOk] = useState(false);
  const [distanceOk, setDistanceOk] = useState(false);

  // 手电筒
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // 对齐进度计时
  const alignStartRef = useRef<number | null>(null);
  const statusRef = useRef<DetectionStatus>('loading_model');
  const progressRef = useRef(0);

  // ─── 语音引导 ──────────────────────────────────────────────────────────────
  const audioUnlocked = useRef(false);
  const lastSpokenStatus = useRef<string>('');

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window) || !audioUnlocked.current) return;
    if (lastSpokenStatus.current === text) return; // 避免重复播报同一句
    lastSpokenStatus.current = text;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = 0.9;
    u.pitch = 1.1;
    u.volume = 0.9;
    window.speechSynthesis.speak(u);
  }, []);

  const unlockAudio = useCallback(() => {
    if (audioUnlocked.current || !('speechSynthesis' in window)) return;
    const unlock = new SpeechSynthesisUtterance('');
    unlock.volume = 0;
    window.speechSynthesis.speak(unlock);
    audioUnlocked.current = true;
  }, []);

  const setTorch = useCallback(async (on: boolean) => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: on } as any] });
      setTorchOn(on);
    } catch {}
  }, [stream]);

  // ─── 检查模型是否已加载（App 启动时预加载，通常这里直接就绪）──────────────
  useEffect(() => {
    if (faceapi.nets.tinyFaceDetector.isLoaded) {
      setModelLoaded(true);
      return;
    }
    // 极少数情况模型还没加载完，继续等
    faceapi.nets.tinyFaceDetector.loadFromUri('/models')
      .then(() => setModelLoaded(true))
      .catch(() => setModelLoaded(true)); // 失败也继续
  }, []);

  // ─── 摄像头初始化 ──────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    let currentStream: MediaStream | null = null;

    const initCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('您的浏览器不支持摄像头访问，请使用 Chrome 或 Safari。');
        return;
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false
        });
        if (!mounted) { s.getTracks().forEach(t => t.stop()); return; }
        currentStream = s;
        setStream(s);
        const track = s.getVideoTracks()[0];
        const caps = track?.getCapabilities?.() as any;
        if (caps?.torch) setTorchSupported(true);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(e => { if (e.name !== 'AbortError') console.error(e); });
        }
      } catch {
        if (mounted) setError('无法访问摄像头，请确保已授予权限并使用 HTTPS 连接。');
      }
    };

    initCamera();
    return () => {
      mounted = false;
      currentStream?.getTracks().forEach(t => t.stop());
    };
  }, [facingMode]);

  // ─── 实时检测循环 ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady || !modelLoaded) return;
    setDetectionStatus('no_face');
    statusRef.current = 'no_face';

    const detect = async () => {
      if (!videoRef.current || !canvasRef.current) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      const currentStatus = statusRef.current;
      if (currentStatus === 'counting' || currentStatus === 'captured') {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      // ── 1. 亮度检测（分析中央区域像素）
      const sampleX = Math.floor(canvas.width * 0.25);
      const sampleY = Math.floor(canvas.height * 0.2);
      const sampleW = Math.floor(canvas.width * 0.5);
      const sampleH = Math.floor(canvas.height * 0.6);
      const imageData = ctx.getImageData(sampleX, sampleY, sampleW, sampleH);
      let sum = 0;
      for (let i = 0; i < imageData.data.length; i += 4) {
        sum += 0.299 * imageData.data[i] + 0.587 * imageData.data[i + 1] + 0.114 * imageData.data[i + 2];
      }
      const brightness = sum / (imageData.data.length / 4);
      const brightnessOk = brightness >= BRIGHTNESS_MIN;
      setLightOk(brightnessOk);

      // ── 2. 人脸检测
      let faceDetected = false;
      let faceInRange = false;
      let faceTooClose = false;

      try {
        const detection = await faceapi.detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
        );

        if (detection) {
          faceDetected = true;
          const { width: fW } = detection.box;
          const ratio = fW / video.videoWidth;
          faceTooClose = ratio > FACE_MAX_RATIO;
          faceInRange = ratio >= FACE_MIN_RATIO && ratio <= FACE_MAX_RATIO;
        }
      } catch {
        // 检测出错时跳过本帧
      }

      setFaceOk(faceDetected);
      setDistanceOk(faceInRange);

      // ── 3. 综合判断状态
      let newStatus: DetectionStatus;
      if (!faceDetected) {
        newStatus = 'no_face';
      } else if (faceTooClose) {
        newStatus = 'too_close';
      } else if (!brightnessOk) {
        newStatus = 'low_light';
      } else if (!faceInRange) {
        newStatus = 'too_far';
      } else {
        newStatus = 'aligning';
      }

      if (newStatus !== currentStatus && currentStatus !== 'counting') {
        statusRef.current = newStatus;
        setDetectionStatus(newStatus);
        // 状态变化时播报语音
        if (newStatus === 'no_face')   speak('请将脸部对准椭圆框');
        if (newStatus === 'too_close') speak('距离太近，请稍微后退一点');
        if (newStatus === 'too_far')   speak('请靠近镜头一点');
        if (newStatus === 'low_light') speak('光线不足，请移动到明亮的地方');
        if (newStatus === 'aligning')  speak('非常好，请保持不动');
        if (newStatus !== 'aligning') {
          alignStartRef.current = null;
          progressRef.current = 0;
          setAlignmentProgress(0);
        }
      }

      // ── 4. 对齐进度
      if (newStatus === 'aligning') {
        if (!alignStartRef.current) alignStartRef.current = Date.now();
        const elapsed = Date.now() - alignStartRef.current;
        const progress = Math.min((elapsed / 2000) * 100, 100); // 2秒保持稳定才拍
        progressRef.current = progress;
        setAlignmentProgress(progress);

        if (progress >= 100 && statusRef.current !== 'counting') {
          statusRef.current = 'counting';
          setDetectionStatus('counting');
          speak('准备拍摄，三，二，一');
          setCountdown(3);
        }
      }

      rafRef.current = requestAnimationFrame(detect);
    };

    rafRef.current = requestAnimationFrame(detect);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isReady, modelLoaded]);

  // ─── 倒计时 ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (detectionStatus !== 'counting') return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    } else {
      handleCapture();
    }
  }, [detectionStatus, countdown]);

  // ─── 拍摄（按人脸 bbox 精准裁剪）──────────────────────────────────────────
  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || detectionStatus === 'captured') return;
    statusRef.current = 'captured';
    setDetectionStatus('captured');
    cancelAnimationFrame(rafRef.current);

    if (torchSupported && facingMode === 'environment') await setTorch(true);
    setIsFlashing(true);

    setTimeout(async () => {
      const video = videoRef.current!;
      const canvas = canvasRef.current!;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;

      ctx.save();
      if (facingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // 尝试用真实人脸 bbox 裁剪
      let cropX = 0, cropY = 0, cropW = canvas.width, cropH = canvas.height;
      try {
        const detection = await faceapi.detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 })
        );
        if (detection) {
          const { x, y, width, height } = detection.box;
          // 在人脸 bbox 基础上加 padding（让头顶/两侧有余量）
          const padX = width * 0.35;
          const padTop = height * 0.55;  // 多留头顶
          const padBottom = height * 0.05; // 少留下巴以下
          cropX = Math.max(0, Math.floor(x - padX));
          cropY = Math.max(0, Math.floor(y - padTop));
          const rawW = Math.min(canvas.width - cropX, Math.ceil(width + padX * 2));
          const rawH = Math.min(canvas.height - cropY, Math.ceil(height + padTop + padBottom));
          cropW = rawW;
          cropH = rawH;
        }
      } catch {
        // 检测失败 fallback：固定比例裁剪
        cropW = Math.round(canvas.width * 0.85);
        cropH = Math.round(canvas.height * 0.62);
        cropX = Math.round((canvas.width - cropW) / 2);
        cropY = 0;
      }

      // 前置摄像头镜像时需要水平翻转裁剪 X 坐标
      if (facingMode === 'user') {
        cropX = canvas.width - cropX - cropW;
      }

      const faceCanvas = document.createElement('canvas');
      faceCanvas.width = cropW;
      faceCanvas.height = cropH;
      faceCanvas.getContext('2d')!.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      setIsFlashing(false);
      if (torchOn) await setTorch(false);
      onCapture(faceCanvas.toDataURL('image/jpeg', 0.92).split(',')[1]);
    }, 150);
  };

  const toggleCamera = () => {
    setTorch(false);
    setTorchSupported(false);
    setTorchOn(false);
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setIsReady(false);
    setDetectionStatus('loading_model');
    setAlignmentProgress(0);
    alignStartRef.current = null;
  };

  // ─── 状态文字 ──────────────────────────────────────────────────────────────
  const statusText: Record<DetectionStatus, string> = {
    loading_model: '正在加载检测模型...',
    no_face: '未检测到人脸，请正对镜头',
    too_close: '距离太近，请后退一点',
    too_far: '距离太远，请靠近镜头',
    low_light: '光线不足，请移动到明亮处',
    aligning: '保持不动，正在校准...',
    counting: `准备拍摄`,
    captured: '拍摄完成',
  };

  const isWarning = ['no_face', 'too_close', 'too_far', 'low_light'].includes(detectionStatus);

  return (
    <div className="fixed inset-0 bg-black flex flex-col font-sans z-[100] h-[100dvh] overflow-hidden">
      {isFlashing && <div className="fixed inset-0 bg-white z-[200]" />}

      {/* 顶部状态条 */}
      <div className="h-16 lg:h-20 px-6 lg:px-10 flex items-center justify-between bg-black/60 backdrop-blur-md border-b border-white/10 z-10">
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className={detectionStatus === 'aligning' || detectionStatus === 'counting' ? 'text-green-400' : 'text-white/40'} />
          <span className="text-[9px] lg:text-[11px] font-medium tracking-[0.2em] uppercase text-white/60 truncate max-w-[160px] lg:max-w-none">
            {statusText[detectionStatus]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {facingMode === 'environment' && torchSupported && (
            <button
              onClick={() => setTorch(!torchOn)}
              className={`px-3 py-1.5 rounded-full text-[8px] font-bold tracking-widest uppercase border flex items-center gap-1.5 transition-all ${
                torchOn ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-white/10 text-white/60 border-transparent'
              }`}
            >
              <Zap size={11} /> {torchOn ? '关闭' : '补光'}
            </button>
          )}
          <button
            onClick={toggleCamera}
            className="px-3 py-1.5 rounded-full text-[8px] font-bold tracking-widest uppercase bg-white/10 text-white/60 border-transparent transition-all hover:bg-white/20"
          >
            {facingMode === 'user' ? '切换后置' : '切换前置'}
          </button>
          <button onClick={onCancel} className="p-2 hover:bg-white/20 rounded-full transition-all text-white/50">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* 相机视图 */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
        {!isReady && !error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 bg-black">
            <div className="w-16 h-16 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin" />
            <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-[0.4em] animate-pulse">正在激活摄像头...</p>
          </div>
        )}

        {/* iOS 音频解锁：点击屏幕开启语音引导 */}
        {isReady && !audioUnlocked.current && (
          <div
            className="absolute inset-0 z-20 flex items-end justify-center pb-40 cursor-pointer"
            onClick={() => { unlockAudio(); speak('语音引导已开启，请将脸部对准椭圆框'); }}
          >
            <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-full px-8 py-4 animate-bounce">
              <span className="text-[11px] text-white font-medium tracking-widest uppercase">点击屏幕开启语音引导</span>
            </div>
          </div>
        )}

        {error ? (
          <div className="flex flex-col items-center gap-6 px-12 text-center">
            <p className="text-white font-serif italic text-xl">权限受限</p>
            <p className="text-white/40 text-xs leading-relaxed max-w-[240px]">{error}</p>
            <div className="flex gap-4">
              <button onClick={onCancel} className="px-8 py-3 bg-white/10 text-white rounded-full text-[10px] font-bold tracking-widest uppercase">返回</button>
              <button onClick={() => window.location.reload()} className="px-8 py-3 bg-[#D4AF37] text-white rounded-full text-[10px] font-bold tracking-widest uppercase">刷新重试</button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay playsInline muted
              onCanPlay={() => setIsReady(true)}
              className="w-full h-full object-cover"
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />

            {/* 虚化遮罩（椭圆外模糊）*/}
            <div
              className="absolute inset-0 pointer-events-none backdrop-blur-[20px] bg-black/30"
              style={{
                maskImage: `radial-gradient(ellipse ${OVAL_W_RATIO * 100 * 0.9}% ${OVAL_H_RATIO * 100 * 0.85}% at center, transparent 72%, black 100%)`,
                WebkitMaskImage: `radial-gradient(ellipse ${OVAL_W_RATIO * 100 * 0.9}% ${OVAL_H_RATIO * 100 * 0.85}% at center, transparent 72%, black 100%)`,
              }}
            />

            {/* 椭圆框 */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                className={`relative transition-all duration-500`}
                style={{ width: `${OVAL_W_RATIO * 100}%`, paddingBottom: `${OVAL_H_RATIO * 100}%` }}
              >
                <svg
                  className="absolute inset-0 w-full h-full"
                  viewBox="0 0 100 130"
                  preserveAspectRatio="none"
                >
                  {/* 背景椭圆描边 */}
                  <ellipse cx="50" cy="65" rx="48" ry="62"
                    fill="none"
                    stroke={
                      detectionStatus === 'counting' ? 'rgba(34,197,94,0.9)' :
                      isWarning ? 'rgba(248,113,113,0.5)' :
                      detectionStatus === 'aligning' ? 'rgba(212,175,55,0.6)' :
                      'rgba(255,255,255,0.2)'
                    }
                    strokeWidth="1.5"
                  />
                  {/* 对齐进度弧线 */}
                  {detectionStatus === 'aligning' && (
                    <ellipse cx="50" cy="65" rx="48" ry="62"
                      fill="none"
                      stroke="#D4AF37"
                      strokeWidth="2.5"
                      strokeDasharray={`${(2 * Math.PI * Math.sqrt((48 * 48 + 62 * 62) / 2)).toFixed(1)}`}
                      strokeDashoffset={`${(2 * Math.PI * Math.sqrt((48 * 48 + 62 * 62) / 2)) * (1 - alignmentProgress / 100)}`}
                      strokeLinecap="round"
                      style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 65px', transition: 'stroke-dashoffset 0.15s linear' }}
                    />
                  )}
                  {detectionStatus === 'counting' && (
                    <ellipse cx="50" cy="65" rx="48" ry="62"
                      fill="none"
                      stroke="rgba(34,197,94,0.8)"
                      strokeWidth="2.5"
                    />
                  )}
                </svg>

                {/* 倒计时 */}
                {detectionStatus === 'counting' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-7xl font-serif italic text-white drop-shadow-lg"
                      style={{ textShadow: '0 0 30px rgba(34,197,94,0.6)' }}>
                      {countdown || ''}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 底部提示文字 */}
            <div className="absolute bottom-28 lg:bottom-36 left-0 right-0 flex flex-col items-center gap-3 pointer-events-none px-6">
              <p className={`text-sm font-serif italic tracking-widest text-center transition-all ${isWarning ? 'text-red-300' : 'text-white/80'}`}>
                {statusText[detectionStatus]}
              </p>
            </div>
          </>
        )}
      </div>

      {/* 底部面板 */}
      <div className="bg-black/80 border-t border-white/10 px-6 lg:px-12 py-5 lg:py-8">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-6">

          {/* 检测条件指示灯 */}
          <div className="flex flex-col gap-2">
            {[
              { ok: lightOk, label: '光线充足', icon: <Sun size={12} /> },
              { ok: faceOk, label: '检测到人脸', icon: <Target size={12} /> },
              { ok: distanceOk, label: '距离适中', icon: <Sparkles size={12} /> },
            ].map(({ ok, label, icon }) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${ok ? 'bg-green-400/20 text-green-400' : 'bg-white/5 text-white/20'}`}>
                  {icon}
                </div>
                <span className={`text-[9px] uppercase tracking-widest font-medium transition-all ${ok ? 'text-green-400' : 'text-white/25'}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* 状态按钮 */}
          <div className="flex flex-col items-center gap-2">
            <div className={`px-8 py-4 rounded-full flex items-center gap-3 transition-all ${
              detectionStatus === 'counting' ? 'bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.5)]' :
              isWarning ? 'bg-red-500/20 border border-red-500/30' :
              detectionStatus === 'aligning' ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/40' :
              'bg-white/5 border border-white/10'
            }`}>
              <span className="text-xs font-medium tracking-[0.3em] uppercase text-white">
                {detectionStatus === 'counting' ? `${countdown} 秒后拍摄` :
                 detectionStatus === 'aligning' ? '条件满足，稳定中...' :
                 detectionStatus === 'loading_model' ? '模型加载中' :
                 '等待检测通过'}
              </span>
              {(detectionStatus === 'aligning' || detectionStatus === 'loading_model') && (
                <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              )}
            </div>
            <p className="text-[8px] text-white/30 uppercase tracking-widest">
              {lightOk && faceOk && distanceOk ? '所有条件满足，保持稳定' : '请根据提示调整位置和光线'}
            </p>
          </div>

        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default ScannerView;
