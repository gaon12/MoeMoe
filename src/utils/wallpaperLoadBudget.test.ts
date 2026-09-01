import { describe, expect, it } from "vitest";
import {
  capWallpaperAttemptBudget,
  getRemainingWallpaperLoadBudget,
  WALLPAPER_LOAD_BUDGET_MS,
} from "./wallpaperLoadBudget.ts";

const SEQUENCE_START_MS = 1000;
const FOUR_SECONDS_MS = 4000;
const SEVEN_SECONDS_MS = 7000;
const AFTER_BUDGET_DEADLINE_MS = 11_001;
const NINE_SECONDS_MS = 9000;
const ONE_AND_HALF_SECONDS_MS = 1500;
const PAST_DEADLINE_MS = -1;
const EXPECTED_LOAD_BUDGET_MS = 10_000;

describe("wallpaper load budget", () => {
  it("caps the complete loading sequence at ten seconds", () => {
    expect(
      getRemainingWallpaperLoadBudget(SEQUENCE_START_MS, FOUR_SECONDS_MS),
    ).toBe(SEVEN_SECONDS_MS);
    expect(
      getRemainingWallpaperLoadBudget(
        SEQUENCE_START_MS,
        AFTER_BUDGET_DEADLINE_MS,
      ),
    ).toBe(0);
    expect(WALLPAPER_LOAD_BUDGET_MS).toBe(EXPECTED_LOAD_BUDGET_MS);
  });

  it("never gives one attempt more time than remains", () => {
    expect(capWallpaperAttemptBudget(NINE_SECONDS_MS, FOUR_SECONDS_MS)).toBe(
      FOUR_SECONDS_MS,
    );
    expect(
      capWallpaperAttemptBudget(ONE_AND_HALF_SECONDS_MS, FOUR_SECONDS_MS),
    ).toBe(ONE_AND_HALF_SECONDS_MS);
    expect(capWallpaperAttemptBudget(PAST_DEADLINE_MS, FOUR_SECONDS_MS)).toBe(
      0,
    );
  });
});
