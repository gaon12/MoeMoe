import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './AutoRefreshIndicator.css';

interface AutoRefreshIndicatorProps {
  intervalSeconds: number;
  lastRefreshTime: number;
  isPaused: boolean;
  isLoading: boolean;
  onTogglePause: () => void;
}

export function AutoRefreshIndicator({
  intervalSeconds,
  lastRefreshTime,
  isPaused,
  isLoading,
  onTogglePause,
}: AutoRefreshIndicatorProps) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (intervalSeconds <= 0 || lastRefreshTime <= 0 || isPaused) {
      setTimeLeft(null);
      return;
    }

    const updateRemaining = () => {
      const elapsed = (Date.now() - lastRefreshTime) / 1000;
      const remaining = Math.max(0, intervalSeconds - elapsed);
      setTimeLeft(remaining);
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 500);
    return () => window.clearInterval(timer);
  }, [intervalSeconds, lastRefreshTime, isPaused]);

  const handleToggle = () => {
    if (intervalSeconds <= 0) return;
    onTogglePause();
  };

  let statusText: string;
  if (intervalSeconds <= 0) {
    statusText = t('autoRefresh.status.disabled');
  } else if (isPaused) {
    statusText = t('autoRefresh.status.paused');
  } else if (isLoading) {
    statusText = t('autoRefresh.status.refreshing');
  } else if (timeLeft != null) {
    statusText = t('autoRefresh.status.next', {
      seconds: Math.max(1, Math.ceil(timeLeft)),
    });
  } else {
    statusText = t('autoRefresh.status.waiting');
  }

  return (
    <div className="auto-refresh-indicator" role="status" aria-live="polite">
      <span className={`indicator-dot${intervalSeconds <= 0 ? ' disabled' : isPaused ? ' paused' : ''}`} />
      <span className="indicator-text">{statusText}</span>
      {intervalSeconds > 0 && (
        <button
          type="button"
          className="indicator-toggle"
          onClick={handleToggle}
        >
          {isPaused ? t('autoRefresh.actions.resume') : t('autoRefresh.actions.pause')}
        </button>
      )}
    </div>
  );
}
