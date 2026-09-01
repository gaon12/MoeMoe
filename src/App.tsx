import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Clock } from "./components/Clock/Clock.tsx";
import {
  ImageBackground,
  type ImageBackgroundHandle,
} from "./components/ImageBackground/ImageBackground.tsx";
import { RefreshButton } from "./components/RefreshButton/RefreshButton.tsx";
import { DownloadButton } from "./components/DownloadButton/DownloadButton.tsx";
import { SettingsButton } from "./components/SettingsButton/SettingsButton.tsx";
import { FullscreenButton } from "./components/FullscreenButton/FullscreenButton.tsx";
import { AutoRefreshIndicator } from "./components/AutoRefreshIndicator/AutoRefreshIndicator.tsx";
import type { AnimeImage } from "./types/image.ts";
import { useApp } from "./contexts/useApp.ts";
import { useSyncedTime } from "./hooks/useSyncedTime.ts";
import { WidgetDock } from "./components/WidgetDock/WidgetDock.tsx";
import { SpotlightActions } from "./components/SpotlightActions/SpotlightActions.tsx";
import { useWallpaperLibrary } from "./hooks/useWallpaperLibrary.ts";
import { useWallpaperHistory } from "./hooks/useWallpaperHistory.ts";
import { HistoryNav } from "./components/HistoryNav/HistoryNav.tsx";
import {
  resolveGlobalShortcut,
  shouldIgnoreGlobalShortcut,
} from "./utils/keyboardShortcuts.ts";
import "./App.css";

const IMAGE_CHANGE_COOLDOWN_MS = 5000;
const SETTINGS_PRELOAD_DELAY_MS = 2000;
const MILLISECONDS_PER_SECOND = 1000;

const importSettingsModal = () =>
  import("./components/SettingsModal/SettingsModal.tsx");

/**
 * The settings UI and its five tab modules are the largest thing in the tree
 * and nothing renders them until the user asks, so they load on demand.
 */
const SettingsModal = lazy(async () => ({
  default: (await importSettingsModal()).SettingsModal,
}));

interface TimerRef {
  current: ReturnType<typeof setTimeout> | null;
}

const clearTimer = (timerRef: TimerRef) => {
  if (timerRef.current !== null) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }
};

