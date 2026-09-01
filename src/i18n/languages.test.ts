// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  detectBrowserLanguage,
  detectInitialLanguage,
  isSupportedLanguage,
  LANGUAGE_STORAGE_KEY,
  readStoredLanguage,
  SUPPORTED_LANGUAGES,
  writeStoredLanguage,
} from "./languages.ts";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("isSupportedLanguage", () => {
  it("accepts every shipped language", () => {
    for (const language of SUPPORTED_LANGUAGES) {
      expect(isSupportedLanguage(language)).toBe(true);
    }
  });

  it("rejects unshipped languages and non-strings", () => {
    expect(isSupportedLanguage("fr")).toBe(false);
    expect(isSupportedLanguage("ko-KR")).toBe(false);
    expect(isSupportedLanguage(null)).toBe(false);
    expect(isSupportedLanguage(42)).toBe(false);
  });
});

describe("detectBrowserLanguage", () => {
  it("matches on the primary subtag so regional variants count", () => {
    expect(detectBrowserLanguage("ko-KR")).toBe("ko");
    expect(detectBrowserLanguage("ja-JP")).toBe("ja");
    expect(detectBrowserLanguage("en-GB")).toBe("en");
  });

  it("ignores tag casing", () => {
    expect(detectBrowserLanguage("KO")).toBe("ko");
    expect(detectBrowserLanguage("Ja-JP")).toBe("ja");
  });

  it("reads the ambient navigator when no tag is passed", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("ko-KR");
    expect(detectBrowserLanguage()).toBe("ko");
  });

  it("falls back to English for anything unshipped or absent", () => {
    expect(detectBrowserLanguage("fr-FR")).toBe("en");
    expect(detectBrowserLanguage("")).toBe("en");
  });
});

describe("readStoredLanguage", () => {
  it("returns a previously stored language", () => {
    writeStoredLanguage("ja");
    expect(readStoredLanguage()).toBe("ja");
  });

  it("ignores a stored value that is no longer supported", () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "fr");
    expect(readStoredLanguage()).toBeNull();
  });

  it("returns null when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    expect(readStoredLanguage()).toBeNull();
  });
});

describe("writeStoredLanguage", () => {
  it("swallows storage failures", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    expect(() => writeStoredLanguage("ko")).not.toThrow();
  });
});

describe("detectInitialLanguage", () => {
  it("prefers an explicit earlier choice over the browser preference", () => {
    writeStoredLanguage("ko");
    expect(detectInitialLanguage()).toBe("ko");
  });

  it("falls back to the browser preference when nothing is stored", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("ja-JP");
    expect(detectInitialLanguage()).toBe("ja");
  });
});
