import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './FullscreenButton.css';

interface FullscreenButtonProps {
  onToggle: () => void;
}

export const FullscreenButton: React.FC<FullscreenButtonProps> = ({
  onToggle,
}) => {
  const { t } = useTranslation();
  const [isFullscreen, setIsFullscreen] = useState(
    typeof document !== 'undefined' ? !!document.fullscreenElement : false,
  );

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleClick = () => {
    onToggle();
  };

  return (
    <button
      className={`fullscreen-button ${isFullscreen ? 'active' : ''}`}
      onClick={handleClick}
      aria-label={t('buttons.fullscreen')}
      title={t('buttons.fullscreen')}
    >
      <svg
        className="fullscreen-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {isFullscreen ? (
          <>
            {/* Exit fullscreen (minimize) icon */}
            <polyline points="4 14 10 14 10 20" />
            <polyline points="20 10 14 10 14 4" />
            <line x1="14" y1="10" x2="21" y2="3" />
            <line x1="10" y1="14" x2="3" y2="21" />
          </>
        ) : (
          <>
            {/* Enter fullscreen (maximize) icon */}
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </>
        )}
      </svg>
    </button>
  );
};
