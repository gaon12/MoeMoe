import { useState, useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  type AppSettings,
  defaultSettings,
  type ThemeMode,
} from "../types/settings.ts";
import { sanitizeSettings } from "../utils/settingsValidation.ts";
import { resolveTheme, THEME_COLORS } from "../utils/theme.ts";
import {
  detectInitialLanguage,
  writeStoredLanguage,
} from "../i18n/languages.ts";
import { AppContext } from "./appContextValue.ts";

const STORAGE_KEY = "moemoe-settings";

export function AppProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const [settings, setSettings] = useState<AppSettings>(() => {
    const fallback = {
      ...defaultSettings,
      language: detectInitialLanguage(),
    };

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return sanitizeSettings(JSON.parse(saved), fallback);
      }
    } catch {
      // Corrupted or unavailable storage falls back to validated defaults.
    }
    return fallback;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Apply theme to document
  useEffect(() => {
    const applyTheme = (theme: ThemeMode) => {
      const root = document.documentElement;
      const prefersDark = globalThis.matchMedia(
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
      const mediaQuery = globalThis.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme("auto");

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [settings.theme]);

  // Apply language
  useEffect(() => {
    if (i18n.language !== settings.language) {
      i18n.changeLanguage(settings.language).catch(() => undefined);
    }
    document.documentElement.lang = settings.language;
    writeStoredLanguage(settings.language);
  }, [i18n, settings.language]);

  // Apply font size
  useEffect(() => {
    document.documentElement.style.fontSize = `${settings.fontSize}px`;
  }, [settings.fontSize]);

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Keep the in-memory settings when persistent storage is unavailable.
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => sanitizeSettings({ ...prev, ...newSettings }, prev));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Reset still succeeds in memory when storage cannot be changed.
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
