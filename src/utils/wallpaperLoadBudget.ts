export const WALLPAPER_LOAD_BUDGET_MS = 10_000;
export const WALLPAPER_PROVIDER_BUDGET_MS = 4_000;
export const WALLPAPER_PRELOAD_BUDGET_MS = 5_000;

export function getRemainingWallpaperLoadBudget(
  startedAt: number,
  now = Date.now(),
): number {
  return Math.max(0, WALLPAPER_LOAD_BUDGET_MS - (now - startedAt));
}

export function capWallpaperAttemptBudget(
  remainingBudget: number,
  attemptLimit: number,
): number {
  return Math.max(0, Math.min(remainingBudget, attemptLimit));
}
