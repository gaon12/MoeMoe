import { useState, useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  type AppSettings,
  defaultSettings,
  type ImageAspectPreference,
  type ThemeMode,
  type Widget,
  type WidgetType,
} from "../types/settings";
import { type ImageSource } from "../types/image";
import { AppContext } from "./appContextValue";

const VALID_WIDGET_TYPES: WidgetType[] = [
  "clock",
  "weather",
  "location",
  "animeQuote",
  "customText",
];

type LegacyWidgetType = WidgetType | "date" | "quote" | string | undefined;

function normalizeWidgetType(type: LegacyWidgetType): WidgetType {
  if (type === "date") return "clock";
  if (type === "quote") return "animeQuote";
  if (VALID_WIDGET_TYPES.includes(type as WidgetType)) {
    return type as WidgetType;
  }
  return "clock";
}

function sanitizeWidgets(widgets?: Widget[]): Widget[] {
  const source = Array.isArray(widgets) ? widgets : defaultSettings.widgets;
  return source
    .filter((widget): widget is Widget => Boolean(widget))
    .slice(0, 4)
    .map((widget, index) => {
      const sanitizedType = normalizeWidgetType(widget.type);
      return {
        ...widget,
        id: widget.id || `widget-${index}`,
        enabled: widget.enabled !== false,
        position: widget.position ?? { x: 0, y: 0 },
        type: sanitizedType,
      };
    });
}

function sanitizeImageSources(imageSources?: ImageSource[]): ImageSource[] {
  if (
    !Array.isArray(imageSources) ||
    imageSources.length === 0 ||
    (imageSources.length === 1 && imageSources[0] === "nekos_best")
  ) {
    return [...defaultSettings.imageSources];
  }

  return imageSources;
}

function sanitizeImageFitMode(imageFitMode?: AppSettings["imageFitMode"]) {
  return imageFitMode === "cover" ? "contain" : imageFitMode;
}

const VALID_IMAGE_ASPECT_PREFERENCES: ImageAspectPreference[] = [
  "any",
  "screen",
  "landscape",
  "portrait",
  "square",
];

function sanitizeImageAspectPreference(
  imageAspectPreference?: AppSettings["imageAspectPreference"],
): ImageAspectPreference {
  return VALID_IMAGE_ASPECT_PREFERENCES.includes(
    imageAspectPreference as ImageAspectPreference,
  )
    ? (imageAspectPreference as ImageAspectPreference)
    : defaultSettings.imageAspectPreference;
}

const STORAGE_KEY = "moemoe-settings";

export function AppProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const [settings, setSettings] = useState<AppSettings>(() => {
    let base: AppSettings | null = null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        base = { ...defaultSettings, ...parsed };
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
    if (!base) {
      // No saved settings: derive language from browser, default to English
      let lang: AppSettings["language"] = "en";
      try {
        const navLang = (navigator.language || "").toLowerCase();
        if (navLang.startsWith("ko")) lang = "ko";
        else if (navLang.startsWith("ja")) lang = "ja";
        else if (navLang.startsWith("en")) lang = "en";
      } catch {
        /* ignore */
      }
      base = { ...defaultSettings, language: lang };
    }
    return {
      ...base,
      imageSources: sanitizeImageSources(base.imageSources),
      imageFitMode:
        sanitizeImageFitMode(base.imageFitMode) ?? defaultSettings.imageFitMode,
      imageAspectPreference: sanitizeImageAspectPreference(
        base.imageAspectPreference,
      ),
      widgets: sanitizeWidgets(base.widgets),
      weatherApiKey:
        typeof base.weatherApiKey === "string" ? base.weatherApiKey.trim() : "",
    };
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
    localStorage.setItem("moemoe-language", settings.language);
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
    setSettings((prev) => {
      const merged = { ...prev, ...newSettings };
      return {
        ...merged,
        imageSources: sanitizeImageSources(
          newSettings.imageSources ?? prev.imageSources,
        ),
        imageAspectPreference: sanitizeImageAspectPreference(
          newSettings.imageAspectPreference ?? prev.imageAspectPreference,
        ),
        widgets: sanitizeWidgets(newSettings.widgets ?? prev.widgets),
        weatherApiKey: (
          newSettings.weatherApiKey ??
          prev.weatherApiKey ??
          ""
        ).trim(),
      };
    });
  };

  const resetSettings = () => {
    setSettings({
      ...defaultSettings,
      widgets: sanitizeWidgets(defaultSettings.widgets),
      weatherApiKey: "",
    });
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
