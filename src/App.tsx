import { useCallback, useEffect, useRef, useState } from "react";
import { Clock } from "./components/Clock/Clock.tsx";
import {
  ImageBackground,
  type ImageBackgroundHandle,
} from "./components/ImageBackground/ImageBackground.tsx";
import { RefreshButton } from "./components/RefreshButton/RefreshButton.tsx";
import { DownloadButton } from "./components/DownloadButton/DownloadButton.tsx";
import { SettingsButton } from "./components/SettingsButton/SettingsButton.tsx";
import { SettingsModal } from "./components/SettingsModal/SettingsModal.tsx";
import { FullscreenButton } from "./components/FullscreenButton/FullscreenButton.tsx";
import { AutoRefreshIndicator } from "./components/AutoRefreshIndicator/AutoRefreshIndicator.tsx";
import type { AnimeImage } from "./types/image.ts";
import { useApp } from "./contexts/useApp.ts";
import { useSyncedTime } from "./hooks/useSyncedTime.ts";
import { WidgetDock } from "./components/WidgetDock/WidgetDock.tsx";
import { SpotlightActions } from "./components/SpotlightActions/SpotlightActions.tsx";
import { useWallpaperLibrary } from "./hooks/useWallpaperLibrary.ts";
import { shouldIgnoreGlobalShortcut } from "./utils/keyboardShortcuts.ts";
import "./App.css";

const IMAGE_CHANGE_COOLDOWN_MS = 5000;
const MILLISECONDS_PER_SECOND = 1000;

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
  } = useWallpaperLibrary();

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

  const handleImageLoad = useCallback((image: AnimeImage) => {
    setCurrentImage(image);
    setIsLoadingImage(false);
    setIsImageChangePending(false);
    setLastImageAttemptTime(Date.now());
  }, []);

  const handleImageError = useCallback(() => {
    setIsLoadingImage(false);
    setIsImageChangePending(false);
    // Anchor the next automatic attempt even when the first provider request
    // fails, so an enabled refresh interval can recover without user input.
    setLastImageAttemptTime(Date.now());
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreGlobalShortcut(event, isSettingsOpen)) {
        return;
      }

      // R key or Space key to refresh
      if (event.key === "r" || event.key === "R" || event.key === " ") {
        event.preventDefault();
        handleRefresh();
      }

      // F key to toggle fullscreen
      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        toggleFullscreen();
      }

      // P key to toggle auto-refresh pause
      if (
        (event.key === "p" || event.key === "P") &&
        settings.imageChangeInterval > 0
      ) {
        event.preventDefault();
        toggleAutoRefreshPause();
      }

      // S key to open settings
      if (event.key === "s" || event.key === "S") {
        event.preventDefault();
        setIsSettingsOpen(true);
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
      <SettingsModal />
    </div>
  );
}
