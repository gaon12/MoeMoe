import { describe, expect, it } from "vitest";
import {
  capWallpaperAttemptBudget,
  getRemainingWallpaperLoadBudget,
  WALLPAPER_LOAD_BUDGET_MS,
} from "./wallpaperLoadBudget";

describe("wallpaper load budget", () => {
  it("caps the complete loading sequence at ten seconds", () => {
    expect(getRemainingWallpaperLoadBudget(1_000, 4_000)).toBe(7_000);
    expect(getRemainingWallpaperLoadBudget(1_000, 11_001)).toBe(0);
    expect(WALLPAPER_LOAD_BUDGET_MS).toBe(10_000);
  });

  it("never gives one attempt more time than remains", () => {
    expect(capWallpaperAttemptBudget(9_000, 4_000)).toBe(4_000);
    expect(capWallpaperAttemptBudget(1_500, 4_000)).toBe(1_500);
    expect(capWallpaperAttemptBudget(-1, 4_000)).toBe(0);
  });
});
