import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Word, TestQuestion, TestResult } from '../types';
import { generateWrittenTest } from '../services/gemini';

interface Props {
  words: Word[];
  onComplete: (results: Partial<TestResult>[]) => void;
  onRestart: () => void;
}

export function WrittenScreen({ words, onComplete, onRestart }: Props) {
  const { t, i18n } = useTranslation();
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  
  const [textAnswer, setTextAnswer] = useState<string>('');
  const [isTextAnswerSubmitted, setIsTextAnswerSubmitted] = useState(false);
  const [isTextAnswerCorrect, setIsTextAnswerCorrect] = useState(false);

  const [results, setResults] = useState<Partial<TestResult>[]>([]);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const generated = await generateWrittenTest(words, i18n.language);
        setQuestions(generated);
      } catch (error) {
        console.error(error);
        alert(t('written.load_failed'));
      } finally {
        setIsLoading(false);
      }
    };
    loadQuestions();
  }, [words]);

  const handleSelect = (index: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);
    
    const question = questions[currentIndex];
    if (question.type === 'multiple_choice') {
      const isCorrect = index === question.correctAnswerIndex;
      
      setResults(prev => {
        const newResults = [...prev];
        newResults[currentIndex] = {
          word: question.word,
          writtenCorrect: isCorrect
        };
        return newResults;
      });
    }
  };

  const handleSubmitTextAnswer = () => {
    if (isTextAnswerSubmitted) return;
    
    const question = questions[currentIndex];
    if (question.type === 'fill_in_the_blank') {
      const isCorrect = textAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase();
      setIsTextAnswerCorrect(isCorrect);
      setIsTextAnswerSubmitted(true);
      
      setResults(prev => {
        const newResults = [...prev];
        newResults[currentIndex] = {
          word: question.word,
          writtenCorrect: isCorrect
        };
        return newResults;
      });
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setTextAnswer('');
      setIsTextAnswerSubmitted(false);
      setIsTextAnswerCorrect(false);
    } else {
      onComplete(results);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mb-4" />
        <p className="text-2xl text-slate-500">{t('written.loading')}</p>
      </div>
    );
  }

  if (questions.length === 0) return <div>{t('written.load_failed')}</div>;

  const question = questions[currentIndex];
  const isAnswered = question.type === 'multiple_choice' ? selectedAnswer !== null : isTextAnswerSubmitted;

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-slate-700">{t('written.title')}</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onRestart}
            className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-full transition-colors"
          >
            {t('written.cancel')}
          </button>
          <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-bold text-lg">
            {currentIndex + 1} / {questions.length}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="bg-white rounded-[2rem] shadow-xl p-10 mb-8">
          <h3 className="text-3xl text-slate-800 font-medium leading-relaxed">
            {question.question}
          </h3>
        </div>

        {question.type === 'multiple_choice' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === question.correctAnswerIndex;
              const showCorrect = selectedAnswer !== null && isCorrect;
              const showWrong = selectedAnswer !== null && isSelected && !isCorrect;

              let buttonClass = "p-8 rounded-2xl text-2xl font-medium text-left transition-all border-4 ";
              if (selectedAnswer === null) {
                buttonClass += "bg-white border-slate-100 hover:border-blue-200 hover:bg-blue-50 text-slate-700 shadow-sm";
              } else if (showCorrect) {
                buttonClass += "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-md";
              } else if (showWrong) {
                buttonClass += "bg-red-50 border-red-500 text-red-800 shadow-md";
              } else {
                buttonClass += "bg-slate-50 border-slate-100 text-slate-400 opacity-50";
              }

              return (
                <button
                  key={index}
                  onClick={() => handleSelect(index)}
                  disabled={selectedAnswer !== null}
                  className={buttonClass}
                >
                  <div className="flex justify-between items-center">
                    <span>{String.fromCharCode(65 + index)}. {option}</span>
                    {showCorrect && <CheckCircle2 className="w-8 h-8 text-emerald-500" />}
                    {showWrong && <XCircle className="w-8 h-8 text-red-500" />}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <input
              type="text"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              disabled={isTextAnswerSubmitted}
              placeholder={t('written.placeholder')}
              className={`w-full max-w-2xl text-3xl p-6 rounded-2xl border-4 outline-none transition-colors ${
                !isTextAnswerSubmitted 
                  ? 'border-slate-200 focus:border-blue-500 bg-white' 
                  : isTextAnswerCorrect 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800' 
                    : 'border-red-500 bg-red-50 text-red-800'
              }`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && textAnswer.trim()) {
                  handleSubmitTextAnswer();
                }
              }}
            />
            
            {!isTextAnswerSubmitted ? (
              <button
                onClick={handleSubmitTextAnswer}
                disabled={!textAnswer.trim()}
                className="px-10 py-4 bg-blue-600 text-white text-xl font-bold rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('written.submit')}
              </button>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3">
                  {isTextAnswerCorrect ? (
                    <><CheckCircle2 className="w-10 h-10 text-emerald-500" /><span className="text-2xl text-emerald-600 font-bold">{t('written.correct')}</span></>
                  ) : (
                    <><XCircle className="w-10 h-10 text-red-500" /><span className="text-2xl text-red-600 font-bold">{t('written.wrong')}</span></>
                  )}
                </div>
                {!isTextAnswerCorrect && (
                  <p className="text-xl text-slate-600">{t('written.correct_is')}<span className="font-bold text-emerald-600">{question.answer}</span></p>
                )}
              </div>
            )}
          </div>
        )}

        <AnimatePresence>
          {isAnswered && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-auto pt-8 flex justify-end"
            >
              <button 
                onClick={handleNext}
                className="px-10 py-5 bg-slate-900 text-white text-2xl font-bold rounded-full hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-xl"
              >
                {currentIndex === questions.length - 1 ? t('written.view_report') : t('written.next')}
                <ChevronRight className="w-8 h-8" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
