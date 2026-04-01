import React from 'react';
import { BookOpen, LogIn, Calendar, HardDrive, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: Props) {
  const { t, i18n } = useTranslation();

  const languages = [
    { code: 'zh-Hant', name: '繁體中文' },
    { code: 'zh-Hans', name: '简体中文' },
    { code: 'en', name: 'English' },
    { code: 'ko', name: '한국어' },
    { code: 'ja', name: '日本語' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
  ];

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-slate-100 p-4 sm:p-8">
      {/* Language Switcher */}
      <div className="w-full max-w-2xl flex justify-end mb-4">
        <div className="relative inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 hover:border-indigo-300 transition-all text-sm font-medium group">
          <Globe className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
          <select
            value={i18n.language}
            onChange={handleLanguageChange}
            className="bg-transparent border-none outline-none cursor-pointer pr-1 py-0.5 appearance-none min-w-[100px]"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 flex items-center">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl">
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-12 w-full text-center space-y-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-indigo-100 rounded-full mb-4">
            <BookOpen className="w-12 h-12 text-indigo-600" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 tracking-tight">{t('login.title')}</h1>
            <h2 className="text-2xl sm:text-3xl font-bold text-indigo-600">{t('login.subtitle')}</h2>
            <p className="text-slate-600 text-lg pt-2 max-w-md mx-auto leading-relaxed">
              {t('login.description')}
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 text-left space-y-6 border border-slate-100">
            <h3 className="font-bold text-slate-700 mb-2 border-b border-slate-200 pb-2">{t('login.why_google_title')}</h3>
            
            <div className="flex gap-4 items-start">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-700 text-sm">{t('login.calendar_title')}</h4>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">
                  {t('login.calendar_desc')}
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="p-2 bg-emerald-100 rounded-lg shrink-0">
                <HardDrive className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-700 text-sm">{t('login.drive_title')}</h4>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">
                  {t('login.drive_desc')}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button 
              onClick={onLogin}
              className="inline-flex items-center justify-center gap-3 px-10 py-4 bg-indigo-600 text-white font-bold text-xl rounded-full hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-1 w-full sm:w-auto"
              aria-label={t('login.cta_button')}
            >
              <LogIn className="w-6 h-6" />
              {t('login.cta_button')}
            </button>
            <p className="text-slate-400 text-xs mt-4">
              {t('login.agreement')}
            </p>
          </div>
        </div>
      </div>

      <footer className="w-full max-w-2xl py-8 mt-4 border-t border-slate-200 text-center space-y-2">
        <div className="flex justify-center gap-6 text-sm font-medium">
          <a href="/privacy.html" className="text-indigo-600 hover:text-indigo-800 transition-colors">{t('login.privacy')}</a>
          <a href="/terms.html" className="text-indigo-600 hover:text-indigo-800 transition-colors">{t('login.terms')}</a>
          <a href="mailto:support@tutorxyz.ken7.me" className="text-slate-500 hover:text-slate-700 transition-colors">{t('login.contact')}</a>
        </div>
        <p className="text-slate-400 text-xs">
          {t('login.copyright')}
        </p>
      </footer>
    </div>
  );
}
