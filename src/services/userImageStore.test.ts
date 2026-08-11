import { describe, expect, it } from "vitest";
import {
  MAX_USER_IMAGE_BYTES,
  MAX_USER_IMAGE_COUNT,
  MAX_USER_IMAGE_TOTAL_BYTES,
  UserImageStoreError,
  getUserImageFingerprint,
  validateUserImageCandidate,
  type UserImageCandidate,
} from "./userImageStore";

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
  it("accepts supported images within collection limits", () => {
    expect(() => validateUserImageCandidate(candidate(), 0, 0)).not.toThrow();
  });

  it("rejects active or animated formats outside the allowlist", () => {
    expect(() =>
      validateUserImageCandidate(candidate({ type: "image/svg+xml" }), 0, 0),
    ).toThrowError(UserImageStoreError);
    expect(() =>
      validateUserImageCandidate(candidate({ type: "image/gif" }), 0, 0),
    ).toThrow(/Unsupported image type/);
  });

  it("enforces per-file, count, and collection quotas", () => {
    expect(() =>
      validateUserImageCandidate(
        candidate({ size: MAX_USER_IMAGE_BYTES + 1 }),
        0,
        0,
      ),
    ).toThrow(/file limit/);
    expect(() =>
      validateUserImageCandidate(candidate(), MAX_USER_IMAGE_COUNT, 0),
    ).toThrow(/limited/);
    expect(() =>
      validateUserImageCandidate(candidate(), 1, MAX_USER_IMAGE_TOTAL_BYTES),
    ).toThrow(/collection exceeds/);
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
