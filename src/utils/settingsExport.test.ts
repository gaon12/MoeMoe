import { describe, expect, it } from "vitest";
import { defaultSettings } from "../types/settings";
import {
  createSettingsExport,
  MAX_SETTINGS_IMPORT_BYTES,
  parseSettingsExport,
} from "./settingsExport";

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
        uiVisibility: defaultSettings.uiVisibility,
      },
    });
    expect(JSON.parse(exported).settings).not.toHaveProperty("weatherApiKey");
  });

  it("never exports a configured WeatherAPI credential", () => {
    const exported = JSON.parse(
      createSettingsExport({ ...defaultSettings, weatherApiKey: "secret-key" }),
    );
    expect(JSON.stringify(exported)).not.toContain("secret-key");
  });

  it("parses wrapped and raw settings payloads", () => {
    expect(
      parseSettingsExport(
        JSON.stringify({
          version: 1,
          settings: { theme: "light" },
        }),
      ),
    ).toMatchObject({ theme: "light" });

    expect(
      parseSettingsExport(JSON.stringify({ theme: "dark" })),
    ).toMatchObject({
      theme: "dark",
    });
  });

  it("rejects invalid payloads", () => {
    expect(() =>
      parseSettingsExport(" ".repeat(MAX_SETTINGS_IMPORT_BYTES + 1)),
    ).toThrow(/size limit/);
    expect(() => parseSettingsExport("[]")).toThrow(/JSON object/);
    expect(() => parseSettingsExport("{")).toThrow();
    expect(() => parseSettingsExport('{"widgets":{}}')).not.toThrow();
    expect(() => parseSettingsExport('{"totallyUnknown":true}')).toThrow(
      /recognized settings/,
    );
  });
});
