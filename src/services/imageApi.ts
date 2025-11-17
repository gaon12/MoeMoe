import {
  type AnimeImage,
  type ImageSource,
} from '../types/image';

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
        'responseDataSnippet:',
        json.length > MAX_ERROR_BODY_LENGTH
          ? `${json.slice(0, MAX_ERROR_BODY_LENGTH)}…`
          : json,
      );
    }
  }

  return new Error(lines.join('\n'));
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
    lines.push('responseBodySnippet:', bodySnippet);
  }

  return new Error(lines.join('\n'));
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
  }>;
}

/**
 * Response structure from waifu.pics API
 */
interface WaifuPicsResponse {
  url: string;
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
}

/**
 * Configuration for image fetching
 */
export interface ImageApiConfig {
  source: ImageSource;
  allowNSFW?: boolean;
  fallbackUrl?: string;
}

/**
 * Fetches a random anime image from nekos.best API
 * Note: Nekos.best is SFW only, NSFW parameter is ignored
 */
async function fetchFromNekosBest(): Promise<AnimeImage> {
  // Nekos.best is SFW only, so we use waifu category
  const category = 'waifu';
  const url = `https://nekos.best/api/v2/${category}?amount=1`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw await buildResponseError('nekos.best', url, response);
  }

  let data: NekosBestResponse;
  try {
    data = await response.json();
  } catch (error) {
    throw buildDataError(
      'nekos.best',
      url,
      'Failed to parse JSON response',
    );
  }

  if (!data.results || data.results.length === 0) {
    throw buildDataError(
      'nekos.best',
      url,
      'No images returned from nekos.best API',
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
  };
}

/**
 * Fetches a random anime image from waifu.pics API
 */
