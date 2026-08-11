import { describe, expect, it } from "vitest";
import type { WallpaperFeedback } from "./wallpaperPreferences";
import {
  chooseWeightedImageSource,
  createWallpaperFeedback,
  getCandidateAcceptanceProbability,
  getSourceWeight,
  getWallpaperAspect,
} from "./wallpaperPreferences";

describe("wallpaper preference learning", () => {
  it("extracts reusable provider, artist, and aspect traits", () => {
    const feedback = createWallpaperFeedback(
      {
        url: "https://images.example/one.jpg",
        source: "wallhaven",
        artistName: "  Artist Name  ",
        dimensions: { width: 1920, height: 1080 },
      },
      "liked",
      123,
    );

    expect(feedback).toEqual({
      url: "https://images.example/one.jpg",
      sentiment: "liked",
      source: "wallhaven",
      artist: "artist name",
      aspect: "landscape",
      updatedAt: 123,
    });
    expect(
      getWallpaperAspect({ dimensions: { width: 1000, height: 1000 } }),
    ).toBe("square");
  });

  it("boosts liked providers without starving disliked providers", () => {
    const feedback: WallpaperFeedback[] = [
      ...Array.from({ length: 20 }, (_, index) => ({
        url: `https://images.example/liked-${index}.jpg`,
        sentiment: "liked" as const,
        source: "wallhaven" as const,
        updatedAt: index,
      })),
      ...Array.from({ length: 20 }, (_, index) => ({
        url: `https://images.example/disliked-${index}.jpg`,
        sentiment: "disliked" as const,
        source: "pic_re" as const,
        updatedAt: index,
      })),
    ];

    expect(getSourceWeight("wallhaven", feedback)).toBeGreaterThan(1);
    expect(getSourceWeight("pic_re", feedback)).toBeGreaterThanOrEqual(0.25);
    expect(
      chooseWeightedImageSource(["wallhaven", "pic_re"], feedback, () => 0),
    ).toBe("wallhaven");
    expect(
      chooseWeightedImageSource(["wallhaven", "pic_re"], feedback, () => 0.999),
    ).toBe("pic_re");
  });

  it("keeps an exploration chance for disliked visual traits", () => {
    const image = {
      url: "https://images.example/candidate.jpg",
      artistName: "Same Artist",
      dimensions: { width: 800, height: 1200 },
    };
    const feedback = Array.from({ length: 30 }, (_, index) =>
      createWallpaperFeedback(
        {
          ...image,
          url: `https://images.example/${index}.jpg`,
        },
        "disliked",
        index,
      ),
    );

    expect(
      getCandidateAcceptanceProbability(image, feedback),
    ).toBeGreaterThanOrEqual(0.25);
  });
});
