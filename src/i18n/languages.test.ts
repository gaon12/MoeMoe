import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  detectBrowserLanguage,
  detectInitialLanguage,
  isSupportedLanguage,
  LANGUAGE_STORAGE_KEY,
  readStoredLanguage,
  SUPPORTED_LANGUAGES,
  writeStoredLanguage,
} from "./languages.ts";

/**
 * An in-memory `Storage`.
 *
 * The globals are stubbed rather than taken from a DOM environment on
 * purpose. This suite previously relied on jsdom supplying `localStorage`,
 * which held on Node 24 and broke on Node 26, where the ambient
 * `localStorage` is not jsdom's. What these functions do with storage is the
 * subject of the tests, so the storage should be supplied by them.
 */
function createStorage(initial: Record<string, string> = {}): Storage {
  const entries = new Map(Object.entries(initial));
  return {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key: string) => entries.get(key) ?? null,
    key: (index: number) => [...entries.keys()][index] ?? null,
    removeItem: (key: string) => {
      entries.delete(key);
    },
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
  };
}

/** Storage that refuses every operation, as it does in private browsing. */
function createBlockedStorage(): Storage {
  const blocked = () => {
    throw new Error("storage blocked");
  };
  return {
    get length(): number {
      return blocked();
    },
    clear: blocked,
    getItem: blocked,
    key: blocked,
    removeItem: blocked,
    setItem: blocked,
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", createStorage());
  vi.stubGlobal("navigator", { language: "en-US" });
});

afterEach(() => {
  vi.unstubAllGlobals();
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
    vi.stubGlobal("navigator", { language: "ko-KR" });
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
    vi.stubGlobal("localStorage", createBlockedStorage());
    expect(readStoredLanguage()).toBeNull();
  });
});

describe("writeStoredLanguage", () => {
  it("swallows storage failures", () => {
    vi.stubGlobal("localStorage", createBlockedStorage());
    expect(() => writeStoredLanguage("ko")).not.toThrow();
  });
});

describe("detectInitialLanguage", () => {
  it("prefers an explicit earlier choice over the browser preference", () => {
    vi.stubGlobal("navigator", { language: "ja-JP" });
    writeStoredLanguage("ko");
    expect(detectInitialLanguage()).toBe("ko");
  });

  it("falls back to the browser preference when nothing is stored", () => {
    vi.stubGlobal("navigator", { language: "ja-JP" });
    expect(detectInitialLanguage()).toBe("ja");
  });
});
