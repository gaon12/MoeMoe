import { useCallback, useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../../contexts/useApp";
import {
  type ThemeMode,
  type Language,
  type AppSettings,
  defaultSettings,
} from "../../types/settings";
import {
  createSettingsExport,
  parseSettingsExport,
} from "../../utils/settingsExport";
import { useModalAccessibility } from "../../hooks/useModalAccessibility";
import { SettingsImageTab } from "./SettingsImageTab";
import { SettingsInfoTab } from "./SettingsInfoTab";
import { SettingsWidgetsTab } from "./SettingsWidgetsTab";
import "./SettingsModal.css";

const MAX_WIDGETS = 4;

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
  const [activeTab, setActiveTab] = useState<
    "general" | "image" | "clock" | "widgets" | "info"
  >("general");
  const [settingsTransferStatus, setSettingsTransferStatus] = useState<
    "idle" | "imported" | "failed"
  >("idle");
  const importInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const secondsLabel = (n: number) =>
    `${n}${i18n.language === "ko" ? "초" : i18n.language === "ja" ? "秒" : "s"}`;

  useEffect(() => {
    if (!isSettingsOpen) setLocalSettings(settings);
  }, [isSettingsOpen, settings]);

  const handleUserImagesAvailabilityChange = useCallback(
    (available: boolean) => {
      const withoutUserImages = settings.imageSources.filter(
        (source) => source !== "user_uploads",
      );
      const imageSources = available
        ? settings.imageSources.includes("user_uploads")
          ? settings.imageSources
          : [...settings.imageSources, "user_uploads" as const]
        : withoutUserImages.length > 0
          ? withoutUserImages
          : ["pic_re" as const];
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

  useModalAccessibility(isSettingsOpen, modalRef, handleClose);

  if (!isSettingsOpen) return null;

  const handleSave = () => {
    if (localSettings.imageSources.length === 0) return;
    const widgetLimit = localSettings.widgets.slice(0, MAX_WIDGETS);
    updateSettings({
      ...localSettings,
      widgets: widgetLimit,
      weatherApiKey: (localSettings.weatherApiKey ?? "").trim(),
    });
    setIsSettingsOpen(false);
    setActiveTab("general");
    setSettingsTransferStatus("idle");
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
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
    if (!file) return;

    try {
      const imported = parseSettingsExport(await file.text());
      setLocalSettings((prev) => ({
        ...prev,
        ...imported,
        weatherApiKey:
          typeof imported.weatherApiKey === "string"
            ? imported.weatherApiKey.trim()
            : prev.weatherApiKey,
      }));
      setSettingsTransferStatus("imported");
    } catch (error) {
      console.error("Failed to import settings:", error);
      setSettingsTransferStatus("failed");
    }
  };

  const handleResetSettings = () => {
    resetSettings();
    setLocalSettings(defaultSettings);
    setSettingsTransferStatus("idle");
  };

  return (
    <div className="settings-modal-overlay" onClick={handleOverlayClick}>
      <div
        ref={modalRef}
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        tabIndex={-1}
      >
        <div className="settings-header">
          <h2 id="settings-modal-title" className="settings-title">
            {t("settings.title")}
          </h2>
          <button
            className="settings-close"
            onClick={handleClose}
            aria-label={t("settings.close")}
          >
            ✕
          </button>
        </div>

        <div className="settings-content">
          <div
            className="settings-tabs"
            role="tablist"
            aria-label={t("settings.title")}
          >
            <button
              type="button"
              className={`settings-tab${activeTab === "general" ? " settings-tab-active" : ""}`}
              onClick={() => setActiveTab("general")}
              role="tab"
              aria-selected={activeTab === "general"}
            >
              {t("settings.tabs.general")}
            </button>
            <button
              type="button"
              className={`settings-tab${activeTab === "image" ? " settings-tab-active" : ""}`}
              onClick={() => setActiveTab("image")}
              role="tab"
              aria-selected={activeTab === "image"}
            >
              {t("settings.tabs.image")}
            </button>
            <button
              type="button"
              className={`settings-tab${activeTab === "clock" ? " settings-tab-active" : ""}`}
              onClick={() => setActiveTab("clock")}
              role="tab"
              aria-selected={activeTab === "clock"}
            >
              {t("settings.tabs.clock")}
            </button>
            <button
              type="button"
              className={`settings-tab${activeTab === "widgets" ? " settings-tab-active" : ""}`}
              onClick={() => setActiveTab("widgets")}
              role="tab"
              aria-selected={activeTab === "widgets"}
            >
              {t("settings.tabs.widgets")}
            </button>
            <button
              type="button"
              className={`settings-tab${activeTab === "info" ? " settings-tab-active" : ""}`}
              onClick={() => setActiveTab("info")}
              role="tab"
              aria-selected={activeTab === "info"}
            >
              {t("settings.tabs.info")}
            </button>
          </div>

          {activeTab === "general" && (
            <>
              {/* Language Settings */}
              <div className="settings-section">
                <h3 className="settings-section-title">
                  {t("settings.language.title")}
                </h3>
                <div className="settings-option">
                  <label className="settings-label">
                    {t("settings.language.title")}
                  </label>
                  <select
                    className="settings-select"
                    value={localSettings.language}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        language: e.target.value as Language,
                      })
                    }
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
                  <label className="settings-label">
                    {t("settings.theme.title")}
                  </label>
                  <select
                    className="settings-select"
                    value={localSettings.theme}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        theme: e.target.value as ThemeMode,
                      })
                    }
                  >
                    <option value="dark">{t("settings.theme.dark")}</option>
                    <option value="light">{t("settings.theme.light")}</option>
                    <option value="auto">{t("settings.theme.auto")}</option>
                  </select>
                </div>
              </div>

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
                      id="showSeconds"
                      className="settings-checkbox"
                      checked={localSettings.showSeconds}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          showSeconds: e.target.checked,
                        })
                      }
                    />
                    <label
                      htmlFor="showSeconds"
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
                      id="use24Hour"
                      className="settings-checkbox"
                      checked={localSettings.use24Hour}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          use24Hour: e.target.checked,
                        })
                      }
                    />
                    <label
                      htmlFor="use24Hour"
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
                        id="showAmPm"
                        className="settings-checkbox"
                        checked={localSettings.showAmPm}
                        onChange={(e) =>
                          setLocalSettings({
                            ...localSettings,
                            showAmPm: e.target.checked,
                          })
                        }
                      />
                      <label
                        htmlFor="showAmPm"
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
                        <label className="settings-label">
                          {t("settings.appearance.amPmStyle.title")}
                        </label>
                        <select
                          className="settings-select"
                          value={localSettings.amPmStyle}
                          onChange={(e) =>
                            setLocalSettings({
                              ...localSettings,
                              amPmStyle: e.target
                                .value as AppSettings["amPmStyle"],
                            })
                          }
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
                      <label className="settings-label">
                        {t("settings.appearance.amPmPosition")}
                      </label>
                      <select
                        className="settings-select"
                        value={localSettings.amPmPosition}
                        onChange={(e) =>
                          setLocalSettings({
                            ...localSettings,
                            amPmPosition: e.target
                              .value as AppSettings["amPmPosition"],
                          })
                        }
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
                      id="useServerTime"
                      className="settings-checkbox"
                      checked={localSettings.useServerTime}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          useServerTime: e.target.checked,
                        })
                      }
                    />
                    <label
                      htmlFor="useServerTime"
                      className="settings-checkbox-label"
                    >
                      {t("settings.time.useServerTime")}
                    </label>
                  </div>
                  <p className="settings-description">
                    {t("settings.time.useServerTimeDesc")}
                  </p>
                </div>

                {localSettings.useServerTime && (
                  <div className="settings-option">
                    <label className="settings-label">
                      {t("settings.time.updateInterval")}
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
            className="settings-button settings-button-secondary"
            onClick={handleClose}
          >
            {t("settings.close")}
          </button>
          <button
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
