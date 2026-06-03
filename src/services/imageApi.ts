import {
  type AnimeImage,
  type ImageDimensions,
  type ImageSource,
} from "../types/image";
import { type ImageAspectPreference } from "../types/settings";

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
const getCorsProxyUrl = (): string | undefined => {
  return import.meta.env.VITE_FIX_CORS_API_URL;
};

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

/**
 * Response structure from nekos.best API
 */
interface NekosBestResponse {
  results: Array<{
    url: string;
    anime_name?: string;
    artist_name?: string;
    artist_href?: string;
    source_url?: string;
    dimensions?: ImageDimensions;
  }>;
}

/**
 * Response structure from waifu.pics API
 */
interface WaifuPicsResponse {
  url: string;
}

interface NekosiaResponse {
  image?: {
    original?: {
      url?: string;
    };
  };
}

interface WaifuImResponse {
  images?: WaifuImImage[];
  items?: WaifuImImage[];
}

interface WaifuImArtist {
  name?: string | null;
  pixiv?: string | null;
  twitter?: string | null;
  deviantArt?: string | null;
}

interface WaifuImImage {
  url?: string;
  width?: number;
  height?: number;
  artist?: WaifuImArtist;
  artists?: WaifuImArtist[];
  source?: string | null;
}

/**
 * Response structure from nekos.moe random API
 */
interface NekosMoeRandomResponse {
  images: Array<{
    id: string;
    nsfw?: boolean;
    artist?: string;
    approver?: { username?: string };
    uploader?: { username?: string };
  }>;
}

/** Danbooru (donmai.us) post structure (partial) */
interface DanbooruPost {
  file_url?: string;
  large_file_url?: string;
  preview_file_url?: string;
  tag_string_artist?: string;
  source?: string;
  rating?: string; // 's', 'q', 'e'
  image_width?: number;
  image_height?: number;
}

/**
 * Configuration for image fetching
 */
export interface ImageApiConfig {
  source: ImageSource;
  allowNSFW?: boolean;
  fallbackUrl?: string;
  aspectPreference?: ImageAspectPreference;
  viewport?: ImageDimensions;
}

export interface ImageAspectRequest {
  preference: ImageAspectPreference;
  viewport?: ImageDimensions;
}

const createCacheBustToken = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const withCacheBust = (url: string): string => {
  const nextUrl = new URL(url);
  nextUrl.searchParams.set("_moemoe_refresh", createCacheBustToken());
  return nextUrl.toString();
};

const isValidDimensions = (
  dimensions: ImageDimensions | undefined,
): dimensions is ImageDimensions =>
  Boolean(dimensions && dimensions.width > 0 && dimensions.height > 0);

const getScreenRatio = (aspect?: ImageAspectRequest): number | undefined => {
  if (aspect?.preference !== "screen" || !isValidDimensions(aspect.viewport)) {
    return undefined;
  }

  return aspect.viewport.width / aspect.viewport.height;
};

const getOrientation = (
  aspect?: ImageAspectRequest,
): "Landscape" | "Portrait" | "Square" | undefined => {
  if (!aspect || aspect.preference === "any") return undefined;
  if (aspect.preference === "landscape") return "Landscape";
  if (aspect.preference === "portrait") return "Portrait";
  if (aspect.preference === "square") return "Square";

  const ratio = getScreenRatio(aspect);
  if (!ratio) return undefined;
  if (Math.abs(ratio - 1) <= 0.08) return "Square";
  return ratio > 1 ? "Landscape" : "Portrait";
};

const COMMON_RATIOS: Array<[number, number]> = [
  [16, 9],
  [9, 16],
  [4, 3],
  [3, 4],
  [3, 2],
  [2, 3],
  [1, 1],
];

const getClosestCommonRatio = (ratio: number): [number, number] | undefined => {
  const match = COMMON_RATIOS.find(
    ([width, height]) => Math.abs(ratio - width / height) <= 0.08,
  );
  return match;
};

export const buildDanbooruAspectTags = (
  aspect?: ImageAspectRequest,
): string[] => {
  if (!aspect || aspect.preference === "any") return [];
  if (aspect.preference === "landscape") return ["ratio:>1"];
  if (aspect.preference === "portrait") return ["ratio:<1"];
  if (aspect.preference === "square") return ["ratio:1"];

  if (!isValidDimensions(aspect.viewport)) return [];
  const ratio = aspect.viewport.width / aspect.viewport.height;
  const [width, height] =
    getClosestCommonRatio(ratio) ??
    (ratio > 1.08 ? [1, 0] : ratio < 0.92 ? [0, 1] : [1, 1]);
  if (height === 0) return ["ratio:>1"];
  if (width === 0) return ["ratio:<1"];
  return [`ratio:${width}:${height}`];
};

