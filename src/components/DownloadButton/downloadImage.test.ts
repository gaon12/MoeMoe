import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchImageBlobWithFallback } from "./downloadImage.ts";

const HTTP_OK = 200;
const HTTP_SERVER_ERROR = 500;
const HTTP_FORBIDDEN = 403;

function response(
  ok: boolean,
  blob: Blob,
  status = ok ? HTTP_OK : HTTP_SERVER_ERROR,
  statusText = ok ? "OK" : "Server Error",
): Response {
  return {
    ok,
    status,
    statusText,
    blob: vi.fn().mockResolvedValue(blob),
  } as unknown as Response;
}

describe("fetchImageBlobWithFallback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the primary image without contacting the proxy", async () => {
    const expected = new Blob(["primary"]);
    const fetchMock = vi.fn().mockResolvedValue(response(true, expected));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchImageBlobWithFallback(
        "https://images.example/direct.jpg",
        "https://proxy.example/image",
        new AbortController().signal,
      ),
    ).resolves.toBe(expected);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("uses the proxy when the direct image is blocked", async () => {
    const expected = new Blob(["proxy"]);
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(response(true, expected));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchImageBlobWithFallback(
        "https://images.example/direct.jpg",
        "https://proxy.example/image",
        new AbortController().signal,
      ),
    ).resolves.toBe(expected);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://proxy.example/image",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("reports all failures when neither source can be downloaded", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        response(false, new Blob(), HTTP_FORBIDDEN, "Forbidden"),
      );
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchImageBlobWithFallback(
      "https://images.example/direct.jpg",
      "https://proxy.example/image",
      new AbortController().signal,
    );

    await expect(promise).rejects.toMatchObject({
      message: "Image download failed from every available source.",
      errors: expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining("HTTP 403 Forbidden"),
        }),
      ]),
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
