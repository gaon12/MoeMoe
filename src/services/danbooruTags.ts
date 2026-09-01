const TAG_SEPARATOR_PATTERN = /\s+/;
const WORD_START_PATTERN = /\b\w/g;

/**
 * Danbooru's copyright tag for artwork that belongs to no series. It is a real
 * tag rather than a missing value, but as a displayed title it says less than
 * nothing.
 */
const UNSERIED_COPYRIGHT_TAG = "original";

/**
 * Turns one Danbooru tag string into something displayable.
 *
 * Danbooru returns space-separated, lowercase, underscored tags -- for
 * example `hatsune_miku vocaloid` or `fate_(series)`. Only the first is used:
 * the list is ordered by relevance, and joining several produces a title no
 * one would recognise.
 */
export function formatDanbooruTag(
  tagString: string | undefined | null,
): string | undefined {
  if (typeof tagString !== "string") {
    return undefined;
  }

  const [firstTag] = tagString.trim().split(TAG_SEPARATOR_PATTERN);
  if (!firstTag || firstTag === UNSERIED_COPYRIGHT_TAG) {
    return undefined;
  }

  const formatted = firstTag
    .replaceAll("_", " ")
    .replace(WORD_START_PATTERN, (character) => character.toUpperCase())
    .trim();

  return formatted || undefined;
}
