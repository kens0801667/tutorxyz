import React, { useState, useEffect } from 'react';
import { AppMode, Word, TestResult, TeacherStyle } from './types';
import { SetupScreen } from './components/SetupScreen';
import { LearningScreen } from './components/LearningScreen';
import { SpeakingScreen } from './components/SpeakingScreen';
import { WrittenScreen } from './components/WrittenScreen';
import { ReportScreen } from './components/ReportScreen';
import { ApiKeySetupScreen, AppConfig } from './components/ApiKeySetupScreen';
import { LoginScreen } from './components/LoginScreen';
import { BookOpen, Mic, PenTool, BarChart, LogIn, LogOut, Loader2, Settings } from 'lucide-react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { getOrCreateCalendar, addTestResultToCalendar } from './services/calendar';
import { getConfigFromDrive, saveConfigToDrive } from './services/drive';
import { setGeminiApiKey } from './services/gemini';

export default function App() {
  const [mode, setMode] = useState<AppMode>('setup');
  const [words, setWords] = useState<Word[]>([]);
  const [speakingResults, setSpeakingResults] = useState<Partial<TestResult>[]>([]);
  const [writtenResults, setWrittenResults] = useState<Partial<TestResult>[]>([]);
  const [sessionInfo, setSessionInfo] = useState<{topic: string, level: string} | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [grantedScopes, setGrantedScopes] = useState<string>('');
  const [isSavingToCalendar, setIsSavingToCalendar] = useState(false);
  
  const [isCheckingKey, setIsCheckingKey] = useState(false);
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);

  const checkApiKey = async (token: string) => {
    setIsCheckingKey(true);
    try {
      const config = await getConfigFromDrive(token);
      if (config && config.geminiApiKey) {
        setGeminiApiKey(config.geminiApiKey);
        setAppConfig(config);
        setShowApiKeySetup(false);
      } else {
        setShowApiKeySetup(true);
      }
    } catch (error: any) {
      if (error.message === 'UNAUTHORIZED') {
        handleLogout();
      } else {
        console.error("Config check failed", error);
        setShowApiKeySetup(true);
      }
    }
    setIsCheckingKey(false);
  };

  const checkScope = (requiredScope: string) => {
    if (!grantedScopes) return false;
    // Google returns scopes as a space-separated string
    const scopesList = grantedScopes.split(' ');
    return scopesList.includes(requiredScope);
  };

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      setAccessToken(tokenResponse.access_token);
      setGrantedScopes(tokenResponse.scope || '');
      checkApiKey(tokenResponse.access_token);
    },
    scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive.appdata',
    include_granted_scopes: true,
    onError: () => {

      alert("登入失敗，請重試。");
    }
  });

  const handleLogout = () => {
    googleLogout();
    setAccessToken(null);
    setAppConfig(null);
    setShowApiKeySetup(false);
    handleRestart();
  };

  const handleSaveConfig = async (config: AppConfig) => {
    if (!accessToken) return;
    
    if (!checkScope('https://www.googleapis.com/auth/drive.appdata')) {
      const confirm = window.confirm('儲存金鑰需要您的 Google Drive 授權。是否現在進行授權？');
      if (confirm) login();
      return;
    }

    try {
      const success = await saveConfigToDrive(accessToken, config);
      if (success) {
        setGeminiApiKey(config.geminiApiKey);
        setAppConfig(config);
        setShowApiKeySetup(false);
      } else {
        alert("儲存設定失敗，請重試。");
      }
    } catch (error: any) {
      if (error.message === 'UNAUTHORIZED') {
        alert('登入已過期，請重新登入。');
        handleLogout();
      } else {
        alert("儲存設定失敗，請重試。");
      }
    }
  };

  const handleStart = (generatedWords: Word[], topic: string, level: string) => {
    setWords(generatedWords);
    setSessionInfo({ topic, level });
    setSessionStartTime(new Date());
    setMode('learning');
  };

  const handleLearningComplete = () => {
    setMode('speaking');
  };

  const handleSpeakingComplete = (results: Partial<TestResult>[]) => {
    setSpeakingResults(results);
    setMode('written');
  };

  const handleWrittenComplete = async (results: Partial<TestResult>[]) => {
    setWrittenResults(results);
    setMode('report');
    
    // Save session to Google Calendar if logged in
    if (accessToken && sessionInfo && appConfig) {
      setIsSavingToCalendar(true);
      try {
        const totalWords = words.length;
        const writtenCorrectCount = results.filter(r => r.writtenCorrect).length;
        const writtenScore = Math.round((writtenCorrectCount / totalWords) * 100) || 0;
        
        const validSpeaking = speakingResults.filter(r => r.speakingScore !== undefined);
        const avgSpeakingScore = validSpeaking.length > 0 
          ? Math.round(validSpeaking.reduce((acc, curr) => acc + (curr.speakingScore || 0), 0) / validSpeaking.length)
          : 0;

        const finalScore = Math.round((writtenScore + avgSpeakingScore) / 2);
        
        const mistakes = results
          .filter(r => !r.writtenCorrect)
          .map(r => r.word);

        const endTime = new Date();
        const startTime = sessionStartTime || new Date(endTime.getTime() - 30 * 60000); // Fallback to 30 mins if null

        if (!checkScope('https://www.googleapis.com/auth/calendar')) {
          const confirm = window.confirm('儲存至日曆功能需要您的授權。是否現在進行授權？');
          if (confirm) login();
          return;
        }

        const calendarId = await getOrCreateCalendar(accessToken, appConfig.calendarName);
        await addTestResultToCalendar(accessToken, calendarId, sessionInfo.topic, finalScore, mistakes, words.length, startTime, endTime);
        
        alert('測驗成績已成功儲存至您的 Google 日曆！');
      } catch (error: any) {
        console.error("Error saving to calendar:", error);
        if (error.message === 'UNAUTHORIZED') {
          alert('登入已過期，請重新登入。');
          handleLogout();
        } else {
          alert('儲存至日曆失敗，請檢查權限設定。');
        }
      } finally {
        setIsSavingToCalendar(false);
      }
    }
  };

  const handleRestart = () => {
    setWords([]);
    setSpeakingResults([]);
    setWrittenResults([]);
    setSessionInfo(null);
    setSessionStartTime(null);
    setMode('setup');
  };

  const steps = [
    { id: 'setup', icon: BookOpen, label: '設定' },
    { id: 'learning', icon: BookOpen, label: '學習' },
    { id: 'speaking', icon: Mic, label: '口說' },
    { id: 'written', icon: PenTool, label: '筆試' },
    { id: 'report', icon: BarChart, label: '報告' },
  ];

  if (!accessToken) {
    return <LoginScreen onLogin={() => login()} />;
  }

  if (isCheckingKey) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-lg font-bold text-slate-700">正在檢查系統設定...</p>
        </div>
      </div>
    );
  }

  if (showApiKeySetup) {
    return (
      <div className="min-h-screen bg-slate-100">
        <ApiKeySetupScreen 
          onSave={handleSaveConfig} 
          initialConfig={appConfig || undefined}
          onCancel={appConfig ? () => setShowApiKeySetup(false) : undefined}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex flex-col">
      {/* Header / Progress Bar */}
      <header className="bg-white shadow-sm px-4 py-3 md:px-8 md:py-4 flex justify-between items-center overflow-x-auto">
        <div className="flex items-center gap-2 md:gap-12 min-w-max pr-4">
          {steps.map((step, index) => {
            const isActive = mode === step.id;
            const isPast = steps.findIndex(s => s.id === mode) > index;
            const Icon = step.icon;
            
            return (
              <div key={step.id} className="flex items-center gap-2 md:gap-3">
                <div className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full transition-colors shrink-0 ${
                  isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 
                  isPast ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  <Icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <span className={`hidden md:block font-bold text-lg ${
                  isActive ? 'text-indigo-900' : 
                  isPast ? 'text-indigo-600' : 'text-slate-400'
                }`}>
                  {step.label}
                </span>
                {index < steps.length - 1 && (
                  <div className={`hidden md:block w-12 h-1 rounded-full ml-2 md:ml-4 ${
                    isPast ? 'bg-indigo-200' : 'bg-slate-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
        
        <div className="shrink-0 ml-2">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => setShowApiKeySetup(true)}
              className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              title="設定"
              aria-label="開啟設定"
            >
              <Settings className="w-5 h-5" />
              <span className="hidden sm:block">設定</span>
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              aria-label="登出帳號"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:block">登出</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {isSavingToCalendar && (
          <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              <p className="text-lg font-bold text-slate-700">正在儲存成績至 Google 日曆...</p>
            </div>
          </div>
        )}
        {mode === 'setup' && <SetupScreen onStart={handleStart} />}
        {mode === 'learning' && <LearningScreen words={words} onComplete={handleLearningComplete} onRestart={handleRestart} teacherStyle={appConfig?.teacherStyle || 'enthusiastic'} />}
        {mode === 'speaking' && <SpeakingScreen words={words} onComplete={handleSpeakingComplete} onRestart={handleRestart} teacherStyle={appConfig?.teacherStyle || 'enthusiastic'} />}
        {mode === 'written' && <WrittenScreen words={words} onComplete={handleWrittenComplete} onRestart={handleRestart} />}
        {mode === 'report' && (
          <ReportScreen 
            words={words} 
            speakingResults={speakingResults} 
            writtenResults={writtenResults} 
            onRestart={handleRestart} 
          />
        )}
      </main>

      {/* Persistent Footer for logged-in users */}
      <footer className="bg-white border-t border-slate-200 py-3 px-4 text-center">
        <div className="flex justify-center gap-4 text-xs font-medium">
          <a href="/privacy.html" className="text-slate-500 hover:text-indigo-600 transition-colors">隱私權政策</a>
          <a href="/terms.html" className="text-slate-500 hover:text-indigo-600 transition-colors">服務條款</a>
          <span className="text-slate-300">|</span>
          <span className="text-slate-400">© 2026 tutorxyz</span>
        </div>
      </footer>
    </div>
  );
}

