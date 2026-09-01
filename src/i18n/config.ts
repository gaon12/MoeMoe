import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enTranslation from "../locales/en/translation.json" with { type: "json" };
import koTranslation from "../locales/ko/translation.json" with { type: "json" };
import jaTranslation from "../locales/ja/translation.json" with { type: "json" };

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
let savedLanguage: string | null = null;
try {
  savedLanguage = localStorage.getItem("moemoe-language");
} catch {
  // Storage can be unavailable in private or restricted browsing contexts.
}
const [browserLanguage] = navigator.language.split("-");
const defaultLanguage =
  savedLanguage ||
  (browserLanguage === "ko" || browserLanguage === "ja"
    ? browserLanguage
    : "en");

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLanguage,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  })
  .catch(() => undefined);
