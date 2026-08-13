import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enTranslation from "../locales/en/translation.json";
import koTranslation from "../locales/ko/translation.json";
import jaTranslation from "../locales/ja/translation.json";

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
} catch (error) {
  console.error("Failed to load the saved language:", error);
}
const browserLanguage = navigator.language.split("-")[0];
const defaultLanguage =
  savedLanguage ||
  (browserLanguage === "ko" || browserLanguage === "ja"
    ? browserLanguage
    : "en");

void i18n
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
  .catch((error: unknown) => {
    console.error("Failed to initialize translations:", error);
  });

export default i18n;
