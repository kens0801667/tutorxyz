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

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;
      
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
      
  // Auto-proceed when BOTH sound is detected AND content is ready
  useEffect(() => {
    if (hasDetectedSound && isReady && !detectionTimerRef.current) {
      detectionTimerRef.current = setTimeout(() => {
        onComplete();
      }, 1000);
    }
  }, [hasDetectedSound, isReady, onComplete]);
    } catch (err: any) {
      console.error("Mic access failed", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("麥克風權限已被拒絕。請點擊網址列左側的「鎖頭」圖示，並將麥克風設定為「允許」。");
      } else {
        setError("無法存取麥克風。請確認設備已正確連接，且沒有被其他程式佔用。");
      }
      setIsInitializing(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setIsInitializing(true);
    startMic();
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

        <div className="grid grid-cols-2 gap-4 pt-4">
          <button
            onClick={onSkip}
            className="flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all"
          >
            <SkipForward className="w-5 h-5" />
            直接略過
          </button>
          
          <button
            onClick={onComplete}
            disabled={(isInitializing && !error) || !isReady}
            className={`flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-bold text-white transition-all shadow-lg ${
              !isReady
                ? 'bg-slate-300 shadow-none cursor-not-allowed'
                : hasDetectedSound 
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' 
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
            }`}
          >
            {!isReady ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                準備中
              </>
            ) : hasDetectedSound ? "開始練習" : "點此跳過"}
            {isReady && <ArrowRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
      
      <p className="mt-8 text-slate-400 text-sm">
        如果您不方便發聲，可以選擇直接略過。
      </p>
    </div>
  );
}
