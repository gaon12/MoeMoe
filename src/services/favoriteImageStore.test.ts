import { describe, expect, it } from "vitest";
import type { AnimeImage } from "../types/image.ts";
import {
  isArchivableImage,
  MAX_FAVORITE_ARCHIVE_BYTES,
  MAX_FAVORITE_IMAGE_BYTES,
} from "./favoriteImageStore.ts";

describe("isArchivableImage", () => {
  it("accepts a remote HTTPS wallpaper", () => {
    expect(isArchivableImage({ url: "https://cdn.example.test/a.webp" })).toBe(
      true,
    );
  });

  it("rejects user images, whose bytes are already stored locally", () => {
    const localImage: AnimeImage = {
      url: "blob:https://moemoe.test/abc",
      isLocal: true,
      localImageId: "abc",
    };
    expect(isArchivableImage(localImage)).toBe(false);
  });

  it("rejects anything that is not an HTTPS URL", () => {
    expect(isArchivableImage({ url: "http://cdn.example.test/a.webp" })).toBe(
      false,
    );
    expect(isArchivableImage({ url: "blob:https://moemoe.test/abc" })).toBe(
      false,
    );
    expect(isArchivableImage({ url: "data:image/png;base64,AAAA" })).toBe(
      false,
    );
    expect(isArchivableImage({ url: "" })).toBe(false);
  });
});

describe("archive limits", () => {
  it("caps a single image at the same ceiling as the CORS proxy", () => {
    expect(MAX_FAVORITE_IMAGE_BYTES).toBe(20 * 1024 * 1024);
  });

  it("keeps the total budget large enough for a full favourites list", () => {
    // The library holds at most 50 favourites, so the budget has to allow a
    // realistic average rather than only a handful of large wallpapers.
    expect(MAX_FAVORITE_ARCHIVE_BYTES).toBeGreaterThanOrEqual(
      MAX_FAVORITE_IMAGE_BYTES,
    );
    expect(MAX_FAVORITE_ARCHIVE_BYTES / 50).toBeGreaterThan(1024 * 1024);
  });
});
