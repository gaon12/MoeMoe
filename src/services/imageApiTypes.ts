import type { ImageDimensions, ImageSource } from "../types/image.ts";
import type { ImageAspectPreference } from "../types/settings.ts";

/**
 * Configuration for image fetching
 */
export interface ImageApiConfig {
  source: ImageSource;
  allowNSFW?: boolean;
  fallbackUrl?: string;
  aspectPreference?: ImageAspectPreference;
  viewport?: ImageDimensions;
  signal?: AbortSignal;
}

export interface ImageAspectRequest {
  preference: ImageAspectPreference;
  viewport?: ImageDimensions;
}
