// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RefreshButton } from "./RefreshButton";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { seconds?: number }) =>
      options?.seconds == null ? key : `${key}:${options.seconds}`,
  }),
}));

describe("RefreshButton", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-11T00:00:10.000Z"));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("is disabled immediately during cooldown and unlocks when it expires", () => {
    render(
      <RefreshButton
        onRefresh={vi.fn()}
        lastRefreshTime={Date.now() - 2_000}
        cooldownSeconds={5}
      />,
    );

    const button = screen.getByRole<HTMLButtonElement>("button", {
      name: "buttons.refreshImage",
    });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.textContent).toContain("3");

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.textContent).toContain("buttons.refreshCooldown:3");
    expect(button.hasAttribute("title")).toBe(false);

    act(() => vi.advanceTimersByTime(1_100));
    expect(screen.getByRole("tooltip")).toBe(tooltip);
    expect(tooltip.textContent).toContain("buttons.refreshCooldown:2");

    act(() => vi.advanceTimersByTime(3_100));
    expect(button.getAttribute("aria-disabled")).toBe("false");
    expect(tooltip.textContent).toContain("buttons.refreshShortcut");
  });

  it("does not start a polling timer when no cooldown is active", () => {
    render(<RefreshButton onRefresh={vi.fn()} />);

    expect(vi.getTimerCount()).toBe(0);
  });
});
