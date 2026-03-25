import React from 'react';
import { BookOpen, LogIn, Calendar, HardDrive } from 'lucide-react';

interface Props {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: Props) {
  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl">
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-12 w-full text-center space-y-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-indigo-100 rounded-full mb-4">
            <BookOpen className="w-12 h-12 text-indigo-600" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 tracking-tight">tutorxyz</h1>
            <h2 className="text-2xl sm:text-3xl font-bold text-indigo-600">AI 智能單字家教</h2>
            <p className="text-slate-600 text-lg pt-2 max-w-md mx-auto leading-relaxed">
              結合 Gemini AI 技術，為孩子提供沉浸式的單字學習環境。透過即時對話練習、美式發音糾正與客製化測驗，讓學習語言變得自然又有趣。
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 text-left space-y-6 border border-slate-100">
            <h3 className="font-bold text-slate-700 mb-2 border-b border-slate-200 pb-2">為什麼需要登入 Google 帳號？</h3>
            
            <div className="flex gap-4 items-start">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-700 text-sm">串聯 Google 日曆：自動記錄學習歷程</h4>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">
                  我們申請存取您的日曆權限，是為了將每次的測驗成績（分數、錯誤單字、測驗時間）紀錄於專屬日曆中，讓家長與孩子能清晰追蹤長期的學習曲線。
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="p-2 bg-emerald-100 rounded-lg shrink-0">
                <HardDrive className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-700 text-sm">存取 Google 雲端硬碟：保護您的隱私設定</h4>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">
                  我們使用 Google Drive App Data 資料夾來儲存您的 AI 金鑰 (API Key) 及個人偏好設定。這確保了敏感資訊僅儲存在您個人的雲端空間，tutorxyz 伺服器不會保存您的私密金鑰。
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button 
              onClick={onLogin}
              className="inline-flex items-center justify-center gap-3 px-10 py-4 bg-indigo-600 text-white font-bold text-xl rounded-full hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-1 w-full sm:w-auto"
              aria-label="使用 Google 帳號開始學習"
            >
              <LogIn className="w-6 h-6" />
              使用 Google 帳號開始學習
            </button>
            <p className="text-slate-400 text-xs mt-4">
              登入即表示您同意我們的服務條款與隱私權政策。
            </p>
          </div>
        </div>
      </div>

      <footer className="w-full max-w-2xl py-8 mt-4 border-t border-slate-200 text-center space-y-2">
        <div className="flex justify-center gap-6 text-sm font-medium">
          <a href="/privacy.html" className="text-indigo-600 hover:text-indigo-800 transition-colors">隱私權政策</a>
          <a href="/terms.html" className="text-indigo-600 hover:text-indigo-800 transition-colors">服務條款</a>
          <a href="mailto:support@tutorxyz.ken7.me" className="text-slate-500 hover:text-slate-700 transition-colors">聯繫支援</a>
        </div>
        <p className="text-slate-400 text-xs">
          © 2026 tutorxyz. 版權所有。
        </p>
      </footer>
    </div>
  );
}

