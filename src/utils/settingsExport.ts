import { type AppSettings } from "../types/settings";
import {
  hasSettingsFields,
  isRecord,
  sanitizeSettings,
} from "./settingsValidation";

const EXPORT_VERSION = 1;

interface SettingsExportPayload {
  version: number;
  exportedAt: string;
  settings: Partial<AppSettings>;
}

export function createSettingsExport(settings: AppSettings, now = new Date()) {
  const payload: SettingsExportPayload = {
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    settings,
  };

  return JSON.stringify(payload, null, 2);
}

export function parseSettingsExport(text: string): AppSettings {
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
