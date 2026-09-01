import { getSafeHttpsUrl } from "./safeUrl.ts";

const TIMEZONE_PLACEHOLDER = "{timezone}";
const EPOCH_MILLISECONDS_THRESHOLD = 100_000_000_000;

function buildConfiguredServerTimeUrl(
  value: unknown,
  timezone: string,
): string | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  const rawUrl = value.trim();
  const encodedTimezone = encodeURIComponent(timezone);

  if (rawUrl.includes(TIMEZONE_PLACEHOLDER)) {
    return getSafeHttpsUrl(
      rawUrl.replaceAll(TIMEZONE_PLACEHOLDER, encodedTimezone),
    );
  }

  const safeUrl = getSafeHttpsUrl(rawUrl);
  if (!safeUrl) {
    return undefined;
  }
  if (rawUrl.endsWith("=") || rawUrl.endsWith("/")) {
    return getSafeHttpsUrl(`${rawUrl}${encodedTimezone}`);
  }

  const url = new URL(safeUrl);
  const timezoneParameter = ["timeZone", "timezone", "tz"].find((key) =>
    url.searchParams.has(key),
  );
  if (timezoneParameter) {
    url.searchParams.set(timezoneParameter, timezone);
    return url.toString();
  }

  url.searchParams.set("timezone", timezone);
  return url.toString();
}

function buildSameOriginServerTimeUrl(
  currentUrl: string,
  cacheBust = Date.now(),
): string {
  const url = new URL(currentUrl);
  url.hash = "";
  url.searchParams.set("_moemoe_server_time", String(cacheBust));
  return url.toString();
}

function parseEpoch(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }
  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(value.trim());
  if (!Number.isFinite(numericValue)) {
    return null;
  }
  return Math.round(
    Math.abs(numericValue) >= EPOCH_MILLISECONDS_THRESHOLD
      ? numericValue
      : numericValue * 1000,
  );
}

function parseServerTimePayload(value: unknown): number | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const payload = value as Record<string, unknown>;

  for (const key of ["timestamp", "unixtime"] as const) {
    const parsed = parseEpoch(payload[key]);
    if (parsed !== null) {
      return parsed;
    }
  }

  for (const key of [
    "utc_datetime",
    "iso8601",
    "dateTime",
    "datetime",
  ] as const) {
    const candidate = payload[key];
    if (typeof candidate === "string" && candidate.trim()) {
      const parsed = Date.parse(candidate);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function parseServerDateHeader(response: Response): number | null {
  const value = response.headers.get("Date");
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export {
  buildConfiguredServerTimeUrl,
  buildSameOriginServerTimeUrl,
  parseServerDateHeader,
  parseServerTimePayload,
};
