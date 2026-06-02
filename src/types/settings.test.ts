import { describe, expect, it } from "vitest";
import { defaultSettings } from "./settings";

describe("defaultSettings", () => {
  it("starts with an uncluttered clock-only surface", () => {
    expect(defaultSettings.widgets).toEqual([]);
    expect(defaultSettings.imageChangeInterval).toBe(0);
  });

  it("uses conservative browser-safe image sources by default", () => {
    expect(defaultSettings.imageSources).toEqual(["nekos_best"]);
  });
});
