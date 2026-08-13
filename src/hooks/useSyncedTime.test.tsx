// @vitest-environment jsdom

import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSyncedTime } from "./useSyncedTime";

describe("useSyncedTime", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("requests the deployment server immediately when no API is configured", async () => {
    vi.stubEnv("VITE_SERVER_TIME_API_URL", "");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: { Date: "Thu, 13 Aug 2026 08:30:00 GMT" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { unmount } = renderHook(() => useSyncedTime(true, 60));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(String(requestUrl)).toContain("_moemoe_server_time=");
    expect(requestInit?.method).toBe("HEAD");
    expect(requestInit?.cache).toBe("no-store");
    unmount();
  });

  it("falls back to GET when HEAD is unsupported", async () => {
    vi.stubEnv("VITE_SERVER_TIME_API_URL", "");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 405 }))
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: { Date: "Thu, 13 Aug 2026 08:30:00 GMT" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { unmount } = renderHook(() => useSyncedTime(true, 60));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("GET");
    unmount();
  });

  it("does not request time while synchronization is disabled", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { unmount } = renderHook(() => useSyncedTime(false, 60));

    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
    unmount();
  });

  it("aborts an in-flight request when synchronization is disabled", async () => {
    vi.stubEnv("VITE_SERVER_TIME_API_URL", "");
    let observedSignal: AbortSignal | undefined;
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          observedSignal = init?.signal ?? undefined;
          observedSignal?.addEventListener(
            "abort",
            () => reject(observedSignal?.reason),
            { once: true },
          );
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { rerender, unmount } = renderHook(
      ({ enabled }) => useSyncedTime(enabled, 60),
      { initialProps: { enabled: true } },
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());

    rerender({ enabled: false });
    expect(observedSignal?.aborted).toBe(true);
    unmount();
  });
});
