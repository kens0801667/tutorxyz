import React, { useState, useEffect } from 'react';
import { Key, ExternalLink, Loader2, CheckCircle2, AlertTriangle, Calendar, FileJson, Mic2 } from 'lucide-react';
import { TeacherStyle } from '../types';

export interface AppConfig {
  geminiApiKey: string;
  calendarName: string;
  configFileName: string;
  teacherStyle: TeacherStyle;
}

interface Props {
  onSave: (config: AppConfig) => Promise<void>;
  onCancel?: () => void;
  initialConfig?: Partial<AppConfig>;
}

export function ApiKeySetupScreen({ onSave, onCancel, initialConfig }: Props) {
  const [apiKey, setApiKey] = useState(initialConfig?.geminiApiKey || '');
  const [calendarName, setCalendarName] = useState(initialConfig?.calendarName || 'tutorxyz學習紀錄');
  const [configFileName, setConfigFileName] = useState(initialConfig?.configFileName || 'tutorxyz_config.json');
  const [teacherStyle, setTeacherStyle] = useState<TeacherStyle>(initialConfig?.teacherStyle || 'enthusiastic');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!apiKey.trim() || !calendarName.trim() || !configFileName.trim()) return;
    setIsSaving(true);
    await onSave({
      geminiApiKey: apiKey.trim(),
      calendarName: calendarName.trim(),
      configFileName: configFileName.trim(),
      teacherStyle
    });
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto p-4 sm:p-8">
      <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-10 w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-full mb-2">
            <Key className="w-10 h-10 text-indigo-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800">系統設定</h2>
          <p className="text-slate-500 text-lg">
            請設定您的 Gemini API Key 與系統偏好。
            您的設定將會安全地儲存在您個人的 Google Drive 應用程式資料夾中。
          </p>
        </div>

        <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-600" />
            Gemini API Key
          </h3>
          <div className="pl-7 space-y-3">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all outline-none font-mono"
            />
            <div className="flex items-start gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold">費用提醒</p>
                <p>使用 Gemini API 可能會產生費用，具體取決於您的使用量與 Google Cloud 帳單設定。請妥善保管您的金鑰，避免外洩。</p>
              </div>
            </div>
            <p className="text-slate-600 text-sm">
              還沒有金鑰？
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium ml-1"
              >
                前往 Google AI Studio 申請 <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>

        <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            日曆名稱設定
          </h3>
          <div className="pl-7">
            <p className="text-slate-500 text-sm mb-2">測驗成績將會自動記錄到這個名稱的 Google 日曆中：</p>
            <input
              type="text"
              value={calendarName}
              onChange={(e) => setCalendarName(e.target.value)}
              placeholder="例如：tutorxyz學習紀錄"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all outline-none"
            />
          </div>
        </div>

        <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <FileJson className="w-5 h-5 text-indigo-600" />
            設定檔儲存位置
          </h3>
          <div className="pl-7">
            <p className="text-slate-500 text-sm mb-2">儲存在 Google Drive appDataFolder 中的檔案名稱：</p>
            <input
              type="text"
              value={configFileName}
              onChange={(e) => setConfigFileName(e.target.value)}
              placeholder="例如：tutorxyz_config.json"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all outline-none font-mono"
            />
          </div>
        </div>

        <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Mic2 className="w-5 h-5 text-indigo-600" />
            口語老師風格與音色
          </h3>
          <div className="pl-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'enthusiastic', label: '熱情鼓勵型', desc: 'Kore (明亮活力)', icon: '🌟' },
              { id: 'strict', label: '嚴格精準型', desc: 'Fenrir (低沉穩重)', icon: '🧐' },
              { id: 'socratic', label: '引導啟發型', desc: 'Charon (溫和智者)', icon: '🤔' },
              { id: 'humorous', label: '幽默搞笑型', desc: 'Puck (輕鬆活潑)', icon: '😂' }
            ].map((style) => (
              <button
                key={style.id}
                onClick={() => setTeacherStyle(style.id as TeacherStyle)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  teacherStyle === style.id
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{style.icon}</span>
                  <span className={`font-bold ${teacherStyle === style.id ? 'text-indigo-700' : 'text-slate-700'}`}>
                    {style.label}
                  </span>
                </div>
                <p className="text-sm text-slate-500">{style.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isSaving}
              className="flex-1 py-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              取消
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!apiKey.trim() || !calendarName.trim() || !configFileName.trim() || isSaving}
            className="flex-1 py-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:bg-slate-300 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                儲存中...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                儲存設定
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
