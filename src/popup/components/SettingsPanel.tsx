import React from 'react';
import type { ExtensionSettings } from '../../shared/types';

interface SettingsPanelProps {
  settings: ExtensionSettings;
  onUpdate: (updates: Partial<ExtensionSettings>) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onUpdate }) => {
  return (
    <div className="sf-settings-panel">
      <h3 className="sf-settings-title">Settings</h3>

      <div className="sf-settings-section">
        <h4 className="sf-settings-section-title">General</h4>

        <ToggleSetting
          id="sf-setting-enabled"
          label="Enable SmartForm Saver"
          description="Turn the extension on or off"
          checked={settings.enabled}
          onChange={(v) => onUpdate({ enabled: v })}
        />

        <ToggleSetting
          id="sf-setting-suggestions"
          label="Show autofill suggestions"
          description="Display saved values when you focus on a form field"
          checked={settings.showAutofillSuggestions}
          onChange={(v) => onUpdate({ showAutofillSuggestions: v })}
        />

        <ToggleSetting
          id="sf-setting-save-prompt"
          label="Ask before saving new values"
          description="Show a prompt when a new value is entered"
          checked={settings.askBeforeSaving}
          onChange={(v) => onUpdate({ askBeforeSaving: v })}
        />

        <ToggleSetting
          id="sf-setting-auto-fill"
          label="Auto-fill high-confidence matches"
          description="Automatically fill fields when confidence is very high"
          checked={settings.autoFillHighConfidence}
          onChange={(v) => onUpdate({ autoFillHighConfidence: v })}
        />
      </div>

      <div className="sf-settings-section">
        <h4 className="sf-settings-section-title">Privacy</h4>
        <p className="sf-settings-note">
          🔒 All saved information is stored locally on your device. No data is ever sent to external servers.
        </p>
      </div>

      <div className="sf-settings-section">
        <h4 className="sf-settings-section-title">Advanced</h4>

        <ToggleSetting
          id="sf-setting-ai"
          label="Enable AI field classification"
          description="Use AI to improve field detection (coming soon)"
          checked={settings.enableAIClassification}
          onChange={(v) => onUpdate({ enableAIClassification: v })}
          disabled
        />
      </div>
    </div>
  );
};

interface ToggleSettingProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

const ToggleSetting: React.FC<ToggleSettingProps> = ({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
}) => (
  <div className={`sf-setting-row ${disabled ? 'sf-setting-disabled' : ''}`}>
    <div className="sf-setting-info">
      <label className="sf-setting-label" htmlFor={id}>{label}</label>
      {description && <p className="sf-setting-description">{description}</p>}
    </div>
    <label className="sf-toggle" htmlFor={id}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        role="switch"
        aria-checked={checked}
      />
      <span className="sf-toggle-slider" />
    </label>
  </div>
);
