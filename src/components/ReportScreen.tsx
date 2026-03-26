import React from 'react';
import { motion } from 'motion/react';
import { Award, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TestResult, Word } from '../types';

interface Props {
  words: Word[];
  speakingResults: Partial<TestResult>[];
  writtenResults: Partial<TestResult>[];
  onRestart: () => void;
}

export function ReportScreen({ words, speakingResults, writtenResults, onRestart }: Props) {
  const { t } = useTranslation();
  const totalWords = words.length;
  const writtenCorrectCount = writtenResults.filter(r => r.writtenCorrect).length;
  const writtenScore = Math.round((writtenCorrectCount / totalWords) * 100) || 0;
  
  const validSpeaking = speakingResults.filter(r => r.speakingScore !== undefined);
  const avgSpeakingScore = validSpeaking.length > 0 
    ? Math.round(validSpeaking.reduce((acc, curr) => acc + (curr.speakingScore || 0), 0) / validSpeaking.length)
    : 0;

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto p-4 sm:p-6 overflow-y-auto">
      <div className="text-center mb-6 sm:mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-24 sm:h-24 bg-indigo-100 rounded-full mb-3 sm:mb-4">
          <Award className="w-8 h-8 sm:w-12 sm:h-12 text-indigo-600" />
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold text-slate-800">{t('report.title')}</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-10">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg p-6 sm:p-8 text-center border-t-8 border-emerald-500">
          <h3 className="text-lg sm:text-2xl font-bold text-slate-500 mb-2">{t('report.avg_speaking')}</h3>
          <div className="text-5xl sm:text-7xl font-black text-emerald-500">{avgSpeakingScore}</div>
        </div>
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg p-6 sm:p-8 text-center border-t-8 border-blue-500">
          <h3 className="text-lg sm:text-2xl font-bold text-slate-500 mb-2">{t('report.written_accuracy')}</h3>
          <div className="text-5xl sm:text-7xl font-black text-blue-500">{writtenScore}%</div>
          <p className="text-sm sm:text-lg text-slate-400 mt-2">{writtenCorrectCount} / {totalWords} {t('report.questions_unit')}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg overflow-hidden mb-6 sm:mb-10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 sm:p-6 text-base sm:text-xl font-bold text-slate-600">{t('report.table.word')}</th>
                <th className="p-4 sm:p-6 text-base sm:text-xl font-bold text-slate-600 text-center">{t('report.table.written')}</th>
                <th className="p-4 sm:p-6 text-base sm:text-xl font-bold text-slate-600 text-center">{t('report.table.speaking')}</th>
                <th className="p-4 sm:p-6 text-base sm:text-xl font-bold text-slate-600">{t('report.table.ai_feedback')}</th>
              </tr>
            </thead>
            <tbody>
              {words.map((word, index) => {
                const sResult = speakingResults.find(r => r.word === word.word);
                const wResult = writtenResults.find(r => r.word === word.word);
                
                return (
                  <tr key={index} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="p-4 sm:p-6">
                      <div className="font-bold text-lg sm:text-2xl text-slate-800">{word.word}</div>
                      <div className="text-sm sm:text-base text-slate-500">{word.translation}</div>
                    </td>
                    <td className="p-4 sm:p-6 text-center">
                      {wResult?.writtenCorrect ? (
                        <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500 mx-auto" />
                      ) : (
                        <XCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 mx-auto" />
                      )}
                    </td>
                    <td className="p-4 sm:p-6 text-center">
                      <span className={`text-xl sm:text-2xl font-bold ${
                        (sResult?.speakingScore || 0) >= 80 ? 'text-emerald-500' : 
                        (sResult?.speakingScore || 0) >= 60 ? 'text-amber-500' : 'text-red-500'
                      }`}>
                        {sResult?.speakingScore || '-'}
                      </span>
                    </td>
                    <td className="p-4 sm:p-6 text-sm sm:text-lg text-slate-600 max-w-[200px] sm:max-w-xs">
                      {sResult?.speakingFeedback || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 pb-6 sm:pb-10">
        <button 
          onClick={onRestart}
          className="px-8 py-4 sm:px-10 sm:py-5 bg-slate-900 text-white text-xl sm:text-2xl font-bold rounded-full hover:bg-slate-800 transition-colors flex items-center gap-2 sm:gap-3 shadow-xl"
        >
          <RotateCcw className="w-6 h-6 sm:w-8 sm:h-8" />
          {t('report.restart')}
        </button>
        <a 
          href="https://calendar.google.com/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-indigo-600 hover:text-indigo-800 underline font-medium text-sm sm:text-base"
        >
          {t('report.calendar_link')}
        </a>
      </div>
    </div>
  );
}
