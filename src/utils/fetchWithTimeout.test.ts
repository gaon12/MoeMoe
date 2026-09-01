import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithTimeout } from "./fetchWithTimeout.ts";

const HTTP_OK = 200;
const SHORT_TIMEOUT_MS = 250;

describe("fetchWithTimeout", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns successful fetch responses", async () => {
    const response = new Response("ok", { status: HTTP_OK });
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchWithTimeout("https://example.com")).resolves.toBe(
      response,
    );
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("aborts requests that exceed the deadline", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener(
              "abort",
              () => reject(init.signal?.reason),
              { once: true },
            );
          }),
      ),
    );

    const request = expect(
      fetchWithTimeout("https://example.com/slow", {}, SHORT_TIMEOUT_MS),
    ).rejects.toThrow("Request timed out after 250ms");

    await vi.advanceTimersByTimeAsync(SHORT_TIMEOUT_MS);
    await request;
  });
});
