import { ALL_IMAGE_SOURCES, type ImageSource } from "../types/image.ts";
import {
  defaultSettings,
  type AppSettings,
  type UiVisibilitySettings,
  type Widget,
  type WidgetType,
} from "../types/settings.ts";

const THEMES = ["light", "dark", "auto"] as const;
const LANGUAGES = ["ko", "en", "ja"] as const;
const FIT_MODES = ["cover", "contain"] as const;
const ASPECT_PREFERENCES = [
  "any",
  "screen",
  "landscape",
  "portrait",
  "square",
] as const;
const LETTERBOX_MODES = ["blur", "edge-color", "custom", "solid"] as const;
const AM_PM_POSITIONS = ["before", "after"] as const;
const AM_PM_STYLES = ["locale", "latin"] as const;
const SIX_DIGIT_HEX_COLOR_PATTERN = /^#[\da-f]{6}$/i;
const WIDGET_TYPES: WidgetType[] = [
  "clock",
  "weather",
  "location",
  "animeQuote",
  "customText",
];

const SETTINGS_KEYS = new Set<keyof AppSettings>([
  "theme",
  "language",
  "fontSize",
  "imageSources",
  "allowNSFW",
  "imageFitMode",
  "imageAspectPreference",
  "letterboxFillMode",
  "letterboxCustomColor",
  "imageChangeInterval",
  "showSeconds",
  "use24Hour",
  "showAmPm",
  "amPmPosition",
  "amPmStyle",
  "useServerTime",
  "serverTimeUpdateIntervalSec",
  "widgets",
  "weatherApiKey",
  "uiVisibility",
  "customText",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasSettingsFields(value: Record<string, unknown>): boolean {
  return Object.keys(value).some((key) =>
    SETTINGS_KEYS.has(key as keyof AppSettings),
  );
}

function enumValue<const T extends readonly string[]>(
  value: unknown,
  values: T,
  fallback: T[number],
): T[number] {
  return typeof value === "string" && values.includes(value)
    ? (value as T[number])
    : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function sanitizeUiVisibility(
  value: unknown,
  fallback: UiVisibilitySettings,
): UiVisibilitySettings {
  const candidate = isRecord(value) ? value : {};
  return {
    clock: booleanValue(candidate.clock, fallback.clock),
    widgets: booleanValue(candidate.widgets, fallback.widgets),
    autoRefreshIndicator: booleanValue(
      candidate.autoRefreshIndicator,
      fallback.autoRefreshIndicator,
    ),
    fullscreenButton: booleanValue(
      candidate.fullscreenButton,
      fallback.fullscreenButton,
    ),
    downloadButton: booleanValue(
      candidate.downloadButton,
      fallback.downloadButton,
    ),
    refreshButton: booleanValue(
      candidate.refreshButton,
      fallback.refreshButton,
    ),
    wallpaperActions: booleanValue(
      candidate.wallpaperActions,
      fallback.wallpaperActions,
    ),
  };
}

function numberValue(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : fallback;
}

function normalizeWidgetType(value: unknown): WidgetType {
  if (value === "date") {
    return "clock";
  }
  if (value === "quote") {
    return "animeQuote";
  }
  return typeof value === "string" && WIDGET_TYPES.includes(value as WidgetType)
    ? (value as WidgetType)
    : "clock";
}

function sanitizeWidgets(value: unknown, fallback: Widget[]): Widget[] {
  const source = Array.isArray(value) ? value : fallback;
  const ids = new Set<string>();

  return source
    .filter(isRecord)
    .slice(0, 4)
    .map((widget, index) => {
      const requestedId =
        typeof widget.id === "string" && widget.id.trim()
          ? widget.id.trim().slice(0, 100)
          : `widget-${index}`;
      let id = requestedId;
      while (ids.has(id)) {
        id = `${requestedId}-${index}`;
      }
      ids.add(id);

      const position = isRecord(widget.position) ? widget.position : {};
      return {
        id,
        type: normalizeWidgetType(widget.type),
        enabled: widget.enabled !== false,
        position: {
          x: numberValue(position.x, 0, -500, 500),
          y: numberValue(position.y, 0, -500, 500),
        },
        data: isRecord(widget.data) ? widget.data : {},
      };
    });
}

function sanitizeImageSources(
  value: unknown,
  fallback: ImageSource[],
): ImageSource[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }
  const unique = [
    ...new Set(
      value.filter(
        (source): source is ImageSource =>
          typeof source === "string" &&
          ALL_IMAGE_SOURCES.includes(source as ImageSource),
      ),
    ),
  ];
  if (unique.length === 0) {
    return fallback;
  }
  const unchanged =
    unique.length === fallback.length &&
    unique.every((source, index) => source === fallback[index]);
  return unchanged ? fallback : unique;
}

function sanitizeSettings(
  value: unknown,
  fallback: AppSettings = defaultSettings,
): AppSettings {
  const candidate = isRecord(value) ? value : {};
  return {
    theme: enumValue(candidate.theme, THEMES, fallback.theme),
    language: enumValue(candidate.language, LANGUAGES, fallback.language),
    fontSize: numberValue(candidate.fontSize, fallback.fontSize, 10, 32),
    imageSources: sanitizeImageSources(
      candidate.imageSources,
      fallback.imageSources,
    ),
    allowNSFW: booleanValue(candidate.allowNSFW, fallback.allowNSFW),
    imageFitMode: enumValue(
      candidate.imageFitMode,
      FIT_MODES,
      fallback.imageFitMode,
    ),
    imageAspectPreference: enumValue(
      candidate.imageAspectPreference,
      ASPECT_PREFERENCES,
      fallback.imageAspectPreference,
    ),
    letterboxFillMode: enumValue(
      candidate.letterboxFillMode,
      LETTERBOX_MODES,
      fallback.letterboxFillMode,
    ),
    letterboxCustomColor:
      typeof candidate.letterboxCustomColor === "string" &&
      SIX_DIGIT_HEX_COLOR_PATTERN.test(candidate.letterboxCustomColor)
        ? candidate.letterboxCustomColor
        : fallback.letterboxCustomColor,
    imageChangeInterval: numberValue(
      candidate.imageChangeInterval,
      fallback.imageChangeInterval,
      0,
      86_400,
    ),
    showSeconds: booleanValue(candidate.showSeconds, fallback.showSeconds),
    use24Hour: booleanValue(candidate.use24Hour, fallback.use24Hour),
    showAmPm: booleanValue(candidate.showAmPm, fallback.showAmPm),
    amPmPosition: enumValue(
      candidate.amPmPosition,
      AM_PM_POSITIONS,
      fallback.amPmPosition,
    ),
    amPmStyle: enumValue(candidate.amPmStyle, AM_PM_STYLES, fallback.amPmStyle),
    useServerTime: booleanValue(
      candidate.useServerTime,
      fallback.useServerTime,
    ),
    serverTimeUpdateIntervalSec: numberValue(
      candidate.serverTimeUpdateIntervalSec,
      fallback.serverTimeUpdateIntervalSec,
      5,
      86_400,
    ),
    widgets: sanitizeWidgets(candidate.widgets, fallback.widgets),
    weatherApiKey:
      typeof candidate.weatherApiKey === "string"
        ? candidate.weatherApiKey.trim().slice(0, 500)
        : fallback.weatherApiKey,
    uiVisibility: sanitizeUiVisibility(
      candidate.uiVisibility,
      fallback.uiVisibility,
    ),
    customText:
      typeof candidate.customText === "string"
        ? candidate.customText.slice(0, 2000)
        : fallback.customText,
  };
}

export { hasSettingsFields, isRecord, sanitizeSettings };
