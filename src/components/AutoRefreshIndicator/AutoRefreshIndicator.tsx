import { useState, useEffect, useCallback } from 'react';
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
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (intervalSeconds <= 0 || lastRefreshTime <= 0 || isPaused) {
      setTimeLeft(null);
      return;
    }

    const updateRemaining = () => {
      const now = Date.now();
      // 자동 새로고침이 꺼져 있거나, 오랫동안 꺼져 있다가
      // 다시 켜진 경우에는 다음 새로고침까지의 남은 시간을
      // "지금부터 intervalSeconds" 기준으로 계산해준다.
      const elapsedSinceLast = (now - lastRefreshTime) / 1000;
      const baseTime =
        elapsedSinceLast >= intervalSeconds ? now : lastRefreshTime;
      const elapsed = (now - baseTime) / 1000;
      const remaining = Math.max(0, intervalSeconds - elapsed);
      setTimeLeft(remaining);
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 500);
    return () => window.clearInterval(timer);
  }, [intervalSeconds, lastRefreshTime, isPaused]);

  const handleMouseEnter = () => setIsExpanded(true);
  const handleMouseLeave = () => setIsExpanded(false);

  const handleFocus = () => setIsExpanded(true);
  const handleBlur = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsExpanded(false);
    }
  }, []);

  const handleToggle = () => {
    if (intervalSeconds <= 0) return;
    onTogglePause();
  };

  let summaryText: string;
  let detailText: string | null = null;
  if (intervalSeconds <= 0) {
    summaryText = t('autoRefresh.status.disabled');
  } else if (isPaused) {
    summaryText = t('autoRefresh.status.paused');
  } else if (isLoading) {
    summaryText = t('autoRefresh.status.refreshing');
  } else if (timeLeft != null) {
    const seconds = Math.max(1, Math.ceil(timeLeft));
    // 기본(축소) 상태에서는 짧은 문구를, 호버/포커스 확장 시에는
    // 기존의 자세한 문구(다음 새로고침까지 N초)를 함께 보여준다.
    summaryText = t('autoRefresh.status.shortNext', { seconds });
    detailText = t('autoRefresh.status.next', { seconds });
  } else {
    summaryText = t('autoRefresh.status.waiting');
  }

  return (
    <div
      className={`auto-refresh-indicator${isExpanded ? ' expanded' : ' collapsed'}`}
      role="status"
      aria-live="polite"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      tabIndex={0}
    >
      <span className={`indicator-dot${intervalSeconds <= 0 ? ' disabled' : isPaused ? ' paused' : ''}`} />
      {(!detailText || !isExpanded) && (
        <span className="indicator-summary">{summaryText}</span>
      )}
      {detailText && isExpanded && (
        <span className="indicator-detail">{detailText}</span>
      )}
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
