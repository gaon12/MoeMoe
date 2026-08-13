// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  imageChangeInterval: 30,
  refresh: vi.fn(),
  setIsSettingsOpen: vi.fn(),
}));

vi.mock("./contexts/useApp", () => ({
  useApp: () => ({
    settings: {
      imageSources: ["pic_re"],
      allowNSFW: false,
      imageFitMode: "contain",
      imageAspectPreference: "screen",
      letterboxFillMode: "blur",
      letterboxCustomColor: "#1a1a1a",
      imageChangeInterval: mocks.imageChangeInterval,
      useServerTime: false,
      serverTimeUpdateIntervalSec: 60,
    },
    isSettingsOpen: false,
    setIsSettingsOpen: mocks.setIsSettingsOpen,
  }),
}));

vi.mock("./components/ImageBackground/ImageBackground", async () => {
  const React = await import("react");
  return {
    ImageBackground: React.forwardRef<
      { refresh: () => void },
      { onImageError?: (error: Error) => void }
    >((props, ref) => {
      React.useImperativeHandle(ref, () => ({ refresh: mocks.refresh }));
      return (
        <button
          type="button"
          onClick={() => props.onImageError?.(new Error("provider failed"))}
        >
          Fail image
        </button>
      );
    }),
  };
});

vi.mock("./hooks/useSyncedTime", () => ({
  useSyncedTime: () => new Date(0),
}));

vi.mock("./hooks/useWallpaperLibrary", () => ({
  useWallpaperLibrary: () => ({
    favorites: [],
    blockedUrls: [],
    feedback: [],
    isFavorite: () => false,
    toggleFavorite: vi.fn(),
    removeFavorite: vi.fn(),
    blockWallpaper: vi.fn(),
  }),
}));

vi.mock("./components/Clock/Clock", () => ({ Clock: () => null }));
vi.mock("./components/RefreshButton/RefreshButton", () => ({
  RefreshButton: () => null,
}));
vi.mock("./components/DownloadButton/DownloadButton", () => ({
  DownloadButton: () => null,
}));
vi.mock("./components/SettingsButton/SettingsButton", () => ({
  SettingsButton: () => null,
}));
vi.mock("./components/SettingsModal/SettingsModal", () => ({
  SettingsModal: () => null,
}));
vi.mock("./components/FullscreenButton/FullscreenButton", () => ({
  FullscreenButton: () => null,
}));
vi.mock("./components/AutoRefreshIndicator/AutoRefreshIndicator", () => ({
  AutoRefreshIndicator: () => null,
}));
vi.mock("./components/WidgetDock/WidgetDock", () => ({
  WidgetDock: () => null,
}));
vi.mock("./components/SpotlightActions/SpotlightActions", () => ({
  SpotlightActions: () => null,
}));

import App from "./App";

describe("App image recovery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.imageChangeInterval = 30;
    mocks.refresh.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("retries after the configured interval when the initial image fails", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Fail image" }));

    act(() => vi.advanceTimersByTime(29_999));
    expect(mocks.refresh).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("does not retry when automatic image changes are disabled", () => {
    mocks.imageChangeInterval = 0;
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Fail image" }));

    act(() => vi.advanceTimersByTime(60_000));
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
