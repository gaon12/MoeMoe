import { describe, expect, it } from "vitest";
import { defaultSettings } from "../types/settings";
import { sanitizeSettings } from "./settingsValidation";

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
      fontSize: Infinity,
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
          position: { x: 9999, y: -9999 },
        },
      ],
    }).widgets;

    expect(widget.position).toEqual({ x: 500, y: -500 });
  });
});
