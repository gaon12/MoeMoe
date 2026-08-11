import type { AnimeImage, ImageDimensions, ImageSource } from "../types/image";
import type { ImageApiConfig, ImageAspectRequest } from "./imageApiTypes";
import {
  buildDanbooruAspectTags,
  buildWaifuImSearchUrl,
  buildWallhavenSearchUrl,
} from "./imageAspect";
import {
  buildDataError,
  buildResponseError,
  getCorsProxyUrl,
  getProxiedImageUrl,
  withCacheBust,
} from "./imageApiUtils";
import { fetchRandomUserImage } from "./userImageStore";

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

interface WallhavenResponse {
  data?: Array<{
    path?: string;
    url?: string;
    resolution?: string;
    dimension_x?: number;
    dimension_y?: number;
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
 * Fetches a random anime image from nekos.best API
 * Note: Nekos.best is SFW only, NSFW parameter is ignored
 */
async function fetchFromNekosBest(signal?: AbortSignal): Promise<AnimeImage> {
  // Nekos.best is SFW only, so we use waifu category
  const category = "waifu";
  const url = `https://nekos.best/api/v2/${category}?amount=1`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal,
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
async function fetchFromWaifuPics(
  allowNSFW = false,
  signal?: AbortSignal,
): Promise<AnimeImage> {
  const sfwOrNsfw = allowNSFW ? "nsfw" : "sfw";
  const url = `https://api.waifu.pics/${sfwOrNsfw}/waifu`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal,
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
async function fetchFromNekosia(signal?: AbortSignal): Promise<AnimeImage> {
  const url = "https://nekosia.cat/api/v1/images/catgirl";

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal,
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
  signal?: AbortSignal,
): Promise<AnimeImage> {
  const url = buildWaifuImSearchUrl(allowNSFW, aspect);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal,
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
async function fetchFromNekosMoe(
  allowNSFW = false,
  signal?: AbortSignal,
): Promise<AnimeImage> {
  const url = `https://nekos.moe/api/v1/random/image?count=1&nsfw=${allowNSFW ? "true" : "false"}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
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
  signal?: AbortSignal,
): Promise<AnimeImage> {
  const rating = allowNSFW ? "-rating:s" : "rating:s";
  const tags = [rating, ...buildDanbooruAspectTags(aspect), "random:1"];
  const apiUrl = `https://danbooru.donmai.us/posts.json?limit=1&tags=${encodeURIComponent(tags.join(" "))}`;
  const response = await fetch(apiUrl, {
    headers: { Accept: "application/json" },
    signal,
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
async function fetchFromNekosApi(
  allowNSFW = false,
  signal?: AbortSignal,
): Promise<AnimeImage> {
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
    signal,
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

async function fetchFromWallhaven(
  aspect?: ImageAspectRequest,
  signal?: AbortSignal,
): Promise<AnimeImage> {
  const url = buildWallhavenSearchUrl(aspect);
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw await buildResponseError("Wallhaven", url, response);
  }

  let data: WallhavenResponse;
  try {
    data = await response.json();
  } catch {
    throw buildDataError("Wallhaven", url, "Failed to parse JSON response");
  }
  const wallpaper = data.data?.[0];
  if (!wallpaper?.path) {
    throw buildDataError(
      "Wallhaven",
      url,
      "No wallpaper URL returned from Wallhaven API",
      data,
    );
  }
  const [resolutionWidth, resolutionHeight] = (
    wallpaper.resolution ?? ""
  ).split("x");
  const width = wallpaper.dimension_x ?? Number(resolutionWidth);
  const height = wallpaper.dimension_y ?? Number(resolutionHeight);
  return {
    url: wallpaper.path,
    proxiedUrl: getProxiedImageUrl(wallpaper.path),
    artistName: wallpaper.uploader?.username,
    sourceUrl: wallpaper.url,
    dimensions:
      Number.isFinite(width) && Number.isFinite(height)
        ? { width, height }
        : undefined,
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
 * Fetches a random anime image from the configured source.
 * Provider failures are surfaced so the caller can choose and report fallbacks.
 */
export async function fetchRandomImage(
  config: ImageApiConfig = { source: "pic_re", allowNSFW: false },
): Promise<AnimeImage> {
  let { source } = config;
  const { allowNSFW = false } = config;
  const { signal } = config;
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
      "wallhaven",
    ];
    source = sources[Math.floor(Math.random() * sources.length)];
  }

  switch (source) {
    case "nekos_best":
      return await fetchFromNekosBest(signal);

    case "waifu_pics":
      return await fetchFromWaifuPics(allowNSFW, signal);

    case "nekosia":
      return await fetchFromNekosia(signal);

    case "waifu_im":
      return await fetchFromWaifuIm(allowNSFW, aspect, signal);

    case "nekos_moe":
      return await fetchFromNekosMoe(allowNSFW, signal);

    case "danbooru":
      return await fetchFromDanbooru(allowNSFW, aspect, signal);

    case "pic_re":
      return await fetchFromPicRe();

    case "nekosapi":
      return await fetchFromNekosApi(allowNSFW, signal);

    case "wallhaven":
      return await fetchFromWallhaven(aspect, signal);

    case "user_uploads":
      return await fetchRandomUserImage(signal);

    case "fallback":
      return getFallbackImage();

    default:
      throw new Error(`Unknown image source: ${source}`);
  }
}
