import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../contexts/AppContext';
import {
  type ThemeMode,
  type Language,
  type ImageFitMode,
  type LetterboxFillMode,
  type Widget,
  type WidgetType,
} from '../../types/settings';
import { type ImageSource, ALL_IMAGE_SOURCES } from '../../types/image';
import './SettingsModal.css';

export const SettingsModal = () => {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings, isSettingsOpen, setIsSettingsOpen } = useApp();
  const [localSettings, setLocalSettings] = useState(settings);
  const [activeTab, setActiveTab] = useState<'general' | 'image' | 'clock' | 'widgets' | 'info'>(
    'general',
  );

  const secondsLabel = (n: number) => `${n}${i18n.language === 'ko' ? '초' : i18n.language === 'ja' ? '秒' : 's'}`;
  const githubUrl = 'https://github.com/gaon12/MoeMoe';
  const MAX_WIDGETS = 4;
  const lang = i18n.language;

  const infoText = {
    librariesTitle:
      lang === 'ja' ? '使用ライブラリ' : lang === 'en' ? 'Libraries Used' : '사용한 라이브러리',
    librariesDescription:
      lang === 'ja'
        ? 'このプロジェクトで利用している主なオープンソースライブラリです。'
        : lang === 'en'
          ? 'Major open-source libraries used in this project.'
          : '이 프로젝트를 구성하는 주요 오픈 소스 라이브러리입니다.',
    librariesNameHeader:
      lang === 'ja' ? 'ライブラリ' : lang === 'en' ? 'Library' : '라이브러리',
    librariesLicenseHeader:
      lang === 'ja' ? 'ライセンス' : lang === 'en' ? 'License' : '라이선스',
    apisTitle:
      lang === 'ja' ? '利用API' : lang === 'en' ? 'APIs Used' : '사용한 API',
    apisDescription:
      lang === 'ja'
        ? '背景画像、天気、位置情報、時刻同期などに外部APIを利用しています。'
        : lang === 'en'
          ? 'External APIs used for wallpapers, weather, location and time sync.'
          : '배경 이미지, 날씨, 위치, 시간 동기화 등에 사용하는 외부 API입니다.',
    apisNameHeader:
      lang === 'ja' ? 'API' : lang === 'en' ? 'API' : 'API',
    apisUsageHeader:
      lang === 'ja' ? '用途' : lang === 'en' ? 'Usage' : '용도',
    licenseTitle:
      lang === 'ja' ? 'ライセンス' : lang === 'en' ? 'License' : '라이선스',
    projectLicenseLabel:
      lang === 'ja'
        ? 'プロジェクトライセンス'
        : lang === 'en'
          ? 'Project license'
          : '프로젝트 라이선스',
  };

  const libraries = [
    { name: 'React', license: 'MIT' },
    { name: 'React DOM', license: 'MIT' },
    { name: 'i18next', license: 'MIT' },
    { name: 'react-i18next', license: 'MIT' },
    { name: 'thumbhash', license: 'MIT' },
    { name: 'Vite', license: 'MIT' },
    { name: 'TypeScript', license: 'Apache-2.0' },
  ];

  const apis = [
    {
      name: 'Nekos.best',
      usage:
        lang === 'ja'
          ? 'アニメ画像 (SFW)'
          : lang === 'en'
            ? 'Anime images (SFW)'
            : '애니메이션 이미지 (SFW)',
    },
    {
      name: 'Waifu.pics',
      usage:
        lang === 'ja'
          ? 'アニメ画像 (SFW/NSFW)'
          : lang === 'en'
            ? 'Anime images (SFW/NSFW)'
            : '애니메이션 이미지 (SFW/NSFW)',
    },
    {
      name: 'Nekosia',
      usage:
        lang === 'ja'
          ? 'アニメ画像'
          : lang === 'en'
            ? 'Anime images'
            : '애니메이션 이미지',
    },
    {
      name: 'Waifu.im',
      usage:
        lang === 'ja'
          ? 'アニメ画像 + 作者情報'
          : lang === 'en'
            ? 'Anime images with artist info'
            : '애니메이션 이미지 및 작가 정보',
    },
    {
      name: 'Nekos.moe',
      usage:
        lang === 'ja'
          ? 'アニメ画像 (IDベース)'
          : lang === 'en'
            ? 'Anime images by ID'
            : 'ID 기반 애니메이션 이미지',
    },
    {
      name: 'Danbooru (donmai.us)',
      usage:
        lang === 'ja'
          ? 'ランダムアニメ画像 (safe/NSFW)'
          : lang === 'en'
            ? 'Random anime images (safe/NSFW)'
            : '랜덤 애니메이션 이미지 (safe/NSFW)',
    },
    {
      name: 'Pic.re',
      usage:
        lang === 'ja'
          ? 'ランダム SFW アニメ画像'
          : lang === 'en'
            ? 'Random SFW anime images'
            : '랜덤 SFW 애니메이션 이미지',
    },
    {
      name: 'Nekos API (api.nekosapi.com)',
      usage:
        lang === 'ja'
          ? 'アニメ画像 (safe/NSFW)'
          : lang === 'en'
            ? 'Anime images (safe/NSFW)'
            : '애니메이션 이미지 (safe/NSFW)',
    },
    {
      name: 'WeatherAPI.com',
      usage:
        lang === 'ja'
          ? '天気・現在地ウィジェットの天気情報'
          : lang === 'en'
            ? 'Weather data for weather/location widgets'
            : '날씨/위치 위젯의 날씨 데이터',
    },
    {
      name: 'OpenStreetMap Nominatim',
      usage:
        lang === 'ja'
          ? '緯度/経度からの住所の逆ジオコーディング'
          : lang === 'en'
            ? 'Reverse geocoding from latitude/longitude'
            : '위도/경도 기반 역지오코딩',
    },
    {
      name: 'Anime Quote API',
      usage:
        lang === 'ja'
          ? 'アニメ名言ウィジェット (環境変数でURL指定)'
          : lang === 'en'
            ? 'Anime quote widget (URL via env var)'
            : '애니 명대사 위젯 (환경 변수로 URL 설정)',
    },
    {
      name: 'Server Time API',
      usage:
        lang === 'ja'
          ? 'サーバー時刻同期 (環境変数でURL指定)'
          : lang === 'en'
            ? 'Server time sync (URL via env var)'
            : '서버 시간 동기화 (환경 변수로 URL 설정)',
    },
    {
      name: 'IP-based Reverse Geocoding API',
      usage:
        lang === 'ja'
          ? 'IPベースのおおまかな現在地推定'
          : lang === 'en'
            ? 'Approximate location from IP (env var)'
            : 'IP 기반 대략적인 위치 추정 (환경 변수)',
    },
  ];

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!isSettingsOpen) return null;

  const handleClose = () => {
    setIsSettingsOpen(false);
    setLocalSettings(settings);
    setActiveTab('general');
  };

  const handleSave = () => {
    if (localSettings.imageSources.length === 0) return;
    const widgetLimit = localSettings.widgets.slice(0, MAX_WIDGETS);
    updateSettings({
      ...localSettings,
      widgets: widgetLimit,
      weatherApiKey: (localSettings.weatherApiKey ?? '').trim(),
    });
    setIsSettingsOpen(false);
    setActiveTab('general');
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

  const widgetTypeOptions: Array<{ value: WidgetType; label: string }> = [
    { value: 'clock', label: t('settings.widgets.clock') },
    { value: 'weather', label: t('settings.widgets.weather') },
    { value: 'location', label: t('settings.widgets.location') },
    { value: 'animeQuote', label: t('settings.widgets.animeQuote') },
    { value: 'customText', label: t('settings.widgets.customText') },
  ];

  const handleWidgetUpdate = (id: string, updates: Partial<Widget>) => {
    const nextWidgets = localSettings.widgets.map((widget) =>
      widget.id === id ? { ...widget, ...updates } : widget,
    );
    setLocalSettings({ ...localSettings, widgets: nextWidgets });
  };

  const handleWidgetTypeChange = (id: string, type: WidgetType) => {
    handleWidgetUpdate(id, { type });
  };

  const handleWidgetToggle = (id: string, enabled: boolean) => {
    handleWidgetUpdate(id, { enabled });
  };

  const handleWidgetRemove = (id: string) => {
    setLocalSettings({
      ...localSettings,
      widgets: localSettings.widgets.filter((widget) => widget.id !== id),
    });
  };

  const handleWidgetMove = (index: number, offset: number) => {
    const newIndex = index + offset;
    if (newIndex < 0 || newIndex >= localSettings.widgets.length) return;
    const widgets = [...localSettings.widgets];
    const [moved] = widgets.splice(index, 1);
    widgets.splice(newIndex, 0, moved);
    setLocalSettings({ ...localSettings, widgets });
  };

  const handleWidgetAdd = () => {
    if (localSettings.widgets.length >= MAX_WIDGETS) return;
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type: 'clock',
      enabled: true,
      position: { x: 0, y: 0 },
      data: {},
    };
    setLocalSettings({ ...localSettings, widgets: [...localSettings.widgets, newWidget] });
  };

  const handleWidgetCustomText = (id: string, text: string) => {
    const target = localSettings.widgets.find((widget) => widget.id === id);
    if (!target) return;
    const data = { ...(target.data || {}), text };
    handleWidgetUpdate(id, { data });
  };

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
          <div className="settings-tabs" role="tablist" aria-label={t('settings.title')}>
            <button
              type="button"
              className={`settings-tab${activeTab === 'general' ? ' settings-tab-active' : ''}`}
              onClick={() => setActiveTab('general')}
              role="tab"
              aria-selected={activeTab === 'general'}
            >
              {t('settings.tabs.general')}
            </button>
            <button
              type="button"
              className={`settings-tab${activeTab === 'image' ? ' settings-tab-active' : ''}`}
              onClick={() => setActiveTab('image')}
              role="tab"
              aria-selected={activeTab === 'image'}
            >
              {t('settings.tabs.image')}
            </button>
            <button
              type="button"
              className={`settings-tab${activeTab === 'clock' ? ' settings-tab-active' : ''}`}
              onClick={() => setActiveTab('clock')}
              role="tab"
              aria-selected={activeTab === 'clock'}
            >
              {t('settings.tabs.clock')}
            </button>
            <button
              type="button"
              className={`settings-tab${activeTab === 'widgets' ? ' settings-tab-active' : ''}`}
              onClick={() => setActiveTab('widgets')}
              role="tab"
              aria-selected={activeTab === 'widgets'}
            >
              {t('settings.tabs.widgets')}
            </button>
            <button
              type="button"
              className={`settings-tab${activeTab === 'info' ? ' settings-tab-active' : ''}`}
              onClick={() => setActiveTab('info')}
              role="tab"
              aria-selected={activeTab === 'info'}
            >
              {t('settings.tabs.info')}
            </button>
          </div>

          {activeTab === 'general' && (
            <>
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
            </>
          )}

          {activeTab === 'image' && (
            <>
              {/* Image Settings */}
              <div className="settings-section">
                <h3 className="settings-section-title">{t('settings.image.title')}</h3>

                {/* Image Sources */}
                <div className="settings-option">
                  <label className="settings-label">{t('settings.imageSource.title')}</label>
                  <p className="settings-description">{t('settings.imageSource.description')}</p>
                  <div className="source-actions">
                    <button
                      type="button"
                      className="settings-button settings-button-secondary"
                      onClick={selectAllSources}
                    >
                      {t('settings.imageSource.selectAll')}
                    </button>
                    <button
                      type="button"
                      className="settings-button settings-button-secondary"
                      onClick={deselectAllSources}
                    >
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
                        <label
                          htmlFor={`source-${source.value}`}
                          className="settings-checkbox-label"
                        >
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
                      <span
                        className="nsfw-warning-icon"
                        data-tooltip={t('settings.image.nsfwWarning')}
                      >
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
                        <option value="edge-color">
                          {t('settings.image.letterboxEdgeColor')}
                        </option>
                        <option value="custom">{t('settings.image.letterboxCustom')}</option>
                        <option value="solid">{t('settings.image.letterboxSolid')}</option>
                      </select>
                    </div>

                    {/* Custom Color Picker (only show when custom mode is selected) */}
                    {localSettings.letterboxFillMode === 'custom' && (
                      <div className="settings-option">
                        <label className="settings-label">
                          {t('settings.image.customColor')}
                        </label>
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
            </>
          )}

          {activeTab === 'clock' && (
            <>
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
                    {(i18n.language === 'ko' || i18n.language === 'ja') && (
                      <div className="settings-option">
                        <label className="settings-label">
                          {t('settings.appearance.amPmStyle.title')}
                        </label>
                        <select
                          className="settings-select"
                          value={localSettings.amPmStyle}
                          onChange={(e) =>
                            setLocalSettings({
                              ...localSettings,
                              amPmStyle: e.target.value as any,
                            })
                          }
                        >
                          <option value="locale">
                            {t('settings.appearance.amPmStyle.locale')}
                          </option>
                          <option value="latin">
                            {t('settings.appearance.amPmStyle.latin')}
                          </option>
                        </select>
                        <p className="settings-description">
                          {t('settings.appearance.amPmStyle.desc')}
                        </p>
                      </div>
                    )}

                    <div className="settings-option">
                      <label className="settings-label">
                        {t('settings.appearance.amPmPosition')}
                      </label>
                      <select
                        className="settings-select"
                        value={localSettings.amPmPosition}
                        onChange={(e) =>
                          setLocalSettings({
                            ...localSettings,
                            amPmPosition: e.target.value as any,
                          })
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
                  <p className="settings-description">
                    {t('settings.time.useServerTimeDesc')}
                  </p>
                </div>

                {localSettings.useServerTime && (
                  <div className="settings-option">
                    <label className="settings-label">
                      {t('settings.time.updateInterval')}
                    </label>
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
            </>
          )}

          {activeTab === 'widgets' && (
            <>
              {/* Widgets Settings */}
              <div className="settings-section">
                <div className="settings-section-header">
                  <h3 className="settings-section-title">{t('settings.widgets.title')}</h3>
                  <p className="settings-description">{t('settings.widgets.description')}</p>
                </div>

                <div className="settings-option">
                  <label className="settings-label" htmlFor="weatherApiKey">
                    {t('settings.widgets.weatherApiKeyLabel')}
                  </label>
                  <p className="settings-description">
                    {t('settings.widgets.weatherApiKeyDescription')}
                  </p>
                  <input
                    id="weatherApiKey"
                    type="password"
                    className="settings-input"
                    value={localSettings.weatherApiKey ?? ''}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, weatherApiKey: e.target.value })
                    }
                    placeholder={t('settings.widgets.weatherApiKeyPlaceholder')}
                    autoComplete="off"
                  />
                </div>

                <div className="widget-controls">
                  <button
                    type="button"
                    className="settings-button settings-button-secondary"
                    onClick={handleWidgetAdd}
                    disabled={localSettings.widgets.length >= MAX_WIDGETS}
                  >
                    {localSettings.widgets.length >= MAX_WIDGETS
                      ? t('settings.widgets.limitReached')
                      : t('settings.widgets.add')}
                  </button>
                  <span className="widget-limit-hint">
                    {t('settings.widgets.limit', { count: MAX_WIDGETS })}
                  </span>
                </div>

                {localSettings.widgets.length === 0 ? (
                  <p className="settings-description">{t('settings.widgets.empty')}</p>
                ) : (
                  <div className="widget-config-list">
                    {localSettings.widgets.map((widget, index) => (
                      <div key={widget.id} className="widget-config-card">
                        <div className="widget-config-header">
                          <div>
                            <p className="widget-config-label">
                              {t('settings.widgets.cardLabel', { index: index + 1 })}
                            </p>
                            <p className="widget-config-name">
                              {t(`settings.widgets.${widget.type}`)}
                            </p>
                          </div>
                          <div className="widget-config-actions">
                            <button
                              type="button"
                              className="widget-config-action"
                              onClick={() => handleWidgetMove(index, -1)}
                              disabled={index === 0}
                              aria-label={t('settings.widgets.moveUp')}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="widget-config-action"
                              onClick={() => handleWidgetMove(index, 1)}
                              disabled={index === localSettings.widgets.length - 1}
                              aria-label={t('settings.widgets.moveDown')}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              className="widget-config-action danger"
                              onClick={() => handleWidgetRemove(widget.id)}
                              aria-label={t('settings.widgets.remove')}
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        <div className="widget-config-row">
                          <label className="widget-config-label">{t('settings.widgets.typeLabel')}</label>
                          <select
                            className="settings-select"
                            value={widget.type}
                            onChange={(e) =>
                              handleWidgetTypeChange(widget.id, e.target.value as WidgetType)
                            }
                          >
                            {widgetTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="widget-config-row">
                          <label className="widget-config-label">{t('settings.widgets.visible')}</label>
                          <label className="widget-config-toggle">
                            <input
                              type="checkbox"
                              checked={widget.enabled}
                              onChange={(e) => handleWidgetToggle(widget.id, e.target.checked)}
                            />
                            <span>{widget.enabled ? t('settings.widgets.enabled') : t('settings.widgets.disabled')}</span>
                          </label>
                        </div>

                        {widget.type === 'customText' && (
                          <div className="widget-config-row">
                            <label className="widget-config-label">
                              {t('settings.widgets.customTextLabel')}
                            </label>
                            <textarea
                              className="widget-config-textarea"
                              rows={2}
                              value={typeof widget.data?.text === 'string' ? widget.data.text : ''}
                              onChange={(e) => handleWidgetCustomText(widget.id, e.target.value)}
                              placeholder={t('settings.widgets.customTextPlaceholder')}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'info' && (
            <>
              <div className="settings-section">
                <h3 className="settings-section-title">{t('settings.info.title')}</h3>

                <div className="settings-option">
                  <label className="settings-label">{t('settings.info.projectName')}</label>
                  <p className="settings-description">{t('app.title')}</p>
                </div>

                <div className="settings-option">
                  <label className="settings-label">{t('settings.info.version')}</label>
                  <p className="settings-description">{__APP_VERSION__}</p>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-section-header">
                  <h3 className="settings-section-title">{infoText.librariesTitle}</h3>
                  <p className="settings-description">{infoText.librariesDescription}</p>
                </div>
                <div className="info-table">
                  <div className="info-table-header">
                    <span className="info-table-col-name">{infoText.librariesNameHeader}</span>
                    <span className="info-table-col-license">{infoText.librariesLicenseHeader}</span>
                  </div>
                  <ul className="info-list">
                    {libraries.map((lib) => (
                      <li key={lib.name} className="info-list-item">
                        <span className="info-list-name">{lib.name}</span>
                        <span className="info-badge">{lib.license}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-section-header">
                  <h3 className="settings-section-title">{infoText.apisTitle}</h3>
                  <p className="settings-description">{infoText.apisDescription}</p>
                </div>
                <div className="info-table">
                  <div className="info-table-header">
                    <span className="info-table-col-name">{infoText.apisNameHeader}</span>
                    <span className="info-table-col-usage">{infoText.apisUsageHeader}</span>
                  </div>
                  <ul className="info-list">
                    {apis.map((api) => (
                      <li key={api.name} className="info-list-item">
                        <span className="info-list-name">{api.name}</span>
                        <span className="info-list-usage">{api.usage}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-section-header">
                  <h3 className="settings-section-title">{infoText.licenseTitle}</h3>
                </div>
                <div className="settings-option">
                  <label className="settings-label">{infoText.projectLicenseLabel}</label>
                  <p className="settings-description">MIT License</p>
                </div>
                <div className="settings-option">
                  <label className="settings-label">{t('settings.info.github')}</label>
                  <a
                    href={githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="info-link"
                  >
                    <span className="info-link-icon" aria-hidden="true">
                      GH
                    </span>
                    <span className="info-link-text">github.com/gaon12/MoeMoe</span>
                  </a>
                </div>
              </div>
            </>
          )}
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
