import { describe, expect, it } from "vitest";
import { getSafeHttpsUrl, isSafeImageUrl } from "./safeUrl";

describe("safe URL handling", () => {
  it("accepts HTTPS and rejects active or cleartext schemes", () => {
    expect(getSafeHttpsUrl("https://example.com/path")).toBe(
      "https://example.com/path",
    );
    expect(getSafeHttpsUrl("http://example.com/path")).toBeUndefined();
    expect(getSafeHttpsUrl("javascript:alert(1)")).toBeUndefined();
    expect(getSafeHttpsUrl("not a url")).toBeUndefined();
  });

  it("allows blob images only for explicitly local records", () => {
    expect(isSafeImageUrl("blob:https://app.example/id", true)).toBe(true);
    expect(isSafeImageUrl("blob:https://app.example/id", false)).toBe(false);
    expect(isSafeImageUrl("https://images.example/a.jpg", false)).toBe(true);
  });
});
