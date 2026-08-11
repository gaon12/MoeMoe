import type { AnimeImage, ImageDimensions } from "../types/image";

const DATABASE_NAME = "moemoe-user-images";
const DATABASE_VERSION = 1;
const STORE_NAME = "images";

export const MAX_USER_IMAGE_COUNT = 50;
export const MAX_USER_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_USER_IMAGE_TOTAL_BYTES = 250 * 1024 * 1024;
export const MAX_USER_IMAGE_PIXELS = 100_000_000;
export const ACCEPTED_USER_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export type UserImageErrorCode =
  | "unsupported"
  | "tooLarge"
  | "tooMany"
  | "quota"
  | "decode"
  | "dimensions"
  | "unavailable"
  | "empty";

export class UserImageStoreError extends Error {
  readonly code: UserImageErrorCode;

  constructor(
    code: UserImageErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "UserImageStoreError";
    this.code = code;
  }
}

export interface StoredUserImage {
  id: string;
  name: string;
  type: string;
  size: number;
  width: number;
  height: number;
  createdAt: number;
  lastModified: number;
  fingerprint: string;
  blob: Blob;
}

export interface UserImageCandidate {
  name: string;
  type: string;
  size: number;
  lastModified: number;
}

export interface AddUserImagesResult {
  added: StoredUserImage[];
  skippedDuplicates: number;
}

const objectUrls = new Map<string, string>();

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB error"));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      new UserImageStoreError(
        "unavailable",
        "IndexedDB is unavailable in this browser",
      ),
    );
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open user image database"));
    request.onblocked = () =>
      reject(new Error("User image database upgrade was blocked"));
  });
}

function closeDatabase(database: IDBDatabase) {
  database.close();
}

export function getUserImageFingerprint(image: UserImageCandidate): string {
  return `${image.name}\u0000${image.size}\u0000${image.lastModified}`;
}

export function validateUserImageCandidate(
  image: UserImageCandidate,
  existingCount: number,
  existingBytes: number,
): void {
  if (!(ACCEPTED_USER_IMAGE_TYPES as readonly string[]).includes(image.type)) {
    throw new UserImageStoreError(
      "unsupported",
      `Unsupported image type: ${image.type || "unknown"}`,
    );
  }
  if (image.size <= 0 || image.size > MAX_USER_IMAGE_BYTES) {
    throw new UserImageStoreError(
      "tooLarge",
      `Image exceeds the ${MAX_USER_IMAGE_BYTES} byte file limit`,
    );
  }
  if (existingCount >= MAX_USER_IMAGE_COUNT) {
    throw new UserImageStoreError(
      "tooMany",
      `Image collection is limited to ${MAX_USER_IMAGE_COUNT} files`,
    );
  }
  if (existingBytes + image.size > MAX_USER_IMAGE_TOTAL_BYTES) {
    throw new UserImageStoreError(
      "quota",
      `Image collection exceeds the ${MAX_USER_IMAGE_TOTAL_BYTES} byte limit`,
    );
  }
}

function validateImageDimensions(dimensions: ImageDimensions) {
  if (
    dimensions.width <= 0 ||
    dimensions.height <= 0 ||
    dimensions.width * dimensions.height > MAX_USER_IMAGE_PIXELS
  ) {
    throw new UserImageStoreError(
      "dimensions",
      "Image dimensions are invalid or too large",
    );
  }
  return dimensions;
}

async function readDimensionsWithImageElement(
  file: File,
): Promise<ImageDimensions> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      const timeoutId = globalThis.setTimeout(
        () => reject(new Error("Image decode timed out")),
        15_000,
      );
      image.onload = () => {
        globalThis.clearTimeout(timeoutId);
        resolve();
      };
      image.onerror = () => {
        globalThis.clearTimeout(timeoutId);
        reject(new Error("Image element could not decode the file"));
      };
      image.src = url;
    });
    return validateImageDimensions({
      width: image.naturalWidth,
      height: image.naturalHeight,
    });
  } finally {
    image.src = "";
    URL.revokeObjectURL(url);
  }
}

