import React, { useState, useEffect, useRef } from 'react';
import { Mic, Activity, CheckCircle2, ArrowRight, SkipForward, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  onComplete: () => void;
  onSkip: () => void;
  isReady?: boolean;
}

export function MicCheckScreen({ onComplete, onSkip, isReady = true }: Props) {
  const [micLevel, setMicLevel] = useState(0);
  const [hasDetectedSound, setHasDetectedSound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const detectionTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startMic();
    return () => {
      stopMic();
      if (detectionTimerRef.current) clearTimeout(detectionTimerRef.current);
    };
  }, []);

  // Auto-proceed when BOTH sound is detected AND content is ready
  useEffect(() => {
    if (hasDetectedSound && isReady && !detectionTimerRef.current) {
      detectionTimerRef.current = setTimeout(() => {
        onComplete();
      }, 1000);
    }
  }, [hasDetectedSound, isReady, onComplete]);

  const startMic = async (deviceId?: string) => {
    stopMic();
    try {
      const constraints = { 
        audio: deviceId ? { deviceId: { exact: deviceId } } : true 
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      micStreamRef.current = stream;
      
      // Fallback AudioContext initialization
      let audioCtx: AudioContext;
      try {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      } catch (e) {
        console.warn("Failed with 16k sample rate, falling back to default");
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      audioContextRef.current = audioCtx;
      
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Populate devices list if not already done
      if (devices.length === 0) {
        navigator.mediaDevices.enumerateDevices().then(allDevices => {
          const audioInputs = allDevices.filter(d => d.kind === 'audioinput');
          setDevices(audioInputs);
          if (!deviceId) {
            setSelectedDeviceId(stream.getTracks()[0].getSettings().deviceId || '');
          }
        });
      }
      
      setIsInitializing(false);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        // Boosted sensitivity logic
        const normalized = average / 255;
        const sensitvityBoost = Math.sqrt(normalized) * 100;
        const currentLevel = Math.min(100, sensitvityBoost * 1.5);
        setMicLevel(currentLevel);

        // Auto-detection logic: if level > 20, consider it "sound detected"
        if (currentLevel > 20 && !hasDetectedSound) {
          setHasDetectedSound(true);
        }
        
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      
      setIsInitializing(false);
      setIsInitializing(false);
    } catch (err) {
      handleError(err);
    }
  };

  const handleError = (err: any) => {
    console.error("Mic access failed", err);
    let message = `無法存取麥克風 (${err.name || 'Error'})`;
    
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      message = "麥克風權限已被拒絕。請點擊網址列左側的「鎖頭」圖示，並將麥克風設定為「允許」。";
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      message = "找不到麥克風設備。請確認您的設備已正確連接。";
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      message = "麥克風正在被其他程式佔用中，請關閉其他使用音訊的視窗再試。";
    } else {
      message = `連線初始化失敗 (${err.message || err.name || 'Unknown Error'})。請嘗試點擊重新嘗試。`;
    }
    
    setError(message);
    setIsInitializing(false);
  };

  const handleRetry = () => {
    setError(null);
    setIsInitializing(true);
    startMic(selectedDeviceId || undefined);
  };

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedDeviceId(newId);
    startMic(newId);
  };

  const stopMic = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) audioContextRef.current.close();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-xl mx-auto p-6 md:p-12 text-center">
      <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 w-full space-y-8 border border-slate-100">
        <div className="space-y-4">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-2 transition-colors ${
            hasDetectedSound ? 'bg-emerald-100' : 'bg-indigo-100'
          }`}>
            {hasDetectedSound ? (
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            ) : (
              <Mic className="w-10 h-10 text-indigo-600" />
            )}
          </div>
          <h2 className="text-3xl font-bold text-slate-800">
            {!isReady ? "正在準備課程內容..." : (hasDetectedSound ? "連線成功！" : "麥克風檢查")}
          </h2>
          <p className="text-slate-500 text-lg">
            {!isReady 
              ? "AI 老師正在為您量身打造單字課，請稍候..." 
              : (hasDetectedSound 
                  ? "太棒了，我們測得您的聲音。即將開始練習..." 
                  : "請對著麥克風說幾句話，確保您的收音正常。")}
          </p>
        </div>

        {error ? (
          <div className="bg-red-50 p-6 rounded-2xl flex flex-col items-center gap-4 border border-red-100 text-center">
            <div className="flex items-start gap-3 text-left w-full">
              <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-red-800 font-bold">需要麥克風權限</p>
                <p className="text-red-700 text-sm leading-relaxed">{error}</p>
                <p className="text-slate-500 text-xs italic">
                  提示：如果這是本地開發環境 (localhost)，請確保您使用的是 Chrome 或 Edge 等主流瀏覽器。
                </p>
              </div>
            </div>
            <button
              onClick={handleRetry}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-100 flex items-center justify-center gap-2"
            >
              <Activity className="w-5 h-5" />
              重新嘗試讀取
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {devices.length > 1 && (
              <div className="text-left space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">選擇輸入裝置</label>
                <select 
                  value={selectedDeviceId}
                  onChange={handleDeviceChange}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                >
                  {devices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="relative h-6 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div 
                className={`absolute inset-y-0 left-0 transition-all duration-75 shadow-lg ${
                  hasDetectedSound ? 'bg-emerald-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${micLevel}%` }}
              ></div>
              {micLevel > 10 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white/50 animate-pulse" />
                </div>
              )}
            </div>
            
            {!hasDetectedSound && (
              <p className="text-sm text-slate-400 animate-pulse">
                等待聲音輸入中...
              </p>
            )}
          </div>
        )}

        <div className="pt-4">
          <button
            onClick={onComplete}
            disabled={(isInitializing && !error) || !isReady}
            className={`w-full flex items-center justify-center gap-2 py-5 px-6 rounded-2xl font-bold text-white transition-all shadow-lg text-xl ${
              !isReady
                ? 'bg-slate-300 shadow-none cursor-not-allowed'
                : hasDetectedSound 
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' 
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
            }`}
          >
            {!isReady ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                正在準備課程...
              </>
            ) : hasDetectedSound ? (
              <>
                <CheckCircle2 className="w-6 h-6" />
                開始練習
              </>
            ) : (
              <>
                <SkipForward className="w-6 h-6" />
                跳過檢測直接開始
              </>
            )}
            {isReady && !hasDetectedSound && <ArrowRight className="w-5 h-5 ml-1 opacity-50" />}
          </button>
        </div>
      </div>
      
      <p className="mt-8 text-slate-400 text-sm">
        如果您不方便發聲，可以選擇直接略過。
      </p>
    </div>
  );
}
