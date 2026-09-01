// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { averageRgbSamples, extractEdgeColor } from "./imageProcessing.ts";

describe("edge color processing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("averages sampled RGB channels", () => {
    expect(
      averageRgbSamples([
        [240, 20, 10],
        [200, 40, 30],
      ]),
    ).toBe("rgb(220, 30, 20)");
    expect(averageRgbSamples([])).toBe("#1a1a1a");
  });

  it("samples natural image dimensions instead of detached layout size", () => {
    const image = document.createElement("img");
    Object.defineProperties(image, {
      naturalWidth: { value: 2 },
      naturalHeight: { value: 2 },
    });
    const context = {
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray([12, 34, 56, 255]),
      })),
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
    };
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName) =>
      tagName === "canvas"
        ? (canvas as unknown as HTMLCanvasElement)
        : originalCreateElement(tagName),
    );

    expect(extractEdgeColor(image)).toBe("rgb(12, 34, 56)");
    expect(canvas.width).toBe(2);
    expect(canvas.height).toBe(2);
    expect(context.drawImage).toHaveBeenCalledWith(image, 0, 0);
  });
});
