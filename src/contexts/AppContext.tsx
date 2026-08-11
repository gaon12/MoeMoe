import { useState, useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  type AppSettings,
  defaultSettings,
  type ThemeMode,
} from "../types/settings";
import { sanitizeSettings } from "../utils/settingsValidation";
import { AppContext } from "./appContextValue";

const STORAGE_KEY = "moemoe-settings";

export function AppProvider({ children }: { children: ReactNode }) {
  const { i18n, t } = useTranslation();
  const [settings, setSettings] = useState<AppSettings>(() => {
    let language: AppSettings["language"] = "en";
    try {
      const navLang = (navigator.language || "").toLowerCase();
      if (navLang.startsWith("ko")) language = "ko";
      else if (navLang.startsWith("ja")) language = "ja";
    } catch {
      // Browser language detection is optional.
    }
    const fallback = { ...defaultSettings, language };

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return sanitizeSettings(JSON.parse(saved), fallback);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
    return fallback;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Apply theme to document
  useEffect(() => {
    const applyTheme = (theme: ThemeMode) => {
      const root = document.documentElement;

      if (theme === "auto") {
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;
        root.setAttribute("data-theme", prefersDark ? "dark" : "light");
      } else {
        root.setAttribute("data-theme", theme);
      }
    };

    applyTheme(settings.theme);

    // Listen for system theme changes if in auto mode
    if (settings.theme === "auto") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme("auto");

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [settings.theme]);

  // Apply language
  useEffect(() => {
    if (i18n.language !== settings.language) {
      i18n.changeLanguage(settings.language);
    }
    document.documentElement.lang = settings.language;
    localStorage.setItem("moemoe-language", settings.language);
  }, [i18n, settings.language]);

  useEffect(() => {
    document.title = t("app.title");
  }, [settings.language, t]);

  // Apply font size
  useEffect(() => {
    document.documentElement.style.fontSize = `${settings.fontSize}px`;
  }, [settings.fontSize]);

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => sanitizeSettings({ ...prev, ...newSettings }, prev));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AppContext.Provider
      value={{
        settings,
        updateSettings,
        resetSettings,
        isSettingsOpen,
        setIsSettingsOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
