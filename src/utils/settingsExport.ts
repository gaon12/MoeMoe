import { type AppSettings } from "../types/settings";

const EXPORT_VERSION = 1;

interface SettingsExportPayload {
  version: number;
  exportedAt: string;
  settings: Partial<AppSettings>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function createSettingsExport(settings: AppSettings, now = new Date()) {
  const payload: SettingsExportPayload = {
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    settings,
  };

  return JSON.stringify(payload, null, 2);
}

export function parseSettingsExport(text: string): Partial<AppSettings> {
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed)) {
    throw new Error("Settings export must be a JSON object.");
  }

  const candidate = isRecord(parsed.settings) ? parsed.settings : parsed;
  if (!isRecord(candidate)) {
    throw new Error("Settings export does not include settings.");
  }

  return candidate as Partial<AppSettings>;
}
