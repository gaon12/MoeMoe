import { useTranslation } from "react-i18next";
import "./HistoryNav.css";

interface HistoryNavProps {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
}

export const HistoryNav = ({
  canGoBack,
  canGoForward,
  onBack,
  onForward,
}: HistoryNavProps) => {
  const { t } = useTranslation();

  return (
    <div className="history-nav">
      <button
        type="button"
        className="history-nav-button"
        onClick={onBack}
        disabled={!canGoBack}
        aria-label={t("history.previous")}
        title={t("history.previous")}
      >
        {"‹"}
      </button>
      <button
        type="button"
        className="history-nav-button"
        onClick={onForward}
        disabled={!canGoForward}
        aria-label={t("history.next")}
        title={t("history.next")}
      >
        {"›"}
      </button>
    </div>
  );
};
