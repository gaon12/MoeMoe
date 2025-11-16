import {
  type AnimeImage,
  type ImageSource,
} from '../types/image';

/**
 * Get CORS proxy URL from environment variable
 */
const getCorsProxyUrl = (): string | undefined => {
  return import.meta.env.VITE_FIX_CORS_API_URL;
};

/**
 * Apply CORS proxy to image URL if proxy is configured
 */
const proxifyImageUrl = (url: string): string => {
  const proxyUrl = getCorsProxyUrl();
  if (proxyUrl && url) {
    return `${proxyUrl}${encodeURIComponent(url)}`;
  }
  return url;
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
    throw new Error(`nekos.best API error: ${response.status} ${response.statusText}`);
  }

  const data: NekosBestResponse = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error('No images returned from nekos.best API');
  }

  const result = data.results[0];

  return {
    url: proxifyImageUrl(result.url),
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
    throw new Error(`waifu.pics API error: ${response.status} ${response.statusText}`);
  }

  const data: WaifuPicsResponse = await response.json();

  if (!data.url) {
    throw new Error('No image URL returned from waifu.pics API');
  }

  return {
    url: proxifyImageUrl(data.url),
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
    throw new Error(`Nekosia API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.image || !data.image.original || !data.image.original.url) {
    throw new Error('No image URL returned from Nekosia API');
  }

  return {
    url: proxifyImageUrl(data.image.original.url),
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
    throw new Error(`waifu.im API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.images || data.images.length === 0) {
    throw new Error('No images returned from waifu.im API');
  }

  const image = data.images[0];

  return {
    url: proxifyImageUrl(image.url),
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
    throw new Error(`nekos.moe API error: ${response.status} ${response.statusText}`);
  }
  const data: NekosMoeRandomResponse = await response.json();
  const img = data.images?.[0];
  if (!img || !img.id) {
    throw new Error('No images returned from nekos.moe API');
  }
  const imageUrl = `https://nekos.moe/image/${img.id}`;
  return {
    url: proxifyImageUrl(imageUrl),
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
    throw new Error(`danbooru API error: ${response.status} ${response.statusText}`);
  }
  const posts: DanbooruPost[] = await response.json();
  const post = posts?.[0];
  const url = post?.large_file_url || post?.file_url || post?.preview_file_url;
  if (!url) {
    throw new Error('No image URL returned from danbooru API');
  }
  return {
    url: proxifyImageUrl(url),
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
    url: proxifyImageUrl(imageUrl),
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
  const url = `https://api.nekosapi.com/v4/images/random?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Nekos API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const images: NekosApiImage[] = Array.isArray(data) ? data : data?.items ?? [];
  const image = images[0];

  if (!image || !image.url) {
    throw new Error('No image URL returned from Nekos API');
  }

  return {
    url: proxifyImageUrl(image.url),
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
    url: proxifyImageUrl(fallbackUrl),
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
