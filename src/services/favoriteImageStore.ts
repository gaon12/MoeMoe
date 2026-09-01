import { fetchImageBlobWithFallback } from "../components/DownloadButton/downloadImage.ts";
import type { AnimeImage } from "../types/image.ts";

const DATABASE_NAME = "moemoe-favorite-images";
const DATABASE_VERSION = 1;
const STORE_NAME = "favorites";

/** Matches the per-image ceiling the CORS proxy already enforces. */
const MAX_FAVORITE_IMAGE_BYTES = 20 * 1024 * 1024;

/** Total archive budget, chosen to sit well inside a typical origin quota. */
const MAX_FAVORITE_ARCHIVE_BYTES = 150 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

interface ArchivedFavorite {
  url: string;
  blob: Blob;
  type: string;
  size: number;
  savedAt: number;
}

/**
 * Object URLs are minted once per archived favourite and reused. Revoking one
 * while a gallery thumbnail still points at it would break the image, so they
 * are released only when the entry itself is deleted.
 */
const objectUrls = new Map<string, string>();

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable in this context."));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "url" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open the favourite store."));
  });
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Favourite store request failed."));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const database = await openDatabase();
  try {
    return await run(
      database.transaction(STORE_NAME, mode).objectStore(STORE_NAME),
    );
  } finally {
    database.close();
  }
}

function isArchivableImage(image: AnimeImage): boolean {
  // Local images already live in IndexedDB under the user-image store, and
  // their blob URLs are not fetchable across sessions anyway.
  return !image.isLocal && image.url.startsWith("https://");
}

async function readArchivedFavoriteUrl(url: string): Promise<string | null> {
  const cached = objectUrls.get(url);
  if (cached) {
    return cached;
  }

  try {
    const entry = await withStore("readonly", (store) =>
      promisifyRequest<ArchivedFavorite | undefined>(store.get(url)),
    );
    if (!entry?.blob) {
      return null;
    }
    const objectUrl = URL.createObjectURL(entry.blob);
    objectUrls.set(url, objectUrl);
    return objectUrl;
  } catch {
    // A blocked or unavailable database simply means no archive.
    return null;
  }
}

async function removeArchivedFavorite(url: string): Promise<void> {
  const objectUrl = objectUrls.get(url);
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrls.delete(url);
  }

  try {
    await withStore("readwrite", (store) =>
      promisifyRequest(store.delete(url)),
    );
  } catch {
    // Nothing to do: the archive is a cache, not the source of truth.
  }
}

/**
 * Drops archived blobs whose URL is no longer favourited, so unfavouriting
 * from another tab or a settings import cannot leak storage.
 */
async function pruneArchivedFavorites(
  keptUrls: readonly string[],
): Promise<void> {
  const kept = new Set(keptUrls);
  try {
    const urls = await withStore("readonly", (store) =>
      promisifyRequest<IDBValidKey[]>(store.getAllKeys()),
    );
    await Promise.all(
      urls
        .filter(
          (key): key is string => typeof key === "string" && !kept.has(key),
        )
        .map((key) => removeArchivedFavorite(key)),
    );
  } catch {
    // Pruning is opportunistic.
  }
}

/**
 * Downloads a favourited wallpaper and keeps the bytes.
 *
 * Favourites used to be bookmarks: a URL in localStorage pointing at someone
 * else's CDN. When that CDN rotated a path, the favourite became a broken
 * image with no way back. Archiving the blob makes the favourite mean what a
 * user assumes it means.
 *
 * Failure is never fatal. The URL stays favourited and simply loads from the
 * network as before.
 */
async function archiveFavorite(
  image: AnimeImage,
  signal: AbortSignal,
): Promise<boolean> {
  if (!isArchivableImage(image)) {
    return false;
  }

  try {
    if (await hasArchivedFavorite(image.url)) {
      return true;
    }

    const blob = await fetchImageBlobWithFallback(
      image.url,
      image.proxiedUrl,
      signal,
    );
    if (
      blob.size === 0 ||
      blob.size > MAX_FAVORITE_IMAGE_BYTES ||
      !ACCEPTED_IMAGE_TYPES.includes(blob.type)
    ) {
      return false;
    }

    const usedBytes = await readArchiveSize();
    if (usedBytes + blob.size > MAX_FAVORITE_ARCHIVE_BYTES) {
      return false;
    }

    await withStore("readwrite", (store) =>
      promisifyRequest(
        store.put({
          url: image.url,
          blob,
          type: blob.type,
          size: blob.size,
          savedAt: Date.now(),
        } satisfies ArchivedFavorite),
      ),
    );
    return true;
  } catch {
    return false;
  }
}

async function hasArchivedFavorite(url: string): Promise<boolean> {
  const count = await withStore("readonly", (store) =>
    promisifyRequest<number>(store.count(url)),
  );
  return count > 0;
}

async function readArchiveSize(): Promise<number> {
  const entries = await withStore("readonly", (store) =>
    promisifyRequest<ArchivedFavorite[]>(store.getAll()),
  );
  return entries.reduce((total, entry) => total + (entry.size || 0), 0);
}

export {
  archiveFavorite,
  isArchivableImage,
  MAX_FAVORITE_ARCHIVE_BYTES,
  MAX_FAVORITE_IMAGE_BYTES,
  pruneArchivedFavorites,
  readArchivedFavoriteUrl,
  removeArchivedFavorite,
};
export type { ArchivedFavorite };
