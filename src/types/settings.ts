import { type ImageSource } from "./image";

/**
 * Theme mode options
 */
export type ThemeMode = "light" | "dark" | "auto";

/**
 * Language options
 */
export type Language = "ko" | "en" | "ja";

/**
 * Image fit mode options
 */
export type ImageFitMode = "cover" | "contain";

/**
 * Preferred source image aspect before CSS fitting is applied
 */
export type ImageAspectPreference =
  "any" | "screen" | "landscape" | "portrait" | "square";

/**
 * Letterbox fill mode options (for 'contain' mode)
 */
export type LetterboxFillMode = "blur" | "edge-color" | "custom" | "solid";

/**
 * Widget types
 */
export type WidgetType =
  "clock" | "weather" | "location" | "animeQuote" | "customText";

/**
 * Widget configuration
 */
export interface Widget {
  id: string;
  type: WidgetType;
  enabled: boolean;
  position: {
    x: number;
    y: number;
  };
  data?: Record<string, unknown>;
}

/**
 * Application settings
 */
export interface AppSettings {
  // Appearance
  theme: ThemeMode;
  language: Language;
  fontSize: number;

  // Image settings
  imageSources: ImageSource[]; // Multiple sources can be enabled
  allowNSFW: boolean;
  imageFitMode: ImageFitMode;
  imageAspectPreference: ImageAspectPreference;
  letterboxFillMode: LetterboxFillMode;
  letterboxCustomColor: string;
  imageChangeInterval: number; // Auto-refresh interval in seconds (0 = disabled)

  // Clock settings
  showSeconds: boolean;
  use24Hour: boolean;
  showAmPm: boolean; // Only applies when use24Hour is false
  amPmPosition: "before" | "after"; // Only applies when showAmPm is true
  amPmStyle: "locale" | "latin"; // Non-English: locale words vs AM/PM

  // Time source
  useServerTime: boolean;
  serverTimeUpdateIntervalSec: number; // How often to resync server offset

  // Widgets
  widgets: Widget[];
  weatherApiKey: string;

  // Custom
  customText?: string;
}

/**
 * Default application settings
 */
export const defaultSettings: AppSettings = {
  theme: "dark",
  language: "en",
  fontSize: 16,
  imageSources: ["pic_re"],
  allowNSFW: false,
  imageFitMode: "contain",
  imageAspectPreference: "screen",
  letterboxFillMode: "blur",
  letterboxCustomColor: "#1a1a1a",
  imageChangeInterval: 0,
  showSeconds: false,
  use24Hour: false,
  showAmPm: true,
  amPmPosition: "after",
  amPmStyle: "locale",
  useServerTime: false,
  serverTimeUpdateIntervalSec: 60,
  widgets: [],
  weatherApiKey: "",
};
