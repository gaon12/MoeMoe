import { describe, expect, it } from "vitest";
import { sanitizeWallpaperLibrary } from "./useWallpaperLibrary";

describe("sanitizeWallpaperLibrary", () => {
  it("keeps safe remote images and removes unsafe URLs", () => {
    expect(
      sanitizeWallpaperLibrary({
        favorites: [
          { url: "https://images.example/favorite.png" },
          {
            url: "javascript:alert(1)",
            sourceUrl: "javascript:alert(2)",
          },
        ],
        blockedUrls: [
          "https://images.example/blocked.png",
          "https://images.example/blocked.png",
          "data:text/html,boom",
        ],
      }),
    ).toEqual({
      favorites: [{ url: "https://images.example/favorite.png" }],
      blockedUrls: ["https://images.example/blocked.png"],
      feedback: [],
    });
  });

  it("drops unsafe optional links from otherwise valid favorites", () => {
    expect(
      sanitizeWallpaperLibrary({
        favorites: [
          {
            url: "https://images.example/safe.png",
            sourceUrl: "javascript:alert(1)",
          },
        ],
      }).favorites,
    ).toEqual([{ url: "https://images.example/safe.png" }]);
  });
});
