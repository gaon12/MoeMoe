import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock } from './components/Clock/Clock';
import {
  ImageBackground,
  type ImageBackgroundHandle,
} from './components/ImageBackground/ImageBackground';
import { RefreshButton } from './components/RefreshButton/RefreshButton';
import { DownloadButton } from './components/DownloadButton/DownloadButton';
import { SettingsButton } from './components/SettingsButton/SettingsButton';
import { SettingsModal } from './components/SettingsModal/SettingsModal';
import { FullscreenButton } from './components/FullscreenButton/FullscreenButton';
import { type AnimeImage } from './types/image';
import { useApp } from './contexts/AppContext';
import './App.css';

function App() {
  const { t } = useTranslation();
  const { settings, setIsSettingsOpen } = useApp();
  const [isLoadingImage, setIsLoadingImage] = useState(true);
  const [currentImage, setCurrentImage] = useState<AnimeImage | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const autoRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageBackgroundRef = useRef<ImageBackgroundHandle | null>(null);

  const scheduleAutoRefresh = useCallback(() => {
    // Clear existing timer
    if (autoRefreshTimerRef.current) {
      clearTimeout(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
    }

    // Schedule new auto-refresh if interval is set
    if (settings.imageChangeInterval > 0) {
      autoRefreshTimerRef.current = setTimeout(() => {
        handleRefresh();
      }, settings.imageChangeInterval * 1000);
    }
  }, [settings.imageChangeInterval]);

  const handleImageLoad = useCallback((image: AnimeImage) => {
    console.log('Image loaded successfully:', image);
    setCurrentImage(image);
    setIsLoadingImage(false);
    // Update lastRefreshTime when image loading is complete
    setLastRefreshTime(Date.now());
    // Schedule next auto-refresh after transition complete
    scheduleAutoRefresh();
  }, [scheduleAutoRefresh]);

  const handleImageError = useCallback((error: Error) => {
    console.error('Image load error:', error);
    setIsLoadingImage(false);
  }, []);

  const handleRefresh = useCallback(() => {
    const now = Date.now();
    const timeSinceLastRefresh = (now - lastRefreshTime) / 1000;
    const cooldownSeconds = 5;

    // Check if cooldown is still active
    if (timeSinceLastRefresh < cooldownSeconds && lastRefreshTime > 0) {
      console.log(`Please wait ${Math.ceil(cooldownSeconds - timeSinceLastRefresh)}s before refreshing`);
      return;
    }

    setIsLoadingImage(true);
    // Clear auto-refresh timer when manually refreshing
    if (autoRefreshTimerRef.current) {
      clearTimeout(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
    }
    imageBackgroundRef.current?.refresh();
  }, [lastRefreshTime]);

  // Cleanup timer on unmount or interval change
  useEffect(() => {
    return () => {
      if (autoRefreshTimerRef.current) {
        clearTimeout(autoRefreshTimerRef.current);
      }
    };
  }, []);

  // Re-schedule when interval setting changes
  useEffect(() => {
    if (lastRefreshTime > 0) {
      scheduleAutoRefresh();
    }
  }, [settings.imageChangeInterval, scheduleAutoRefresh, lastRefreshTime]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Failed to enter fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

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
      if (event.key === 'r' || event.key === 'R' || event.key === ' ') {
        event.preventDefault();
        handleRefresh();
      }

	      // F key to toggle fullscreen
  	      if (event.key === 'f' || event.key === 'F') {
  	        event.preventDefault();
  	        toggleFullscreen();
      }

      // S key to open settings
      if (event.key === 's' || event.key === 'S') {
        event.preventDefault();
        setIsSettingsOpen(true);
      }
    };

	    window.addEventListener('keydown', handleKeyDown);

	    return () => {
	      window.removeEventListener('keydown', handleKeyDown);
	    };
	  }, [handleRefresh, toggleFullscreen, setIsSettingsOpen]);

  return (
    <div className="app">
      <ImageBackground
        ref={imageBackgroundRef}
        imageSources={settings.imageSources}
        allowNSFW={settings.allowNSFW}
        imageFitMode={settings.imageFitMode}
        letterboxFillMode={settings.letterboxFillMode}
        letterboxCustomColor={settings.letterboxCustomColor}
        onImageLoad={handleImageLoad}
        onImageError={handleImageError}
      />
      <div className="content">
        <Clock />
        {currentImage && currentImage.animeName && (
          <div className="image-info">
            <p className="anime-name">{currentImage.animeName}</p>
          </div>
        )}
      </div>

	      <SettingsButton />
	      <FullscreenButton onToggle={toggleFullscreen} />
	      <RefreshButton
	        onRefresh={handleRefresh}
        isLoading={isLoadingImage}
        lastRefreshTime={lastRefreshTime}
      />
      <DownloadButton
        imageUrl={currentImage?.url || null}
        imageName={currentImage?.animeName || 'anime-image'}
      />
      <SettingsModal />

      <div className="keyboard-hints">
        <span>{t('keyboard.refresh')}</span>
        <span>•</span>
        <span>{t('keyboard.fullscreen')}</span>
        <span>•</span>
        <span>{t('keyboard.settings')}</span>
      </div>
    </div>
  );
}

export default App;
