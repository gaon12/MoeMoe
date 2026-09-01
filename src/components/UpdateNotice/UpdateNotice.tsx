import { useTranslation } from "react-i18next";
import "./UpdateNotice.css";

const MS_PER_MINUTE = 60_000;
const MS_PER_SECOND = 1000;

interface UpdateNoticeProps {
  msRemaining: number;
  onApply: () => void;
}

/** `m:ss`, so the last minute still visibly counts down. */
function formatCountdown(msRemaining: number): string {
  const totalSeconds = Math.ceil(msRemaining / MS_PER_SECOND);
  const minutes = Math.floor((totalSeconds * MS_PER_SECOND) / MS_PER_MINUTE);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export const UpdateNotice = ({ msRemaining, onApply }: UpdateNoticeProps) => {
  const { t } = useTranslation();

  return (
    <div
      className="update-notice"
      role="status"
      // Announced once when it appears. `assertive` would interrupt a screen
      // reader every second as the countdown ticks.
      aria-live="polite"
    >
      <p className="update-notice-text">
        {t("update.available", { countdown: formatCountdown(msRemaining) })}
      </p>
      <button type="button" className="update-notice-button" onClick={onApply}>
        {t("update.reloadNow")}
      </button>
    </div>
  );
};
