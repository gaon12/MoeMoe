import type { AnimeImage, ImageDimensions } from "../types/image.ts";

const DATABASE_NAME = "moemoe-user-images";
const DATABASE_VERSION = 1;
const STORE_NAME = "images";

const MAX_USER_IMAGE_COUNT = 50;
const MAX_USER_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_USER_IMAGE_TOTAL_BYTES = 250 * 1024 * 1024;
const MAX_USER_IMAGE_PIXELS = 100_000_000;
const ACCEPTED_USER_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

type UserImageErrorCode =
  | "unsupported"
  | "tooLarge"
  | "tooMany"
  | "quota"
  | "decode"
  | "dimensions"
  | "unavailable"
  | "empty";

class UserImageStoreError extends Error {
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

function createUserImageStoreError(
  code: UserImageErrorCode,
  message: string,
  cause: unknown,
): UserImageStoreError {
  return new UserImageStoreError(code, message, { cause });
}

interface StoredUserImage {
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

interface UserImageCandidate {
  name: string;
  type: string;
  size: number;
  lastModified: number;
}

interface AddUserImagesResult {
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

function getUserImageFingerprint(image: UserImageCandidate): string {
  return `${image.name}\u0000${image.size}\u0000${image.lastModified}`;
}

function validateUserImageCandidate(
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
      if (error instanceof UserImageStoreError) {
        throw error;
      }
      bitmapError = error;
    } finally {
      bitmap?.close();
    }
  }

  try {
    return await readDimensionsWithImageElement(file);
  } catch (error) {
    if (error instanceof UserImageStoreError) {
      throw error;
    }
    throw createUserImageStoreError(
      "decode",
      "The selected file could not be decoded as an image",
      bitmapError ?? error,
    );
  }
}

async function listUserImages(): Promise<StoredUserImage[]> {
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

async function countUserImages(): Promise<number> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const count = await requestResult(
      transaction.objectStore(STORE_NAME).count(),
    );
    await transactionDone(transaction);
    return count;
  } finally {
    closeDatabase(database);
  }
}

function getRandomUserImageOffset(count: number, random = Math.random): number {
  if (!Number.isInteger(count) || count <= 0) {
    return 0;
  }
  const value = Math.min(0.999_999_999, Math.max(0, random()));
  return Math.floor(value * count);
}

async function getUserImageAtOffset(offset: number): Promise<StoredUserImage> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).openCursor();
    const image = await new Promise<StoredUserImage>((resolve, reject) => {
      let advanced = false;
      request.onerror = () =>
        reject(request.error ?? new Error("Failed to read a user image"));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          reject(new UserImageStoreError("empty", "No user image was found"));
          return;
        }
        if (!advanced && offset > 0) {
          advanced = true;
          cursor.advance(offset);
          return;
        }
        resolve(cursor.value as StoredUserImage);
      };
    });
    await transactionDone(transaction);
    return image;
  } finally {
    closeDatabase(database);
  }
}

async function addUserImages(
  files: readonly File[],
): Promise<AddUserImagesResult> {
  const existing = await listUserImages();
  const fingerprints = new Set(existing.map((image) => image.fingerprint));
  let totalBytes = existing.reduce((sum, image) => sum + image.size, 0);
  const pending: StoredUserImage[] = [];
  let skippedDuplicates = 0;

  const processFileAt = async (index: number): Promise<void> => {
    const file = files[index];
    if (!file) {
      return;
    }

    const fingerprint = getUserImageFingerprint(file);
    if (fingerprints.has(fingerprint)) {
      skippedDuplicates += 1;
    } else {
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

    return processFileAt(index + 1);
  };

  await processFileAt(0);

  if (pending.length === 0) {
    return { added: [], skippedDuplicates };
  }

  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    for (const image of pending) {
      store.add(image);
    }
    await transactionDone(transaction);
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      throw createUserImageStoreError(
        "quota",
        "Browser storage quota was exceeded",
        error,
      );
    }
    throw error;
  } finally {
    closeDatabase(database);
  }

  return { added: pending, skippedDuplicates };
}

function getUserImageObjectUrl(image: StoredUserImage): string {
  const existing = objectUrls.get(image.id);
  if (existing) {
    return existing;
  }
  const url = URL.createObjectURL(image.blob);
  objectUrls.set(image.id, url);
  return url;
}

async function deleteUserImage(id: string): Promise<void> {
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

async function clearUserImages(): Promise<void> {
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

async function fetchRandomUserImage(signal?: AbortSignal): Promise<AnimeImage> {
  if (signal?.aborted) {
    throw signal.reason;
  }
  const count = await countUserImages();
  if (signal?.aborted) {
    throw signal.reason;
  }
  if (count === 0) {
    throw new UserImageStoreError(
      "empty",
      "No user images are stored. Add images in Settings → Images.",
    );
  }
  const image = await getUserImageAtOffset(getRandomUserImageOffset(count));
  if (signal?.aborted) {
    throw signal.reason;
  }
  return {
    url: getUserImageObjectUrl(image),
    animeName: image.name,
    artistName: "Local image",
    dimensions: { width: image.width, height: image.height },
    isLocal: true,
    localImageId: image.id,
  };
}

export {
  ACCEPTED_USER_IMAGE_TYPES,
  addUserImages,
  clearUserImages,
  deleteUserImage,
  fetchRandomUserImage,
  getRandomUserImageOffset,
  getUserImageFingerprint,
  getUserImageObjectUrl,
  listUserImages,
  MAX_USER_IMAGE_BYTES,
  MAX_USER_IMAGE_COUNT,
  MAX_USER_IMAGE_PIXELS,
  MAX_USER_IMAGE_TOTAL_BYTES,
  UserImageStoreError,
  validateUserImageCandidate,
};
export type {
  AddUserImagesResult,
  StoredUserImage,
  UserImageCandidate,
  UserImageErrorCode,
};
