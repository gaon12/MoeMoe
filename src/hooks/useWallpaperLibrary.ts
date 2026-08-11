import { useCallback, useEffect, useMemo, useState } from "react";
import type { AnimeImage } from "../types/image";

const STORAGE_KEY = "moemoe-wallpaper-library";
const MAX_FAVORITES = 50;
const MAX_BLOCKED_URLS = 200;

export interface WallpaperLibraryData {
  favorites: AnimeImage[];
  blockedUrls: string[];
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
    return { favorites: [], blockedUrls: [] };
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
  return { favorites, blockedUrls };
}

export function useWallpaperLibrary() {
  const [library, setLibrary] = useState<WallpaperLibraryData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved
        ? sanitizeWallpaperLibrary(JSON.parse(saved))
        : { favorites: [], blockedUrls: [] };
    } catch (error) {
      console.error("Failed to load wallpaper library:", error);
      return { favorites: [], blockedUrls: [] };
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
      };
    });
  }, []);

  const removeFavorite = useCallback((url: string) => {
    setLibrary((current) => ({
      ...current,
      favorites: current.favorites.filter((image) => image.url !== url),
    }));
  }, []);

  const blockWallpaper = useCallback((image: AnimeImage) => {
    setLibrary((current) => ({
      favorites: current.favorites.filter((item) => item.url !== image.url),
      blockedUrls: [image.url, ...current.blockedUrls]
        .filter((url, index, urls) => urls.indexOf(url) === index)
        .slice(0, MAX_BLOCKED_URLS),
    }));
  }, []);

  const isFavorite = useCallback(
    (url: string | undefined) => Boolean(url && favoriteUrls.has(url)),
    [favoriteUrls],
  );

  return {
    favorites: library.favorites,
    blockedUrls: library.blockedUrls,
    isFavorite,
    toggleFavorite,
    removeFavorite,
    blockWallpaper,
  };
}
