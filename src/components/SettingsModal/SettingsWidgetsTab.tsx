import { useTranslation } from "react-i18next";
import type { Dispatch, SetStateAction } from "react";
import type { AppSettings, Widget, WidgetType } from "../../types/settings";

interface SettingsWidgetsTabProps {
  localSettings: AppSettings;
  setLocalSettings: Dispatch<SetStateAction<AppSettings>>;
}

const MAX_WIDGETS = 4;

export const SettingsWidgetsTab = ({
  localSettings,
  setLocalSettings,
}: SettingsWidgetsTabProps) => {
  const { t } = useTranslation();

  const widgetTypeOptions: Array<{ value: WidgetType; label: string }> = [
    { value: "clock", label: t("settings.widgets.clock") },
    { value: "weather", label: t("settings.widgets.weather") },
    { value: "location", label: t("settings.widgets.location") },
    { value: "animeQuote", label: t("settings.widgets.animeQuote") },
    { value: "customText", label: t("settings.widgets.customText") },
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
      type: "clock",
      enabled: true,
      position: { x: 0, y: 0 },
      data: {},
    };
    setLocalSettings({
      ...localSettings,
      widgets: [...localSettings.widgets, newWidget],
    });
  };

  const handleWidgetCustomText = (id: string, text: string) => {
    const target = localSettings.widgets.find((widget) => widget.id === id);
    if (!target) return;
    const data = { ...(target.data || {}), text };
    handleWidgetUpdate(id, { data });
  };

  const handleWidgetPosition = (id: string, axis: "x" | "y", value: number) => {
    const target = localSettings.widgets.find((widget) => widget.id === id);
    if (!target || !Number.isFinite(value)) return;
    handleWidgetUpdate(id, {
      position: {
        ...target.position,
        [axis]: Math.min(500, Math.max(-500, value)),
      },
    });
  };

  return (
    <>
      {/* Widgets Settings */}
      <div className="settings-section">
        <div className="settings-section-header">
          <h3 className="settings-section-title">
            {t("settings.widgets.title")}
          </h3>
          <p className="settings-description">
            {t("settings.widgets.description")}
          </p>
        </div>

        <div className="settings-option">
          <label className="settings-label" htmlFor="weatherApiKey">
            {t("settings.widgets.weatherApiKeyLabel")}
          </label>
          <p className="settings-description">
            {t("settings.widgets.weatherApiKeyDescription")}
          </p>
          <input
            id="weatherApiKey"
            type="password"
            className="settings-input"
            value={localSettings.weatherApiKey ?? ""}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                weatherApiKey: e.target.value,
              })
            }
            placeholder={t("settings.widgets.weatherApiKeyPlaceholder")}
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
              ? t("settings.widgets.limitReached")
              : t("settings.widgets.add")}
          </button>
          <span className="widget-limit-hint">
            {t("settings.widgets.limit", { count: MAX_WIDGETS })}
          </span>
        </div>

        {localSettings.widgets.length === 0 ? (
          <p className="settings-description">{t("settings.widgets.empty")}</p>
        ) : (
          <div className="widget-config-list">
            {localSettings.widgets.map((widget, index) => (
              <div key={widget.id} className="widget-config-card">
                <div className="widget-config-header">
                  <div>
                    <p className="widget-config-label">
                      {t("settings.widgets.cardLabel", {
                        index: index + 1,
                      })}
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
                      aria-label={t("settings.widgets.moveUp")}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="widget-config-action"
                      onClick={() => handleWidgetMove(index, 1)}
                      disabled={index === localSettings.widgets.length - 1}
                      aria-label={t("settings.widgets.moveDown")}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="widget-config-action danger"
                      onClick={() => handleWidgetRemove(widget.id)}
                      aria-label={t("settings.widgets.remove")}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="widget-config-row">
                  <label className="widget-config-label">
                    {t("settings.widgets.typeLabel")}
                  </label>
                  <select
                    className="settings-select"
                    value={widget.type}
                    onChange={(e) =>
                      handleWidgetTypeChange(
                        widget.id,
                        e.target.value as WidgetType,
                      )
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
                  <span className="widget-config-label">
                    {t("settings.widgets.position")}
                  </span>
                  <div className="widget-position-grid">
                    <label>
                      <span>{t("settings.widgets.offsetX")}</span>
                      <input
                        className="settings-input"
                        type="number"
                        min={-500}
                        max={500}
                        step={10}
                        value={widget.position.x}
                        onChange={(event) =>
                          handleWidgetPosition(
                            widget.id,
                            "x",
                            Number(event.target.value),
                          )
                        }
                      />
                    </label>
                    <label>
                      <span>{t("settings.widgets.offsetY")}</span>
                      <input
                        className="settings-input"
                        type="number"
                        min={-500}
                        max={500}
                        step={10}
                        value={widget.position.y}
                        onChange={(event) =>
                          handleWidgetPosition(
                            widget.id,
                            "y",
                            Number(event.target.value),
                          )
                        }
                      />
                    </label>
                  </div>
                  <p className="settings-description">
                    {t("settings.widgets.positionDescription")}
                  </p>
                </div>

                <div className="widget-config-row">
                  <label className="widget-config-label">
                    {t("settings.widgets.visible")}
                  </label>
                  <label className="widget-config-toggle">
                    <input
                      type="checkbox"
                      checked={widget.enabled}
                      onChange={(e) =>
                        handleWidgetToggle(widget.id, e.target.checked)
                      }
                    />
                    <span>
                      {widget.enabled
                        ? t("settings.widgets.enabled")
                        : t("settings.widgets.disabled")}
                    </span>
                  </label>
                </div>

                {widget.type === "customText" && (
                  <div className="widget-config-row">
                    <label className="widget-config-label">
                      {t("settings.widgets.customTextLabel")}
                    </label>
                    <textarea
                      className="widget-config-textarea"
                      rows={2}
                      value={
                        typeof widget.data?.text === "string"
                          ? widget.data.text
                          : ""
                      }
                      onChange={(e) =>
                        handleWidgetCustomText(widget.id, e.target.value)
                      }
                      placeholder={t("settings.widgets.customTextPlaceholder")}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
