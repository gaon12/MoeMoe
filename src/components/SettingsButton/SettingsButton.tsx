import { useTranslation } from 'react-i18next';
import { useApp } from '../../contexts/AppContext';
import './SettingsButton.css';

export const SettingsButton = () => {
  const { t } = useTranslation();
  const { setIsSettingsOpen } = useApp();

  return (
    <div className="settings-button-wrapper">
      <button
        className="settings-fab"
        onClick={() => setIsSettingsOpen(true)}
        aria-label={t('buttons.settings')}
        title={t('buttons.settings')}
      >
        ⚙️
      </button>
    </div>
  );
};
