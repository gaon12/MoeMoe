import { useTranslation } from "react-i18next";
import { useCallback, useId, type Dispatch, type SetStateAction } from "react";
import type { AppSettings, Widget, WidgetType } from "../../types/settings.ts";

interface SettingsWidgetsTabProps {
  localSettings: AppSettings;
  setLocalSettings: Dispatch<SetStateAction<AppSettings>>;
}

const MAX_WIDGETS = 4;
const MAX_WIDGET_POSITION_OFFSET = 500;

export const SettingsWidgetsTab = ({
  localSettings,
  setLocalSettings,
}: SettingsWidgetsTabProps) => {
  const { t } = useTranslation();
  const idPrefix = useId();

  const widgetTypeOptions: Array<{ value: WidgetType; label: string }> = [
    { value: "clock", label: t("settings.widgets.clock") },
    { value: "weather", label: t("settings.widgets.weather") },
    { value: "location", label: t("settings.widgets.location") },
    { value: "animeQuote", label: t("settings.widgets.animeQuote") },
    { value: "customText", label: t("settings.widgets.customText") },
  ];

  const handleWidgetUpdate = useCallback(
    (id: string, updates: Partial<Widget>) => {
      setLocalSettings((current) => ({
        ...current,
        widgets: current.widgets.map((widget) =>
          widget.id === id ? { ...widget, ...updates } : widget,
        ),
      }));
    },
    [setLocalSettings],
  );

  const handleWidgetTypeChange = useCallback(
    (id: string, type: WidgetType) => {
      handleWidgetUpdate(id, { type });
    },
    [handleWidgetUpdate],
  );

  const handleWidgetToggle = useCallback(
    (id: string, enabled: boolean) => {
      handleWidgetUpdate(id, { enabled });
    },
    [handleWidgetUpdate],
  );

  const handleWidgetRemove = useCallback(
    (id: string) => {
      setLocalSettings((current) => ({
        ...current,
        widgets: current.widgets.filter((widget) => widget.id !== id),
      }));
    },
    [setLocalSettings],
  );

  const handleWidgetMove = useCallback(
    (index: number, offset: number) => {
      setLocalSettings((current) => {
        const newIndex = index + offset;
        if (newIndex < 0 || newIndex >= current.widgets.length) {
          return current;
        }
        const widgets = [...current.widgets];
        const [moved] = widgets.splice(index, 1);
        if (!moved) {
          return current;
        }
        widgets.splice(newIndex, 0, moved);
        return { ...current, widgets };
      });
    },
    [setLocalSettings],
  );

  const handleWidgetAdd = useCallback(() => {
    setLocalSettings((current) => {
      if (current.widgets.length >= MAX_WIDGETS) {
        return current;
      }
      const newWidget: Widget = {
        id: `widget-${Date.now()}`,
        type: "clock",
        enabled: true,
        position: { x: 0, y: 0 },
        data: {},
      };
      return { ...current, widgets: [...current.widgets, newWidget] };
    });
  }, [setLocalSettings]);

  const handleWidgetCustomText = useCallback(
    (id: string, text: string) => {
      setLocalSettings((current) => ({
        ...current,
        widgets: current.widgets.map((widget) =>
          widget.id === id
            ? { ...widget, data: { ...(widget.data || {}), text } }
            : widget,
        ),
      }));
    },
    [setLocalSettings],
  );

  const handleWidgetPosition = useCallback(
    (id: string, axis: "x" | "y", value: number) => {
      if (!Number.isFinite(value)) {
        return;
      }
      setLocalSettings((current) => ({
        ...current,
        widgets: current.widgets.map((widget) =>
          widget.id === id
            ? {
                ...widget,
                position: {
                  ...widget.position,
                  [axis]: Math.min(
                    MAX_WIDGET_POSITION_OFFSET,
                    Math.max(-MAX_WIDGET_POSITION_OFFSET, value),
                  ),
                },
              }
            : widget,
        ),
      }));
    },
    [setLocalSettings],
  );

  const handleWeatherApiKeyChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const weatherApiKey = event.currentTarget.value;
      setLocalSettings((current) => ({ ...current, weatherApiKey }));
    },
    [setLocalSettings],
  );
  const handleWidgetMoveClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      handleWidgetMove(
        Number(event.currentTarget.dataset.index),
        Number(event.currentTarget.dataset.offset),
      );
    },
    [handleWidgetMove],
  );
  const handleWidgetRemoveClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const { widgetId } = event.currentTarget.dataset;
      if (widgetId) {
        handleWidgetRemove(widgetId);
      }
    },
    [handleWidgetRemove],
  );
  const handleWidgetTypeSelect = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const { widgetId } = event.currentTarget.dataset;
      if (widgetId) {
        handleWidgetTypeChange(
          widgetId,
          event.currentTarget.value as WidgetType,
        );
      }
    },
    [handleWidgetTypeChange],
  );
  const handleWidgetPositionChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { widgetId, axis } = event.currentTarget.dataset;
      if (widgetId && (axis === "x" || axis === "y")) {
        handleWidgetPosition(widgetId, axis, Number(event.currentTarget.value));
      }
    },
    [handleWidgetPosition],
  );
  const handleWidgetEnabledChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { widgetId } = event.currentTarget.dataset;
      if (widgetId) {
        handleWidgetToggle(widgetId, event.currentTarget.checked);
      }
    },
    [handleWidgetToggle],
  );
  const handleWidgetTextChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const { widgetId } = event.currentTarget.dataset;
      if (widgetId) {
        handleWidgetCustomText(widgetId, event.currentTarget.value);
      }
    },
    [handleWidgetCustomText],
  );

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
          <label
            className="settings-label"
            htmlFor={`${idPrefix}-weather-api-key`}
          >
            {t("settings.widgets.weatherApiKeyLabel")}
          </label>
          <p className="settings-description">
            {t("settings.widgets.weatherApiKeyDescription")}
          </p>
          <input
            id={`${idPrefix}-weather-api-key`}
            type="password"
            className="settings-input"
            value={localSettings.weatherApiKey}
            onChange={handleWeatherApiKeyChange}
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
                      data-index={index}
                      data-offset={-1}
                      className="widget-config-action"
                      onClick={handleWidgetMoveClick}
                      disabled={index === 0}
                      aria-label={t("settings.widgets.moveUp")}
                    >
                      {"↑"}
                    </button>
                    <button
                      type="button"
                      data-index={index}
                      data-offset={1}
                      className="widget-config-action"
                      onClick={handleWidgetMoveClick}
                      disabled={index === localSettings.widgets.length - 1}
                      aria-label={t("settings.widgets.moveDown")}
                    >
                      {"↓"}
                    </button>
                    <button
                      type="button"
                      data-widget-id={widget.id}
                      className="widget-config-action danger"
                      onClick={handleWidgetRemoveClick}
                      aria-label={t("settings.widgets.remove")}
                    >
                      {"✕"}
                    </button>
                  </div>
                </div>

                <div className="widget-config-row">
                  <label
                    className="widget-config-label"
                    htmlFor={`${idPrefix}-${widget.id}-type`}
                  >
                    {t("settings.widgets.typeLabel")}
                  </label>
                  <select
                    id={`${idPrefix}-${widget.id}-type`}
                    data-widget-id={widget.id}
                    className="settings-select"
                    value={widget.type}
                    onChange={handleWidgetTypeSelect}
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
                        data-widget-id={widget.id}
                        data-axis="x"
                        min={-500}
                        max={500}
                        step={10}
                        value={widget.position.x}
                        onChange={handleWidgetPositionChange}
                      />
                    </label>
                    <label>
                      <span>{t("settings.widgets.offsetY")}</span>
                      <input
                        className="settings-input"
                        type="number"
                        data-widget-id={widget.id}
                        data-axis="y"
                        min={-500}
                        max={500}
                        step={10}
                        value={widget.position.y}
                        onChange={handleWidgetPositionChange}
                      />
                    </label>
                  </div>
                  <p className="settings-description">
                    {t("settings.widgets.positionDescription")}
                  </p>
                </div>

                <div className="widget-config-row">
                  <span className="widget-config-label">
                    {t("settings.widgets.visible")}
                  </span>
                  <label className="widget-config-toggle">
                    <input
                      type="checkbox"
                      data-widget-id={widget.id}
                      checked={widget.enabled}
                      onChange={handleWidgetEnabledChange}
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
                    <label
                      className="widget-config-label"
                      htmlFor={`${idPrefix}-${widget.id}-custom-text`}
                    >
                      {t("settings.widgets.customTextLabel")}
                    </label>
                    <textarea
                      id={`${idPrefix}-${widget.id}-custom-text`}
                      data-widget-id={widget.id}
                      className="widget-config-textarea"
                      rows={2}
                      value={
                        typeof widget.data?.text === "string"
                          ? widget.data.text
                          : ""
                      }
                      onChange={handleWidgetTextChange}
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
