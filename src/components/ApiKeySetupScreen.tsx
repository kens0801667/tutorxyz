import React, { useState, useEffect } from 'react';
import { Key, ExternalLink, Loader2, CheckCircle2, AlertTriangle, Calendar, FileJson, Mic2, X, Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TeacherStyle } from '../types';
import { listAvailableModels } from '../services/gemini';

export interface AppConfig {
  geminiApiKey: string;
  calendarName: string;
  configFileName: string;
  teacherStyle: TeacherStyle;
  geminiModel?: string;
  geminiLiveModel?: string;
  volume?: number;
}

interface Props {
  onSave: (config: AppConfig) => Promise<void>;
  onCancel?: () => void;
  initialConfig?: Partial<AppConfig>;
}

export function ApiKeySetupScreen({ onSave, onCancel, initialConfig }: Props) {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState(initialConfig?.geminiApiKey || '');
  const [calendarName, setCalendarName] = useState(initialConfig?.calendarName || '');
  const [configFileName, setConfigFileName] = useState(initialConfig?.configFileName || 'tutorxyz_config.json');
  const [teacherStyle, setTeacherStyle] = useState<TeacherStyle>(initialConfig?.teacherStyle || 'enthusiastic');
  
  const [geminiModel, setGeminiModel] = useState(initialConfig?.geminiModel || 'gemini-3-flash-preview');
  const [geminiLiveModel, setGeminiLiveModel] = useState(initialConfig?.geminiLiveModel || 'gemini-2.5-flash-native-audio-preview-09-2025');
  const [volume, setVolume] = useState(initialConfig?.volume ?? 100);
  
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableLiveModels, setAvailableLiveModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchModels = async () => {
      if (apiKey.length > 20) {
        setIsLoadingModels(true);
        try {
          const models = await listAvailableModels(apiKey);
          setAvailableModels(models.standard);
          setAvailableLiveModels(models.live);
        } catch (error) {
          console.error("Error fetching models:", error);
        }
        setIsLoadingModels(false);
      }
    };
    fetchModels();
  }, [apiKey]);

  useEffect(() => {
    if (!calendarName && !initialConfig?.calendarName) {
      setCalendarName(t('settings.calendar_default_name'));
    }
  }, [t, calendarName, initialConfig]);

  const handleResetCalendarName = () => {
    setCalendarName(t('settings.calendar_default_name'));
  };

  const handleSave = async () => {
    if (!apiKey.trim() || !calendarName.trim() || !configFileName.trim()) return;
    setIsSaving(true);
    await onSave({
      geminiApiKey: apiKey.trim(),
      calendarName: calendarName.trim(),
      configFileName: configFileName.trim(),
      teacherStyle,
      geminiModel,
      geminiLiveModel,
      volume
    });
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto p-4 sm:p-8">
      <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-10 w-full space-y-8 relative">
        {onCancel && (
          <button 
            onClick={onCancel}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-full mb-2">
            <Key className="w-10 h-10 text-indigo-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800">{t('settings.title')}</h2>
          <p className="text-slate-500 text-lg">
            {t('settings.subtitle')}
            <br />
            {t('settings.description')}
          </p>
        </div>

        <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-600" />
            {t('settings.api_key_title')}
          </h3>
          <div className="pl-7 space-y-3">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t('settings.api_key_placeholder')}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all outline-none font-mono"
            />
            <div className="flex items-start gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold">{t('settings.cost_alert.title')}</p>
                <p>{t('settings.cost_alert.content')}</p>
              </div>
            </div>
            <p className="text-slate-600 text-sm">
              {t('settings.no_key')}
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium ml-1"
              >
                {t('settings.get_key')} <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>

        <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Mic2 className="w-5 h-5 text-indigo-600" />
            {t('settings.model_config.title')}
          </h3>
          <div className="pl-7 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">{t('settings.model_config.standard_label')}</label>
              <div className="relative">
                <select
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  disabled={isLoadingModels}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all outline-none appearance-none bg-white disabled:bg-slate-100"
                >
                  {availableModels.length > 0 ? (
                    availableModels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))
                  ) : (
                    <option value={geminiModel}>{geminiModel}</option>
                  )}
                </select>
                {isLoadingModels && (
                  <div className="absolute right-10 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">{t('settings.model_config.live_label')}</label>
              <select
                value={geminiLiveModel}
                onChange={(e) => setGeminiLiveModel(e.target.value)}
                disabled={isLoadingModels}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all outline-none appearance-none bg-white disabled:bg-slate-100"
              >
                {availableLiveModels.length > 0 ? (
                  availableLiveModels.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))
                ) : (
                  <option value={geminiLiveModel}>{geminiLiveModel}</option>
                )}
              </select>
            </div>

            <div className="pt-4 border-t border-slate-200/60">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-indigo-500" />
                  {t('settings.model_config.volume_label')}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Level</span>
                  <span className="text-sm font-black text-indigo-600 border-b-2 border-indigo-200 px-1">{volume}%</span>
                </div>
              </div>
              
              <div className="relative group pt-1">
                <div className="flex items-end gap-1 h-12 mb-2 px-1">
                  {Array.from({ length: 25 }).map((_, i) => {
                    const threshold = (i / 24) * 100;
                    const isActive = volume >= threshold;
                    return (
                      <div
                        key={i}
                        onClick={() => setVolume(Math.round(threshold))}
                        className={`flex-1 rounded-full transition-all duration-300 cursor-pointer ${
                          isActive 
                            ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.4)]' 
                            : 'bg-slate-200 hover:bg-slate-300'
                        }`}
                        style={{ height: `${20 + (i / 24) * 80}%` }}
                      ></div>
                    );
                  })}
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-500 mt-2"
                />
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-2 uppercase tracking-widest font-bold">
                {t('settings.model_config.volume_adjust_hint')}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            {t('settings.calendar_title')}
          </h3>
          <div className="pl-7">
            <p className="text-slate-500 text-sm mb-2">{t('settings.calendar_desc')}</p>
            <div className="relative">
              <input
                type="text"
                value={calendarName}
                onChange={(e) => setCalendarName(e.target.value)}
                placeholder={t('settings.calendar_placeholder')}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all outline-none pr-32"
              />
              <button
                type="button"
                onClick={handleResetCalendarName}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-100"
              >
                {t('settings.reset_to_default')}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4 bg-slate-100 p-6 rounded-2xl">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <FileJson className="w-5 h-5 text-slate-500" />
            {t('settings.config_file_title')}
          </h3>
          <div className="pl-7">
            <p className="text-slate-500 text-sm mb-2">{t('settings.config_file_desc')}</p>
            <input
              type="text"
              value={configFileName}
              onChange={(e) => setConfigFileName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-600 focus:border-slate-400 outline-none font-mono text-sm"
              readOnly
            />
          </div>
        </div>

        <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Mic2 className="w-5 h-5 text-indigo-600" />
            {t('settings.style_title')}
          </h3>
          <div className="pl-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['enthusiastic', 'strict', 'socratic', 'humorous'] as TeacherStyle[]).map((style) => (
              <button
                key={style}
                onClick={() => setTeacherStyle(style)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  teacherStyle === style 
                    ? 'border-indigo-500 bg-indigo-50 ring-4 ring-indigo-500/10' 
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{t(`settings.styles.${style}.icon`)}</span>
                  <span className={`font-bold ${teacherStyle === style ? 'text-indigo-700' : 'text-slate-700'}`}>
                    {t(`settings.styles.${style}.name`)}
                  </span>
                </div>
                <p className="text-sm text-slate-500">{t(`settings.styles.${style}.desc`)}</p>
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
              {t('settings.cancel')}
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
                {t('settings.saving')}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                {t('settings.save')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
