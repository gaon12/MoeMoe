import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { detectInitialLanguage, FALLBACK_LANGUAGE } from "./languages.ts";

import enTranslation from "../locales/en/translation.json" with {
  type: "json",
};
import koTranslation from "../locales/ko/translation.json" with {
  type: "json",
};
import jaTranslation from "../locales/ja/translation.json" with {
  type: "json",
};

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

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: detectInitialLanguage(),
    fallbackLng: FALLBACK_LANGUAGE,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  })
  .catch(() => undefined);
