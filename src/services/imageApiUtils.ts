import { getSafeHttpsUrl } from "../utils/safeUrl.ts";

const MAX_ERROR_BODY_LENGTH = 1000;

const safeJsonStringify = (value: unknown): string | undefined => {
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
};

const buildDataError = (
  sourceName: string,
  requestUrl: string,
  detail: string,
  context?: { data?: unknown; cause?: unknown },
): Error => {
  const lines: string[] = [
    `${sourceName} API error`,
    `requestUrl: ${requestUrl}`,
    detail,
  ];

  if (context?.data !== undefined) {
    const json = safeJsonStringify(context.data);
    if (json) {
      lines.push(
        "responseDataSnippet:",
        json.length > MAX_ERROR_BODY_LENGTH
          ? `${json.slice(0, MAX_ERROR_BODY_LENGTH)}…`
          : json,
      );
    }
  }

  if (context?.cause === undefined) {
    return new Error(lines.join("\n"));
  }
  return new Error(lines.join("\n"), { cause: context.cause });
};

const buildResponseError = async (
  sourceName: string,
  requestUrl: string,
  response: Response,
): Promise<Error> => {
  let bodySnippet: string | undefined;
  try {
    const text = await response.text();
    if (text) {
      bodySnippet =
        text.length > MAX_ERROR_BODY_LENGTH
          ? `${text.slice(0, MAX_ERROR_BODY_LENGTH)}…`
          : text;
    }
  } catch {
    // ignore body read errors
  }

  const lines: string[] = [
    `${sourceName} API error`,
    `requestUrl: ${requestUrl}`,
    `status: ${response.status} ${response.statusText}`,
  ];

  if (bodySnippet) {
    lines.push("responseBodySnippet:", bodySnippet);
  }

  return new Error(lines.join("\n"));
};

/**
 * Get CORS proxy URL from environment variable
 */
const getCorsProxyUrl = (): string | undefined =>
  getSafeHttpsUrl(import.meta.env.VITE_FIX_CORS_API_URL);

/**
 * Build a CORS-proxied image URL if proxy is configured.
 * Returns undefined when no proxy is configured.
 */
const getProxiedImageUrl = (url: string): string | undefined => {
  const proxyUrl = getCorsProxyUrl();
  if (proxyUrl && url) {
    return `${proxyUrl}${encodeURIComponent(url)}`;
  }
  return undefined;
};

const createCacheBustToken = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const withCacheBust = (url: string): string => {
  const nextUrl = new URL(url);
  nextUrl.searchParams.set("_moemoe_refresh", createCacheBustToken());
  return nextUrl.toString();
};

export {
  buildDataError,
  buildResponseError,
  getCorsProxyUrl,
  getProxiedImageUrl,
  withCacheBust,
};
