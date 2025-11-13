import { useState, useEffect } from 'react';
import './RefreshButton.css';

interface RefreshButtonProps {
  onRefresh: () => void;
  isLoading?: boolean;
  lastRefreshTime?: number;
  cooldownSeconds?: number;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onRefresh,
  isLoading = false,
  lastRefreshTime = 0,
  cooldownSeconds = 5,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [remainingCooldown, setRemainingCooldown] = useState<number>(0);

  // Update cooldown timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastRefreshTime > 0) {
        const elapsed = (Date.now() - lastRefreshTime) / 1000;
        const remaining = Math.max(0, cooldownSeconds - elapsed);
        setRemainingCooldown(remaining);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [lastRefreshTime, cooldownSeconds]);

  const handleClick = () => {
    if (isLoading || isAnimating || remainingCooldown > 0) return;

    setIsAnimating(true);
    onRefresh();

    // Reset animation after it completes
    setTimeout(() => {
      setIsAnimating(false);
    }, 600);
  };

  const isCooldownActive = remainingCooldown > 0;
  const isDisabled = isLoading || isCooldownActive;

  return (
    <button
      className={`refresh-button ${isLoading ? 'loading' : ''} ${isAnimating ? 'animating' : ''} ${isCooldownActive ? 'cooldown' : ''}`}
      onClick={handleClick}
      disabled={isDisabled}
      aria-label="Refresh image"
      title={
        isCooldownActive
          ? `Please wait ${Math.ceil(remainingCooldown)}s before refreshing`
          : 'Refresh image (Press R or Space)'
      }
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
        >
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
      )}
    </button>
  );
};
