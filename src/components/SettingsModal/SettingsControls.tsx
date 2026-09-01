import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { UiVisibilitySettings } from "../../types/settings.ts";
import {
  SETTINGS_TABS,
  type SettingsTab,
  UI_VISIBILITY_KEYS,
} from "./settingsOptions.ts";

interface SettingsTabButtonProps {
  tab: SettingsTab;
  label: string;
  isActive: boolean;
  onSelect: (tab: SettingsTab) => void;
}

/**
 * A single tablist button. It exists as its own component so the click
 * handler can be memoised per tab rather than rebuilt inline on every render.
 */
const SettingsTabButton = ({
  tab,
  label,
  isActive,
  onSelect,
}: SettingsTabButtonProps) => {
  const handleClick = useCallback(() => onSelect(tab), [onSelect, tab]);

  return (
    <button
      type="button"
      className={`settings-tab${isActive ? " settings-tab-active" : ""}`}
      onClick={handleClick}
      role="tab"
      aria-selected={isActive}
    >
      {label}
    </button>
  );
};

interface SettingsVisibilityToggleProps {
  field: keyof UiVisibilitySettings;
  label: string;
  checked: boolean;
  onChange: (field: keyof UiVisibilitySettings, visible: boolean) => void;
}

const SettingsVisibilityToggle = ({
  field,
  label,
  checked,
  onChange,
}: SettingsVisibilityToggleProps) => {
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange(field, event.target.checked);
    },
    [field, onChange],
  );

  return (
    <label className="settings-visibility-item">
      <input
        type="checkbox"
        className="settings-checkbox"
        checked={checked}
        onChange={handleChange}
      />
      <span>{label}</span>
    </label>
  );
};

interface SettingsTabBarProps {
  activeTab: SettingsTab;
  onSelect: (tab: SettingsTab) => void;
}

interface SettingsVisibilityGridProps {
  visibility: UiVisibilitySettings;
  onChange: (field: keyof UiVisibilitySettings, visible: boolean) => void;
}

export const SettingsTabBar = ({
  activeTab,
  onSelect,
}: SettingsTabBarProps) => {
  const { t } = useTranslation();

  return (
    <div
      className="settings-tabs"
      role="tablist"
      aria-label={t("settings.title")}
    >
      {SETTINGS_TABS.map((tab) => (
        <SettingsTabButton
          key={tab}
          tab={tab}
          label={t(`settings.tabs.${tab}`)}
          isActive={activeTab === tab}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};

export const SettingsVisibilityGrid = ({
  visibility,
  onChange,
}: SettingsVisibilityGridProps) => {
  const { t } = useTranslation();

  return (
    <div className="settings-visibility-grid">
      {UI_VISIBILITY_KEYS.map((key) => (
        <SettingsVisibilityToggle
          key={key}
          field={key}
          label={t(`settings.visibility.items.${key}`)}
          checked={visibility[key]}
          onChange={onChange}
        />
      ))}
    </div>
  );
};
