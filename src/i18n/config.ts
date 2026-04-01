import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zhHant from './locales/zh-Hant.json';
import zhHans from './locales/zh-Hans.json';
import ko from './locales/ko.json';
import ja from './locales/ja.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'zh-Hant': { translation: zhHant },
      'zh-TW': { translation: zhHant },
      'zh-Hans': { translation: zhHans },
      'zh-CN': { translation: zhHans },
      'ko': { translation: ko },
      'ja': { translation: ja },
      'en': { translation: en },
      'es': { translation: es },
      'fr': { translation: fr },
      'de': { translation: de },
    },
    fallbackLng: 'zh-Hant',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage', 'cookie'],
    },
  });

export default i18n;
