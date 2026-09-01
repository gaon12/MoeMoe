/**
 * Widget offsets are stored as a percentage of the viewport rather than in
 * pixels, so an arrangement made on one display keeps its proportions on
 * another instead of drifting off-screen.
 */
export const MAX_WIDGET_POSITION_PERCENT = 45;

/**
 * The viewport that pixel offsets written before this change were arranged
 * against. A fixed reference keeps the migration deterministic and testable;
 * reading the live viewport would make the stored value depend on whichever
 * display happened to load the settings first.
 */
export const LEGACY_POSITION_REFERENCE = { width: 1920, height: 1080 } as const;

export function clampWidgetPositionPercent(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.min(
    MAX_WIDGET_POSITION_PERCENT,
    Math.max(-MAX_WIDGET_POSITION_PERCENT, value),
  );
}

/**
 * Converts a legacy pixel offset to a percentage of the reference viewport,
 * rounded to one decimal so stored settings stay readable.
 */
export function convertLegacyPixelOffset(
  pixels: unknown,
  referenceSize: number,
): number {
  if (typeof pixels !== "number" || !Number.isFinite(pixels)) {
    return 0;
  }
  const percent = (pixels / referenceSize) * 100;
  return clampWidgetPositionPercent(Math.round(percent * 10) / 10);
}

/** Turns a pointer movement in pixels into a percentage of the viewport. */
export function pixelDeltaToPercent(
  deltaPixels: number,
  viewportSize: number,
): number {
  if (!Number.isFinite(deltaPixels) || viewportSize <= 0) {
    return 0;
  }
  return (deltaPixels / viewportSize) * 100;
}

export function roundWidgetPositionPercent(value: number): number {
  return Math.round(value * 10) / 10;
}
