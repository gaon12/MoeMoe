import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ALL_IMAGE_SOURCES,
  type AnimeImage,
  type ImageSource,
} from "../types/image";
import {
  createWallpaperFeedback,
  type WallpaperAspect,
  type WallpaperFeedback,
  type WallpaperSentiment,
} from "../utils/wallpaperPreferences";

const STORAGE_KEY = "moemoe-wallpaper-library";
const MAX_FAVORITES = 50;
const MAX_BLOCKED_URLS = 200;
const MAX_FEEDBACK = 300;

export interface WallpaperLibraryData {
  favorites: AnimeImage[];
  blockedUrls: string[];
  feedback: WallpaperFeedback[];
}

function isSafeRemoteUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function sanitizeWallpaperLibrary(value: unknown): WallpaperLibraryData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { favorites: [], blockedUrls: [], feedback: [] };
  }
  const candidate = value as Record<string, unknown>;
  const favorites = Array.isArray(candidate.favorites)
    ? candidate.favorites
        .flatMap((item): AnimeImage[] => {
          if (!item || typeof item !== "object" || Array.isArray(item))
            return [];
          const image = item as Record<string, unknown>;
          if (!isSafeRemoteUrl(image.url)) return [];
          const sanitized: AnimeImage = { url: image.url };
          if (isSafeRemoteUrl(image.proxiedUrl)) {
            sanitized.proxiedUrl = image.proxiedUrl;
          }
          if (isSafeRemoteUrl(image.sourceUrl)) {
            sanitized.sourceUrl = image.sourceUrl;
          }
          if (isSafeRemoteUrl(image.artistHref)) {
            sanitized.artistHref = image.artistHref;
          }
          if (typeof image.animeName === "string") {
            sanitized.animeName = image.animeName.slice(0, 500);
          }
          if (typeof image.artistName === "string") {
            sanitized.artistName = image.artistName.slice(0, 500);
          }
          if (
            typeof image.source === "string" &&
            ALL_IMAGE_SOURCES.includes(image.source as ImageSource)
          ) {
            sanitized.source = image.source as ImageSource;
          }
          if (
            image.dimensions &&
            typeof image.dimensions === "object" &&
            !Array.isArray(image.dimensions)
          ) {
            const dimensions = image.dimensions as Record<string, unknown>;
            if (
              typeof dimensions.width === "number" &&
              typeof dimensions.height === "number" &&
              dimensions.width > 0 &&
              dimensions.height > 0
            ) {
              sanitized.dimensions = {
                width: dimensions.width,
                height: dimensions.height,
              };
            }
          }
          return [sanitized];
        })
        .slice(0, MAX_FAVORITES)
    : [];
  const blockedUrls = Array.isArray(candidate.blockedUrls)
    ? [...new Set(candidate.blockedUrls.filter(isSafeRemoteUrl))].slice(
        0,
        MAX_BLOCKED_URLS,
      )
    : [];
  const validSentiments: WallpaperSentiment[] = ["liked", "disliked"];
  const validAspects: WallpaperAspect[] = ["landscape", "portrait", "square"];
  const feedback = Array.isArray(candidate.feedback)
    ? candidate.feedback
        .flatMap((item): WallpaperFeedback[] => {
          if (!item || typeof item !== "object" || Array.isArray(item))
            return [];
          const entry = item as Record<string, unknown>;
          if (
            !isSafeRemoteUrl(entry.url) ||
            !validSentiments.includes(entry.sentiment as WallpaperSentiment)
          ) {
            return [];
          }
          return [
            {
              url: entry.url,
              sentiment: entry.sentiment as WallpaperSentiment,
              source:
                typeof entry.source === "string" &&
                ALL_IMAGE_SOURCES.includes(entry.source as ImageSource)
                  ? (entry.source as ImageSource)
                  : undefined,
              artist:
                typeof entry.artist === "string"
                  ? entry.artist.trim().toLocaleLowerCase().slice(0, 200) ||
                    undefined
                  : undefined,
              aspect: validAspects.includes(entry.aspect as WallpaperAspect)
                ? (entry.aspect as WallpaperAspect)
                : undefined,
              updatedAt:
                typeof entry.updatedAt === "number" &&
                Number.isFinite(entry.updatedAt)
                  ? entry.updatedAt
                  : 0,
            },
          ];
        })
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .filter(
          (entry, index, entries) =>
            entries.findIndex((candidate) => candidate.url === entry.url) ===
            index,
        )
        .slice(0, MAX_FEEDBACK)
    : [];
  return { favorites, blockedUrls, feedback };
}

function upsertFeedback(
  feedback: readonly WallpaperFeedback[],
  entry: WallpaperFeedback,
): WallpaperFeedback[] {
  return [entry, ...feedback.filter((item) => item.url !== entry.url)].slice(
    0,
    MAX_FEEDBACK,
  );
}

export function useWallpaperLibrary() {
  const [library, setLibrary] = useState<WallpaperLibraryData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved
        ? sanitizeWallpaperLibrary(JSON.parse(saved))
        : { favorites: [], blockedUrls: [], feedback: [] };
    } catch (error) {
      console.error("Failed to load wallpaper library:", error);
      return { favorites: [], blockedUrls: [], feedback: [] };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
    } catch (error) {
      console.error("Failed to save wallpaper library:", error);
    }
  }, [library]);

  const favoriteUrls = useMemo(
    () => new Set(library.favorites.map((image) => image.url)),
    [library.favorites],
  );

  const toggleFavorite = useCallback((image: AnimeImage) => {
    setLibrary((current) => {
      const exists = current.favorites.some((item) => item.url === image.url);
      return {
        ...current,
        favorites: exists
          ? current.favorites.filter((item) => item.url !== image.url)
          : [image, ...current.favorites].slice(0, MAX_FAVORITES),
        blockedUrls: exists
          ? current.blockedUrls
          : current.blockedUrls.filter((url) => url !== image.url),
        feedback: exists
          ? current.feedback.filter(
              (entry) => entry.url !== image.url || entry.sentiment !== "liked",
            )
          : upsertFeedback(
              current.feedback,
              createWallpaperFeedback(image, "liked"),
            ),
      };
    });
  }, []);

  const removeFavorite = useCallback((url: string) => {
    setLibrary((current) => ({
      ...current,
      favorites: current.favorites.filter((image) => image.url !== url),
      feedback: current.feedback.filter(
        (entry) => entry.url !== url || entry.sentiment !== "liked",
      ),
    }));
  }, []);

  const blockWallpaper = useCallback((image: AnimeImage) => {
    setLibrary((current) => ({
      favorites: current.favorites.filter((item) => item.url !== image.url),
      blockedUrls: [image.url, ...current.blockedUrls]
        .filter((url, index, urls) => urls.indexOf(url) === index)
        .slice(0, MAX_BLOCKED_URLS),
      feedback: upsertFeedback(
        current.feedback,
        createWallpaperFeedback(image, "disliked"),
      ),
    }));
  }, []);

  const isFavorite = useCallback(
    (url: string | undefined) => Boolean(url && favoriteUrls.has(url)),
    [favoriteUrls],
  );

  return {
    favorites: library.favorites,
    blockedUrls: library.blockedUrls,
    feedback: library.feedback,
    isFavorite,
    toggleFavorite,
    removeFavorite,
    blockWallpaper,
  };
}
