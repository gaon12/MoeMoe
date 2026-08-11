import { useTranslation } from "react-i18next";
import type { Dispatch, SetStateAction } from "react";
import type {
  AppSettings,
  ImageAspectPreference,
  ImageFitMode,
  LetterboxFillMode,
} from "../../types/settings";
import { ALL_IMAGE_SOURCES, type ImageSource } from "../../types/image";

interface SettingsImageTabProps {
  localSettings: AppSettings;
  setLocalSettings: Dispatch<SetStateAction<AppSettings>>;
}

export const SettingsImageTab = ({
  localSettings,
  setLocalSettings,
}: SettingsImageTabProps) => {
  const { t, i18n } = useTranslation();
  const secondsLabel = (value: number) =>
    `${value}${i18n.language === "ko" ? "초" : i18n.language === "ja" ? "秒" : "s"}`;

  const toggleImageSource = (source: ImageSource) => {
    const newSources = localSettings.imageSources.includes(source)
      ? localSettings.imageSources.filter((s) => s !== source)
      : [...localSettings.imageSources, source];
    setLocalSettings({ ...localSettings, imageSources: newSources });
  };

  const allSourceValues = ALL_IMAGE_SOURCES;

  const selectAllSources = () =>
    setLocalSettings({ ...localSettings, imageSources: allSourceValues });
  const deselectAllSources = () =>
    setLocalSettings({ ...localSettings, imageSources: [] });

  const sourceLabelKeyMap: Record<string, string> = {
    nekos_best: "settings.imageSource.nekosBest",
    waifu_pics: "settings.imageSource.waifuPics",
    nekosia: "settings.imageSource.nekosia",
    waifu_im: "settings.imageSource.waifuIm",
    nekos_moe: "settings.imageSource.nekosMoe",
    danbooru: "settings.imageSource.danbooru",
    pic_re: "settings.imageSource.picRe",
    nekosapi: "settings.imageSource.nekosapi",
    wallhaven: "settings.imageSource.wallhaven",
  };

  const availableSources: Array<{ value: ImageSource; label: string }> =
    allSourceValues.map((value) => ({
      value,
      label: t(sourceLabelKeyMap[value] ?? value),
    }));

  return (
    <>
      {/* Image Settings */}
      <div className="settings-section">
        <h3 className="settings-section-title">{t("settings.image.title")}</h3>

        {/* Image Sources */}
        <div className="settings-option">
          <label className="settings-label">
            {t("settings.imageSource.title")}
          </label>
          <p className="settings-description">
            {t("settings.imageSource.description")}
          </p>
          <div className="source-actions">
            <button
              type="button"
              className="settings-button settings-button-secondary"
              onClick={selectAllSources}
            >
              {t("settings.imageSource.selectAll")}
            </button>
            <button
              type="button"
              className="settings-button settings-button-secondary"
              onClick={deselectAllSources}
            >
              {t("settings.imageSource.deselectAll")}
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
            <p
              className="settings-description"
              style={{ color: "var(--accent)" }}
            >
              {t("settings.imageSource.atLeastOne")}
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
                setLocalSettings({
                  ...localSettings,
                  allowNSFW: e.target.checked,
                })
              }
            />
            <label htmlFor="allowNSFW" className="settings-checkbox-label">
              {t("settings.image.allowNSFW")}{" "}
              <span
                className="nsfw-warning-icon"
                data-tooltip={t("settings.image.nsfwWarning")}
              >
                ⚠️
              </span>
            </label>
          </div>
        </div>

        {/* Image Fit Mode */}
        <div className="settings-option">
          <label className="settings-label">
            {t("settings.image.fitMode")}
          </label>
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
            <option value="cover">{t("settings.image.fitCover")}</option>
            <option value="contain">{t("settings.image.fitContain")}</option>
          </select>
        </div>

        <div className="settings-option">
          <label className="settings-label">
            {t("settings.image.aspectPreference")}
          </label>
          <select
            className="settings-select"
            value={localSettings.imageAspectPreference}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                imageAspectPreference: e.target.value as ImageAspectPreference,
              })
            }
          >
            <option value="screen">{t("settings.image.aspectScreen")}</option>
            <option value="landscape">
              {t("settings.image.aspectLandscape")}
            </option>
            <option value="portrait">
              {t("settings.image.aspectPortrait")}
            </option>
            <option value="square">{t("settings.image.aspectSquare")}</option>
            <option value="any">{t("settings.image.aspectAny")}</option>
          </select>
        </div>

        {/* Letterbox Fill Mode (only show when contain mode is selected) */}
        {localSettings.imageFitMode === "contain" && (
          <>
            <div className="settings-option">
              <label className="settings-label">
                {t("settings.image.letterboxFill")}
              </label>
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
                <option value="blur">
                  {t("settings.image.letterboxBlur")}
                </option>
                <option value="edge-color">
                  {t("settings.image.letterboxEdgeColor")}
                </option>
                <option value="custom">
                  {t("settings.image.letterboxCustom")}
                </option>
                <option value="solid">
                  {t("settings.image.letterboxSolid")}
                </option>
              </select>
            </div>

            {/* Custom Color Picker (only show when custom mode is selected) */}
            {localSettings.letterboxFillMode === "custom" && (
              <div className="settings-option">
                <label className="settings-label">
                  {t("settings.image.customColor")}
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
          <label className="settings-label">
            {t("settings.image.autoRefresh")}
          </label>
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
            <option value="0">{t("settings.image.autoRefreshDisabled")}</option>
            <option value="30">{secondsLabel(30)}</option>
            <option value="60">{secondsLabel(60)}</option>
            <option value="120">{secondsLabel(120)}</option>
            <option value="300">{secondsLabel(300)}</option>
            <option value="600">{secondsLabel(600)}</option>
          </select>
        </div>
      </div>
    </>
  );
};
