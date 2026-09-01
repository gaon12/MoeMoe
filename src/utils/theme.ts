import type { ThemeMode } from "../types/settings.ts";

export type ResolvedTheme = Exclude<ThemeMode, "auto">;

export const THEME_COLORS: Record<ResolvedTheme, string> = {
  dark: "#1a1a1a",
  light: "#ffffff",
};

export function resolveTheme(
  theme: ThemeMode,
  prefersDark: boolean,
): ResolvedTheme {
  if (theme !== "auto") {
    return theme;
  }
  return prefersDark ? "dark" : "light";
}
