import { useTranslation } from "react-i18next";
import { useApp } from "../../contexts/useApp";
import "./SettingsButton.css";

export const SettingsButton = () => {
  const { t } = useTranslation();
  const { setIsSettingsOpen } = useApp();

  return (
    <div className="settings-button-wrapper">
      <button
        className="settings-fab"
        onClick={() => setIsSettingsOpen(true)}
        aria-label={t("buttons.settings")}
        title={t("buttons.settings")}
      >
        <svg
          className="settings-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.65V21a2 2 0 1 1-4 0v-.09A1.8 1.8 0 0 0 8.6 19.4a1.8 1.8 0 0 0-1.98.36l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.8 1.8 0 0 0 4.4 15a1.8 1.8 0 0 0-1.65-1.1H2.5a2 2 0 1 1 0-4h.09A1.8 1.8 0 0 0 4.4 8.6a1.8 1.8 0 0 0-.36-1.98l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.8 1.8 0 0 0 8.6 4.4a1.8 1.8 0 0 0 1.1-1.65V2.5a2 2 0 1 1 4 0v.09A1.8 1.8 0 0 0 15 4.4a1.8 1.8 0 0 0 1.98-.36l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.8 1.8 0 0 0 19.4 8.6a1.8 1.8 0 0 0 1.65 1.1h.45a2 2 0 1 1 0 4h-.09A1.8 1.8 0 0 0 19.4 15Z" />
        </svg>
      </button>
    </div>
  );
};
