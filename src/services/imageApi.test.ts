import { describe, expect, it } from "vitest";
import { fetchRandomImage } from "./imageApi";

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
});
