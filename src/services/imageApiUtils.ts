const MAX_ERROR_BODY_LENGTH = 1000;

const safeJsonStringify = (value: unknown): string | undefined => {
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
};

export const buildDataError = (
  sourceName: string,
  requestUrl: string,
  detail: string,
  data?: unknown,
): Error => {
  const lines: string[] = [
    `${sourceName} API error`,
    `requestUrl: ${requestUrl}`,
    detail,
  ];

  if (data !== undefined) {
    const json = safeJsonStringify(data);
    if (json) {
      lines.push(
        "responseDataSnippet:",
        json.length > MAX_ERROR_BODY_LENGTH
          ? `${json.slice(0, MAX_ERROR_BODY_LENGTH)}…`
          : json,
      );
    }
  }

  return new Error(lines.join("\n"));
};

export const buildResponseError = async (
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
export const getCorsProxyUrl = (): string | undefined => {
  return import.meta.env.VITE_FIX_CORS_API_URL;
};

/**
 * Build a CORS-proxied image URL if proxy is configured.
 * Returns undefined when no proxy is configured.
 */
export const getProxiedImageUrl = (url: string): string | undefined => {
  const proxyUrl = getCorsProxyUrl();
  if (proxyUrl && url) {
    return `${proxyUrl}${encodeURIComponent(url)}`;
  }
  return undefined;
};

const createCacheBustToken = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const withCacheBust = (url: string): string => {
  const nextUrl = new URL(url);
  nextUrl.searchParams.set("_moemoe_refresh", createCacheBustToken());
  return nextUrl.toString();
};
