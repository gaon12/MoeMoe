import type { Language } from "../types/settings.ts";

/** Languages the interface ships translations for, in fallback order. */
export const SUPPORTED_LANGUAGES = [
  "en",
  "ko",
  "ja",
] as const satisfies readonly Language[];

/** Used whenever detection finds nothing we can render. */
export const FALLBACK_LANGUAGE: Language = "en";

/**
 * Mirrors the active language outside the settings blob so the i18n layer can
 * pick it up before the React tree, and therefore the settings context,
 * exists.
 */
export const LANGUAGE_STORAGE_KEY = "moemoe-language";

export function isSupportedLanguage(value: unknown): value is Language {
  return (
    typeof value === "string" &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
  );
}

/**
 * Resolves the browser's preferred language to one we can render, matching on
 * the primary subtag so regional variants such as `ko-KR` still count.
 */
export function detectBrowserLanguage(
  navigatorLanguage: string | undefined = globalThis.navigator?.language,
): Language {
  const [primarySubtag] = (navigatorLanguage ?? "").toLowerCase().split("-");
  return isSupportedLanguage(primarySubtag) ? primarySubtag : FALLBACK_LANGUAGE;
}

export function readStoredLanguage(): Language | null {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isSupportedLanguage(stored) ? stored : null;
  } catch {
    // Storage is unavailable in private or restricted browsing contexts.
    return null;
  }
}

export function writeStoredLanguage(language: Language): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Language persistence is a convenience, never a requirement.
  }
}

/**
 * The single language-detection rule for the whole application: an explicit
 * earlier choice wins, otherwise fall back to what the browser asks for.
 */
export function detectInitialLanguage(): Language {
  return readStoredLanguage() ?? detectBrowserLanguage();
}
