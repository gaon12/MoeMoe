import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from '../locales/en/translation.json';
import koTranslation from '../locales/ko/translation.json';
import jaTranslation from '../locales/ja/translation.json';

const resources = {
  en: {
    translation: enTranslation,
  },
  ko: {
    translation: koTranslation,
  },
  ja: {
    translation: jaTranslation,
  },
};

// Get saved language from localStorage or detect browser language
const savedLanguage = localStorage.getItem('moemoe-language');
const browserLanguage = navigator.language.split('-')[0];
const defaultLanguage = savedLanguage || (browserLanguage === 'ko' || browserLanguage === 'ja' ? browserLanguage : 'en');

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
