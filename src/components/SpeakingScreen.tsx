import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Mic, Loader2, CheckCircle2, Volume2 } from 'lucide-react';
import { Word, TestResult, TeacherStyle } from '../types';
import { startLiveSpeakingSession } from '../services/gemini';

interface Props {
  words: Word[];
  onComplete: (results: Partial<TestResult>[]) => void;
  onRestart: () => void;
  teacherStyle: TeacherStyle;
  volume: number;
}

export function SpeakingScreen({ words, onComplete, onRestart, teacherStyle, volume }: Props) {
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [testFinished, setTestFinished] = useState(false);
  const [finalFeedback, setFinalFeedback] = useState('');
  const [finalScore, setFinalScore] = useState(0);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  
  const nextPlayTimeRef = useRef<number>(0);
  const sourceNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume / 100;
    }
  }, [volume]);

  useEffect(() => {
    let isActive = true;

    const initLiveSession = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const audioCtx = audioContextRef.current;
        
        // Setup GainNode for volume control
        const mainGainNode = audioCtx.createGain();
        mainGainNode.gain.value = volume / 100;
        mainGainNode.connect(audioCtx.destination);
        gainNodeRef.current = mainGainNode;

        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }

        const workletCode = `
          class PCMProcessor extends AudioWorkletProcessor {
            process(inputs, outputs, parameters) {
              const input = inputs[0];
              if (input && input.length > 0) {
                const channelData = input[0];
                const pcm16 = new Int16Array(channelData.length);
                for (let i = 0; i < channelData.length; i++) {
                  pcm16[i] = Math.max(-1, Math.min(1, channelData[i])) * 32767;
                }
                this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
              }
              return true;
            }
          }
          registerProcessor('pcm-processor', PCMProcessor);
        `;
        const blob = new Blob([workletCode], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        await audioCtx.audioWorklet.addModule(url);

        const source = audioCtx.createMediaStreamSource(stream);
        const workletNode = new AudioWorkletNode(audioCtx, 'pcm-processor');
        workletNodeRef.current = workletNode;

        const sessionPromise = startLiveSpeakingSession(
          words,
          teacherStyle,
          (base64Audio) => {
            if (!isActive) return;
            playAudioChunk(base64Audio);
          },
          () => {
            if (!isActive) return;
            interruptAudioPlayback();
          },
          (score, feedback) => {
            if (!isActive) return;
            setFinalScore(score);
            setFinalFeedback(feedback);
            setTestFinished(true);
          }
        );

        workletNode.port.onmessage = (e) => {
          if (!isActive) return;
          const pcm16 = new Int16Array(e.data);
          let binary = '';
          const bytes = new Uint8Array(pcm16.buffer);
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = window.btoa(binary);
          sessionPromise.then(session => {
            session.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } });
          }).catch(() => {});
        };

        source.connect(workletNode);
        // Connect to a GainNode with gain 0 to avoid feedback loop but keep processing
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = 0;
        workletNode.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        const session = await sessionPromise;
        if (!isActive) {
          session.close();
          return;
        }
        sessionRef.current = session;
        setIsConnected(true);
        setIsConnecting(false);

        // Trigger the AI to start speaking immediately
        session.sendClientContent({
          turns: [{ role: "user", parts: [{ text: "老師你好，我準備好開始測驗了，請直接開始第一題！" }] }],
          turnComplete: true
        });

      } catch (error) {
        console.error("Failed to initialize live session:", error);
        setIsConnecting(false);
      }
    };

    initLiveSession();

    return () => {
      isActive = false;
      if (sessionRef.current) {
        try { sessionRef.current.close(); } catch (e) {}
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      interruptAudioPlayback();
    };
  }, [words]);

  const playAudioChunk = (base64Audio: string) => {
    const audioCtx = audioContextRef.current;
    if (!audioCtx) return;

    setIsSpeaking(true);

    const binaryString = window.atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }
    
    const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    
    if (gainNodeRef.current) {
      source.connect(gainNodeRef.current);
    } else {
      source.connect(audioCtx.destination);
    }

    const currentTime = audioCtx.currentTime;
    const startTime = Math.max(currentTime, nextPlayTimeRef.current);
    
    source.start(startTime);
    nextPlayTimeRef.current = startTime + audioBuffer.duration;
    
    sourceNodesRef.current.push(source);

    source.onended = () => {
      sourceNodesRef.current = sourceNodesRef.current.filter(n => n !== source);
      if (sourceNodesRef.current.length === 0) {
        setIsSpeaking(false);
      }
    };
  };

  const interruptAudioPlayback = () => {
    sourceNodesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourceNodesRef.current = [];
    if (audioContextRef.current) {
      nextPlayTimeRef.current = audioContextRef.current.currentTime;
    }
    setIsSpeaking(false);
  };

  const handleFinish = () => {
    const generatedResults = words.map(w => ({
      word: w.word,
      speakingScore: finalScore,
      speakingFeedback: finalFeedback
    }));
    onComplete(generatedResults);
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-slate-700">即時語音口說測驗</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onRestart}
            className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-full transition-colors"
          >
            取消測驗
          </button>
          <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            Live
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        {isConnecting ? (
          <div className="flex flex-col items-center gap-4 text-slate-500">
            <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
            <p className="text-lg">正在連線至 Teacher Gemini...</p>
          </div>
        ) : testFinished ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center max-w-md w-full"
          >
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">測驗完成！</h3>
            <p className="text-slate-600 mb-6">{finalFeedback}</p>
            <div className="text-4xl font-black text-indigo-600 mb-8">{finalScore} 分</div>
            
            <button
              onClick={handleFinish}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-colors"
            >
              接續筆試
            </button>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center gap-12 w-full max-w-md">
            {/* AI Avatar */}
            <div className="relative">
              <motion.div 
                animate={{ 
                  scale: isSpeaking ? [1, 1.1, 1] : 1,
                  boxShadow: isSpeaking ? "0 0 40px rgba(99, 102, 241, 0.4)" : "0 0 0px rgba(99, 102, 241, 0)"
                }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-40 h-40 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center shadow-xl z-10 relative"
              >
                <Volume2 className={`w-16 h-16 text-white ${isSpeaking ? 'animate-pulse' : ''}`} />
              </motion.div>
              
              {/* Ripple effects when speaking */}
              {isSpeaking && (
                <>
                  <motion.div 
                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0 bg-indigo-400 rounded-full -z-10"
                  />
                  <motion.div 
                    animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}
                    className="absolute inset-0 bg-indigo-300 rounded-full -z-10"
                  />
                </>
              )}
            </div>

            <div className="text-center">
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Teacher Gemini</h3>
              <p className="text-slate-500">
                {isSpeaking ? "老師正在說話..." : "老師正在聽你說..."}
              </p>
            </div>

            {/* User Mic Indicator */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 w-full flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isSpeaking ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-600'}`}>
                <Mic className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-700">你的麥克風</p>
                <p className="text-sm text-slate-500">
                  {isSpeaking ? "請先聽老師說完" : "請直接說話回應"}
                </p>
              </div>
              {!isSpeaking && (
                <div className="flex gap-1 h-6 items-center">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ height: ["20%", "100%", "20%"] }}
                      transition={{ repeat: Infinity, duration: 0.5 + i * 0.1 }}
                      className="w-1.5 bg-emerald-500 rounded-full"
                    />
                  ))}
                </div>
              )}
            </div>
            
            <p className="text-sm text-slate-400 text-center mt-4">
              請直接對著麥克風說話，老師會即時回應你。<br/>
              測驗包含：{words.map(w => w.translation).join(', ')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
