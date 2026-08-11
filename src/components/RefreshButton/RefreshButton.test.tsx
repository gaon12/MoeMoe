// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RefreshButton } from "./RefreshButton";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
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
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain("3");

    act(() => vi.advanceTimersByTime(3_100));
    expect(button.disabled).toBe(false);
  });
});
