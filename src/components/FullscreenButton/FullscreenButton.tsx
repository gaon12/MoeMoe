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
    typeof document !== 'undefined'
      ? Boolean(
          (document as Document & {
            webkitFullscreenElement?: Element | null;
            mozFullScreenElement?: Element | null;
            msFullscreenElement?: Element | null;
          }).fullscreenElement ||
            (document as Document & { webkitFullscreenElement?: Element | null })
              .webkitFullscreenElement ||
            (document as Document & { mozFullScreenElement?: Element | null }).mozFullScreenElement ||
            (document as Document & { msFullscreenElement?: Element | null }).msFullscreenElement,
        )
      : false,
  );

  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null;
        mozFullScreenElement?: Element | null;
        msFullscreenElement?: Element | null;
      };
      setIsFullscreen(
        Boolean(
          doc.fullscreenElement ||
            doc.webkitFullscreenElement ||
            doc.mozFullScreenElement ||
            doc.msFullscreenElement,
        ),
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange as EventListener);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange as EventListener);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener(
        'webkitfullscreenchange',
        handleFullscreenChange as EventListener,
      );
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange as EventListener);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange as EventListener);
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
