import { useTranslation } from "react-i18next";
import {
  useCallback,
  useId,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type {
  AppSettings,
  ImageAspectPreference,
  ImageFitMode,
  LetterboxFillMode,
} from "../../types/settings.ts";
import { ALL_IMAGE_SOURCES, type ImageSource } from "../../types/image.ts";
import { UserImageManager } from "./UserImageManager.tsx";

const AUTO_REFRESH_INTERVAL_OPTIONS = ["30", "60", "120", "300", "600"];

interface SettingsImageTabProps {
  localSettings: AppSettings;
  setLocalSettings: Dispatch<SetStateAction<AppSettings>>;
  onUserImagesAvailabilityChange: (available: boolean) => void;
}

const getSecondsSuffix = (language: string) => {
  if (language === "ko") {
    return "초";
  }
  if (language === "ja") {
    return "秒";
  }
  return "s";
};

export const SettingsImageTab = ({
  localSettings,
  setLocalSettings,
  onUserImagesAvailabilityChange,
}: SettingsImageTabProps) => {
  const { t, i18n } = useTranslation();
  const idPrefix = useId();
  const secondsLabel = (value: number) =>
    `${value}${getSecondsSuffix(i18n.language)}`;
  const [userImageCount, setUserImageCount] = useState(0);

  const toggleImageSource = useCallback(
    (source: ImageSource) => {
      if (source === "user_uploads" && userImageCount === 0) {
        return;
      }
      setLocalSettings((current) => ({
        ...current,
        imageSources: current.imageSources.includes(source)
          ? current.imageSources.filter(
              (currentSource) => currentSource !== source,
            )
          : [...current.imageSources, source],
      }));
    },
    [setLocalSettings, userImageCount],
  );

  const handleImageSourceChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const source = event.currentTarget.dataset.source as
        | ImageSource
        | undefined;
      if (source) {
        toggleImageSource(source);
      }
    },
    [toggleImageSource],
  );

  const allSourceValues = ALL_IMAGE_SOURCES;

  const selectAllSources = () =>
    setLocalSettings({
      ...localSettings,
      imageSources: allSourceValues.filter(
        (source) => source !== "user_uploads" || userImageCount > 0,
      ),
    });
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
    user_uploads: "settings.imageSource.userUploads",
  };

  const handleUserImagesAdded = useCallback(() => {
    setLocalSettings((current) => ({
      ...current,
      imageSources: current.imageSources.includes("user_uploads")
        ? current.imageSources
        : [...current.imageSources, "user_uploads"],
    }));
    onUserImagesAvailabilityChange(true);
  }, [onUserImagesAvailabilityChange, setLocalSettings]);

  const handleLastUserImageRemoved = useCallback(() => {
    setLocalSettings((current) => {
      const remainingSources = current.imageSources.filter(
        (source) => source !== "user_uploads",
      );
      return {
        ...current,
        imageSources:
          remainingSources.length > 0 ? remainingSources : ["pic_re"],
      };
    });
    onUserImagesAvailabilityChange(false);
  }, [onUserImagesAvailabilityChange, setLocalSettings]);

  const handleAllowNsfwChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const allowNSFW = event.currentTarget.checked;
      setLocalSettings((current) => ({ ...current, allowNSFW }));
    },
    [setLocalSettings],
  );

  const handleFitModeChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const imageFitMode = event.currentTarget.value as ImageFitMode;
      setLocalSettings((current) => ({ ...current, imageFitMode }));
    },
    [setLocalSettings],
  );

  const handleAspectPreferenceChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const imageAspectPreference = event.currentTarget
        .value as ImageAspectPreference;
      setLocalSettings((current) => ({ ...current, imageAspectPreference }));
    },
    [setLocalSettings],
  );

  const handleLetterboxFillChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const letterboxFillMode = event.currentTarget.value as LetterboxFillMode;
      setLocalSettings((current) => ({ ...current, letterboxFillMode }));
    },
    [setLocalSettings],
  );

  const handleLetterboxColorChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const letterboxCustomColor = event.currentTarget.value;
      setLocalSettings((current) => ({ ...current, letterboxCustomColor }));
    },
    [setLocalSettings],
  );

  const handleFavoriteClickActionChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const favoriteClickAction = event.currentTarget
        .value as AppSettings["favoriteClickAction"];
      setLocalSettings((current) => ({ ...current, favoriteClickAction }));
    },
    [setLocalSettings],
  );

  const handleRefreshIntervalChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const imageChangeInterval = Number(event.currentTarget.value);
      setLocalSettings((current) => ({ ...current, imageChangeInterval }));
    },
    [setLocalSettings],
  );

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
          <span className="settings-label">
            {t("settings.imageSource.title")}
          </span>
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
                  id={`${idPrefix}-source-${source.value}`}
                  data-source={source.value}
                  className="settings-checkbox"
                  checked={localSettings.imageSources.includes(source.value)}
                  disabled={
                    source.value === "user_uploads" && userImageCount === 0
                  }
                  onChange={handleImageSourceChange}
                />
                <label
                  htmlFor={`${idPrefix}-source-${source.value}`}
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

        <UserImageManager
          onCountChange={setUserImageCount}
          onImagesAdded={handleUserImagesAdded}
          onLastImageRemoved={handleLastUserImageRemoved}
        />

        {/* NSFW Toggle */}
        <div className="settings-option">
          <div className="settings-checkbox-group">
            <input
              type="checkbox"
              id={`${idPrefix}-allow-nsfw`}
              className="settings-checkbox nsfw-checkbox"
              checked={localSettings.allowNSFW}
              onChange={handleAllowNsfwChange}
            />
            <label
              htmlFor={`${idPrefix}-allow-nsfw`}
              className="settings-checkbox-label"
            >
              {t("settings.image.allowNSFW")}{" "}
              <span
                className="nsfw-warning-icon"
                data-tooltip={t("settings.image.nsfwWarning")}
              >
                {"⚠️"}
              </span>
            </label>
          </div>
        </div>

        <div className="settings-option">
          <label
            className="settings-label"
            htmlFor={`${idPrefix}-favorite-click-action`}
          >
            {t("settings.favoriteClickAction.label")}
          </label>
          <select
            id={`${idPrefix}-favorite-click-action`}
            className="settings-select"
            value={localSettings.favoriteClickAction}
            onChange={handleFavoriteClickActionChange}
          >
            <option value="apply">
              {t("settings.favoriteClickAction.apply")}
            </option>
            <option value="openSource">
              {t("settings.favoriteClickAction.openSource")}
            </option>
          </select>
        </div>

        {/* Image Fit Mode */}
        <div className="settings-option">
          <label className="settings-label" htmlFor={`${idPrefix}-fit-mode`}>
            {t("settings.image.fitMode")}
          </label>
          <select
            id={`${idPrefix}-fit-mode`}
            className="settings-select"
            value={localSettings.imageFitMode}
            onChange={handleFitModeChange}
          >
            <option value="cover">{t("settings.image.fitCover")}</option>
            <option value="contain">{t("settings.image.fitContain")}</option>
          </select>
        </div>

        <div className="settings-option">
          <label
            className="settings-label"
            htmlFor={`${idPrefix}-aspect-preference`}
          >
            {t("settings.image.aspectPreference")}
          </label>
          <select
            id={`${idPrefix}-aspect-preference`}
            className="settings-select"
            value={localSettings.imageAspectPreference}
            onChange={handleAspectPreferenceChange}
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
              <label
                className="settings-label"
                htmlFor={`${idPrefix}-letterbox-fill`}
              >
                {t("settings.image.letterboxFill")}
              </label>
              <select
                id={`${idPrefix}-letterbox-fill`}
                className="settings-select"
                value={localSettings.letterboxFillMode}
                onChange={handleLetterboxFillChange}
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
                <label
                  className="settings-label"
                  htmlFor={`${idPrefix}-custom-color`}
                >
                  {t("settings.image.customColor")}
                </label>
                <input
                  id={`${idPrefix}-custom-color`}
                  type="color"
                  className="settings-color-picker"
                  value={localSettings.letterboxCustomColor}
                  onChange={handleLetterboxColorChange}
                />
              </div>
            )}
          </>
        )}

        {/* Auto Refresh Interval */}
        <div className="settings-option">
          <label
            className="settings-label"
            htmlFor={`${idPrefix}-auto-refresh`}
          >
            {t("settings.image.autoRefresh")}
          </label>
          <select
            id={`${idPrefix}-auto-refresh`}
            className="settings-select"
            value={localSettings.imageChangeInterval}
            onChange={handleRefreshIntervalChange}
          >
            <option value="0">{t("settings.image.autoRefreshDisabled")}</option>
            {AUTO_REFRESH_INTERVAL_OPTIONS.map((interval) => (
              <option key={interval} value={interval}>
                {secondsLabel(Number(interval))}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
};
