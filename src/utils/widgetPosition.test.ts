import { describe, expect, it } from "vitest";
import {
  clampWidgetPositionPercent,
  convertLegacyPixelOffset,
  LEGACY_POSITION_REFERENCE,
  MAX_WIDGET_POSITION_PERCENT,
  pixelDeltaToPercent,
  roundWidgetPositionPercent,
} from "./widgetPosition.ts";

describe("clampWidgetPositionPercent", () => {
  it("passes through values inside the range", () => {
    expect(clampWidgetPositionPercent(0)).toBe(0);
    expect(clampWidgetPositionPercent(12.5)).toBe(12.5);
    expect(clampWidgetPositionPercent(-30)).toBe(-30);
  });

  it("clamps to the supported range in both directions", () => {
    expect(clampWidgetPositionPercent(999)).toBe(MAX_WIDGET_POSITION_PERCENT);
    expect(clampWidgetPositionPercent(-999)).toBe(-MAX_WIDGET_POSITION_PERCENT);
  });

  it("treats anything that is not a finite number as centred", () => {
    expect(clampWidgetPositionPercent(Number.NaN)).toBe(0);
    expect(clampWidgetPositionPercent(Number.POSITIVE_INFINITY)).toBe(0);
    expect(clampWidgetPositionPercent("40")).toBe(0);
    expect(clampWidgetPositionPercent(undefined)).toBe(0);
    expect(clampWidgetPositionPercent(null)).toBe(0);
  });
});

describe("convertLegacyPixelOffset", () => {
  it("converts against the reference viewport", () => {
    // A widget nudged 480px right on a 1920px display sat a quarter of the
    // way across it, and should still sit a quarter of the way across.
    expect(convertLegacyPixelOffset(480, LEGACY_POSITION_REFERENCE.width)).toBe(
      25,
    );
    expect(
      convertLegacyPixelOffset(-270, LEGACY_POSITION_REFERENCE.height),
    ).toBe(-25);
  });

  it("leaves an unmoved widget centred", () => {
    expect(convertLegacyPixelOffset(0, LEGACY_POSITION_REFERENCE.width)).toBe(
      0,
    );
  });

  it("rounds to one decimal place", () => {
    expect(convertLegacyPixelOffset(100, LEGACY_POSITION_REFERENCE.width)).toBe(
      5.2,
    );
  });

  it("clamps the old maximum offset into the new range", () => {
    // The old inputs allowed +-500px, which is more than 45% of 1080.
    expect(
      convertLegacyPixelOffset(500, LEGACY_POSITION_REFERENCE.height),
    ).toBe(MAX_WIDGET_POSITION_PERCENT);
  });

  it("treats unusable input as centred", () => {
    expect(convertLegacyPixelOffset(undefined, 1920)).toBe(0);
    expect(convertLegacyPixelOffset(Number.NaN, 1920)).toBe(0);
  });
});

describe("pixelDeltaToPercent", () => {
  it("expresses a drag as a share of the viewport", () => {
    expect(pixelDeltaToPercent(192, 1920)).toBe(10);
    expect(pixelDeltaToPercent(-540, 1080)).toBe(-50);
  });

  it("returns zero rather than dividing by a missing viewport", () => {
    expect(pixelDeltaToPercent(100, 0)).toBe(0);
    expect(pixelDeltaToPercent(100, -1)).toBe(0);
    expect(pixelDeltaToPercent(Number.NaN, 1920)).toBe(0);
  });
});

describe("roundWidgetPositionPercent", () => {
  it("keeps one decimal place so stored settings stay readable", () => {
    expect(roundWidgetPositionPercent(12.34)).toBe(12.3);
    expect(roundWidgetPositionPercent(12.35)).toBe(12.4);
    expect(roundWidgetPositionPercent(-8.06)).toBe(-8.1);
  });
});
