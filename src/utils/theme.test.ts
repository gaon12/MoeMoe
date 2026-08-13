import { describe, expect, it } from "vitest";
import { resolveTheme, THEME_COLORS } from "./theme";

describe("theme presentation", () => {
  it("resolves automatic themes from the system preference", () => {
    expect(resolveTheme("auto", true)).toBe("dark");
    expect(resolveTheme("auto", false)).toBe("light");
  });

  it("keeps explicit themes and exposes matching browser chrome colors", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
    expect(THEME_COLORS).toEqual({ dark: "#1a1a1a", light: "#ffffff" });
  });
});