export const buildWaifuImSearchUrl = (
  allowNSFW: boolean,
  aspect?: ImageAspectRequest,
): string => {
  const params = new URLSearchParams({
    IsNsfw: allowNSFW ? "All" : "False",
    OrderBy: "Random",
    PageSize: "1",
  });
  const orientation = getOrientation(aspect);
  if (orientation) {
    params.set("Orientation", orientation);
  }
  if (aspect?.preference === "screen" && isValidDimensions(aspect.viewport)) {
    params.set("Width", `>=${Math.round(aspect.viewport.width)}`);
    params.set("Height", `>=${Math.round(aspect.viewport.height)}`);
  }
  return `https://api.waifu.im/images?${params.toString()}`;
};

/**
 * Fetches a random anime image from nekos.best API
 * Note: Nekos.best is SFW only, NSFW parameter is ignored
 */
async function fetchFromNekosBest(): Promise<AnimeImage> {
  // Nekos.best is SFW only, so we use waifu category
  const category = "waifu";
  const url = `https://nekos.best/api/v2/${category}?amount=1`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw await buildResponseError("nekos.best", url, response);
  }

  let data: NekosBestResponse;
  try {
    data = await response.json();
  } catch {
    throw buildDataError("nekos.best", url, "Failed to parse JSON response");
  }

  if (!data.results || data.results.length === 0) {
    throw buildDataError(
      "nekos.best",
      url,
      "No images returned from nekos.best API",
      data,
    );
  }

  const result = data.results[0];

  const directUrl = result.url;

  return {
    url: directUrl,
    proxiedUrl: getProxiedImageUrl(directUrl),
    animeName: result.anime_name,
    artistName: result.artist_name,
    artistHref: result.artist_href,
    sourceUrl: result.source_url,
    dimensions: result.dimensions,
  };
}

/**
 * Fetches a random anime image from waifu.pics API
 */
async function fetchFromWaifuPics(allowNSFW = false): Promise<AnimeImage> {
  const sfwOrNsfw = allowNSFW ? "nsfw" : "sfw";
  const url = `https://api.waifu.pics/${sfwOrNsfw}/waifu`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw await buildResponseError("waifu.pics", url, response);
  }

  let data: WaifuPicsResponse;
  try {
    data = await response.json();
  } catch {
    throw buildDataError("waifu.pics", url, "Failed to parse JSON response");
  }

  if (!data.url) {
    throw buildDataError(
      "waifu.pics",
      url,
      "No image URL returned from waifu.pics API",
      data,
    );
  }

  const directUrl = data.url;

  return {
    url: directUrl,
    proxiedUrl: getProxiedImageUrl(directUrl),
  };
}

/**
 * Fetches a random anime image from Nekosia API
 */
async function fetchFromNekosia(): Promise<AnimeImage> {
  const url = "https://nekosia.cat/api/v1/images/catgirl";

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw await buildResponseError("Nekosia", url, response);
  }

  let data: NekosiaResponse;
  try {
    data = await response.json();
  } catch {
    throw buildDataError("Nekosia", url, "Failed to parse JSON response");
  }

  if (!data.image || !data.image.original || !data.image.original.url) {
    throw buildDataError(
      "Nekosia",
      url,
      "No image URL returned from Nekosia API",
      data,
    );
  }

  const directUrl = data.image.original.url;

  return {
    url: directUrl,
    proxiedUrl: getProxiedImageUrl(directUrl),
  };
}

/**
 * Fetches a random anime image from waifu.im API
 */
