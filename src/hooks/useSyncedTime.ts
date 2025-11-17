import { useCallback, useEffect, useRef, useState } from 'react';

export function useSyncedTime(useServerTime: boolean, serverTimeUpdateIntervalSec: number) {
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const offsetRef = useRef(0); // server-client delta
  const syncTimerRef = useRef<number | null>(null);

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
    try {
      const baseUrl = import.meta.env.VITE_SERVER_TIME_API_URL as string | undefined;
      if (!baseUrl) {
        offsetRef.current = 0;
        return;
      }
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const requestUrl = `${baseUrl}${encodeURIComponent(tz)}`;
      const t0 = Date.now();
      const response = await fetch(requestUrl, { cache: 'no-store' });
      const t3 = Date.now();
      if (!response.ok) {
        const snippet = await response
          .text()
          .then((text) => (text.length > 500 ? `${text.slice(0, 500)}…` : text))
          .catch(() => undefined);
        const details = [
          `Failed to fetch server time (${response.status} ${response.statusText})`,
          `url: ${requestUrl}`,
        ];
        if (snippet) {
          details.push(`body: ${snippet}`);
        }
        throw new Error(details.join('\n'));
      }
      const data = await response.json();
      let serverMs: number | null = null;
      if (data && typeof data.timestamp === 'string') {
        const sec = parseFloat(data.timestamp);
        if (!Number.isNaN(sec)) {
          serverMs = Math.round(sec * 1000);
        }
      }
      if (serverMs == null && typeof data?.iso8601 === 'string') {
        const parsed = Date.parse(data.iso8601);
        if (!Number.isNaN(parsed)) {
          serverMs = parsed;
        }
      }
      if (serverMs == null && typeof data?.datetime === 'string') {
        const parsed = Date.parse(data.datetime.replace(' ', 'T'));
        if (!Number.isNaN(parsed)) {
          serverMs = parsed;
        }
      }
      if (serverMs == null) {
        throw new Error('Server time response did not include a valid timestamp');
      }
      const midpoint = (t0 + t3) / 2;
      offsetRef.current = serverMs - midpoint;
    } catch (error) {
      console.error('Server time sync failed:', error);
      offsetRef.current = 0;
    }
  }, []);

  useEffect(() => {
    if (syncTimerRef.current) {
      window.clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
    }

    if (useServerTime) {
      fetchServerTime();
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
    };
  }, [useServerTime, serverTimeUpdateIntervalSec, fetchServerTime]);

  return currentTime;
}
