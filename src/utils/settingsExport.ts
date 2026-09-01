import type { AppSettings } from "../types/settings.ts";
import {
  hasSettingsFields,
  isRecord,
  sanitizeSettings,
} from "./settingsValidation.ts";

const EXPORT_VERSION = 1;
const MAX_SETTINGS_IMPORT_BYTES = 1_000_000;

interface SettingsExportPayload {
  version: number;
  exportedAt: string;
  settings: Partial<AppSettings>;
}

function createSettingsExport(settings: AppSettings, now = new Date()) {
  // The weather API key is a user-held secret, so it never leaves the browser
  // in an export. JSON.stringify drops the undefined value entirely.
  const portableSettings: Partial<AppSettings> = {
    ...settings,
    weatherApiKey: undefined,
  };
  const payload: SettingsExportPayload = {
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    settings: portableSettings,
  };

  return JSON.stringify(payload, null, 2);
}

function parseSettingsExport(text: string): AppSettings {
  if (text.length > MAX_SETTINGS_IMPORT_BYTES) {
    throw new Error("Settings export exceeds the import size limit.");
  }
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed)) {
    throw new Error("Settings export must be a JSON object.");
  }

  const candidate = isRecord(parsed.settings) ? parsed.settings : parsed;
  if (!isRecord(candidate)) {
    throw new Error("Settings export does not include settings.");
  }

  if (!hasSettingsFields(candidate)) {
    throw new Error("Settings export does not include recognized settings.");
  }

  return sanitizeSettings(candidate);
}

export { createSettingsExport, MAX_SETTINGS_IMPORT_BYTES, parseSettingsExport };
