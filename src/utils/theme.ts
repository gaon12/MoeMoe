import type { ThemeMode } from "../types/settings";

export type ResolvedTheme = Exclude<ThemeMode, "auto">;

export const THEME_COLORS: Record<ResolvedTheme, string> = {
  dark: "#1a1a1a",
  light: "#ffffff",
};

export function resolveTheme(
  theme: ThemeMode,
  prefersDark: boolean,
): ResolvedTheme {
  return theme === "auto" ? (prefersDark ? "dark" : "light") : theme;
}
