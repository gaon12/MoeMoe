// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const AUTO_REFRESH_INTERVAL_SECONDS = 30;
const ALMOST_ONE_REFRESH_INTERVAL_MS = 29_999;
const FINAL_INTERVAL_MILLISECOND = 1;
const ONE_MINUTE_MS = 60_000;

const mocks = vi.hoisted(() => ({
  imageChangeInterval: 0,
  refresh: vi.fn(),
  showImage: vi.fn(),
  loadCount: 0,
  setIsSettingsOpen: vi.fn(),
  uiVisibility: {
    clock: true,
    widgets: true,
    autoRefreshIndicator: true,
    fullscreenButton: true,
    downloadButton: true,
    refreshButton: true,
    wallpaperActions: true,
    historyNav: true,
  },
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
      uiVisibility: mocks.uiVisibility,
    },
    isSettingsOpen: false,
    setIsSettingsOpen: mocks.setIsSettingsOpen,
  }),
}));

vi.mock("./components/ImageBackground/ImageBackground", async () => {
  const React = await import("react");
  return {
    ImageBackground: React.forwardRef<
      { refresh: () => void; showImage: (image: { url: string }) => void },
      {
        onImageError?: (error: Error) => void;
        onImageLoad?: (image: { url: string }) => void;
      }
    >(({ onImageError, onImageLoad }, ref) => {
      React.useImperativeHandle(ref, () => ({
        refresh: mocks.refresh,
        showImage: mocks.showImage,
      }));
      const handleFailure = React.useCallback(
        () => onImageError?.(new Error("provider failed")),
        [onImageError],
      );
      const handleLoad = React.useCallback(() => {
        mocks.loadCount += 1;
        onImageLoad?.({ url: `https://example.test/${mocks.loadCount}.webp` });
      }, [onImageLoad]);
      return (
        <>
          <button type="button" onClick={handleFailure}>
            {"Fail image"}
          </button>
          <button type="button" onClick={handleLoad}>
            {"Load image"}
          </button>
        </>
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

vi.mock("./components/Clock/Clock", () => ({
  Clock: () => <div data-testid="clock" />,
}));
vi.mock("./components/RefreshButton/RefreshButton", () => ({
  RefreshButton: () => <div data-testid="refresh-button" />,
}));
vi.mock("./components/DownloadButton/DownloadButton", () => ({
  DownloadButton: () => <div data-testid="download-button" />,
}));
vi.mock("./components/SettingsButton/SettingsButton", () => ({
  SettingsButton: () => <div data-testid="settings-button" />,
}));
vi.mock("./components/SettingsModal/SettingsModal", () => ({
  SettingsModal: () => null,
}));
vi.mock("./components/FullscreenButton/FullscreenButton", () => ({
  FullscreenButton: () => <div data-testid="fullscreen-button" />,
}));
vi.mock("./components/AutoRefreshIndicator/AutoRefreshIndicator", () => ({
  AutoRefreshIndicator: () => <div data-testid="auto-refresh-indicator" />,
}));
vi.mock("./components/WidgetDock/WidgetDock", () => ({
  WidgetDock: () => <div data-testid="widget-dock" />,
}));
vi.mock("./components/SpotlightActions/SpotlightActions", () => ({
  SpotlightActions: () => <div data-testid="wallpaper-actions" />,
}));
vi.mock("./components/HistoryNav/HistoryNav", () => ({
  HistoryNav: ({
    canGoBack,
    canGoForward,
    onBack,
    onForward,
  }: {
    canGoBack: boolean;
    canGoForward: boolean;
    onBack: () => void;
    onForward: () => void;
  }) => (
    <div data-testid="history-nav">
      <button
        type="button"
        data-testid="history-back"
        disabled={!canGoBack}
        onClick={onBack}
      />
      <button
        type="button"
        data-testid="history-forward"
        disabled={!canGoForward}
        onClick={onForward}
      />
    </div>
  ),
}));

import { App } from "./App.tsx";

describe("App image recovery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.imageChangeInterval = AUTO_REFRESH_INTERVAL_SECONDS;
    mocks.refresh.mockReset();
    mocks.showImage.mockReset();
    mocks.loadCount = 0;
    Object.assign(mocks.uiVisibility, {
      clock: true,
      widgets: true,
      autoRefreshIndicator: true,
      fullscreenButton: true,
      downloadButton: true,
      refreshButton: true,
      wallpaperActions: true,
      historyNav: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("retries after the configured interval when the initial image fails", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Fail image" }));

    act(() => vi.advanceTimersByTime(ALMOST_ONE_REFRESH_INTERVAL_MS));
    expect(mocks.refresh).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(FINAL_INTERVAL_MILLISECOND));
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("does not retry when automatic image changes are disabled", () => {
    mocks.imageChangeInterval = 0;
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Fail image" }));

    act(() => vi.advanceTimersByTime(ONE_MINUTE_MS));
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("hides every optional interface element while keeping settings visible", () => {
    Object.assign(mocks.uiVisibility, {
      clock: false,
      widgets: false,
      autoRefreshIndicator: false,
      fullscreenButton: false,
      downloadButton: false,
      refreshButton: false,
      wallpaperActions: false,
      historyNav: false,
    });

    render(<App />);

    expect(screen.getByTestId("settings-button")).not.toBeNull();
    expect(screen.queryByTestId("clock")).toBeNull();
    expect(screen.queryByTestId("widget-dock")).toBeNull();
    expect(screen.queryByTestId("auto-refresh-indicator")).toBeNull();
    expect(screen.queryByTestId("fullscreen-button")).toBeNull();
    expect(screen.queryByTestId("download-button")).toBeNull();
    expect(screen.queryByTestId("refresh-button")).toBeNull();
    expect(screen.queryByTestId("wallpaper-actions")).toBeNull();
    expect(screen.queryByTestId("history-nav")).toBeNull();
  });
});

describe("App wallpaper history", () => {
  beforeEach(() => {
    mocks.imageChangeInterval = 0;
    mocks.refresh.mockReset();
    mocks.showImage.mockReset();
    mocks.loadCount = 0;
    Object.assign(mocks.uiVisibility, {
      clock: true,
      widgets: true,
      autoRefreshIndicator: true,
      fullscreenButton: true,
      downloadButton: true,
      refreshButton: true,
      wallpaperActions: true,
      historyNav: true,
    });
  });

  afterEach(cleanup);

  const loadImages = (count: number) => {
    const load = screen.getByRole("button", { name: "Load image" });
    for (let index = 0; index < count; index += 1) {
      fireEvent.click(load);
    }
  };

  it("walks backwards through the images that were shown", () => {
    render(<App />);
    loadImages(3);

    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(mocks.showImage).toHaveBeenLastCalledWith({
      url: "https://example.test/2.webp",
    });

    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(mocks.showImage).toHaveBeenLastCalledWith({
      url: "https://example.test/1.webp",
    });
  });

  it("walks forward again after going back", () => {
    render(<App />);
    loadImages(3);

    fireEvent.keyDown(document, { key: "ArrowLeft" });
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    fireEvent.keyDown(document, { key: "ArrowRight" });

    expect(mocks.showImage).toHaveBeenLastCalledWith({
      url: "https://example.test/2.webp",
    });
  });

  it("does nothing at either end of the history", () => {
    render(<App />);
    loadImages(1);

    fireEvent.keyDown(document, { key: "ArrowLeft" });
    fireEvent.keyDown(document, { key: "ArrowRight" });

    expect(mocks.showImage).not.toHaveBeenCalled();
  });

  it("disables each direction until there is somewhere to go", () => {
    render(<App />);

    const back = screen.getByTestId("history-back") as HTMLButtonElement;
    const forward = screen.getByTestId("history-forward") as HTMLButtonElement;
    expect(back.disabled).toBe(true);
    expect(forward.disabled).toBe(true);

    loadImages(2);
    expect(back.disabled).toBe(false);
    expect(forward.disabled).toBe(true);

    fireEvent.click(back);
    expect(mocks.showImage).toHaveBeenLastCalledWith({
      url: "https://example.test/1.webp",
    });
    expect(forward.disabled).toBe(false);
  });

  it("keeps the history cursor when the same image is reported again", () => {
    render(<App />);
    loadImages(2);

    // Navigating makes the real background re-report the image it moved to.
    // That must not be recorded as a new entry, or back would never advance.
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(mocks.showImage).toHaveBeenLastCalledWith({
      url: "https://example.test/1.webp",
    });

    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(mocks.showImage).toHaveBeenCalledOnce();
  });
});
