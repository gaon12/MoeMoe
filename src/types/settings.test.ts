import { describe, expect, it } from "vitest";
import { defaultSettings } from "./settings.ts";

const OPTIONAL_UI_ELEMENT_COUNT = 8;

describe("defaultSettings", () => {
  it("starts with an uncluttered clock-only surface", () => {
    expect(defaultSettings.widgets).toEqual([]);
    expect(defaultSettings.imageChangeInterval).toBe(0);
  });

  it("uses a CORS-friendly direct image source by default", () => {
    expect(defaultSettings.imageSources).toEqual(["pic_re"]);
  });

  it("shows the whole image by default instead of cropping it", () => {
    expect(defaultSettings.imageFitMode).toBe("contain");
  });

  it("prefers images matching the current screen ratio by default", () => {
    expect(defaultSettings.imageAspectPreference).toBe("screen");
  });

  it("keeps every optional interface element visible by default", () => {
    expect(Object.values(defaultSettings.uiVisibility)).toEqual(
      new Array(OPTIONAL_UI_ELEMENT_COUNT).fill(true),
    );
  });
});
