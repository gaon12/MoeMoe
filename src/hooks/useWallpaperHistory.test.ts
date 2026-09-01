import { describe, expect, it } from "vitest";
import type { AnimeImage } from "../types/image.ts";
import {
  EMPTY_WALLPAPER_HISTORY,
  pushWallpaperHistoryEntry,
  type WallpaperHistoryState,
} from "./useWallpaperHistory.ts";

const image = (url: string): AnimeImage => ({ url });

function build(urls: string[], index = urls.length - 1): WallpaperHistoryState {
  return { entries: urls.map(image), index };
}

describe("pushWallpaperHistoryEntry", () => {
  it("records the first wallpaper at the cursor", () => {
    const next = pushWallpaperHistoryEntry(EMPTY_WALLPAPER_HISTORY, image("a"));
    expect(next.entries.map((entry) => entry.url)).toEqual(["a"]);
    expect(next.index).toBe(0);
  });

  it("appends and advances the cursor", () => {
    const next = pushWallpaperHistoryEntry(build(["a"]), image("b"));
    expect(next.entries.map((entry) => entry.url)).toEqual(["a", "b"]);
    expect(next.index).toBe(1);
  });

  it("ignores the entry already at the cursor", () => {
    const state = build(["a", "b"]);
    expect(pushWallpaperHistoryEntry(state, image("b"))).toBe(state);
  });

  it("re-records an earlier entry that is not at the cursor", () => {
    const next = pushWallpaperHistoryEntry(build(["a", "b"]), image("a"));
    expect(next.entries.map((entry) => entry.url)).toEqual(["a", "b", "a"]);
    expect(next.index).toBe(2);
  });

  it("discards the forward stack when a new wallpaper arrives", () => {
    const rewound = build(["a", "b", "c"], 0);
    const next = pushWallpaperHistoryEntry(rewound, image("d"));
    expect(next.entries.map((entry) => entry.url)).toEqual(["a", "d"]);
    expect(next.index).toBe(1);
  });

  it("drops the oldest entries once the limit is reached", () => {
    const next = pushWallpaperHistoryEntry(
      build(["a", "b", "c"]),
      image("d"),
      3,
    );
    expect(next.entries.map((entry) => entry.url)).toEqual(["b", "c", "d"]);
    expect(next.index).toBe(2);
  });

  it("keeps the cursor on the last entry when trimming", () => {
    let state = EMPTY_WALLPAPER_HISTORY;
    for (const url of ["a", "b", "c", "d", "e"]) {
      state = pushWallpaperHistoryEntry(state, image(url), 2);
    }
    expect(state.entries.map((entry) => entry.url)).toEqual(["d", "e"]);
    expect(state.index).toBe(1);
  });

  it("keeps no history at all for a non-positive limit", () => {
    expect(pushWallpaperHistoryEntry(build(["a"]), image("b"), 0)).toEqual(
      EMPTY_WALLPAPER_HISTORY,
    );
  });
});
