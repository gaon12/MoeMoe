// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SpotlightActions } from "./SpotlightActions";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

const currentImage = {
  url: "https://images.example/current.jpg",
  source: "wallhaven" as const,
  animeName: "Current wallpaper",
};

describe("SpotlightActions", () => {
  it("sends explicit like and dislike feedback", () => {
    const onToggleFavorite = vi.fn();
    const onDismiss = vi.fn();
    render(
      <SpotlightActions
        currentImage={currentImage}
        favorites={[]}
        isFavorite={false}
        onToggleFavorite={onToggleFavorite}
        onRemoveFavorite={vi.fn()}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "spotlight.favorite" }));
    fireEvent.click(screen.getByRole("button", { name: "spotlight.notForMe" }));

    expect(onToggleFavorite).toHaveBeenCalledWith(currentImage);
    expect(onDismiss).toHaveBeenCalledWith(currentImage);
  });

  it("locks feedback while a cooldown-deferred image change is pending", () => {
    render(
      <SpotlightActions
        currentImage={currentImage}
        favorites={[]}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
        onRemoveFavorite={vi.fn()}
        onDismiss={vi.fn()}
        isChangePending
      />,
    );

    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: "spotlight.favorite",
      }).disabled,
    ).toBe(true);
    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: "spotlight.notForMe",
      }).disabled,
    ).toBe(true);
  });

  it("opens the saved wallpaper gallery in an accessible dialog", () => {
    render(
      <SpotlightActions
        currentImage={currentImage}
        favorites={[currentImage]}
        isFavorite
        onToggleFavorite={vi.fn()}
        onRemoveFavorite={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "spotlight.gallery" }));

    expect(screen.getByRole("dialog").getAttribute("aria-labelledby")).toBe(
      "spotlight-gallery-title",
    );
    expect(screen.getByAltText("Current wallpaper")).toBeTruthy();
  });
});
