import { useState, useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  type AppSettings,
  defaultSettings,
  type ThemeMode,
} from "../types/settings";
import { sanitizeSettings } from "../utils/settingsValidation";
import { resolveTheme, THEME_COLORS } from "../utils/theme";
import { AppContext } from "./appContextValue";

const STORAGE_KEY = "moemoe-settings";

export function AppProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
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
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      const resolvedTheme = resolveTheme(theme, prefersDark);
      root.setAttribute("data-theme", resolvedTheme);
      document
        .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
        ?.setAttribute("content", THEME_COLORS[resolvedTheme]);
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
      void i18n.changeLanguage(settings.language).catch((error: unknown) => {
        console.error("Failed to change language:", error);
      });
    }
    document.documentElement.lang = settings.language;
    try {
      localStorage.setItem("moemoe-language", settings.language);
    } catch (error) {
      console.error("Failed to save language:", error);
    }
  }, [i18n, settings.language]);

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
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to remove saved settings:", error);
    }
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
