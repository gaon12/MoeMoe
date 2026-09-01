import { describe, expect, it } from "vitest";
import {
  MAX_USER_IMAGE_BYTES,
  MAX_USER_IMAGE_COUNT,
  MAX_USER_IMAGE_TOTAL_BYTES,
  UserImageStoreError,
  getUserImageFingerprint,
  getRandomUserImageOffset,
  validateUserImageCandidate,
  type UserImageCandidate,
} from "./userImageStore.ts";

const UNSUPPORTED_IMAGE_TYPE_PATTERN = /Unsupported image type/;
const FILE_LIMIT_PATTERN = /file limit/;
const COUNT_LIMIT_PATTERN = /limited/;
const COLLECTION_LIMIT_PATTERN = /collection exceeds/;

const candidate = (
  overrides: Partial<UserImageCandidate> = {},
): UserImageCandidate => ({
  name: "wallpaper.png",
  type: "image/png",
  size: 1024,
  lastModified: 123,
  ...overrides,
});

describe("user image validation", () => {
  it("selects a bounded random cursor offset without loading every blob", () => {
    expect(getRandomUserImageOffset(50, () => 0)).toBe(0);
    expect(getRandomUserImageOffset(50, () => 0.5)).toBe(25);
    expect(getRandomUserImageOffset(50, () => 1)).toBe(49);
    expect(getRandomUserImageOffset(0, () => 0.5)).toBe(0);
  });

  it("accepts supported images within collection limits", () => {
    expect(() => validateUserImageCandidate(candidate(), 0, 0)).not.toThrow();
  });

  it("rejects active or animated formats outside the allowlist", () => {
    expect(() =>
      validateUserImageCandidate(candidate({ type: "image/svg+xml" }), 0, 0),
    ).toThrowError(UserImageStoreError);
    expect(() =>
      validateUserImageCandidate(candidate({ type: "image/gif" }), 0, 0),
    ).toThrow(UNSUPPORTED_IMAGE_TYPE_PATTERN);
  });

  it("enforces per-file, count, and collection quotas", () => {
    expect(() =>
      validateUserImageCandidate(
        candidate({ size: MAX_USER_IMAGE_BYTES + 1 }),
        0,
        0,
      ),
    ).toThrow(FILE_LIMIT_PATTERN);
    expect(() =>
      validateUserImageCandidate(candidate(), MAX_USER_IMAGE_COUNT, 0),
    ).toThrow(COUNT_LIMIT_PATTERN);
    expect(() =>
      validateUserImageCandidate(candidate(), 1, MAX_USER_IMAGE_TOTAL_BYTES),
    ).toThrow(COLLECTION_LIMIT_PATTERN);
  });

  it("uses stable file metadata for duplicate detection", () => {
    expect(getUserImageFingerprint(candidate())).toBe(
      getUserImageFingerprint(candidate()),
    );
    expect(getUserImageFingerprint(candidate({ lastModified: 124 }))).not.toBe(
      getUserImageFingerprint(candidate()),
    );
  });
});