async function readImageDimensions(file: File): Promise<ImageDimensions> {
  let bitmap: ImageBitmap | null = null;
  let bitmapError: unknown;
  if (typeof createImageBitmap === "function") {
    try {
      bitmap = await createImageBitmap(file);
      return validateImageDimensions({
        width: bitmap.width,
        height: bitmap.height,
      });
    } catch (error) {
      if (error instanceof UserImageStoreError) throw error;
      bitmapError = error;
    } finally {
      bitmap?.close();
    }
  }

  try {
    return await readDimensionsWithImageElement(file);
  } catch (error) {
    if (error instanceof UserImageStoreError) throw error;
    throw new UserImageStoreError(
      "decode",
      "The selected file could not be decoded as an image",
      { cause: bitmapError ?? error },
    );
  }
}

export async function listUserImages(): Promise<StoredUserImage[]> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const images = await requestResult(
      transaction.objectStore(STORE_NAME).getAll() as IDBRequest<
        StoredUserImage[]
      >,
    );
    await transactionDone(transaction);
    return images.sort((a, b) => b.createdAt - a.createdAt);
  } finally {
    closeDatabase(database);
  }
}

export async function addUserImages(
  files: readonly File[],
): Promise<AddUserImagesResult> {
  const existing = await listUserImages();
  const fingerprints = new Set(existing.map((image) => image.fingerprint));
  let totalBytes = existing.reduce((sum, image) => sum + image.size, 0);
  const pending: StoredUserImage[] = [];
  let skippedDuplicates = 0;

  for (const file of files) {
    const fingerprint = getUserImageFingerprint(file);
    if (fingerprints.has(fingerprint)) {
      skippedDuplicates += 1;
      continue;
    }

    validateUserImageCandidate(
      file,
      existing.length + pending.length,
      totalBytes,
    );
    const dimensions = await readImageDimensions(file);
    const stored: StoredUserImage = {
      id:
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : Array.from(crypto.getRandomValues(new Uint32Array(4)), (value) =>
              value.toString(16).padStart(8, "0"),
            ).join(""),
      name: file.name.slice(0, 255),
      type: file.type,
      size: file.size,
      width: dimensions.width,
      height: dimensions.height,
      createdAt: Date.now(),
      lastModified: file.lastModified,
      fingerprint,
      blob: file,
    };
    pending.push(stored);
    fingerprints.add(fingerprint);
    totalBytes += file.size;
  }

  if (pending.length === 0) return { added: [], skippedDuplicates };

  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    for (const image of pending) store.add(image);
    await transactionDone(transaction);
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      throw new UserImageStoreError(
        "quota",
        "Browser storage quota was exceeded",
        { cause: error },
      );
    }
    throw error;
  } finally {
    closeDatabase(database);
  }

  return { added: pending, skippedDuplicates };
}

export function getUserImageObjectUrl(image: StoredUserImage): string {
  const existing = objectUrls.get(image.id);
  if (existing) return existing;
  const url = URL.createObjectURL(image.blob);
  objectUrls.set(image.id, url);
  return url;
}

export async function deleteUserImage(id: string): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    await transactionDone(transaction);
  } finally {
    closeDatabase(database);
  }
  // Keep an already displayed blob URL alive until this page is closed.
}

export async function clearUserImages(): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).clear();
    await transactionDone(transaction);
  } finally {
    closeDatabase(database);
  }
  // Existing blob URLs may still be displayed; the browser releases them when
  // this document is closed.
}

export async function fetchRandomUserImage(
  signal?: AbortSignal,
): Promise<AnimeImage> {
  if (signal?.aborted) throw signal.reason;
  const images = await listUserImages();
  if (signal?.aborted) throw signal.reason;
  if (images.length === 0) {
    throw new UserImageStoreError(
      "empty",
      "No user images are stored. Add images in Settings → Images.",
    );
  }
  const image = images[Math.floor(Math.random() * images.length)];
  return {
    url: getUserImageObjectUrl(image),
    animeName: image.name,
    artistName: "Local image",
    dimensions: { width: image.width, height: image.height },
    isLocal: true,
    localImageId: image.id,
  };
}
