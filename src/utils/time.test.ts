import { describe, expect, it } from "vitest";
import { defaultSettings } from "../types/settings.ts";
import { getFormattedTimeParts, getFullDateString } from "./time.ts";

describe("time formatting", () => {
  const sample = new Date("2026-06-02T14:05:09");

  it("formats localized 12-hour time with AM/PM after the time", () => {
    const result = getFormattedTimeParts(sample, defaultSettings, "ko");

    expect(result).toEqual({
      time: "02:05",
      ampmText: "오후",
      ampmPosition: "after",
    });
  });

  it("includes seconds when enabled", () => {
    const result = getFormattedTimeParts(
      sample,
      { ...defaultSettings, showSeconds: true },
      "en",
    );

    expect(result.time).toBe("02:05:09");
    expect(result.ampmText).toBe("PM");
  });

  it("formats Korean full date text", () => {
    expect(getFullDateString(sample, "ko")).toContain("2026년 6월 2일");
  });
});
