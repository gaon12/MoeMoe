import { useTranslation } from "react-i18next";
import "./HistoryNav.css";

interface HistoryNavProps {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
}

/**
 * History arrows for the control dock.
 *
 * The wrapper is `display: contents`, so the buttons become direct children of
 * the dock and follow its own axis -- stacked on desktop, inline on mobile --
 * rather than forming a fixed row that widens the bar.
 *
 * Each arrow is rendered only while it leads somewhere, so the dock grows by
 * one button after the first change and by two only once the user has gone
 * back. A permanently visible pair of dead arrows is clutter on a surface
 * whose whole point is staying out of the wallpaper's way.
 */
export const HistoryNav = ({
  canGoBack,
  canGoForward,
  onBack,
  onForward,
}: HistoryNavProps) => {
  const { t } = useTranslation();

  return (
    <div className="history-nav">
      {canGoBack ? (
        <button
          type="button"
          className="history-nav-button"
          onClick={onBack}
          aria-label={t("history.previous")}
          title={t("history.previous")}
        >
          {"‹"}
        </button>
      ) : null}
      {canGoForward ? (
        <button
          type="button"
          className="history-nav-button"
          onClick={onForward}
          aria-label={t("history.next")}
          title={t("history.next")}
        >
          {"›"}
        </button>
      ) : null}
    </div>
  );
};
