import React, { useState } from 'react';
import type { SemanticField } from '../../shared/types';
import { FIELD_TAXONOMY, CATEGORY_CONFIG } from '../../shared/constants/taxonomy';

interface AddValueFormProps {
  onSave: (field: SemanticField, value: string, label?: string) => Promise<boolean>;
  onCancel: () => void;
}

export const AddValueForm: React.FC<AddValueFormProps> = ({ onSave, onCancel }) => {
  const [field, setField] = useState<SemanticField>('full_name');
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!value.trim()) {
      setError('Please enter a value');
      return;
    }

    setSaving(true);
    setError('');

    const success = await onSave(field, value.trim(), label.trim() || undefined);
    if (success) {
      setValue('');
      setLabel('');
      onCancel();
    } else {
      setError('Failed to save. Please try again.');
    }
    setSaving(false);
  };

  // Group taxonomy entries by category for the select dropdown
  const groupedFields = CATEGORY_CONFIG.map((cat) => ({
    ...cat,
    fields: FIELD_TAXONOMY.filter((f) => f.category === cat.key && !f.sensitive),
  })).filter((g) => g.fields.length > 0);

  return (
    <form className="sf-add-form" onSubmit={handleSubmit}>
      <h3 className="sf-add-title">Add Information</h3>

      <div className="sf-form-group">
        <label className="sf-form-label" htmlFor="sf-add-field">Field</label>
        <select
          id="sf-add-field"
          className="sf-form-select"
          value={field}
          onChange={(e) => setField(e.target.value as SemanticField)}
        >
          {groupedFields.map((group) => (
            <optgroup key={group.key} label={`${group.icon} ${group.label}`}>
              {group.fields.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="sf-form-group">
        <label className="sf-form-label" htmlFor="sf-add-value">Value</label>
        <input
          id="sf-add-value"
          className="sf-form-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter value..."
          autoFocus
        />
      </div>

      <div className="sf-form-group">
        <label className="sf-form-label" htmlFor="sf-add-label">Label <span className="sf-form-optional">(optional)</span></label>
        <input
          id="sf-add-label"
          className="sf-form-input"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g., Personal, College, Work"
        />
      </div>

      {error && <div className="sf-form-error" role="alert">{error}</div>}

      <div className="sf-form-actions">
        <button
          type="submit"
          className="sf-btn sf-btn-primary"
          disabled={saving || !value.trim()}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" className="sf-btn sf-btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
};
