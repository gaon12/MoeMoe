import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "./AutoRefreshIndicator.css";

const MILLISECONDS_PER_SECOND = 1000;
const COUNTDOWN_UPDATE_INTERVAL_MS = 500;

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
      const now = Date.now();
      // 자동 새로고침이 꺼져 있거나, 오랫동안 꺼져 있다가
      // 다시 켜진 경우에는 다음 새로고침까지의 남은 시간을
      // "지금부터 intervalSeconds" 기준으로 계산해준다.
      const elapsedSinceLast =
        (now - lastRefreshTime) / MILLISECONDS_PER_SECOND;
      const baseTime =
        elapsedSinceLast >= intervalSeconds ? now : lastRefreshTime;
      const elapsed = (now - baseTime) / MILLISECONDS_PER_SECOND;
      const remaining = Math.max(0, intervalSeconds - elapsed);
      setTimeLeft(remaining);
    };

    updateRemaining();
    const timer = globalThis.setInterval(
      updateRemaining,
      COUNTDOWN_UPDATE_INTERVAL_MS,
    );
    return () => globalThis.clearInterval(timer);
  }, [intervalSeconds, lastRefreshTime, isPaused]);

  let dotClassName = "indicator-dot";
  if (intervalSeconds <= 0) {
    dotClassName += " disabled";
  } else if (isPaused) {
    dotClassName += " paused";
  }

  let summaryText: string;
  let detailText: string | null = null;
  if (intervalSeconds <= 0) {
    summaryText = t("autoRefresh.status.disabled");
  } else if (isPaused) {
    summaryText = t("autoRefresh.status.paused");
  } else if (isLoading) {
    summaryText = t("autoRefresh.status.refreshing");
  } else if (timeLeft === null) {
    summaryText = t("autoRefresh.status.waiting");
  } else {
    const seconds = Math.max(1, Math.ceil(timeLeft));
    // 기본(축소) 상태에서는 짧은 문구를, 호버/포커스 확장 시에는
    // 기존의 자세한 문구(다음 새로고침까지 N초)를 함께 보여준다.
    summaryText = t("autoRefresh.status.shortNext", { seconds });
    detailText = t("autoRefresh.status.next", { seconds });
  }

  const containerClassName = detailText
    ? "auto-refresh-indicator has-detail"
    : "auto-refresh-indicator";

  return (
    <section className={containerClassName}>
      <span className={dotClassName} />
      <span
        className="indicator-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="indicator-summary">{summaryText}</span>
        {detailText ? (
          <span className="indicator-detail">{detailText}</span>
        ) : null}
      </span>
      {intervalSeconds > 0 ? (
        <button
          type="button"
          className="indicator-toggle"
          onClick={onTogglePause}
        >
          {isPaused
            ? t("autoRefresh.actions.resume")
            : t("autoRefresh.actions.pause")}
        </button>
      ) : null}
    </section>
  );
}
