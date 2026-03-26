import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Loader2, Camera, Upload, Image as ImageIcon, X, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Word } from '../types';
import { generateVocabulary, extractWordsFromImage, extractWordsFromText } from '../services/gemini';
import { saveCustomList } from '../services/history';
import { HistoryTab } from './HistoryTab';

interface Props {
  onStart: (words: Word[], topic: string, level: string) => void;
}

export function SetupScreen({ onStart }: Props) {
  const { t, i18n } = useTranslation();
  const [inputMode, setInputMode] = useState<'topic' | 'image' | 'text' | 'history'>('topic');
  const [topic, setTopic] = useState(() => {
    const saved = localStorage.getItem('last_topic');
    return saved !== null ? saved : '';
  });
  const [level, setLevel] = useState(() => {
    const saved = localStorage.getItem('last_level');
    return saved !== null ? saved : '';
  });
  const [count, setCount] = useState(() => {
    const saved = localStorage.getItem('last_count');
    return saved !== null ? parseInt(saved, 10) : 10;
  });
  const [customText, setCustomText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // If no saved values, initialize with current language defaults
    if (!localStorage.getItem('last_topic') && !topic) {
      setTopic(t('setup.defaults.topic'));
    }
    if (!localStorage.getItem('last_level') && !level) {
      setLevel(t('setup.defaults.level'));
    }
  }, [t, topic, level]);

  // Handle language change for defaults if user hasn't modified them
  useEffect(() => {
    // If the field is currently empty, it means we should provide the default for the new language
    if (!localStorage.getItem('last_topic') && !topic) {
      setTopic(t('setup.defaults.topic'));
    }
    if (!localStorage.getItem('last_level') && !level) {
      setLevel(t('setup.defaults.level'));
    }
  }, [i18n.language, t]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
      streamRef.current = stream;
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert(t('setup.errors.camera_denied'));
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImagePreview(dataUrl);
        
        fetch(dataUrl)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
            setSelectedImage(file);
          });
          
        stopCamera();
      }
    }
  };

  const handleStart = async () => {
    setIsLoading(true);
    try {
      let words: Word[] = [];
      let finalTopic = topic;
      let finalLevel = level;

      if (inputMode === 'topic') {
        localStorage.setItem('last_topic', topic);
        localStorage.setItem('last_level', level);
        localStorage.setItem('last_count', count.toString());
        
        words = await generateVocabulary(topic, level, count, i18n.language);
        const savedList = saveCustomList('topic', words, `[${level}] ${topic}`.trim());
        finalTopic = savedList.title;
        finalLevel = t('setup.history_label');
      } else if (inputMode === 'image' && selectedImage && imagePreview) {
        const base64Data = imagePreview.split(',')[1];
        words = await extractWordsFromImage(base64Data, selectedImage.type, count, i18n.language);
        
        if (words.length === 0) {
          alert(t('setup.errors.image_no_words'));
          setIsLoading(false);
          return;
        }
        
        const savedList = saveCustomList('image', words, t('setup.custom_list_label'));
        finalTopic = savedList.title;
        finalLevel = t('setup.custom_list_label');
      } else if (inputMode === 'text' && customText.trim()) {
        words = await extractWordsFromText(customText, count, i18n.language);
        
        if (words.length === 0) {
          alert(t('setup.errors.text_no_words'));
          setIsLoading(false);
          return;
        }
        
        const savedList = saveCustomList('text', words, t('setup.custom_list_label'));
        finalTopic = savedList.title;
        finalLevel = t('setup.custom_list_label');
      }

      onStart(words, finalTopic, finalLevel);
    } catch (error) {
      console.error(error);
      alert(t('setup.errors.failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto p-4 sm:p-8">
      <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-10 w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-full mb-4">
            <BookOpen className="w-10 h-10 text-indigo-600" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 tracking-tight">{t('login.title')}</h1>
          <h2 className="text-xl sm:text-2xl font-bold text-indigo-600">{t('setup.title')}</h2>
          <p className="text-slate-500 text-base sm:text-lg pt-1">{t('setup.subtitle')}</p>
        </div>

        {/* Input Mode Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-xl overflow-x-auto">
          {(['topic', 'image', 'text', 'history'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setInputMode(mode)}
              className={`flex-1 py-3 px-2 text-sm sm:text-base font-medium rounded-lg transition-all whitespace-nowrap flex items-center justify-center gap-1 ${
                inputMode === mode 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {mode === 'history' && <History className="w-4 h-4" />}
              {t(`setup.tabs.${mode}`)}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {inputMode === 'history' ? (
            <HistoryTab onStartTest={(words, topic, level) => onStart(words, topic, level)} />
          ) : inputMode === 'topic' ? (
            <>
              <div>
                <label className="block text-lg font-medium text-slate-700 mb-2">{t('setup.level_label')}</label>
                <input 
                  type="text" 
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full text-xl p-4 border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all bg-white"
                  placeholder={t('setup.level_placeholder')}
                />
              </div>

              <div>
                <label className="block text-lg font-medium text-slate-700 mb-2">{t('setup.topic_label')}</label>
                <input 
                  type="text" 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full text-xl p-4 border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                  placeholder={t('setup.topic_placeholder')}
                />
              </div>
            </>
          ) : inputMode === 'image' ? (
            <div className="space-y-4">
              <label className="block text-lg font-medium text-slate-700 mb-2">{t('setup.image_label')}</label>
              
              {!imagePreview ? (
                isCameraOpen ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 bg-black aspect-video flex flex-col items-center justify-center">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                      <button
                        onClick={stopCamera}
                        className="px-6 py-2 bg-white/20 backdrop-blur-md text-white rounded-full font-medium hover:bg-white/30 transition-colors"
                        aria-label={t('setup.camera.cancel')}
                      >
                        {t('setup.camera.cancel')}
                      </button>
                      <button
                        onClick={capturePhoto}
                        className="w-14 h-14 bg-white rounded-full border-4 border-indigo-500 shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
                        aria-label={t('setup.camera.capture')}
                      >
                        <Camera className="w-6 h-6 text-indigo-600" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={startCamera}
                      className="flex flex-col items-center justify-center p-6 sm:p-8 border-2 border-dashed border-slate-300 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                    >
                      <div className="w-14 h-14 bg-slate-100 group-hover:bg-indigo-100 rounded-full flex items-center justify-center mb-4 transition-colors">
                        <Camera className="w-7 h-7 text-slate-500 group-hover:text-indigo-600" />
                      </div>
                      <span className="text-slate-600 font-medium">{t('setup.camera.live')}</span>
                    </button>
                    
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center p-6 sm:p-8 border-2 border-dashed border-slate-300 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                    >
                      <div className="w-14 h-14 bg-slate-100 group-hover:bg-indigo-100 rounded-full flex items-center justify-center mb-4 transition-colors">
                        <Upload className="w-7 h-7 text-slate-500 group-hover:text-indigo-600" />
                      </div>
                      <span className="text-slate-600 font-medium">{t('setup.camera.upload')}</span>
                    </button>
                  </div>
                )
              ) : (
                <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-50">
                  <img 
                    src={imagePreview} 
                    alt="Selected vocabulary list" 
                    className="w-full h-48 sm:h-64 object-contain"
                  />
                  <button
                    onClick={clearImage}
                    className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm text-slate-700 rounded-full shadow-sm hover:bg-red-50 hover:text-red-600 transition-colors"
                    aria-label={t('setup.camera.clear')}
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <div className="flex items-center text-white gap-2">
                      <ImageIcon className="w-4 h-4" />
                      <span className="text-sm font-medium truncate">{selectedImage?.name || t('setup.camera.selected')}</span>
                    </div>
                  </div>
                </div>
              )}
              
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block text-lg font-medium text-slate-700 mb-2">{t('setup.text_label')}</label>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-full h-48 text-lg p-4 border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all resize-none bg-white"
                placeholder={t('setup.text_placeholder')}
              />
            </div>
          )}

          {inputMode !== 'history' && (
            <div className="space-y-6">
              <div>
                <label className="block text-lg font-medium text-slate-700 mb-2">
                  {inputMode === 'topic' 
                    ? t('setup.units.word_count', { count }) 
                    : t('setup.units.word_count_max', { count })}
                </label>
                <input 
                  type="range" 
                  min="3" 
                  max="20" 
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value))}
                  className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>
          )}
        </div>

        {inputMode !== 'history' && (
          <button 
            onClick={handleStart}
            disabled={isLoading || (inputMode === 'image' && !selectedImage) || (inputMode === 'text' && !customText.trim())}
            className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 text-white text-2xl font-bold rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin" />
                <span>{t(`setup.loading.${inputMode}`)}</span>
              </>
            ) : (
              t('setup.start_button')
            )}
          </button>
        )}
      </div>
    </div>
  );
}
