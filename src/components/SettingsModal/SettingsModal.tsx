import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../contexts/AppContext';
import { type ThemeMode, type Language, type ImageFitMode, type LetterboxFillMode } from '../../types/settings';
import { type ImageSource, ALL_IMAGE_SOURCES } from '../../types/image';
import './SettingsModal.css';

export const SettingsModal = () => {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings, isSettingsOpen, setIsSettingsOpen } = useApp();
  const [localSettings, setLocalSettings] = useState(settings);

  const secondsLabel = (n: number) => `${n}${i18n.language === 'ko' ? '초' : i18n.language === 'ja' ? '秒' : 's'}`;

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!isSettingsOpen) return null;

  const handleClose = () => {
    setIsSettingsOpen(false);
    setLocalSettings(settings);
  };

  const handleSave = () => {
    if (localSettings.imageSources.length === 0) return;
    updateSettings(localSettings);
    setIsSettingsOpen(false);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const toggleImageSource = (source: ImageSource) => {
    const newSources = localSettings.imageSources.includes(source)
      ? localSettings.imageSources.filter((s) => s !== source)
      : [...localSettings.imageSources, source];
    setLocalSettings({ ...localSettings, imageSources: newSources });
  };

  const allSourceValues = ALL_IMAGE_SOURCES;

  const selectAllSources = () =>
    setLocalSettings({ ...localSettings, imageSources: allSourceValues });
  const deselectAllSources = () => setLocalSettings({ ...localSettings, imageSources: [] });

  const sourceLabelKeyMap: Record<string, string> = {
    nekos_best: 'settings.imageSource.nekosBest',
    waifu_pics: 'settings.imageSource.waifuPics',
    nekosia: 'settings.imageSource.nekosia',
    waifu_im: 'settings.imageSource.waifuIm',
    nekos_moe: 'settings.imageSource.nekosMoe',
    danbooru: 'settings.imageSource.danbooru',
    pic_re: 'settings.imageSource.picRe',
    nekosapi: 'settings.imageSource.nekosapi',
  };

  const availableSources: Array<{ value: ImageSource; label: string }> = allSourceValues.map(
    (value) => ({
      value,
      label: t(sourceLabelKeyMap[value] ?? value),
    }),
  );

  return (
    <div className="settings-modal-overlay" onClick={handleOverlayClick}>
      <div className="settings-modal">
        <div className="settings-header">
          <h2 className="settings-title">{t('settings.title')}</h2>
          <button className="settings-close" onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="settings-content">
          {/* Language Settings */}
          <div className="settings-section">
            <h3 className="settings-section-title">{t('settings.language.title')}</h3>
            <div className="settings-option">
              <label className="settings-label">{t('settings.language.title')}</label>
              <select
                className="settings-select"
                value={localSettings.language}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, language: e.target.value as Language })
                }
              >
                <option value="ko">{t('settings.language.korean')}</option>
                <option value="en">{t('settings.language.english')}</option>
                <option value="ja">{t('settings.language.japanese')}</option>
              </select>
            </div>
          </div>

          {/* Theme Settings */}
          <div className="settings-section">
            <h3 className="settings-section-title">{t('settings.theme.title')}</h3>
            <div className="settings-option">
              <label className="settings-label">{t('settings.theme.title')}</label>
              <select
                className="settings-select"
                value={localSettings.theme}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, theme: e.target.value as ThemeMode })
                }
              >
                <option value="dark">{t('settings.theme.dark')}</option>
                <option value="light">{t('settings.theme.light')}</option>
                <option value="auto">{t('settings.theme.auto')}</option>
              </select>
            </div>
          </div>

          {/* Image Settings */}
          <div className="settings-section">
            <h3 className="settings-section-title">{t('settings.image.title')}</h3>

            {/* Image Sources */}
            <div className="settings-option">
              <label className="settings-label">{t('settings.imageSource.title')}</label>
              <p className="settings-description">{t('settings.imageSource.description')}</p>
              <div className="source-actions">
                <button type="button" className="settings-button settings-button-secondary" onClick={selectAllSources}>
                  {t('settings.imageSource.selectAll')}
                </button>
                <button type="button" className="settings-button settings-button-secondary" onClick={deselectAllSources}>
                  {t('settings.imageSource.deselectAll')}
                </button>
              </div>
              <div className="source-checkboxes">
                {availableSources.map((source) => (
                  <div key={source.value} className="source-checkbox-item">
                    <input
                      type="checkbox"
                      id={`source-${source.value}`}
                      className="settings-checkbox"
                      checked={localSettings.imageSources.includes(source.value)}
                      onChange={() => toggleImageSource(source.value)}
                    />
                    <label htmlFor={`source-${source.value}`} className="settings-checkbox-label">
                      {source.label}
                    </label>
                  </div>
                ))}
              </div>
              {localSettings.imageSources.length === 0 && (
                <p className="settings-description" style={{ color: 'var(--accent)' }}>
                  {t('settings.imageSource.atLeastOne')}
                </p>
              )}
            </div>

            {/* NSFW Toggle */}
            <div className="settings-option">
              <div className="settings-checkbox-group">
                <input
                  type="checkbox"
                  id="allowNSFW"
                  className="settings-checkbox nsfw-checkbox"
                  checked={localSettings.allowNSFW}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, allowNSFW: e.target.checked })
                  }
                />
                <label htmlFor="allowNSFW" className="settings-checkbox-label">
                  {t('settings.image.allowNSFW')}{' '}
                  <span className="nsfw-warning-icon" data-tooltip={t('settings.image.nsfwWarning')}>
                    ⚠️
                  </span>
                </label>
              </div>
            </div>

            {/* Image Fit Mode */}
            <div className="settings-option">
              <label className="settings-label">{t('settings.image.fitMode')}</label>
              <select
                className="settings-select"
                value={localSettings.imageFitMode}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    imageFitMode: e.target.value as ImageFitMode,
                  })
                }
              >
                <option value="cover">{t('settings.image.fitCover')}</option>
                <option value="contain">{t('settings.image.fitContain')}</option>
              </select>
            </div>

            {/* Letterbox Fill Mode (only show when contain mode is selected) */}
            {localSettings.imageFitMode === 'contain' && (
              <>
                <div className="settings-option">
                  <label className="settings-label">{t('settings.image.letterboxFill')}</label>
                  <select
                    className="settings-select"
                    value={localSettings.letterboxFillMode}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        letterboxFillMode: e.target.value as LetterboxFillMode,
                      })
                    }
                  >
                    <option value="blur">{t('settings.image.letterboxBlur')}</option>
                    <option value="edge-color">{t('settings.image.letterboxEdgeColor')}</option>
                    <option value="custom">{t('settings.image.letterboxCustom')}</option>
                    <option value="solid">{t('settings.image.letterboxSolid')}</option>
                  </select>
                </div>

                {/* Custom Color Picker (only show when custom mode is selected) */}
                {localSettings.letterboxFillMode === 'custom' && (
                  <div className="settings-option">
                    <label className="settings-label">{t('settings.image.customColor')}</label>
                    <input
                      type="color"
                      className="settings-color-picker"
                      value={localSettings.letterboxCustomColor}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          letterboxCustomColor: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
              </>
            )}

            {/* Auto Refresh Interval */}
            <div className="settings-option">
              <label className="settings-label">{t('settings.image.autoRefresh')}</label>
              <select
                className="settings-select"
                value={localSettings.imageChangeInterval}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    imageChangeInterval: Number(e.target.value),
                  })
                }
              >
                <option value="0">{t('settings.image.autoRefreshDisabled')}</option>
                <option value="30">{secondsLabel(30)}</option>
                <option value="60">{secondsLabel(60)}</option>
                <option value="120">{secondsLabel(120)}</option>
                <option value="300">{secondsLabel(300)}</option>
                <option value="600">{secondsLabel(600)}</option>
              </select>
            </div>
          </div>

          {/* Clock Settings */}
          <div className="settings-section">
            <h3 className="settings-section-title">{t('settings.appearance.title')}</h3>
            <div className="settings-option">
              <div className="settings-checkbox-group">
                <input
                  type="checkbox"
                  id="showSeconds"
                  className="settings-checkbox"
                  checked={localSettings.showSeconds}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, showSeconds: e.target.checked })
                  }
                />
                <label htmlFor="showSeconds" className="settings-checkbox-label">
                  {t('settings.appearance.showSeconds')}
                </label>
              </div>
            </div>

            <div className="settings-option">
              <div className="settings-checkbox-group">
                <input
                  type="checkbox"
                  id="use24Hour"
                  className="settings-checkbox"
                  checked={localSettings.use24Hour}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, use24Hour: e.target.checked })
                  }
                />
                <label htmlFor="use24Hour" className="settings-checkbox-label">
                  {t('settings.appearance.use24Hour')}
                </label>
              </div>
            </div>

            {/* AM/PM visibility, style and position (12-hour only) */}
            {!localSettings.use24Hour && (
              <div className="settings-option">
                <div className="settings-checkbox-group">
                  <input
                    type="checkbox"
                    id="showAmPm"
                    className="settings-checkbox"
                    checked={localSettings.showAmPm}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, showAmPm: e.target.checked })
                    }
                  />
                  <label htmlFor="showAmPm" className="settings-checkbox-label">
                    {t('settings.appearance.showAmPm')}
                  </label>
                </div>
              </div>
            )}

            {!localSettings.use24Hour && localSettings.showAmPm && (
              <>
                <div className="settings-option">
                  <label className="settings-label">{t('settings.appearance.amPmStyle.title')}</label>
                  <select
                    className="settings-select"
                    value={localSettings.amPmStyle}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, amPmStyle: e.target.value as any })
                    }
                  >
                    <option value="locale">{t('settings.appearance.amPmStyle.locale')}</option>
                    <option value="latin">{t('settings.appearance.amPmStyle.latin')}</option>
                  </select>
                  <p className="settings-description">{t('settings.appearance.amPmStyle.desc')}</p>
                </div>

                <div className="settings-option">
                  <label className="settings-label">{t('settings.appearance.amPmPosition')}</label>
                  <select
                    className="settings-select"
                    value={localSettings.amPmPosition}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, amPmPosition: e.target.value as any })
                    }
                  >
                    <option value="before">{t('settings.appearance.before')}</option>
                    <option value="after">{t('settings.appearance.after')}</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Time Source */}
          <div className="settings-section">
            <h3 className="settings-section-title">{t('settings.time.title')}</h3>
            <div className="settings-option">
              <div className="settings-checkbox-group">
                <input
                  type="checkbox"
                  id="useServerTime"
                  className="settings-checkbox"
                  checked={localSettings.useServerTime}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, useServerTime: e.target.checked })
                  }
                />
                <label htmlFor="useServerTime" className="settings-checkbox-label">
                  {t('settings.time.useServerTime')}
                </label>
              </div>
              <p className="settings-description">{t('settings.time.useServerTimeDesc')}</p>
            </div>

            {localSettings.useServerTime && (
              <div className="settings-option">
                <label className="settings-label">{t('settings.time.updateInterval')}</label>
                <select
                  className="settings-select"
                  value={localSettings.serverTimeUpdateIntervalSec}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      serverTimeUpdateIntervalSec: Number(e.target.value),
                    })
                  }
                >
                  <option value="10">{secondsLabel(10)}</option>
                  <option value="30">{secondsLabel(30)}</option>
                  <option value="60">{secondsLabel(60)}</option>
                  <option value="300">{secondsLabel(300)}</option>
                </select>
              </div>
            )}
          </div>

          {/* Widgets Settings */}
          <div className="settings-section">
            <h3 className="settings-section-title">{t('settings.widgets.title')}</h3>
            <div className="widget-list">
              {localSettings.widgets.map((widget) => (
                <div key={widget.id} className="widget-item">
                  <span className="widget-name">
                    {t(`settings.widgets.${widget.type}`)}
                  </span>
                  <input
                    type="checkbox"
                    className="widget-toggle"
                    checked={widget.enabled}
                    onChange={(e) => {
                      const newWidgets = localSettings.widgets.map((w) =>
                        w.id === widget.id ? { ...w, enabled: e.target.checked } : w
                      );
                      setLocalSettings({ ...localSettings, widgets: newWidgets });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button className="settings-button settings-button-secondary" onClick={handleClose}>
            {t('settings.close')}
          </button>
          <button
            className="settings-button settings-button-primary"
            onClick={handleSave}
            disabled={localSettings.imageSources.length === 0}
            title={localSettings.imageSources.length === 0 ? t('settings.imageSource.atLeastOne') : undefined}
          >
            {t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  );
};
