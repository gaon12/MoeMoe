import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWithTimeout } from "../utils/fetchWithTimeout";
import {
  buildConfiguredServerTimeUrl,
  buildSameOriginServerTimeUrl,
  parseServerDateHeader,
  parseServerTimePayload,
} from "../utils/serverTime";

const SERVER_TIME_TIMEOUT_MS = 8_000;

async function fetchSameOriginServerTime(signal: AbortSignal) {
  const requestUrl = buildSameOriginServerTimeUrl(window.location.href);
  let response = await fetchWithTimeout(
    requestUrl,
    { method: "HEAD", cache: "no-store", signal },
    SERVER_TIME_TIMEOUT_MS,
  );
  let serverMs = response.ok ? parseServerDateHeader(response) : null;

  if (response.status === 405 || response.status === 501 || serverMs == null) {
    response = await fetchWithTimeout(
      requestUrl,
      { method: "GET", cache: "no-store", signal },
      SERVER_TIME_TIMEOUT_MS,
    );
    serverMs = response.ok ? parseServerDateHeader(response) : null;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch deployment server time (${response.status} ${response.statusText})`,
    );
  }
  if (serverMs == null) {
    throw new Error("Deployment server response did not include a Date header");
  }
  return serverMs;
}

async function fetchConfiguredServerTime(
  requestUrl: string,
  signal: AbortSignal,
) {
  const response = await fetchWithTimeout(
    requestUrl,
    { cache: "no-store", signal },
    SERVER_TIME_TIMEOUT_MS,
  );
  if (!response.ok) {
    const snippet = await response
      .text()
      .then((text) => (text.length > 500 ? `${text.slice(0, 500)}…` : text))
      .catch(() => undefined);
    const details = [
      `Failed to fetch server time (${response.status} ${response.statusText})`,
      `url: ${requestUrl}`,
    ];
    if (snippet) details.push(`body: ${snippet}`);
    throw new Error(details.join("\n"));
  }

  const serverMs = parseServerTimePayload(await response.json());
  if (serverMs == null) {
    throw new Error("Server time response did not include a valid timestamp");
  }
  return serverMs;
}

export function useSyncedTime(
  useServerTime: boolean,
  serverTimeUpdateIntervalSec: number,
) {
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const offsetRef = useRef(0); // server-client delta
  const syncTimerRef = useRef<number | null>(null);
  const requestSequenceRef = useRef(0);
  const requestControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now() + offsetRef.current;
      setCurrentTime(new Date(now));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const fetchServerTime = useCallback(async () => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    const requestSequence = ++requestSequenceRef.current;
    const isStale = () =>
      controller.signal.aborted ||
      requestSequence !== requestSequenceRef.current;

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const requestUrl = buildConfiguredServerTimeUrl(
        import.meta.env.VITE_SERVER_TIME_API_URL,
        tz,
      );
      const t0 = Date.now();
      const serverMs = requestUrl
        ? await fetchConfiguredServerTime(requestUrl, controller.signal)
        : await fetchSameOriginServerTime(controller.signal);
      const t3 = Date.now();
      if (isStale()) return;
      const midpoint = (t0 + t3) / 2;
      offsetRef.current = serverMs - midpoint;
    } catch (error) {
      if (isStale()) return;
      console.error("Server time sync failed:", error);
      offsetRef.current = 0;
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    if (syncTimerRef.current) {
      window.clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    requestSequenceRef.current += 1;
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;

    if (useServerTime) {
      void fetchServerTime();
      const intervalMs = Math.max(5, serverTimeUpdateIntervalSec) * 1000;
      syncTimerRef.current = window.setInterval(fetchServerTime, intervalMs);
    } else {
      offsetRef.current = 0;
    }

    return () => {
      if (syncTimerRef.current) {
        window.clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      requestSequenceRef.current += 1;
      requestControllerRef.current?.abort();
      requestControllerRef.current = null;
    };
  }, [useServerTime, serverTimeUpdateIntervalSec, fetchServerTime]);

  return currentTime;
}
