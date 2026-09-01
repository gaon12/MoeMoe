import type { ImageDimensions } from "../types/image.ts";
import type { ImageAspectRequest } from "./imageApiTypes.ts";

const SQUARE_RATIO = 1;
const COMMON_RATIO_TOLERANCE = 0.08;
const LANDSCAPE_FALLBACK_THRESHOLD = 1.08;
const PORTRAIT_FALLBACK_THRESHOLD = 0.92;
const WIDESCREEN_LONG_EDGE = 16;
const WIDESCREEN_SHORT_EDGE = 9;
const STANDARD_LONG_EDGE = 4;
const STANDARD_SHORT_EDGE = 3;
const PHOTO_LONG_EDGE = 3;
const PHOTO_SHORT_EDGE = 2;

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
  if (!aspect || aspect.preference === "any") {
    return undefined;
  }
  if (aspect.preference === "landscape") {
    return "Landscape";
  }
  if (aspect.preference === "portrait") {
    return "Portrait";
  }
  if (aspect.preference === "square") {
    return "Square";
  }

  const ratio = getScreenRatio(aspect);
  if (!ratio) {
    return undefined;
  }
  if (Math.abs(ratio - SQUARE_RATIO) <= COMMON_RATIO_TOLERANCE) {
    return "Square";
  }
  return ratio > SQUARE_RATIO ? "Landscape" : "Portrait";
};

const COMMON_RATIOS: [number, number][] = [
  [WIDESCREEN_LONG_EDGE, WIDESCREEN_SHORT_EDGE],
  [WIDESCREEN_SHORT_EDGE, WIDESCREEN_LONG_EDGE],
  [STANDARD_LONG_EDGE, STANDARD_SHORT_EDGE],
  [STANDARD_SHORT_EDGE, STANDARD_LONG_EDGE],
  [PHOTO_LONG_EDGE, PHOTO_SHORT_EDGE],
  [PHOTO_SHORT_EDGE, PHOTO_LONG_EDGE],
  [SQUARE_RATIO, SQUARE_RATIO],
];

const getClosestCommonRatio = (ratio: number): [number, number] | undefined => {
  const match = COMMON_RATIOS.find(
    ([width, height]) =>
      Math.abs(ratio - width / height) <= COMMON_RATIO_TOLERANCE,
  );
  return match;
};

export const buildDanbooruAspectTags = (
  aspect?: ImageAspectRequest,
): string[] => {
  if (!aspect || aspect.preference === "any") {
    return [];
  }
  if (aspect.preference === "landscape") {
    return ["ratio:>1"];
  }
  if (aspect.preference === "portrait") {
    return ["ratio:<1"];
  }
  if (aspect.preference === "square") {
    return ["ratio:1"];
  }

  if (!isValidDimensions(aspect.viewport)) {
    return [];
  }
  const ratio = aspect.viewport.width / aspect.viewport.height;
  let fallbackRatio: [number, number] = [SQUARE_RATIO, SQUARE_RATIO];
  if (ratio > LANDSCAPE_FALLBACK_THRESHOLD) {
    fallbackRatio = [SQUARE_RATIO, 0];
  } else if (ratio < PORTRAIT_FALLBACK_THRESHOLD) {
    fallbackRatio = [0, SQUARE_RATIO];
  }
  const [width, height] = getClosestCommonRatio(ratio) ?? fallbackRatio;
  if (height === 0) {
    return ["ratio:>1"];
  }
  if (width === 0) {
    return ["ratio:<1"];
  }
  return [`ratio:${width}:${height}`];
};

export const buildWaifuImSearchUrl = (
  allowNsfw: boolean,
  aspect?: ImageAspectRequest,
): string => {
  const params = new URLSearchParams({
    IsNsfw: allowNsfw ? "All" : "False",
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

export const buildWallhavenSearchUrl = (
  aspect?: ImageAspectRequest,
): string => {
  const params = new URLSearchParams({
    categories: "010",
    purity: "100",
    sorting: "random",
    order: "desc",
  });
  const orientation = getOrientation(aspect);
  if (orientation === "Landscape") {
    params.set("ratios", "16x9,16x10");
  }
  if (orientation === "Portrait") {
    params.set("ratios", "9x16,10x16");
  }
  if (orientation === "Square") {
    params.set("ratios", "1x1");
  }
  if (aspect?.preference === "screen" && isValidDimensions(aspect.viewport)) {
    params.set(
      "atleast",
      `${Math.round(aspect.viewport.width)}x${Math.round(aspect.viewport.height)}`,
    );
  }
  return `https://wallhaven.cc/api/v1/search?${params.toString()}`;
};
