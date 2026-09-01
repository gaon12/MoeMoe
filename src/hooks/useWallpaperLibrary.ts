import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ALL_IMAGE_SOURCES,
  type AnimeImage,
  type ImageSource,
} from "../types/image.ts";
import {
  createWallpaperFeedback,
  type WallpaperAspect,
  type WallpaperFeedback,
  type WallpaperSentiment,
} from "../utils/wallpaperPreferences.ts";
import { isSafeHttpsUrl } from "../utils/safeUrl.ts";
import {
  archiveFavorite,
  pruneArchivedFavorites,
  readArchivedFavoriteUrl,
  removeArchivedFavorite,
} from "../services/favoriteImageStore.ts";

const STORAGE_KEY = "moemoe-wallpaper-library";
const MAX_FAVORITES = 50;
const MAX_BLOCKED_URLS = 200;
const MAX_FEEDBACK = 300;

/** Ceiling on a single background archive download. */
const ARCHIVE_TIMEOUT_MS = 30_000;

interface WallpaperLibraryData {
  favorites: AnimeImage[];
  blockedUrls: string[];
  feedback: WallpaperFeedback[];
}

function isSafeRemoteUrl(value: unknown): value is string {
  return isSafeHttpsUrl(value);
}

function sanitizeWallpaperLibrary(value: unknown): WallpaperLibraryData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { favorites: [], blockedUrls: [], feedback: [] };
  }
  const candidate = value as Record<string, unknown>;
  const favorites = Array.isArray(candidate.favorites)
    ? candidate.favorites
        .flatMap((item): AnimeImage[] => {
          if (!item || typeof item !== "object" || Array.isArray(item)) {
            return [];
          }
          const image = item as Record<string, unknown>;
          if (!isSafeRemoteUrl(image.url)) {
            return [];
          }
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
          if (!item || typeof item !== "object" || Array.isArray(item)) {
            return [];
          }
          const entry = item as Record<string, unknown>;
          if (
            !(
              isSafeRemoteUrl(entry.url) &&
              validSentiments.includes(entry.sentiment as WallpaperSentiment)
            )
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
            entries.findIndex(
              (existingEntry) => existingEntry.url === entry.url,
            ) === index,
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

function useWallpaperLibrary() {
  const [library, setLibrary] = useState<WallpaperLibraryData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved
        ? sanitizeWallpaperLibrary(JSON.parse(saved))
        : { favorites: [], blockedUrls: [], feedback: [] };
    } catch {
      return { favorites: [], blockedUrls: [], feedback: [] };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
    } catch {
      // Keep the in-memory library when persistent storage is unavailable.
    }
  }, [library]);

  const favoriteUrls = useMemo(
    () => new Set(library.favorites.map((image) => image.url)),
    [library.favorites],
  );

  const toggleFavorite = useCallback((image: AnimeImage) => {
    setLibrary((current) => {
      const exists = current.favorites.some((item) => item.url === image.url);
      if (exists) {
        removeArchivedFavorite(image.url).catch(() => undefined);
      } else {
        // Archiving runs alongside the state update rather than gating it, so
        // marking a favourite stays instant even on a slow connection. A
        // failure just leaves the favourite loading from the network.
        archiveFavorite(image, AbortSignal.timeout(ARCHIVE_TIMEOUT_MS)).catch(
          () => undefined,
        );
      }
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
    removeArchivedFavorite(url).catch(() => undefined);
    setLibrary((current) => ({
      ...current,
      favorites: current.favorites.filter((image) => image.url !== url),
      feedback: current.feedback.filter(
        (entry) => entry.url !== url || entry.sentiment !== "liked",
      ),
    }));
  }, []);

  const blockWallpaper = useCallback((image: AnimeImage) => {
    removeArchivedFavorite(image.url).catch(() => undefined);
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

  // Blob URLs for favourites whose bytes are archived, so the gallery keeps
  // working after a provider rotates or deletes the original path.
  const [archivedUrls, setArchivedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const urls = library.favorites.map((image) => image.url);

    const loadArchivedUrls = async () => {
      const resolved = await Promise.all(
        urls.map(
          async (url) => [url, await readArchivedFavoriteUrl(url)] as const,
        ),
      );
      if (cancelled) {
        return;
      }
      setArchivedUrls(
        Object.fromEntries(
          resolved.filter((entry): entry is [string, string] =>
            Boolean(entry[1]),
          ),
        ),
      );
    };

    loadArchivedUrls().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [library.favorites]);

  // Drop archived blobs for anything no longer favourited, which covers
  // unfavouriting in another tab and settings imports.
  useEffect(() => {
    pruneArchivedFavorites(library.favorites.map((image) => image.url)).catch(
      () => undefined,
    );
  }, [library.favorites]);

  const resolveFavoriteUrl = useCallback(
    (url: string) => archivedUrls[url] ?? url,
    [archivedUrls],
  );

  return {
    resolveFavoriteUrl,
    favorites: library.favorites,
    blockedUrls: library.blockedUrls,
    feedback: library.feedback,
    isFavorite,
    toggleFavorite,
    removeFavorite,
    blockWallpaper,
  };
}

export { sanitizeWallpaperLibrary, useWallpaperLibrary };
export type { WallpaperLibraryData };
