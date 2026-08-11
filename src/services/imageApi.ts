export type { ImageApiConfig, ImageAspectRequest } from "./imageApiTypes";
export {
  buildDanbooruAspectTags,
  buildWaifuImSearchUrl,
  buildWallhavenSearchUrl,
} from "./imageAspect";
export { fetchRandomImage } from "./imageProviders";

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
