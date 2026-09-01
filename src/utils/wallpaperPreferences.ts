import type { AnimeImage, ImageSource } from "../types/image.ts";

type WallpaperSentiment = "liked" | "disliked";
type WallpaperAspect = "landscape" | "portrait" | "square";

interface WallpaperFeedback {
  url: string;
  sentiment: WallpaperSentiment;
  source?: ImageSource;
  artist?: string;
  aspect?: WallpaperAspect;
  updatedAt: number;
}

const EXPLORATION_FLOOR = 0.25;
const SCORE_PRIOR = 4;

function getWallpaperAspect(
  image: Pick<AnimeImage, "dimensions">,
): WallpaperAspect | undefined {
  const { dimensions } = image;
  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
    return undefined;
  }
  const ratio = dimensions.width / dimensions.height;
  if (ratio > 1.1) {
    return "landscape";
  }
  if (ratio < 0.9) {
    return "portrait";
  }
  return "square";
}

function createWallpaperFeedback(
  image: AnimeImage,
  sentiment: WallpaperSentiment,
  updatedAt = Date.now(),
): WallpaperFeedback {
  const artist = image.artistName?.trim().toLocaleLowerCase().slice(0, 200);
  return {
    url: image.url,
    sentiment,
    source: image.source,
    artist: artist || undefined,
    aspect: getWallpaperAspect(image),
    updatedAt,
  };
}

function learnedScore(matches: readonly WallpaperSentiment[]): number {
  if (matches.length === 0) {
    return 0;
  }
  const sum = matches.reduce(
    (total, sentiment) => total + (sentiment === "liked" ? 1 : -1),
    0,
  );
  return sum / (matches.length + SCORE_PRIOR);
}

function getSourceWeight(
  source: ImageSource,
  feedback: readonly WallpaperFeedback[],
): number {
  const score = learnedScore(
    feedback
      .filter((entry) => entry.source === source)
      .map((entry) => entry.sentiment),
  );
  return Math.max(EXPLORATION_FLOOR, 1 + score * 1.5);
}

function chooseWeightedImageSource(
  sources: readonly ImageSource[],
  feedback: readonly WallpaperFeedback[],
  random = Math.random,
): ImageSource {
  if (sources.length === 0) {
    return "pic_re";
  }
  const weighted = sources.map((source) => ({
    source,
    weight: getSourceWeight(source, feedback),
  }));
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = Math.min(0.999_999_999, Math.max(0, random())) * total;
  for (const entry of weighted) {
    cursor -= entry.weight;
    if (cursor < 0) {
      return entry.source;
    }
  }
  return weighted.at(-1)?.source ?? "pic_re";
}

function getCandidateAcceptanceProbability(
  image: AnimeImage,
  feedback: readonly WallpaperFeedback[],
): number {
  const signals: number[] = [];
  const artist = image.artistName?.trim().toLocaleLowerCase();
  const aspect = getWallpaperAspect(image);

  if (artist) {
    signals.push(
      learnedScore(
        feedback
          .filter((entry) => entry.artist === artist)
          .map((entry) => entry.sentiment),
      ),
    );
  }
  if (aspect) {
    signals.push(
      learnedScore(
        feedback
          .filter((entry) => entry.aspect === aspect)
          .map((entry) => entry.sentiment),
      ),
    );
  }
  if (signals.length === 0) {
    return 1;
  }
  const average =
    signals.reduce((sum, score) => sum + score, 0) / signals.length;
  return Math.max(EXPLORATION_FLOOR, Math.min(1, 0.7 + average));
}

function shouldAcceptWallpaperCandidate(
  image: AnimeImage,
  feedback: readonly WallpaperFeedback[],
  options: {
    hasPreviousImage: boolean;
    isFinalAttempt: boolean;
    random?: () => number;
  },
): boolean {
  if (!options.hasPreviousImage || image.isLocal || options.isFinalAttempt) {
    return true;
  }
  return (
    (options.random ?? Math.random)() <=
    getCandidateAcceptanceProbability(image, feedback)
  );
}

export {
  chooseWeightedImageSource,
  createWallpaperFeedback,
  getCandidateAcceptanceProbability,
  getSourceWeight,
  getWallpaperAspect,
  shouldAcceptWallpaperCandidate,
};
export type { WallpaperAspect, WallpaperFeedback, WallpaperSentiment };
