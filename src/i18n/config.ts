import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zhHant from './locales/zh-Hant.json';
import zhHans from './locales/zh-Hans.json';
import ko from './locales/ko.json';
import ja from './locales/ja.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';

const resources = {
  'zh-Hant': { translation: zhHant },
  'zh-Hans': { translation: zhHans },
  'ko': { translation: ko },
  'ja': { translation: ja },
  'es': { translation: es },
  'fr': { translation: fr },
  'de': { translation: de }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh-Hant',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'sessionStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage', 'cookie']
    }
  }).then(() => {
    // Force English speakers to Japanese per user request (Wait, user said Traditional Chinese)
    // "English speakers are not the target audience; English browser settings now default to Traditional Chinese."
    if (i18n.language.startsWith('en')) {
      i18n.changeLanguage('zh-Hant');
    }
  });

export default i18n;
