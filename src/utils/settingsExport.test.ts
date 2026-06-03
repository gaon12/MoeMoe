import { describe, expect, it } from "vitest";
import { defaultSettings } from "../types/settings";
import { createSettingsExport, parseSettingsExport } from "./settingsExport";

describe("settings export", () => {
  it("wraps settings with export metadata", () => {
    const exported = createSettingsExport(
      defaultSettings,
      new Date("2026-06-02T00:00:00.000Z"),
    );

    expect(JSON.parse(exported)).toMatchObject({
      version: 1,
      exportedAt: "2026-06-02T00:00:00.000Z",
      settings: {
        widgets: [],
        imageSources: ["pic_re"],
        imageFitMode: "contain",
        imageAspectPreference: "screen",
      },
    });
  });

  it("parses wrapped and raw settings payloads", () => {
    expect(
      parseSettingsExport(
        JSON.stringify({
          version: 1,
          settings: { theme: "light" },
        }),
      ),
    ).toEqual({ theme: "light" });

    expect(parseSettingsExport(JSON.stringify({ theme: "dark" }))).toEqual({
      theme: "dark",
    });
  });

  it("rejects invalid payloads", () => {
    expect(() => parseSettingsExport("[]")).toThrow(/JSON object/);
    expect(() => parseSettingsExport("{")).toThrow();
  });
});
