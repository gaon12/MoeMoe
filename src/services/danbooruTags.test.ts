import { describe, expect, it } from "vitest";
import { formatDanbooruTag } from "./danbooruTags.ts";

describe("formatDanbooruTag", () => {
  it("turns an underscored tag into a readable name", () => {
    expect(formatDanbooruTag("hatsune_miku")).toBe("Hatsune Miku");
    expect(formatDanbooruTag("touhou")).toBe("Touhou");
  });

  it("uses only the first tag, which is the most relevant one", () => {
    expect(
      formatDanbooruTag("hatsune_miku vocaloid crypton_future_media"),
    ).toBe("Hatsune Miku");
  });

  it("keeps qualifiers that are part of the series name", () => {
    expect(formatDanbooruTag("fate_(series)")).toBe("Fate (Series)");
  });

  it("treats the unseried placeholder as no title", () => {
    // `original` is a real Danbooru tag meaning the work belongs to no
    // series. Displaying it as a title would be worse than showing nothing.
    expect(formatDanbooruTag("original")).toBeUndefined();
  });

  it("returns nothing for empty or absent values", () => {
    expect(formatDanbooruTag("")).toBeUndefined();
    expect(formatDanbooruTag("   ")).toBeUndefined();
    expect(formatDanbooruTag(undefined)).toBeUndefined();
    expect(formatDanbooruTag(null)).toBeUndefined();
  });

  it("tolerates irregular spacing", () => {
    expect(formatDanbooruTag("  kantai_collection   ")).toBe(
      "Kantai Collection",
    );
  });
});
