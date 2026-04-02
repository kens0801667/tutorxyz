import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, ChevronRight, ChevronLeft, Loader2, Play } from 'lucide-react';
import { Word, TeacherStyle } from '../types';
import { generateAudio, generateTeacherScript, getVoiceConfig } from '../services/gemini';

interface Props {
  words: Word[];
  onComplete: () => void;
  onRestart: () => void;
  teacherStyle: TeacherStyle;
  volume: number;
}

export function LearningScreen({ words, onComplete, onRestart, teacherStyle, volume }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const playIdRef = useRef<number>(0);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume / 100;
    }
  }, [volume]);

  const word = words[currentIndex];

  const stopCurrentAudio = () => {
    playIdRef.current += 1; // Increment to cancel any pending playAudio
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {
        // ignore
      }
      audioSourceRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  useEffect(() => {
    return () => {
      stopCurrentAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playAudio = async (text: string) => {
    if (isPlaying || isLoadingAudio) return;
    
    setIsLoadingAudio(true);
    const currentPlayId = ++playIdRef.current;
    
    const fallbackToBrowserTTS = () => {
      if (playIdRef.current !== currentPlayId) return;
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Cancel any existing speech
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Use teacher style config for fallback
        const voiceConfig = getVoiceConfig(teacherStyle);
        utterance.lang = voiceConfig.lang;
        utterance.pitch = voiceConfig.pitch;
        utterance.rate = voiceConfig.rate;
        utterance.volume = volume / 100;
        
        utterance.onstart = () => {
          if (playIdRef.current === currentPlayId) setIsPlaying(true);
        };
        utterance.onend = () => {
          if (playIdRef.current === currentPlayId) setIsPlaying(false);
        };
        utterance.onerror = () => {
          if (playIdRef.current === currentPlayId) setIsPlaying(false);
        };
        window.speechSynthesis.speak(utterance);
      } else {
        setIsPlaying(false);
      }
    };

    try {
      const base64Audio = await generateAudio(text, teacherStyle);
      if (playIdRef.current !== currentPlayId) return;
      
      if (base64Audio) {
        stopCurrentAudio();
        playIdRef.current = currentPlayId; // Restore the playId since stopCurrentAudio increments it
        
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          const mainGainNode = audioContextRef.current.createGain();
          mainGainNode.gain.value = volume / 100;
          mainGainNode.connect(audioContextRef.current.destination);
          gainNodeRef.current = mainGainNode;
        }
        const audioContext = audioContextRef.current;
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        
        // Decode base64 to raw PCM bytes
        const binaryString = window.atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Convert 16-bit PCM to Float32 for Web Audio API
        const int16Array = new Int16Array(bytes.buffer);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768.0;
        }

        // Create audio buffer (1 channel, 24000 Hz)
        const audioBuffer = audioContext.createBuffer(1, float32Array.length, 24000);
        audioBuffer.getChannelData(0).set(float32Array);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        
        if (gainNodeRef.current) {
          source.connect(gainNodeRef.current);
        } else {
          source.connect(audioContext.destination);
        }
        
        source.onended = () => {
          if (playIdRef.current === currentPlayId) {
            setIsPlaying(false);
            audioSourceRef.current = null;
          }
        };
        
        audioSourceRef.current = source;
        setIsPlaying(true);
        source.start();
      } else {
        fallbackToBrowserTTS();
      }
    } catch (error) {
      console.warn("Audio generation failed, using fallback:", error);
      fallbackToBrowserTTS();
    } finally {
      if (playIdRef.current === currentPlayId) {
        setIsLoadingAudio(false);
      }
    }
  };

  const playTeacherScript = async () => {
    if (isPlaying || isLoadingAudio) return;
    setIsLoadingAudio(true);
    try {
      const script = await generateTeacherScript(word.word, word.translation);
      await playAudio(script);
    } catch (error) {
      console.error(error);
      setIsLoadingAudio(false);
    }
  };

  const handleNext = () => {
    stopCurrentAudio();
    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    stopCurrentAudio();
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 sm:p-6">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-700 whitespace-nowrap">單字學習</h2>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={onRestart}
            className="px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-full transition-colors whitespace-nowrap"
          >
            取消學習
          </button>
          <button
            onClick={() => {
              stopCurrentAudio();
              onComplete();
            }}
            className="px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100 bg-indigo-50 rounded-full transition-colors whitespace-nowrap"
          >
            略過學習
          </button>
          <div className="bg-indigo-100 text-indigo-700 px-3 py-2 sm:px-4 sm:py-2 rounded-full font-bold text-sm sm:text-lg whitespace-nowrap">
            {currentIndex + 1} / {words.length}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-2xl bg-white rounded-[2rem] sm:rounded-[3rem] shadow-2xl p-6 sm:p-12 flex flex-col items-center text-center max-h-full overflow-y-auto"
          >
            <div className="mb-4 sm:mb-6">
              <span className="inline-block px-3 py-1 sm:px-4 sm:py-1 bg-slate-100 text-slate-500 rounded-full text-sm sm:text-lg font-medium mb-3 sm:mb-4">
                {word.partOfSpeech}
              </span>
              <h1 className="text-5xl sm:text-7xl font-bold text-slate-900 mb-2 sm:mb-4 tracking-tight">{word.word}</h1>
              <p className="text-2xl sm:text-3xl text-indigo-600 font-medium">{word.translation}</p>
            </div>

            <div className="flex gap-4 mb-6 sm:mb-10">
              <button 
                onClick={() => playAudio(word.word)}
                disabled={isLoadingAudio || isPlaying}
                className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-100 transition-colors disabled:opacity-50 flex-shrink-0"
                title="聽發音"
                aria-label="播放單字發音"
              >
                {isLoadingAudio ? <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin" /> : <Volume2 className="w-8 h-8 sm:w-10 sm:h-10" />}
              </button>
              <button 
                onClick={playTeacherScript}
                disabled={isLoadingAudio || isPlaying}
                className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-100 transition-colors disabled:opacity-50 flex-shrink-0"
                title="老師講解"
                aria-label="播放老師講解"
              >
                {isLoadingAudio ? <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin" /> : <Play className="w-8 h-8 sm:w-10 sm:h-10 ml-1" />}
              </button>
            </div>

            <div className="w-full bg-slate-50 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-left border border-slate-100">
              <div className="flex justify-between items-start mb-2 sm:mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-slate-400 uppercase tracking-wider">例句 Example</h3>
                <button 
                  onClick={() => playAudio(word.exampleSentence)}
                  disabled={isLoadingAudio || isPlaying}
                  className="text-indigo-500 hover:text-indigo-700 disabled:opacity-50 flex-shrink-0"
                  aria-label="播放例句發音"
                >
                  <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
              <p className="text-xl sm:text-2xl text-slate-800 font-medium mb-2 sm:mb-3 leading-relaxed">{word.exampleSentence}</p>
              <p className="text-lg sm:text-xl text-slate-500">{word.exampleTranslation}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-between items-center mt-4 sm:mt-8 gap-4">
        <button 
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="p-4 sm:p-6 bg-white rounded-full shadow-md text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all flex-shrink-0"
          aria-label="上一個單字"
        >
          <ChevronLeft className="w-6 h-6 sm:w-8 h-8" />
        </button>
        <button 
          onClick={handleNext}
          className="flex-1 sm:flex-none px-6 sm:px-10 py-4 sm:py-5 bg-indigo-600 text-white text-xl sm:text-2xl font-bold rounded-full shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
        >
          {currentIndex === words.length - 1 ? '完成學習' : '下一個'}
          <ChevronRight className="w-6 h-6 sm:w-8 h-8" />
        </button>
      </div>
    </div>
  );
}
