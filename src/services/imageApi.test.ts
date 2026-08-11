import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildDanbooruAspectTags,
  buildWaifuImSearchUrl,
  buildWallhavenSearchUrl,
  fetchRandomImage,
} from "./imageApi";

describe("fetchRandomImage", () => {
  afterEach(() => vi.restoreAllMocks());

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
    expect(first.source).toBe("pic_re");
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

  it("builds a SFW anime Wallhaven query for the current screen", () => {
    const url = new URL(
      buildWallhavenSearchUrl({
        preference: "screen",
        viewport: { width: 1920, height: 1080 },
      }),
    );
    expect(url.searchParams.get("categories")).toBe("010");
    expect(url.searchParams.get("purity")).toBe("100");
    expect(url.searchParams.get("sorting")).toBe("random");
    expect(url.searchParams.get("ratios")).toContain("16x9");
    expect(url.searchParams.get("atleast")).toBe("1920x1080");
  });

  it("surfaces provider errors instead of silently returning a placeholder", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("maintenance", {
        status: 503,
        statusText: "Service Unavailable",
      }),
    );

    await expect(
      fetchRandomImage({ source: "nekos_best", allowNSFW: false }),
    ).rejects.toThrow(/503 Service Unavailable/);
  });

  it("rejects active URLs returned by a compromised provider", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ url: "javascript:alert(1)" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(fetchRandomImage({ source: "waifu_pics" })).rejects.toThrow(
      /Unsafe image URL/,
    );
  });

  it("passes cancellation signals to providers", async () => {
    const controller = new AbortController();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new DOMException("aborted", "AbortError"));

    await expect(
      fetchRandomImage({
        source: "nekos_best",
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});
