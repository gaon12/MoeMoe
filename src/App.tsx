import { useState, useEffect, useCallback, useRef } from "react";
import { Clock } from "./components/Clock/Clock";
import {
  ImageBackground,
  type ImageBackgroundHandle,
} from "./components/ImageBackground/ImageBackground";
import { RefreshButton } from "./components/RefreshButton/RefreshButton";
import { DownloadButton } from "./components/DownloadButton/DownloadButton";
import { SettingsButton } from "./components/SettingsButton/SettingsButton";
import { SettingsModal } from "./components/SettingsModal/SettingsModal";
import { FullscreenButton } from "./components/FullscreenButton/FullscreenButton";
import { AutoRefreshIndicator } from "./components/AutoRefreshIndicator/AutoRefreshIndicator";
import { type AnimeImage } from "./types/image";
import { useApp } from "./contexts/useApp";
import { useSyncedTime } from "./hooks/useSyncedTime";
import { WidgetDock } from "./components/WidgetDock/WidgetDock";
import { SpotlightActions } from "./components/SpotlightActions/SpotlightActions";
import { useWallpaperLibrary } from "./hooks/useWallpaperLibrary";
import "./App.css";

const IMAGE_CHANGE_COOLDOWN_MS = 5_000;

function App() {
  const { settings, setIsSettingsOpen } = useApp();
  const [isLoadingImage, setIsLoadingImage] = useState(true);
  const [currentImage, setCurrentImage] = useState<AnimeImage | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
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
    if (pendingImageChangeTimerRef.current) {
      clearTimeout(pendingImageChangeTimerRef.current);
      pendingImageChangeTimerRef.current = null;
    }
    setIsImageChangePending(false);
    setIsLoadingImage(true);
    if (autoRefreshTimerRef.current) {
      clearTimeout(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
    }
    imageBackgroundRef.current?.refresh();
  }, []);

  const requestImageChange = useCallback(
    (deferDuringCooldown = false) => {
      if (isLoadingImage || isImageChangePending) return false;
      const elapsed = Date.now() - lastRefreshTime;
      const remaining =
        lastRefreshTime > 0
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
    [isImageChangePending, isLoadingImage, lastRefreshTime, performImageChange],
  );

  const handleRefresh = useCallback(() => {
    requestImageChange(false);
  }, [requestImageChange]);

  const scheduleAutoRefresh = useCallback(() => {
    // Clear existing timer
    if (autoRefreshTimerRef.current) {
      clearTimeout(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
    }

    // Schedule new auto-refresh if interval is set and not paused
    if (settings.imageChangeInterval > 0 && !isAutoRefreshPaused) {
      autoRefreshTimerRef.current = setTimeout(() => {
        handleRefresh();
      }, settings.imageChangeInterval * 1000);
    }
  }, [settings.imageChangeInterval, isAutoRefreshPaused, handleRefresh]);

  const handleImageLoad = useCallback((image: AnimeImage) => {
    setCurrentImage(image);
    setIsLoadingImage(false);
    setIsImageChangePending(false);
    // Update lastRefreshTime when image loading is complete
    setLastRefreshTime(Date.now());
  }, []);

  const handleImageError = useCallback(() => {
    setIsLoadingImage(false);
    setIsImageChangePending(false);
  }, []);

  const handleDismissWallpaper = useCallback(
    (image: AnimeImage) => {
      if (image.isLocal) return;
      blockWallpaper(image);
      requestImageChange(true);
    },
    [blockWallpaper, requestImageChange],
  );

  // Cleanup timer on unmount or interval change
  useEffect(() => {
    return () => {
      if (autoRefreshTimerRef.current) {
        clearTimeout(autoRefreshTimerRef.current);
      }
      if (pendingImageChangeTimerRef.current) {
        clearTimeout(pendingImageChangeTimerRef.current);
      }
    };
  }, []);

  // Re-schedule when interval setting changes
  useEffect(() => {
    if (lastRefreshTime > 0) {
      scheduleAutoRefresh();
    }
  }, [settings.imageChangeInterval, scheduleAutoRefresh, lastRefreshTime]);

  const toggleAutoRefreshPause = useCallback(() => {
    setIsAutoRefreshPaused((prev) => !prev);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === "undefined") return;

    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      mozFullScreenElement?: Element | null;
      msFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
      mozCancelFullScreen?: () => Promise<void> | void;
      msExitFullscreen?: () => Promise<void> | void;
    };

    const docElement = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
      mozRequestFullScreen?: () => Promise<void> | void;
      msRequestFullscreen?: () => Promise<void> | void;
    };

    const isFullscreenActive =
      !!doc.fullscreenElement ||
      !!doc.webkitFullscreenElement ||
      !!doc.mozFullScreenElement ||
      !!doc.msFullscreenElement;

    if (!isFullscreenActive && !isPseudoFullscreen) {
      const requestFullscreen =
        docElement.requestFullscreen ||
        docElement.webkitRequestFullscreen ||
        docElement.mozRequestFullScreen ||
        docElement.msRequestFullscreen;

      if (requestFullscreen) {
        try {
          const result = requestFullscreen.call(docElement);
          if (result && typeof (result as Promise<void>).catch === "function") {
            (result as Promise<void>).catch(() => {
              setIsPseudoFullscreen(true);
            });
          }
        } catch {
          setIsPseudoFullscreen(true);
        }
      } else {
        setIsPseudoFullscreen(true);
      }
    } else {
      if (isPseudoFullscreen) {
        setIsPseudoFullscreen(false);
        return;
      }

      const exitFullscreen =
        doc.exitFullscreen ||
        doc.webkitExitFullscreen ||
        doc.mozCancelFullScreen ||
        doc.msExitFullscreen;

      if (exitFullscreen) {
        try {
          const result = exitFullscreen.call(doc);
          if (result && typeof (result as Promise<void>).catch === "function") {
            (result as Promise<void>).catch(() => setIsPseudoFullscreen(false));
          }
        } catch {
          setIsPseudoFullscreen(false);
        }
      }
    }
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
      // Prevent actions if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
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
      if (event.key === "p" || event.key === "P") {
        if (settings.imageChangeInterval > 0) {
          event.preventDefault();
          toggleAutoRefreshPause();
        }
      }

      // S key to open settings
      if (event.key === "s" || event.key === "S") {
        event.preventDefault();
        setIsSettingsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    handleRefresh,
    toggleFullscreen,
    setIsSettingsOpen,
    settings.imageChangeInterval,
    toggleAutoRefreshPause,
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
      <div className="content">
        <Clock currentTime={currentTime} />
      </div>

      <div className="control-dock" aria-label="Wallpaper controls">
        <SettingsButton />
        <FullscreenButton
          onToggle={toggleFullscreen}
          isPseudoFullscreen={isPseudoFullscreen}
        />
        <DownloadButton
          imageUrl={currentImage?.url || null}
          imageName={currentImage?.animeName || "anime-image"}
        />
        <RefreshButton
          onRefresh={handleRefresh}
          isLoading={isLoadingImage}
          lastRefreshTime={lastRefreshTime}
        />
        <SpotlightActions
          currentImage={currentImage}
          favorites={favorites}
          isFavorite={!currentImage?.isLocal && isFavorite(currentImage?.url)}
          onToggleFavorite={toggleFavorite}
          onRemoveFavorite={removeFavorite}
          onDismiss={handleDismissWallpaper}
          isChangePending={isImageChangePending}
        />
      </div>
      {settings.imageChangeInterval > 0 && (
        <AutoRefreshIndicator
          intervalSeconds={settings.imageChangeInterval}
          lastRefreshTime={lastRefreshTime}
          isPaused={isAutoRefreshPaused}
          isLoading={isLoadingImage}
          onTogglePause={toggleAutoRefreshPause}
        />
      )}
      <WidgetDock currentTime={currentTime} />
      <SettingsModal />
    </div>
  );
}

export default App;
