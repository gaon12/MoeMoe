import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../../contexts/useApp.ts";
import {
  type ThemeMode,
  type Language,
  type AppSettings,
  type UiVisibilitySettings,
  defaultSettings,
} from "../../types/settings.ts";
import {
  createSettingsExport,
  MAX_SETTINGS_IMPORT_BYTES,
  parseSettingsExport,
} from "../../utils/settingsExport.ts";
import { useModalAccessibility } from "../../hooks/useModalAccessibility.ts";
import { SettingsTabBar, SettingsVisibilityGrid } from "./SettingsControls.tsx";
import type { SettingsTab } from "./settingsOptions.ts";
import { SettingsImageTab } from "./SettingsImageTab.tsx";
import { SettingsInfoTab } from "./SettingsInfoTab.tsx";
import { SettingsWidgetsTab } from "./SettingsWidgetsTab.tsx";
import "./SettingsModal.css";

const MAX_WIDGETS = 4;
const SERVER_TIME_UPDATE_INTERVAL_OPTIONS = ["10", "30", "60", "300"];

const getSecondsSuffix = (language: string) => {
  if (language === "ko") {
    return "초";
  }
  if (language === "ja") {
    return "秒";
  }
  return "s";
};

export const SettingsModal = () => {
  const { t, i18n } = useTranslation();
  const {
    settings,
    updateSettings,
    resetSettings,
    isSettingsOpen,
    setIsSettingsOpen,
  } = useApp();
  const [localSettings, setLocalSettings] = useState(settings);
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [settingsTransferStatus, setSettingsTransferStatus] = useState<
    "idle" | "imported" | "failed"
  >("idle");
  const idPrefix = useId();
  const importInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const secondsLabel = (n: number) => `${n}${getSecondsSuffix(i18n.language)}`;

  useEffect(() => {
    if (!isSettingsOpen) {
      setLocalSettings(settings);
    }
  }, [isSettingsOpen, settings]);

  const handleUserImagesAvailabilityChange = useCallback(
    (available: boolean) => {
      const withoutUserImages = settings.imageSources.filter(
        (source) => source !== "user_uploads",
      );
      let imageSources: AppSettings["imageSources"];
      if (available) {
        imageSources = settings.imageSources.includes("user_uploads")
          ? settings.imageSources
          : [...settings.imageSources, "user_uploads"];
      } else {
        imageSources =
          withoutUserImages.length > 0 ? withoutUserImages : ["pic_re"];
      }
      updateSettings({ imageSources });
    },
    [settings.imageSources, updateSettings],
  );

  const handleClose = useCallback(() => {
    setIsSettingsOpen(false);
    setLocalSettings(settings);
    setActiveTab("general");
    setSettingsTransferStatus("idle");
  }, [setIsSettingsOpen, settings]);

  const handleUiVisibilityChange = useCallback(
    (key: keyof UiVisibilitySettings, visible: boolean) => {
      setLocalSettings((previous) => ({
        ...previous,
        uiVisibility: {
          ...previous.uiVisibility,
          [key]: visible,
        },
      }));
    },
    [],
  );

  /**
   * Stable change handlers for the plain settings fields. Building them once
   * keeps every control out of the render path's allocation budget and lets
   * the inputs receive an unchanging `onChange` identity.
   */
  const fieldHandlers = useMemo(
    () => ({
      language: (event: React.ChangeEvent<HTMLSelectElement>) => {
        const language = event.target.value as Language;
        setLocalSettings((previous) => ({ ...previous, language }));
      },
      theme: (event: React.ChangeEvent<HTMLSelectElement>) => {
        const theme = event.target.value as ThemeMode;
        setLocalSettings((previous) => ({ ...previous, theme }));
      },
      showSeconds: (event: React.ChangeEvent<HTMLInputElement>) => {
        const showSeconds = event.target.checked;
        setLocalSettings((previous) => ({ ...previous, showSeconds }));
      },
      use24Hour: (event: React.ChangeEvent<HTMLInputElement>) => {
        const use24Hour = event.target.checked;
        setLocalSettings((previous) => ({ ...previous, use24Hour }));
      },
      showAmPm: (event: React.ChangeEvent<HTMLInputElement>) => {
        const showAmPm = event.target.checked;
        setLocalSettings((previous) => ({ ...previous, showAmPm }));
      },
      amPmStyle: (event: React.ChangeEvent<HTMLSelectElement>) => {
        const amPmStyle = event.target.value as AppSettings["amPmStyle"];
        setLocalSettings((previous) => ({ ...previous, amPmStyle }));
      },
      amPmPosition: (event: React.ChangeEvent<HTMLSelectElement>) => {
        const amPmPosition = event.target.value as AppSettings["amPmPosition"];
        setLocalSettings((previous) => ({ ...previous, amPmPosition }));
      },
      useServerTime: (event: React.ChangeEvent<HTMLInputElement>) => {
        const useServerTime = event.target.checked;
        setLocalSettings((previous) => ({ ...previous, useServerTime }));
      },
      serverTimeUpdateIntervalSec: (
        event: React.ChangeEvent<HTMLSelectElement>,
      ) => {
        const serverTimeUpdateIntervalSec = Number(event.target.value);
        setLocalSettings((previous) => ({
          ...previous,
          serverTimeUpdateIntervalSec,
        }));
      },
    }),
    [],
  );

  useModalAccessibility(isSettingsOpen, modalRef, handleClose);

  if (!isSettingsOpen) {
    return null;
  }

  const handleSave = () => {
    if (localSettings.imageSources.length === 0) {
      return;
    }
    const widgetLimit = localSettings.widgets.slice(0, MAX_WIDGETS);
    updateSettings({
      ...localSettings,
      widgets: widgetLimit,
      weatherApiKey: localSettings.weatherApiKey.trim(),
    });
    setIsSettingsOpen(false);
    setActiveTab("general");
    setSettingsTransferStatus("idle");
  };

  const handleExportSettings = () => {
    const blob = new Blob([createSettingsExport(localSettings)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `moemoe-settings-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportSettingsClick = () => {
    importInputRef.current?.click();
  };

  const handleImportSettings = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    try {
      if (file.size > MAX_SETTINGS_IMPORT_BYTES) {
        throw new Error("Settings import file is too large");
      }
      const imported = parseSettingsExport(await file.text());
      setLocalSettings((prev) => ({
        ...prev,
        ...imported,
        weatherApiKey: prev.weatherApiKey,
      }));
      setSettingsTransferStatus("imported");
    } catch {
      setSettingsTransferStatus("failed");
    }
  };

  const handleResetSettings = () => {
    resetSettings();
    setLocalSettings(defaultSettings);
    setSettingsTransferStatus("idle");
  };

  return (
    <div className="settings-modal-overlay">
      <button
        type="button"
        className="settings-modal-backdrop"
        onClick={handleClose}
        aria-label={t("settings.close")}
        tabIndex={-1}
      />
      <div
        ref={modalRef}
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${idPrefix}-title`}
        tabIndex={-1}
      >
        <div className="settings-header">
          <h2 id={`${idPrefix}-title`} className="settings-title">
            {t("settings.title")}
          </h2>
          <button
            type="button"
            className="settings-close"
            onClick={handleClose}
            aria-label={t("settings.close")}
          >
            {"✕"}
          </button>
        </div>

        <div className="settings-content">
          <SettingsTabBar activeTab={activeTab} onSelect={setActiveTab} />

          {activeTab === "general" && (
            <>
              {/* Language Settings */}
              <div className="settings-section">
                <h3 className="settings-section-title">
                  {t("settings.language.title")}
                </h3>
                <div className="settings-option">
                  <label
                    className="settings-label"
                    htmlFor={`${idPrefix}-language`}
                  >
                    {t("settings.language.title")}
                  </label>
                  <select
                    id={`${idPrefix}-language`}
                    className="settings-select"
                    value={localSettings.language}
                    onChange={fieldHandlers.language}
                  >
                    <option value="ko">{t("settings.language.korean")}</option>
                    <option value="en">{t("settings.language.english")}</option>
                    <option value="ja">
                      {t("settings.language.japanese")}
                    </option>
                  </select>
                </div>
              </div>

              {/* Theme Settings */}
              <div className="settings-section">
                <h3 className="settings-section-title">
                  {t("settings.theme.title")}
                </h3>
                <div className="settings-option">
                  <label
                    className="settings-label"
                    htmlFor={`${idPrefix}-theme`}
                  >
                    {t("settings.theme.title")}
                  </label>
                  <select
                    id={`${idPrefix}-theme`}
                    className="settings-select"
                    value={localSettings.theme}
                    onChange={fieldHandlers.theme}
                  >
                    <option value="dark">{t("settings.theme.dark")}</option>
                    <option value="light">{t("settings.theme.light")}</option>
                    <option value="auto">{t("settings.theme.auto")}</option>
                  </select>
                </div>
              </div>

              <fieldset className="settings-section settings-fieldset">
                <legend className="settings-section-title">
                  {t("settings.visibility.title")}
                </legend>
                <p className="settings-description">
                  {t("settings.visibility.description")}
                </p>
                <SettingsVisibilityGrid
                  visibility={localSettings.uiVisibility}
                  onChange={handleUiVisibilityChange}
                />
              </fieldset>

              <div className="settings-section">
                <h3 className="settings-section-title">
                  {t("settings.management.title")}
                </h3>
                <p className="settings-description">
                  {t("settings.management.description")}
                </p>
                <div className="settings-management-actions">
                  <button
                    type="button"
                    className="settings-button settings-button-secondary"
                    onClick={handleExportSettings}
                  >
                    {t("settings.management.export")}
                  </button>
                  <button
                    type="button"
                    className="settings-button settings-button-secondary"
                    onClick={handleImportSettingsClick}
                  >
                    {t("settings.management.import")}
                  </button>
                  <button
                    type="button"
                    className="settings-button settings-button-danger"
                    onClick={handleResetSettings}
                  >
                    {t("settings.management.reset")}
                  </button>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="settings-file-input"
                    onChange={handleImportSettings}
                  />
                </div>
                {settingsTransferStatus === "imported" && (
                  <p className="settings-description settings-status-success">
                    {t("settings.management.imported")}
                  </p>
                )}
                {settingsTransferStatus === "failed" && (
                  <p className="settings-description settings-status-error">
                    {t("settings.management.importFailed")}
                  </p>
                )}
              </div>
            </>
          )}

          {activeTab === "image" && (
            <SettingsImageTab
              localSettings={localSettings}
              setLocalSettings={setLocalSettings}
              onUserImagesAvailabilityChange={
                handleUserImagesAvailabilityChange
              }
            />
          )}

          {activeTab === "clock" && (
            <>
              {/* Clock Settings */}
              <div className="settings-section">
                <h3 className="settings-section-title">
                  {t("settings.appearance.title")}
                </h3>
                <div className="settings-option">
                  <div className="settings-checkbox-group">
                    <input
                      type="checkbox"
                      id={`${idPrefix}-show-seconds`}
                      className="settings-checkbox"
                      checked={localSettings.showSeconds}
                      onChange={fieldHandlers.showSeconds}
                    />
                    <label
                      htmlFor={`${idPrefix}-show-seconds`}
                      className="settings-checkbox-label"
                    >
                      {t("settings.appearance.showSeconds")}
                    </label>
                  </div>
                </div>

                <div className="settings-option">
                  <div className="settings-checkbox-group">
                    <input
                      type="checkbox"
                      id={`${idPrefix}-use-24-hour`}
                      className="settings-checkbox"
                      checked={localSettings.use24Hour}
                      onChange={fieldHandlers.use24Hour}
                    />
                    <label
                      htmlFor={`${idPrefix}-use-24-hour`}
                      className="settings-checkbox-label"
                    >
                      {t("settings.appearance.use24Hour")}
                    </label>
                  </div>
                </div>

                {/* AM/PM visibility, style and position (12-hour only) */}
                {!localSettings.use24Hour && (
                  <div className="settings-option">
                    <div className="settings-checkbox-group">
                      <input
                        type="checkbox"
                        id={`${idPrefix}-show-am-pm`}
                        className="settings-checkbox"
                        checked={localSettings.showAmPm}
                        onChange={fieldHandlers.showAmPm}
                      />
                      <label
                        htmlFor={`${idPrefix}-show-am-pm`}
                        className="settings-checkbox-label"
                      >
                        {t("settings.appearance.showAmPm")}
                      </label>
                    </div>
                  </div>
                )}

                {!localSettings.use24Hour && localSettings.showAmPm && (
                  <>
                    {(i18n.language === "ko" || i18n.language === "ja") && (
                      <div className="settings-option">
                        <label
                          className="settings-label"
                          htmlFor={`${idPrefix}-am-pm-style`}
                        >
                          {t("settings.appearance.amPmStyle.title")}
                        </label>
                        <select
                          id={`${idPrefix}-am-pm-style`}
                          className="settings-select"
                          value={localSettings.amPmStyle}
                          onChange={fieldHandlers.amPmStyle}
                        >
                          <option value="locale">
                            {t("settings.appearance.amPmStyle.locale")}
                          </option>
                          <option value="latin">
                            {t("settings.appearance.amPmStyle.latin")}
                          </option>
                        </select>
                        <p className="settings-description">
                          {t("settings.appearance.amPmStyle.desc")}
                        </p>
                      </div>
                    )}

                    <div className="settings-option">
                      <label
                        className="settings-label"
                        htmlFor={`${idPrefix}-am-pm-position`}
                      >
                        {t("settings.appearance.amPmPosition")}
                      </label>
                      <select
                        id={`${idPrefix}-am-pm-position`}
                        className="settings-select"
                        value={localSettings.amPmPosition}
                        onChange={fieldHandlers.amPmPosition}
                      >
                        <option value="before">
                          {t("settings.appearance.before")}
                        </option>
                        <option value="after">
                          {t("settings.appearance.after")}
                        </option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Time Source */}
              <div className="settings-section">
                <h3 className="settings-section-title">
                  {t("settings.time.title")}
                </h3>
                <div className="settings-option">
                  <div className="settings-checkbox-group">
                    <input
                      type="checkbox"
                      id={`${idPrefix}-use-server-time`}
                      className="settings-checkbox"
                      checked={localSettings.useServerTime}
                      onChange={fieldHandlers.useServerTime}
                    />
                    <label
                      htmlFor={`${idPrefix}-use-server-time`}
                      className="settings-checkbox-label"
                    >
                      {t("settings.time.useServerTime")}
                    </label>
                  </div>
                  <p className="settings-description">
                    {t("settings.time.useServerTimeDesc")}
                  </p>
                </div>

                {localSettings.useServerTime ? (
                  <div className="settings-option">
                    <label
                      className="settings-label"
                      htmlFor={`${idPrefix}-server-time-interval`}
                    >
                      {t("settings.time.updateInterval")}
                    </label>
                    <select
                      id={`${idPrefix}-server-time-interval`}
                      className="settings-select"
                      value={localSettings.serverTimeUpdateIntervalSec}
                      onChange={fieldHandlers.serverTimeUpdateIntervalSec}
                    >
                      {SERVER_TIME_UPDATE_INTERVAL_OPTIONS.map((interval) => (
                        <option key={interval} value={interval}>
                          {secondsLabel(Number(interval))}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            </>
          )}

          {activeTab === "widgets" && (
            <SettingsWidgetsTab
              localSettings={localSettings}
              setLocalSettings={setLocalSettings}
            />
          )}

          {activeTab === "info" && <SettingsInfoTab />}
        </div>

        <div className="settings-footer">
          <button
            type="button"
            className="settings-button settings-button-secondary"
            onClick={handleClose}
          >
            {t("settings.close")}
          </button>
          <button
            type="button"
            className="settings-button settings-button-primary"
            onClick={handleSave}
            disabled={localSettings.imageSources.length === 0}
            title={
              localSettings.imageSources.length === 0
                ? t("settings.imageSource.atLeastOne")
                : undefined
            }
          >
            {t("settings.save")}
          </button>
        </div>
      </div>
    </div>
  );
};
