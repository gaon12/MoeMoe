import type { ImageSource } from "../types/image.ts";

/**
 * Brand names for the image providers.
 *
 * These are proper nouns and stay identical in every locale, so they live in
 * code rather than in the translation files. The sources without a brand --
 * the user's own library and the bundled fallback -- are absent here and
 * named through i18n by the caller.
 */
export const PROVIDER_DISPLAY_NAMES: Partial<Record<ImageSource, string>> = {
  nekos_best: "Nekos.best",
  waifu_pics: "Waifu.pics",
  nekosia: "Nekosia",
  waifu_im: "Waifu.im",
  nekos_moe: "Nekos.moe",
  danbooru: "Danbooru",
  pic_re: "Pic.re",
  nekosapi: "NekosAPI",
  wallhaven: "Wallhaven",
};

export function getProviderDisplayName(
  source: ImageSource | undefined,
): string | undefined {
  return source ? PROVIDER_DISPLAY_NAMES[source] : undefined;
}
