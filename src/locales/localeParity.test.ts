import { describe, expect, it } from "vitest";
import { SUPPORTED_LANGUAGES } from "../i18n/languages.ts";
import enTranslation from "./en/translation.json" with { type: "json" };
import jaTranslation from "./ja/translation.json" with { type: "json" };
import koTranslation from "./ko/translation.json" with { type: "json" };

interface TranslationTree {
  [key: string]: string | TranslationTree;
}

const translations: Record<string, TranslationTree> = {
  en: enTranslation,
  ko: koTranslation,
  ja: jaTranslation,
};

/**
 * Only languages that actually ship a file, so the "every language has a
 * file" assertion is the one place a missing locale is reported.
 */
const shippedLocales = SUPPORTED_LANGUAGES.flatMap((language) => {
  const tree = translations[language];
  return tree ? [[language, tree] as const] : [];
});

/** Flattens a translation tree to sorted dotted paths. */
function collectKeys(tree: TranslationTree, prefix = ""): string[] {
  return Object.entries(tree)
    .flatMap(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof value === "string" ? [path] : collectKeys(value, path);
    })
    .sort((left, right) => left.localeCompare(right));
}

const PLACEHOLDER_PATTERN = /\{\{(\w+)\}\}/g;

/** Interpolation placeholders such as `{{widget}}`. */
function collectPlaceholders(value: string): string[] {
  return [...value.matchAll(PLACEHOLDER_PATTERN)]
    .map((match) => match[1])
    .sort((left, right) => left.localeCompare(right));
}

function readValue(tree: TranslationTree, path: string): string {
  const value = path
    .split(".")
    .reduce<string | TranslationTree | undefined>(
      (node, key) => (typeof node === "object" ? node[key] : undefined),
      tree,
    );
  return typeof value === "string" ? value : "";
}

describe("locale parity", () => {
  const referenceKeys = collectKeys(enTranslation);

  it("ships a translation file for every supported language", () => {
    for (const language of SUPPORTED_LANGUAGES) {
      expect(translations[language]).toBeDefined();
    }
  });

  it("defines the same keys in every language", () => {
    for (const [language, tree] of shippedLocales) {
      // Reported as a set difference so a failure names the missing keys
      // rather than dumping several hundred matching ones.
      const keys = collectKeys(tree);
      expect({
        language,
        missing: referenceKeys.filter((key) => !keys.includes(key)),
        extra: keys.filter((key) => !referenceKeys.includes(key)),
      }).toEqual({ language, missing: [], extra: [] });
    }
  });

  it("never leaves a translated string empty", () => {
    for (const [language, tree] of shippedLocales) {
      const blank = collectKeys(tree).filter(
        (key) => readValue(tree, key).trim() === "",
      );
      expect({ language, blank }).toEqual({ language, blank: [] });
    }
  });

  it("keeps interpolation placeholders consistent across languages", () => {
    for (const key of referenceKeys) {
      const expected = collectPlaceholders(readValue(enTranslation, key));
      for (const [language, tree] of shippedLocales) {
        expect({
          key,
          language,
          placeholders: collectPlaceholders(readValue(tree, key)),
        }).toEqual({ key, language, placeholders: expected });
      }
    }
  });
});
