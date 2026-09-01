import { describe, expect, it, vi } from "vitest";
import {
  exitFullscreen,
  FULLSCREEN_CHANGE_EVENTS,
  getFullscreenElement,
  isNativeFullscreenAvailable,
  requestFullscreen,
} from "./fullscreen.ts";

/** Stands in for a `document` without constructing a real one. */
function fakeDocument(overrides: Record<string, unknown>): Document {
  return overrides as unknown as Document;
}

function fakeElement(overrides: Record<string, unknown>): HTMLElement {
  return overrides as unknown as HTMLElement;
}

describe("getFullscreenElement", () => {
  const element = {} as Element;

  it("reads the standard property", () => {
    expect(
      getFullscreenElement(fakeDocument({ fullscreenElement: element })),
    ).toBe(element);
  });

  it("falls back to the webkit property on older Safari", () => {
    expect(
      getFullscreenElement(fakeDocument({ webkitFullscreenElement: element })),
    ).toBe(element);
  });

  it("returns null when nothing is fullscreen", () => {
    expect(
      getFullscreenElement(
        fakeDocument({
          fullscreenElement: null,
          webkitFullscreenElement: null,
        }),
      ),
    ).toBeNull();
    expect(getFullscreenElement(fakeDocument({}))).toBeNull();
  });
});

describe("isNativeFullscreenAvailable", () => {
  it("accepts a standards-compliant browser", () => {
    expect(
      isNativeFullscreenAvailable(
        fakeElement({ requestFullscreen: () => Promise.resolve() }),
        fakeDocument({ fullscreenEnabled: true }),
      ),
    ).toBe(true);
  });

  it("accepts Safari's prefixed pair", () => {
    expect(
      isNativeFullscreenAvailable(
        fakeElement({ webkitRequestFullscreen: () => undefined }),
        fakeDocument({ webkitFullscreenEnabled: true }),
      ),
    ).toBe(true);
  });

  it("rejects iPhone Safari, which reports fullscreen as disabled", () => {
    // The property exists and is false, so a presence check would pass here
    // and the request would then do nothing at all.
    expect(
      isNativeFullscreenAvailable(
        fakeElement({ webkitRequestFullscreen: () => undefined }),
        fakeDocument({ webkitFullscreenEnabled: false }),
      ),
    ).toBe(false);
  });

  it("rejects a browser with no request method", () => {
    expect(
      isNativeFullscreenAvailable(
        fakeElement({}),
        fakeDocument({ fullscreenEnabled: true }),
      ),
    ).toBe(false);
  });

  it("rejects a document that reports nothing at all", () => {
    expect(
      isNativeFullscreenAvailable(
        fakeElement({ requestFullscreen: () => Promise.resolve() }),
        fakeDocument({}),
      ),
    ).toBe(false);
  });
});

describe("requestFullscreen", () => {
  it("reports success and calls the standard method on the element", async () => {
    const requestSpy = vi.fn(() => Promise.resolve());
    const element = fakeElement({ requestFullscreen: requestSpy });

    await expect(requestFullscreen(element)).resolves.toBe(true);
    expect(requestSpy).toHaveBeenCalledOnce();
  });

  it("accepts Safari's void-returning prefixed method", async () => {
    const requestSpy = vi.fn(() => undefined);
    await expect(
      requestFullscreen(fakeElement({ webkitRequestFullscreen: requestSpy })),
    ).resolves.toBe(true);
    expect(requestSpy).toHaveBeenCalledOnce();
  });

  it("reports failure instead of throwing when the method is missing", async () => {
    // This is the case that broke Safari: calling an absent method throws a
    // TypeError synchronously, which a `.catch()` on the result never sees,
    // so the pseudo-fullscreen fallback was never reached.
    await expect(requestFullscreen(fakeElement({}))).resolves.toBe(false);
  });

  it("reports failure when the browser rejects the request", async () => {
    await expect(
      requestFullscreen(
        fakeElement({
          requestFullscreen: () => Promise.reject(new Error("denied")),
        }),
      ),
    ).resolves.toBe(false);
  });

  it("reports failure when the method throws synchronously", async () => {
    await expect(
      requestFullscreen(
        fakeElement({
          requestFullscreen: () => {
            throw new TypeError("not a function");
          },
        }),
      ),
    ).resolves.toBe(false);
  });
});

describe("exitFullscreen", () => {
  it("calls the standard method", async () => {
    const exitSpy = vi.fn(() => Promise.resolve());
    await exitFullscreen(fakeDocument({ exitFullscreen: exitSpy }));
    expect(exitSpy).toHaveBeenCalledOnce();
  });

  it("calls Safari's prefixed method", async () => {
    const exitSpy = vi.fn(() => undefined);
    await exitFullscreen(fakeDocument({ webkitExitFullscreen: exitSpy }));
    expect(exitSpy).toHaveBeenCalledOnce();
  });

  it("does nothing when neither exists", async () => {
    await expect(exitFullscreen(fakeDocument({}))).resolves.toBeUndefined();
  });
});

describe("FULLSCREEN_CHANGE_EVENTS", () => {
  it("covers both spellings so older Safari still updates the button", () => {
    expect([...FULLSCREEN_CHANGE_EVENTS]).toEqual([
      "fullscreenchange",
      "webkitfullscreenchange",
    ]);
  });
});