async function fetchFromWaifuIm(
  allowNSFW = false,
  aspect?: ImageAspectRequest,
): Promise<AnimeImage> {
  const url = buildWaifuImSearchUrl(allowNSFW, aspect);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw await buildResponseError("waifu.im", url, response);
  }

  let data: WaifuImResponse;
  try {
    data = await response.json();
  } catch {
    throw buildDataError("waifu.im", url, "Failed to parse JSON response");
  }

  const images = data.items ?? data.images ?? [];
  if (images.length === 0) {
    throw buildDataError(
      "waifu.im",
      url,
      "No images returned from waifu.im API",
      data,
    );
  }

  const image = images[0];
  if (!image?.url) {
    throw buildDataError(
      "waifu.im",
      url,
      "No image URL returned from waifu.im API",
      data,
    );
  }

  const directUrl = image.url;
  const artist = image.artists?.[0] ?? image.artist;

  return {
    url: directUrl,
    proxiedUrl: getProxiedImageUrl(directUrl),
    artistName: artist?.name ?? undefined,
    artistHref:
      artist?.pixiv ?? artist?.twitter ?? artist?.deviantArt ?? undefined,
    sourceUrl: image.source ?? undefined,
    dimensions:
      image.width && image.height
        ? { width: image.width, height: image.height }
        : undefined,
  };
}

/**
 * Fetches a random image from nekos.moe
 * API: https://nekos.moe/api/v1/random/image?count=1&nsfw=false
 * Direct image: https://nekos.moe/image/{id}
 */
async function fetchFromNekosMoe(allowNSFW = false): Promise<AnimeImage> {
  const url = `https://nekos.moe/api/v1/random/image?count=1&nsfw=${allowNSFW ? "true" : "false"}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw await buildResponseError("nekos.moe", url, response);
  }
  let data: NekosMoeRandomResponse;
  try {
    data = await response.json();
  } catch {
    throw buildDataError("nekos.moe", url, "Failed to parse JSON response");
  }
  const img = data.images?.[0];
  if (!img || !img.id) {
    throw buildDataError(
      "nekos.moe",
      url,
      "No images returned from nekos.moe API",
      data,
    );
  }
  const imageUrl = `https://nekos.moe/image/${img.id}`;
  return {
    url: imageUrl,
    proxiedUrl: getProxiedImageUrl(imageUrl),
    artistName: img.artist,
    sourceUrl: `https://nekos.moe/post/${img.id}`,
  };
}

/**
 * Fetches a random post from Danbooru (donmai.us)
 * API: https://danbooru.donmai.us/posts.json?random=true&limit=1&tags=rating:safe
 */
async function fetchFromDanbooru(
  allowNSFW = false,
  aspect?: ImageAspectRequest,
): Promise<AnimeImage> {
  const rating = allowNSFW ? "-rating:s" : "rating:s";
  const tags = [rating, ...buildDanbooruAspectTags(aspect), "random:1"];
  const apiUrl = `https://danbooru.donmai.us/posts.json?limit=1&tags=${encodeURIComponent(tags.join(" "))}`;
  const response = await fetch(apiUrl, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw await buildResponseError("danbooru", apiUrl, response);
  }

  let posts: DanbooruPost[];
  try {
    posts = await response.json();
  } catch {
    throw buildDataError("danbooru", apiUrl, "Failed to parse JSON response");
  }
  const post = posts?.[0];
  const url = post?.large_file_url || post?.file_url || post?.preview_file_url;
  if (!url) {
    throw buildDataError(
      "danbooru",
      apiUrl,
      "No image URL returned from danbooru API",
      posts,
    );
  }
  return {
    url,
    proxiedUrl: getProxiedImageUrl(url),
    artistName: post?.tag_string_artist,
    sourceUrl: post?.source,
    dimensions:
      post?.image_width && post.image_height
        ? { width: post.image_width, height: post.image_height }
        : undefined,
  };
}

/**
 * Fetches a random SFW anime image from Pic.re
 * Docs: https://doc.pic.re/anime-api-jie-shao
 */
async function fetchFromPicRe(): Promise<AnimeImage> {
  // Pic.re serves a random safe-for-work anime image at this URL.
  const imageUrl = withCacheBust("https://pic.re/image");
  return {
    url: imageUrl,
    proxiedUrl: getProxiedImageUrl(imageUrl),
    sourceUrl: imageUrl,
  };
}

/**
 * Response structure for Nekos API image
 * Docs: https://github.com/Nekos-API/Nekos-API
 */
interface NekosApiImage {
  id: number;
  url: string;
  rating?: string;
  artist_name?: string | null;
  source_url?: string | null;
}

/**
 * Fetches a random anime image from Nekos API
 * Base URL: https://api.nekosapi.com/v4
 */
