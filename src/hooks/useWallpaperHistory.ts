import { useCallback, useState } from "react";
import type { AnimeImage } from "../types/image.ts";

/** How many recently shown wallpapers stay reachable with back and forward. */
export const MAX_WALLPAPER_HISTORY = 20;

export interface WallpaperHistoryState {
  entries: AnimeImage[];
  /** Position within `entries`, or -1 while nothing has been shown yet. */
  index: number;
}

export const EMPTY_WALLPAPER_HISTORY: WallpaperHistoryState = {
  entries: [],
  index: -1,
};

/**
 * Records a newly shown wallpaper.
 *
 * Re-recording the entry already at the cursor is a no-op, which is what lets
 * history navigation reuse the ordinary "an image was displayed" callback
 * without pushing the entry it just moved to.
 */
export function pushWallpaperHistoryEntry(
  state: WallpaperHistoryState,
  image: AnimeImage,
  limit: number = MAX_WALLPAPER_HISTORY,
): WallpaperHistoryState {
  if (limit <= 0) {
    return EMPTY_WALLPAPER_HISTORY;
  }
  if (state.entries[state.index]?.url === image.url) {
    return state;
  }

  // Loading something new after going back discards what was ahead, the same
  // way a browser drops its forward stack once you navigate elsewhere.
  const retained = state.entries.slice(0, state.index + 1);
  const entries = [...retained, image].slice(-limit);
  return { entries, index: entries.length - 1 };
}

export function useWallpaperHistory(limit: number = MAX_WALLPAPER_HISTORY) {
  const [history, setHistory] = useState<WallpaperHistoryState>(
    EMPTY_WALLPAPER_HISTORY,
  );

  const push = useCallback(
    (image: AnimeImage) => {
      setHistory((previous) =>
        pushWallpaperHistoryEntry(previous, image, limit),
      );
    },
    [limit],
  );

  const step = useCallback(
    (offset: number): AnimeImage | null => {
      const targetIndex = history.index + offset;
      const target = history.entries[targetIndex];
      if (targetIndex < 0 || !target) {
        return null;
      }
      setHistory({ entries: history.entries, index: targetIndex });
      return target;
    },
    [history],
  );

  const goBack = useCallback(() => step(-1), [step]);
  const goForward = useCallback(() => step(1), [step]);

  const clear = useCallback(() => setHistory(EMPTY_WALLPAPER_HISTORY), []);

  return {
    history,
    canGoBack: history.index > 0,
    canGoForward:
      history.index >= 0 && history.index < history.entries.length - 1,
    push,
    goBack,
    goForward,
    clear,
  };
}
