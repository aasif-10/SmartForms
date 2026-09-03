import React, { useState } from 'react';
import type { SavedValue } from '../../shared/types';
import { TAXONOMY_MAP } from '../../shared/constants/taxonomy';

interface SavedValueCardProps {
  value: SavedValue;
  onEdit: (id: string, updates: Partial<SavedValue>) => void;
  onDelete: (id: string) => void;
}

export const SavedValueCard: React.FC<SavedValueCardProps> = ({ value, onEdit, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.value);
  const [editLabel, setEditLabel] = useState(value.label ?? '');

  const entry = TAXONOMY_MAP[value.field];
  const fieldLabel = entry?.label ?? value.field;

  const handleSave = () => {
    if (editValue.trim()) {
      onEdit(value.id, {
        value: editValue.trim(),
        label: editLabel.trim() || undefined,
      });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value.value);
    setEditLabel(value.label ?? '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  if (isEditing) {
    return (
      <div className="sf-value-card sf-value-card-editing">
        <div className="sf-value-field-name">{fieldLabel}</div>
        <input
          className="sf-edit-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Value"
          aria-label={`Edit ${fieldLabel} value`}
          autoFocus
        />
        <input
          className="sf-edit-input sf-edit-label"
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Label (optional)"
          aria-label={`Edit ${fieldLabel} label`}
        />
        <div className="sf-value-actions">
          <button className="sf-btn sf-btn-small sf-btn-primary" onClick={handleSave}>
            Save
          </button>
          <button className="sf-btn sf-btn-small sf-btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sf-value-card" role="listitem">
      <div className="sf-value-header">
        <span className="sf-value-field-name">{fieldLabel}</span>
        {value.label && <span className="sf-value-label-badge">{value.label}</span>}
      </div>
      <div className="sf-value-content">{value.value}</div>
      {value.usageCount > 0 && (
        <div className="sf-value-meta">Used {value.usageCount} time{value.usageCount !== 1 ? 's' : ''}</div>
      )}
      <div className="sf-value-actions">
        <button
          className="sf-btn-icon"
          onClick={() => setIsEditing(true)}
          aria-label={`Edit ${fieldLabel}`}
          title="Edit"
        >
          ✏️
        </button>
        <button
          className="sf-btn-icon sf-btn-icon-danger"
          onClick={() => onDelete(value.id)}
          aria-label={`Delete ${fieldLabel}`}
          title="Delete"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};
