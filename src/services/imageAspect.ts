import type { ImageDimensions } from "../types/image";
import type { ImageAspectRequest } from "./imageApiTypes";

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
  if (!aspect || aspect.preference === "any") return undefined;
  if (aspect.preference === "landscape") return "Landscape";
  if (aspect.preference === "portrait") return "Portrait";
  if (aspect.preference === "square") return "Square";

  const ratio = getScreenRatio(aspect);
  if (!ratio) return undefined;
  if (Math.abs(ratio - 1) <= 0.08) return "Square";
  return ratio > 1 ? "Landscape" : "Portrait";
};

const COMMON_RATIOS: Array<[number, number]> = [
  [16, 9],
  [9, 16],
  [4, 3],
  [3, 4],
  [3, 2],
  [2, 3],
  [1, 1],
];

const getClosestCommonRatio = (ratio: number): [number, number] | undefined => {
  const match = COMMON_RATIOS.find(
    ([width, height]) => Math.abs(ratio - width / height) <= 0.08,
  );
  return match;
};

export const buildDanbooruAspectTags = (
  aspect?: ImageAspectRequest,
): string[] => {
  if (!aspect || aspect.preference === "any") return [];
  if (aspect.preference === "landscape") return ["ratio:>1"];
  if (aspect.preference === "portrait") return ["ratio:<1"];
  if (aspect.preference === "square") return ["ratio:1"];

  if (!isValidDimensions(aspect.viewport)) return [];
  const ratio = aspect.viewport.width / aspect.viewport.height;
  const [width, height] =
    getClosestCommonRatio(ratio) ??
    (ratio > 1.08 ? [1, 0] : ratio < 0.92 ? [0, 1] : [1, 1]);
  if (height === 0) return ["ratio:>1"];
  if (width === 0) return ["ratio:<1"];
  return [`ratio:${width}:${height}`];
};

export const buildWaifuImSearchUrl = (
  allowNSFW: boolean,
  aspect?: ImageAspectRequest,
): string => {
  const params = new URLSearchParams({
    IsNsfw: allowNSFW ? "All" : "False",
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
