/**
 * Image data structure returned from anime image APIs
 */
export interface AnimeImage {
  url: string;
  animeName?: string;
  artistName?: string;
  artistHref?: string;
  sourceUrl?: string;
}

/**
 * Supported anime image API sources
 */
export type ImageSource =
  | 'nekos_best'
  | 'waifu_pics'
  | 'nekosia'
  | 'waifu_im'
  | 'nekos_moe'
  | 'danbooru' // donmai.us
  | 'pic_re'
  | 'nekosapi'
  | 'random'
  | 'fallback';

/**
 * All selectable sources in UI (excluding 'random' and 'fallback')
 */
export const ALL_IMAGE_SOURCES: ImageSource[] = [
  'nekos_best',
  'waifu_pics',
  'nekosia',
  'waifu_im',
  'nekos_moe',
  'danbooru',
  'pic_re',
  'nekosapi',
];

/**
 * Available image categories for nekos.best
 */
export type NekosBestCategory =
  | 'neko'
  | 'waifu'
  | 'kitsune'
  | 'husbando'
  | 'shinobu'
  | 'megumin'
  | 'bully'
  | 'cuddle'
  | 'cry'
  | 'hug'
  | 'awoo'
  | 'kiss'
  | 'lick'
  | 'pat'
  | 'smug'
  | 'bonk'
  | 'yeet'
  | 'blush'
  | 'smile'
  | 'wave'
  | 'highfive'
  | 'handhold'
  | 'nom'
  | 'bite'
  | 'glomp'
  | 'slap'
  | 'kill'
  | 'kick'
  | 'happy'
  | 'wink'
  | 'poke'
  | 'dance'
  | 'cringe';

/**
 * Available categories for waifu.pics
 */
export type WaifuPicsCategory =
  | 'waifu'
  | 'neko'
  | 'shinobu'
  | 'megumin'
  | 'bully'
  | 'cuddle'
  | 'cry'
  | 'hug'
  | 'awoo'
  | 'kiss'
  | 'lick'
  | 'pat'
  | 'smug'
  | 'bonk'
  | 'yeet'
  | 'blush'
  | 'smile'
  | 'wave'
  | 'highfive'
  | 'handhold'
  | 'nom'
  | 'bite'
  | 'glomp'
  | 'slap'
  | 'kill'
  | 'kick'
  | 'happy'
  | 'wink'
  | 'poke'
  | 'dance'
  | 'cringe';