async function fetchFromNekosApi(allowNSFW = false): Promise<AnimeImage> {
  const params = new URLSearchParams();
  params.set("limit", "1");
  if (!allowNSFW) {
    params.set("rating", "safe");
  }
  const baseUrl = `https://api.nekosapi.com/v4/images/random?${params.toString()}`;

  const requestInit: RequestInit = {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  };

  let requestUrl = baseUrl;
  let response: Response;

  try {
    // 먼저 원본 URL로 직접 요청을 시도한다.
    response = await fetch(requestUrl, requestInit);
  } catch (directError) {
    // CORS 우회 프록시가 설정되어 있다면, 프록시를 통해 다시 시도한다.
    const corsProxy = getCorsProxyUrl();
    if (!corsProxy) {
      throw directError instanceof Error
        ? directError
        : new Error(`Nekos API request failed: ${String(directError)}`);
    }

    const proxiedUrl = `${corsProxy}${encodeURIComponent(baseUrl)}`;
    requestUrl = proxiedUrl;

    try {
      response = await fetch(proxiedUrl, requestInit);
    } catch (proxyError) {
      const lines: string[] = [
        "Nekos API request failed via direct and CORS proxy",
        `directUrl: ${baseUrl}`,
        `proxiedUrl: ${proxiedUrl}`,
      ];
      if (directError instanceof Error && directError.message) {
        lines.push("directError:", directError.message);
      }
      if (proxyError instanceof Error && proxyError.message) {
        lines.push("proxyError:", proxyError.message);
      }
      throw new Error(lines.join("\n"), { cause: proxyError });
    }
  }

  if (!response.ok) {
    throw await buildResponseError("Nekos", requestUrl, response);
  }

  let data: NekosApiImage[] | { items?: NekosApiImage[] };
  try {
    data = await response.json();
  } catch {
    throw buildDataError("Nekos", requestUrl, "Failed to parse JSON response");
  }
  const images: NekosApiImage[] = Array.isArray(data)
    ? data
    : (data?.items ?? []);
  const image = images[0];

  if (!image || !image.url) {
    throw buildDataError(
      "Nekos",
      requestUrl,
      "No image URL returned from Nekos API",
      data,
    );
  }

  const directUrl = image.url;

  return {
    url: directUrl,
    proxiedUrl: getProxiedImageUrl(directUrl),
    artistName: image.artist_name ?? undefined,
    sourceUrl: image.source_url ?? undefined,
  };
}

/**
 * Returns a fallback placeholder image
 */
function getFallbackImage(): AnimeImage {
  // Using a reliable placeholder service
  const fallbackUrl = `https://picsum.photos/1920/1080?random=${Date.now()}`;
  return {
    url: fallbackUrl,
    proxiedUrl: getProxiedImageUrl(fallbackUrl),
  };
}

/**
 * Fetches a random anime image from the configured source with automatic fallback
 */
export async function fetchRandomImage(
  config: ImageApiConfig = { source: "pic_re", allowNSFW: false },
): Promise<AnimeImage> {
  let { source } = config;
  const { allowNSFW = false } = config;
  const aspect: ImageAspectRequest | undefined = config.aspectPreference
    ? { preference: config.aspectPreference, viewport: config.viewport }
    : undefined;

  // If RANDOM is selected, randomly choose an API
  if (source === "random") {
    const sources: ImageSource[] = [
      "nekos_best",
      "waifu_pics",
      "nekosia",
      "waifu_im",
      "nekos_moe",
      "danbooru",
      "pic_re",
      "nekosapi",
    ];
    source = sources[Math.floor(Math.random() * sources.length)];
  }

  try {
    switch (source) {
      case "nekos_best":
        return await fetchFromNekosBest();

      case "waifu_pics":
        return await fetchFromWaifuPics(allowNSFW);

      case "nekosia":
        return await fetchFromNekosia();

      case "waifu_im":
        return await fetchFromWaifuIm(allowNSFW, aspect);

      case "nekos_moe":
        return await fetchFromNekosMoe(allowNSFW);

      case "danbooru":
        return await fetchFromDanbooru(allowNSFW, aspect);

      case "pic_re":
        return await fetchFromPicRe();

      case "nekosapi":
        return await fetchFromNekosApi(allowNSFW);

      case "fallback":
        return getFallbackImage();

      default:
        throw new Error(`Unknown image source: ${source}`);
    }
  } catch {
    // Automatic fallback to Pic.re, which serves a direct image without an API CORS preflight.
    if (source !== "pic_re") {
      try {
        return await fetchFromPicRe();
      } catch {
        // fall through to the final placeholder
      }
    }

    // Final fallback to placeholder
    return getFallbackImage();
  }
}

/**
 * Preloads an image to ensure it's cached before displaying
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload image: ${url}`));
    img.src = url;
  });
}
