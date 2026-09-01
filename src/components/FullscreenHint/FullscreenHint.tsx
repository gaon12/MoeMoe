import { useTranslation } from "react-i18next";
import "./FullscreenHint.css";

interface FullscreenHintProps {
  onDismiss: () => void;
}

/**
 * Shown when the fullscreen control is pressed on a browser that cannot go
 * fullscreen -- in practice, an iPhone Safari tab.
 *
 * A page cannot hide Safari's address bar there by any means, so rather than
 * flipping an icon and changing nothing, this says what the browser will not
 * do and what does work instead.
 */
export const FullscreenHint = ({ onDismiss }: FullscreenHintProps) => {
  const { t } = useTranslation();

  return (
    <div className="fullscreen-hint" role="status" aria-live="polite">
      <p className="fullscreen-hint-text">{t("fullscreen.installHint")}</p>
      <button
        type="button"
        className="fullscreen-hint-dismiss"
        onClick={onDismiss}
        aria-label={t("fullscreen.dismissHint")}
      >
        {"✕"}
      </button>
    </div>
  );
};
