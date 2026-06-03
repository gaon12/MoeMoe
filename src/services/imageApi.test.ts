import { describe, expect, it } from "vitest";
import {
  buildDanbooruAspectTags,
  buildWaifuImSearchUrl,
  fetchRandomImage,
} from "./imageApi";

describe("fetchRandomImage", () => {
  it("cache-busts Pic.re requests so refreshes request a new image", async () => {
    const first = await fetchRandomImage({
      source: "pic_re",
      allowNSFW: false,
    });
    const second = await fetchRandomImage({
      source: "pic_re",
      allowNSFW: false,
    });

    expect(first.url).toMatch(/^https:\/\/pic\.re\/image\?_moemoe_refresh=/);
    expect(second.url).toMatch(/^https:\/\/pic\.re\/image\?_moemoe_refresh=/);
    expect(first.url).not.toBe(second.url);
    expect(first.sourceUrl).toBe(first.url);
  });

  it("builds Waifu.im orientation and resolution filters from the screen", () => {
    const url = new URL(
      buildWaifuImSearchUrl(false, {
        preference: "screen",
        viewport: { width: 1920, height: 1080 },
      }),
    );

    expect(url.searchParams.get("IsNsfw")).toBe("False");
    expect(url.searchParams.get("OrderBy")).toBe("Random");
    expect(url.searchParams.get("Orientation")).toBe("Landscape");
    expect(url.searchParams.get("Width")).toBe(">=1920");
    expect(url.searchParams.get("Height")).toBe(">=1080");
  });

  it("builds Danbooru aspect metatags from the screen", () => {
    expect(
      buildDanbooruAspectTags({
        preference: "screen",
        viewport: { width: 1920, height: 1080 },
      }),
    ).toEqual(["ratio:16:9"]);
    expect(
      buildDanbooruAspectTags({
        preference: "screen",
        viewport: { width: 929, height: 917 },
      }),
    ).toEqual(["ratio:1:1"]);
    expect(buildDanbooruAspectTags({ preference: "portrait" })).toEqual([
      "ratio:<1",
    ]);
  });
});