async function fetchFromWaifuPics(allowNSFW = false): Promise<AnimeImage> {
  const sfwOrNsfw = allowNSFW ? 'nsfw' : 'sfw';
  const url = `https://api.waifu.pics/${sfwOrNsfw}/waifu`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw await buildResponseError('waifu.pics', url, response);
  }

  let data: WaifuPicsResponse;
  try {
    data = await response.json();
  } catch {
    throw buildDataError(
      'waifu.pics',
      url,
      'Failed to parse JSON response',
    );
  }

  if (!data.url) {
    throw buildDataError(
      'waifu.pics',
      url,
      'No image URL returned from waifu.pics API',
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
  const url = 'https://nekosia.cat/api/v1/images/catgirl';

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw await buildResponseError('Nekosia', url, response);
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw buildDataError(
      'Nekosia',
      url,
      'Failed to parse JSON response',
    );
  }

  if (!data.image || !data.image.original || !data.image.original.url) {
    throw buildDataError(
      'Nekosia',
      url,
      'No image URL returned from Nekosia API',
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
async function fetchFromWaifuIm(allowNSFW = false): Promise<AnimeImage> {
  const nsfwParam = allowNSFW ? 'true' : 'false';
  const url = `https://api.waifu.im/search?is_nsfw=${nsfwParam}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw await buildResponseError('waifu.im', url, response);
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw buildDataError(
      'waifu.im',
      url,
      'Failed to parse JSON response',
    );
  }

  if (!data.images || data.images.length === 0) {
    throw buildDataError(
      'waifu.im',
      url,
      'No images returned from waifu.im API',
      data,
    );
  }

  const image = data.images[0];

  const directUrl = image.url;

  return {
    url: directUrl,
    proxiedUrl: getProxiedImageUrl(directUrl),
    artistName: image.artist?.name,
    artistHref: image.artist?.pixiv,
    sourceUrl: image.source,
  };
}

/**
 * Fetches a random image from nekos.moe
 * API: https://nekos.moe/api/v1/random/image?count=1&nsfw=false
 * Direct image: https://nekos.moe/image/{id}
 */
async function fetchFromNekosMoe(allowNSFW = false): Promise<AnimeImage> {
  const url = `https://nekos.moe/api/v1/random/image?count=1&nsfw=${allowNSFW ? 'true' : 'false'}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw await buildResponseError('nekos.moe', url, response);
  }
  let data: NekosMoeRandomResponse;
  try {
    data = await response.json();
  } catch {
    throw buildDataError(
      'nekos.moe',
      url,
      'Failed to parse JSON response',
    );
  }
  const img = data.images?.[0];
  if (!img || !img.id) {
    throw buildDataError(
      'nekos.moe',
      url,
      'No images returned from nekos.moe API',
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
async function fetchFromDanbooru(allowNSFW = false): Promise<AnimeImage> {
  const rating = allowNSFW ? '-rating:s' : 'rating:s';
  // Use order:random to get a random safe/NSFW as configured
  const apiUrl = `https://danbooru.donmai.us/posts.json?limit=1&random=true&tags=${encodeURIComponent(rating)}`;
  const response = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
  if (!response.ok) {
    throw await buildResponseError('danbooru', apiUrl, response);
  }

  let posts: DanbooruPost[];
  try {
    posts = await response.json();
  } catch {
    throw buildDataError(
      'danbooru',
      apiUrl,
      'Failed to parse JSON response',
    );
  }
  const post = posts?.[0];
  const url = post?.large_file_url || post?.file_url || post?.preview_file_url;
  if (!url) {
    throw buildDataError(
      'danbooru',
      apiUrl,
      'No image URL returned from danbooru API',
      posts,
    );
  }
  return {
    url,
    proxiedUrl: getProxiedImageUrl(url),
    artistName: post?.tag_string_artist,
    sourceUrl: post?.source,
  };
}

/**
 * Fetches a random SFW anime image from Pic.re
 * Docs: https://doc.pic.re/anime-api-jie-shao
 */
async function fetchFromPicRe(): Promise<AnimeImage> {
  // Pic.re serves a random safe-for-work anime image at this URL.
  const imageUrl = 'https://pic.re/image';
  return {
    url: imageUrl,
    proxiedUrl: getProxiedImageUrl(imageUrl),
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
  params.set('limit', '1');
  if (!allowNSFW) {
    params.set('rating', 'safe');
  }
  const baseUrl = `https://api.nekosapi.com/v4/images/random?${params.toString()}`;

  const requestInit: RequestInit = {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
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
        'Nekos API request failed via direct and CORS proxy',
        `directUrl: ${baseUrl}`,
        `proxiedUrl: ${proxiedUrl}`,
      ];
      if (directError instanceof Error && directError.message) {
        lines.push('directError:', directError.message);
      }
      if (proxyError instanceof Error && proxyError.message) {
        lines.push('proxyError:', proxyError.message);
      }
      throw new Error(lines.join('\n'));
    }
  }

  if (!response.ok) {
    throw await buildResponseError('Nekos', requestUrl, response);
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw buildDataError(
      'Nekos',
      requestUrl,
      'Failed to parse JSON response',
    );
  }
  const images: NekosApiImage[] = Array.isArray(data) ? data : data?.items ?? [];
  const image = images[0];

  if (!image || !image.url) {
    throw buildDataError(
      'Nekos',
      requestUrl,
      'No image URL returned from Nekos API',
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
  config: ImageApiConfig = { source: 'nekos_best', allowNSFW: false }
): Promise<AnimeImage> {
  let { source, allowNSFW = false } = config;

  // If RANDOM is selected, randomly choose an API
  if (source === 'random') {
    const sources: ImageSource[] = ['nekos_best', 'waifu_pics', 'nekosia', 'waifu_im', 'nekos_moe', 'danbooru', 'pic_re', 'nekosapi'];
    source = sources[Math.floor(Math.random() * sources.length)];
    console.log(`Random source selected: ${source}`);
  }

  try {
    switch (source) {
      case 'nekos_best':
        return await fetchFromNekosBest();

      case 'waifu_pics':
        return await fetchFromWaifuPics(allowNSFW);

      case 'nekosia':
        return await fetchFromNekosia();

      case 'waifu_im':
        return await fetchFromWaifuIm(allowNSFW);

      case 'nekos_moe':
        return await fetchFromNekosMoe(allowNSFW);

      case 'danbooru':
        return await fetchFromDanbooru(allowNSFW);

      case 'pic_re':
        return await fetchFromPicRe();

      case 'nekosapi':
        return await fetchFromNekosApi(allowNSFW);

      case 'fallback':
        return getFallbackImage();

      default:
        throw new Error(`Unknown image source: ${source}`);
    }
  } catch (error) {
    console.error('Error fetching image from primary source:', error);

    // Automatic fallback to nekos.best if primary source fails
    if (source !== 'nekos_best') {
      try {
        console.log('Attempting fallback to nekos.best...');
        return await fetchFromNekosBest();
      } catch (fallbackError) {
        console.error('Fallback to nekos.best failed:', fallbackError);
      }
    }

    // Final fallback to placeholder
    console.log('Using placeholder image as final fallback');
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
