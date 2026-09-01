import { useState, useEffect, useId } from "react";
import { useTranslation } from "react-i18next";
import "./RefreshButton.css";

const MILLISECONDS_PER_SECOND = 1000;
const COOLDOWN_POLL_INTERVAL_MS = 250;
const REFRESH_ANIMATION_DURATION_MS = 600;

interface RefreshButtonProps {
  onRefresh: () => void;
  isLoading?: boolean;
  lastRefreshTime?: number;
  cooldownSeconds?: number;
}

const getRemainingCooldown = (
  lastRefreshTime: number,
  cooldownSeconds: number,
) => {
  if (lastRefreshTime <= 0) {
    return 0;
  }
  const elapsed = (Date.now() - lastRefreshTime) / MILLISECONDS_PER_SECOND;
  return Math.max(0, cooldownSeconds - elapsed);
};

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onRefresh,
  isLoading = false,
  lastRefreshTime = 0,
  cooldownSeconds = 5,
}) => {
  const { t } = useTranslation();
  const tooltipId = useId();
  const [isAnimating, setIsAnimating] = useState(false);
  const [remainingCooldown, setRemainingCooldown] = useState<number>(() =>
    getRemainingCooldown(lastRefreshTime, cooldownSeconds),
  );

  // Update cooldown timer
  useEffect(() => {
    const initialRemaining = getRemainingCooldown(
      lastRefreshTime,
      cooldownSeconds,
    );
    setRemainingCooldown(initialRemaining);
    if (initialRemaining <= 0) {
      return;
    }

    const interval = globalThis.setInterval(() => {
      const nextRemaining = getRemainingCooldown(
        lastRefreshTime,
        cooldownSeconds,
      );
      setRemainingCooldown(nextRemaining);
      if (nextRemaining <= 0) {
        globalThis.clearInterval(interval);
      }
    }, COOLDOWN_POLL_INTERVAL_MS);

    return () => globalThis.clearInterval(interval);
  }, [lastRefreshTime, cooldownSeconds]);

  const handleClick = () => {
    if (isLoading || isAnimating || remainingCooldown > 0) {
      return;
    }

    setIsAnimating(true);
    onRefresh();

    // Reset animation after it completes
    setTimeout(() => {
      setIsAnimating(false);
    }, REFRESH_ANIMATION_DURATION_MS);
  };

  const isCooldownActive = remainingCooldown > 0;
  const isDisabled = isLoading || isCooldownActive;
  let tooltipText = t("buttons.refreshShortcut");
  if (isCooldownActive) {
    tooltipText = t("buttons.refreshCooldown", {
      seconds: Math.ceil(remainingCooldown),
    });
  } else if (isLoading) {
    tooltipText = t("buttons.refreshLoading");
  }

  return (
    <span className="refresh-button-container">
      <button
        type="button"
        className={`refresh-button ${isLoading ? "loading" : ""} ${isAnimating ? "animating" : ""} ${isCooldownActive ? "cooldown" : ""}`}
        onClick={handleClick}
        aria-disabled={isDisabled}
        aria-describedby={tooltipId}
        aria-label={t("buttons.refreshImage")}
      >
        {isCooldownActive ? (
          <span className="cooldown-text">{Math.ceil(remainingCooldown)}</span>
        ) : (
          <svg
            className="refresh-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        )}
      </button>
      <span id={tooltipId} className="refresh-tooltip" role="tooltip">
        {tooltipText}
      </span>
    </span>
  );
};
