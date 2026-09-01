import { describe, expect, it } from "vitest";
import { defaultSettings } from "../types/settings.ts";
import { sanitizeSettings } from "./settingsValidation.ts";

describe("sanitizeSettings", () => {
  it("preserves image source identity for unrelated setting updates", () => {
    const current = sanitizeSettings({
      ...defaultSettings,
      imageSources: ["pic_re", "wallhaven"],
    });
    const updated = sanitizeSettings({ ...current, fontSize: 18 }, current);

    expect(updated.imageSources).toBe(current.imageSources);
  });

  it("preserves a valid cover fit mode across persistence", () => {
    expect(sanitizeSettings({ imageFitMode: "cover" }).imageFitMode).toBe(
      "cover",
    );
  });

  it("filters untrusted values and clamps numeric settings", () => {
    const result = sanitizeSettings({
      theme: "neon",
      fontSize: Number.POSITIVE_INFINITY,
      imageSources: ["pic_re", "javascript:"],
      imageChangeInterval: -100,
      letterboxCustomColor: "url(evil)",
      widgets: {},
    });

    expect(result).toMatchObject({
      theme: defaultSettings.theme,
      fontSize: defaultSettings.fontSize,
      imageSources: ["pic_re"],
      imageChangeInterval: 0,
      letterboxCustomColor: defaultSettings.letterboxCustomColor,
      widgets: defaultSettings.widgets,
    });
  });

  it("migrates legacy widgets and removes duplicate IDs", () => {
    const result = sanitizeSettings({
      widgets: [
        { id: "same", type: "date", enabled: true },
        { id: "same", type: "quote", enabled: true },
      ],
    });

    expect(result.widgets.map(({ id, type }) => ({ id, type }))).toEqual([
      { id: "same", type: "clock" },
      { id: "same-1", type: "animeQuote" },
    ]);
  });

  it("preserves the IndexedDB-backed user image source", () => {
    expect(
      sanitizeSettings({ imageSources: ["pic_re", "user_uploads"] })
        .imageSources,
    ).toEqual(["pic_re", "user_uploads"]);
  });

  it("bounds desktop widget offsets to the supported viewport range", () => {
    const [widget] = sanitizeSettings({
      widgets: [
        {
          id: "offset",
          type: "clock",
          positionUnit: "percent",
          position: { x: 9999, y: -9999 },
        },
      ],
    }).widgets;

    expect(widget.position).toEqual({ x: 45, y: -45 });
  });

  it("keeps widget offsets already stored as percentages", () => {
    const [widget] = sanitizeSettings({
      widgets: [
        {
          id: "kept",
          type: "clock",
          positionUnit: "percent",
          position: { x: 12.5, y: -8 },
        },
      ],
    }).widgets;

    expect(widget.position).toEqual({ x: 12.5, y: -8 });
    expect(widget.positionUnit).toBe("percent");
  });

  it("migrates pixel widget offsets saved before positions were relative", () => {
    const [widget] = sanitizeSettings({
      widgets: [
        {
          id: "legacy",
          type: "clock",
          position: { x: 480, y: -270 },
        },
      ],
    }).widgets;

    // 480px across a 1920px reference and 270px up a 1080px one are both a
    // quarter of the way out, and stay there.
    expect(widget.position).toEqual({ x: 25, y: -25 });
    expect(widget.positionUnit).toBe("percent");
  });

  it("migrates settings saved before per-element visibility was added", () => {
    const result = sanitizeSettings({ theme: "light" });

    expect(result.uiVisibility).toEqual(defaultSettings.uiVisibility);
  });

  it("preserves valid visibility choices and repairs invalid fields", () => {
    const result = sanitizeSettings({
      uiVisibility: {
        clock: false,
        widgets: false,
        autoRefreshIndicator: "hidden",
        fullscreenButton: false,
      },
    });

    expect(result.uiVisibility).toEqual({
      ...defaultSettings.uiVisibility,
      clock: false,
      widgets: false,
      fullscreenButton: false,
    });
  });
});
