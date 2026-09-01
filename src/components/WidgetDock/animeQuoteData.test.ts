import { describe, expect, it } from "vitest";
import {
  getBuiltInAnimeQuote,
  parseAnimeQuoteResponse,
} from "./animeQuoteData.ts";

describe("anime quote data", () => {
  it("parses both configured API response shapes", () => {
    expect(
      parseAnimeQuoteResponse([
        { quote: " Keep going. ", character: "Hero", show: "Series" },
      ]),
    ).toEqual({ content: "Keep going.", character: "Hero", show: "Series" });
    expect(
      parseAnimeQuoteResponse({
        content: "Choose your future.",
        author: "Lead",
        anime: "Another Series",
      }),
    ).toEqual({
      content: "Choose your future.",
      character: "Lead",
      show: "Another Series",
    });
  });

  it("rejects empty or malformed responses", () => {
    expect(parseAnimeQuoteResponse({ quote: "   " })).toBeNull();
    expect(parseAnimeQuoteResponse(null)).toBeNull();
  });

  it("provides a non-repeating built-in fallback", () => {
    const first = getBuiltInAnimeQuote(undefined, () => 0);
    const second = getBuiltInAnimeQuote(first.content, () => 0);
    expect(second.content).not.toBe(first.content);
  });
});