export function App() {
  const { settings, isSettingsOpen, setIsSettingsOpen } = useApp();
  const [isLoadingImage, setIsLoadingImage] = useState(true);
  const [currentImage, setCurrentImage] = useState<AnimeImage | null>(null);
  const [lastImageAttemptTime, setLastImageAttemptTime] = useState<number>(0);
  const [isAutoRefreshPaused, setIsAutoRefreshPaused] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [isImageChangePending, setIsImageChangePending] = useState(false);
  const autoRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const imageBackgroundRef = useRef<ImageBackgroundHandle | null>(null);
  const pendingImageChangeTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const currentTime = useSyncedTime(
    settings.useServerTime,
    settings.serverTimeUpdateIntervalSec,
  );
  const {
    favorites,
    blockedUrls,
    feedback,
    isFavorite,
    toggleFavorite,
    removeFavorite,
    blockWallpaper,
    resolveFavoriteUrl,
  } = useWallpaperLibrary();
  const {
    canGoBack,
    canGoForward,
    push: recordWallpaper,
    goBack,
    goForward,
  } = useWallpaperHistory();

  const performImageChange = useCallback(() => {
    clearTimer(pendingImageChangeTimerRef);
    setIsImageChangePending(false);
    setIsLoadingImage(true);
    clearTimer(autoRefreshTimerRef);
    imageBackgroundRef.current?.refresh();
  }, []);

  const requestImageChange = useCallback(
    (deferDuringCooldown = false) => {
      if (isLoadingImage || isImageChangePending) {
        return false;
      }
      const elapsed = Date.now() - lastImageAttemptTime;
      const remaining =
        lastImageAttemptTime > 0
          ? Math.max(0, IMAGE_CHANGE_COOLDOWN_MS - elapsed)
          : 0;
      if (remaining > 0) {
        if (deferDuringCooldown) {
          setIsImageChangePending(true);
          pendingImageChangeTimerRef.current = setTimeout(
            performImageChange,
            remaining,
          );
        }
        return false;
      }
      performImageChange();
      return true;
    },
    [
      isImageChangePending,
      isLoadingImage,
      lastImageAttemptTime,
      performImageChange,
    ],
  );

  const handleRefresh = useCallback(() => {
    requestImageChange(false);
  }, [requestImageChange]);

  const scheduleAutoRefresh = useCallback(() => {
    // Clear existing timer
    clearTimer(autoRefreshTimerRef);

    // Schedule new auto-refresh if interval is set and not paused
    if (settings.imageChangeInterval > 0 && !isAutoRefreshPaused) {
      autoRefreshTimerRef.current = setTimeout(() => {
        handleRefresh();
      }, settings.imageChangeInterval * MILLISECONDS_PER_SECOND);
    }
  }, [settings.imageChangeInterval, isAutoRefreshPaused, handleRefresh]);

  const handleImageLoad = useCallback(
    (image: AnimeImage) => {
      setCurrentImage(image);
      setIsLoadingImage(false);
      setIsImageChangePending(false);
      setLastImageAttemptTime(Date.now());
      // Re-recording the entry the user just navigated to is a no-op, so this
      // one callback serves both fresh loads and history navigation.
      recordWallpaper(image);
    },
    [recordWallpaper],
  );

  const handleImageError = useCallback(() => {
    setIsLoadingImage(false);
    setIsImageChangePending(false);
    // Anchor the next automatic attempt even when the first provider request
    // fails, so an enabled refresh interval can recover without user input.
    setLastImageAttemptTime(Date.now());
  }, []);

  const navigateHistory = useCallback((target: AnimeImage | null) => {
    if (!target) {
      return;
    }
    // A deliberate navigation supersedes any pending or scheduled change.
    clearTimer(pendingImageChangeTimerRef);
    clearTimer(autoRefreshTimerRef);
    setIsImageChangePending(false);
    setIsLoadingImage(false);
    imageBackgroundRef.current?.showImage(target);
  }, []);

  const handleHistoryBack = useCallback(() => {
    navigateHistory(goBack());
  }, [goBack, navigateHistory]);

  const handleHistoryForward = useCallback(() => {
    navigateHistory(goForward());
  }, [goForward, navigateHistory]);

  const handleApplyFavorite = useCallback((image: AnimeImage) => {
    // Applying a favourite is a navigation like any other, so it cancels
    // pending work and is recorded in history via the load callback.
    clearTimer(pendingImageChangeTimerRef);
    clearTimer(autoRefreshTimerRef);
    setIsImageChangePending(false);
    setIsLoadingImage(false);
    imageBackgroundRef.current?.showImage(image);
  }, []);

  const handleDismissWallpaper = useCallback(
    (image: AnimeImage) => {
      if (image.isLocal) {
        return;
      }
      blockWallpaper(image);
      requestImageChange(true);
    },
    [blockWallpaper, requestImageChange],
  );

  // Cleanup timer on unmount or interval change
  useEffect(
    () => () => {
      clearTimer(autoRefreshTimerRef);
      clearTimer(pendingImageChangeTimerRef);
    },
    [],
  );

  // Re-schedule when interval setting changes
  useEffect(() => {
    if (lastImageAttemptTime > 0) {
      scheduleAutoRefresh();
    }
  }, [settings.imageChangeInterval, scheduleAutoRefresh, lastImageAttemptTime]);

  const toggleAutoRefreshPause = useCallback(() => {
    setIsAutoRefreshPaused((prev) => !prev);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === "undefined") {
      return;
    }
    if (isPseudoFullscreen) {
      setIsPseudoFullscreen(false);
      return;
    }
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => setIsPseudoFullscreen(false));
      return;
    }
    document.documentElement
      .requestFullscreen()
      .catch(() => setIsPseudoFullscreen(true));
  }, [isPseudoFullscreen]);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "pseudo-fullscreen-root",
      isPseudoFullscreen,
    );
    document.body.classList.toggle(
      "pseudo-fullscreen-root",
      isPseudoFullscreen,
    );

    return () => {
      document.documentElement.classList.remove("pseudo-fullscreen-root");
      document.body.classList.remove("pseudo-fullscreen-root");
    };
  }, [isPseudoFullscreen]);

  // Warm the settings chunk once the browser is idle, so the first press of
  // the settings button never waits on a network round trip.
  useEffect(() => {
    const preload = () => {
      importSettingsModal().catch(() => undefined);
    };

    if (typeof requestIdleCallback === "function") {
      const handle = requestIdleCallback(preload);
      return () => cancelIdleCallback(handle);
    }

    const timer = setTimeout(preload, SETTINGS_PRELOAD_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreGlobalShortcut(event, isSettingsOpen)) {
        return;
      }

      const shortcut = resolveGlobalShortcut(event);
      if (!shortcut) {
        return;
      }

      if (shortcut === "togglePause" && settings.imageChangeInterval <= 0) {
        return;
      }

      event.preventDefault();

      switch (shortcut) {
        case "refresh":
          handleRefresh();
          break;
        case "fullscreen":
          toggleFullscreen();
          break;
        case "togglePause":
          toggleAutoRefreshPause();
          break;
        case "openSettings":
          setIsSettingsOpen(true);
          break;
        case "historyBack":
          handleHistoryBack();
          break;
        case "historyForward":
          handleHistoryForward();
          break;
        default:
          break;
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);

    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    handleRefresh,
    toggleFullscreen,
    setIsSettingsOpen,
    settings.imageChangeInterval,
    toggleAutoRefreshPause,
    isSettingsOpen,
    handleHistoryBack,
    handleHistoryForward,
  ]);

  return (
    <div className={`app ${isPseudoFullscreen ? "pseudo-fullscreen" : ""}`}>
      <ImageBackground
        ref={imageBackgroundRef}
        imageSources={settings.imageSources}
        allowNSFW={settings.allowNSFW}
        imageFitMode={settings.imageFitMode}
        imageAspectPreference={settings.imageAspectPreference}
        letterboxFillMode={settings.letterboxFillMode}
        letterboxCustomColor={settings.letterboxCustomColor}
        onImageLoad={handleImageLoad}
        onImageError={handleImageError}
        excludedUrls={blockedUrls}
        feedback={feedback}
      />
      {settings.uiVisibility.clock ? (
        <div className="content">
          <Clock currentTime={currentTime} />
        </div>
      ) : null}

      <div
        className="control-dock"
        role="toolbar"
        aria-label="Wallpaper controls"
      >
        <SettingsButton />
        {settings.uiVisibility.fullscreenButton ? (
          <FullscreenButton
            onToggle={toggleFullscreen}
            isPseudoFullscreen={isPseudoFullscreen}
          />
        ) : null}
        {settings.uiVisibility.downloadButton ? (
          <DownloadButton
            imageUrl={currentImage?.url || null}
            fallbackImageUrl={currentImage?.proxiedUrl || null}
            imageName={currentImage?.animeName || "anime-image"}
          />
        ) : null}
        {settings.uiVisibility.historyNav ? (
          <HistoryNav
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            onBack={handleHistoryBack}
            onForward={handleHistoryForward}
          />
        ) : null}
        {settings.uiVisibility.refreshButton ? (
          <RefreshButton
            onRefresh={handleRefresh}
            isLoading={isLoadingImage}
            lastRefreshTime={lastImageAttemptTime}
          />
        ) : null}
        {settings.uiVisibility.wallpaperActions ? (
          <SpotlightActions
            currentImage={currentImage}
            favorites={favorites}
            isFavorite={!currentImage?.isLocal && isFavorite(currentImage?.url)}
            onToggleFavorite={toggleFavorite}
            onRemoveFavorite={removeFavorite}
            onDismiss={handleDismissWallpaper}
            isChangePending={isImageChangePending}
            resolveFavoriteUrl={resolveFavoriteUrl}
            onApplyFavorite={handleApplyFavorite}
            favoriteClickAction={settings.favoriteClickAction}
          />
        ) : null}
      </div>
      {settings.uiVisibility.autoRefreshIndicator &&
      settings.imageChangeInterval > 0 ? (
        <AutoRefreshIndicator
          intervalSeconds={settings.imageChangeInterval}
          lastRefreshTime={lastImageAttemptTime}
          isPaused={isAutoRefreshPaused}
          isLoading={isLoadingImage}
          onTogglePause={toggleAutoRefreshPause}
        />
      ) : null}
      {settings.uiVisibility.widgets ? (
        <WidgetDock currentTime={currentTime} />
      ) : null}
      {isSettingsOpen ? (
        <Suspense fallback={null}>
          <SettingsModal />
        </Suspense>
      ) : null}
    </div>
  );
}
