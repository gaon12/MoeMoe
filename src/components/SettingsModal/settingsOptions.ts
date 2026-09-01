import type { UiVisibilitySettings } from "../../types/settings.ts";

/** Tabs rendered by the settings modal, in display order. */
export const SETTINGS_TABS = [
  "general",
  "image",
  "clock",
  "widgets",
  "info",
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number];

/**
 * Toggleable interface elements, in display order. The settings button is
 * deliberately absent so users always keep a way back into this modal.
 */
export const UI_VISIBILITY_KEYS = [
  "clock",
  "widgets",
  "autoRefreshIndicator",
  "fullscreenButton",
  "downloadButton",
  "refreshButton",
  "wallpaperActions",
  "historyNav",
] as const satisfies readonly (keyof UiVisibilitySettings)[];
