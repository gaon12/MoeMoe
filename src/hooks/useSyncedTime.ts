import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWithTimeout } from "../utils/fetchWithTimeout.ts";
import {
  buildConfiguredServerTimeUrl,
  buildSameOriginServerTimeUrl,
  parseServerDateHeader,
  parseServerTimePayload,
} from "../utils/serverTime.ts";

const SERVER_TIME_TIMEOUT_MS = 8000;
const HTTP_METHOD_NOT_ALLOWED = 405;
const HTTP_NOT_IMPLEMENTED = 501;
const MAX_ERROR_BODY_CHARS = 500;
const CLOCK_TICK_INTERVAL_MS = 1000;
const ROUND_TRIP_MIDPOINT_DIVISOR = 2;
const MINIMUM_SYNC_INTERVAL_SECONDS = 5;
const MILLISECONDS_PER_SECOND = 1000;

async function fetchSameOriginServerTime(signal: AbortSignal) {
  const requestUrl = buildSameOriginServerTimeUrl(globalThis.location.href);
  let response = await fetchWithTimeout(
    requestUrl,
    { method: "HEAD", cache: "no-store", signal },
    SERVER_TIME_TIMEOUT_MS,
  );
  let serverMs = response.ok ? parseServerDateHeader(response) : null;

  if (
    response.status === HTTP_METHOD_NOT_ALLOWED ||
    response.status === HTTP_NOT_IMPLEMENTED ||
    serverMs === null
  ) {
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
  if (serverMs === null) {
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
      .then((text) =>
        text.length > MAX_ERROR_BODY_CHARS
          ? `${text.slice(0, MAX_ERROR_BODY_CHARS)}…`
          : text,
      )
      .catch(() => undefined);
    const details = [
      `Failed to fetch server time (${response.status} ${response.statusText})`,
      `url: ${requestUrl}`,
    ];
    if (snippet) {
      details.push(`body: ${snippet}`);
    }
    throw new Error(details.join("\n"));
  }

  const serverMs = parseServerTimePayload(await response.json());
  if (serverMs === null) {
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
  const requestSequenceRef = useRef(0);
  const requestControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = globalThis.setInterval(() => {
      const now = Date.now() + offsetRef.current;
      setCurrentTime(new Date(now));
    }, CLOCK_TICK_INTERVAL_MS);

    return () => {
      globalThis.clearInterval(timer);
    };
  }, []);

  const fetchServerTime = useCallback(async () => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    requestSequenceRef.current += 1;
    const requestSequence = requestSequenceRef.current;
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
      if (isStale()) {
        return;
      }
      const midpoint = (t0 + t3) / ROUND_TRIP_MIDPOINT_DIVISOR;
      offsetRef.current = serverMs - midpoint;
    } catch {
      if (isStale()) {
        return;
      }
      offsetRef.current = 0;
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    requestSequenceRef.current += 1;
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;

    if (useServerTime) {
      fetchServerTime();
      const intervalMs =
        Math.max(MINIMUM_SYNC_INTERVAL_SECONDS, serverTimeUpdateIntervalSec) *
        MILLISECONDS_PER_SECOND;
      const syncTimer = globalThis.setInterval(fetchServerTime, intervalMs);
      return () => {
        globalThis.clearInterval(syncTimer);
        requestSequenceRef.current += 1;
        requestControllerRef.current?.abort();
        requestControllerRef.current = null;
      };
    }

    offsetRef.current = 0;

    return () => {
      requestSequenceRef.current += 1;
      requestControllerRef.current?.abort();
      requestControllerRef.current = null;
    };
  }, [useServerTime, serverTimeUpdateIntervalSec, fetchServerTime]);

  return currentTime;
}
