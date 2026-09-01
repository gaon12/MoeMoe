// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SpotlightActions } from "./SpotlightActions.tsx";

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
        isChangePending={true}
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
        isFavorite={true}
        onToggleFavorite={vi.fn()}
        onRemoveFavorite={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "spotlight.gallery" }));

    const dialog = screen.getByRole("dialog");
    const titleId = dialog.getAttribute("aria-labelledby");
    expect(titleId).toBeTruthy();
    expect(document.getElementById(titleId ?? "")?.textContent).toBe(
      "spotlight.gallery",
    );
    expect(screen.getByAltText("Current wallpaper")).toBeTruthy();
  });

  it("closes the gallery through the accessible backdrop button", () => {
    render(
      <SpotlightActions
        currentImage={currentImage}
        favorites={[currentImage]}
        isFavorite={true}
        onToggleFavorite={vi.fn()}
        onRemoveFavorite={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "spotlight.gallery" }));
    const closeButtons = screen.getAllByRole("button", {
      name: "spotlight.close",
    });
    fireEvent.click(closeButtons[0]);

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
