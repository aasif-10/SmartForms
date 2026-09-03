import React from 'react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}) => (
  <div className="sf-confirm-backdrop" onClick={onCancel} role="dialog" aria-modal="true" aria-label={title}>
    <div className="sf-confirm-dialog" onClick={(e) => e.stopPropagation()}>
      <h3 className="sf-confirm-title">{title}</h3>
      <p className="sf-confirm-message">{message}</p>
      <div className="sf-confirm-actions">
        <button
          className="sf-btn sf-btn-secondary"
          onClick={onCancel}
          aria-label={cancelLabel}
        >
          {cancelLabel}
        </button>
        <button
          className={`sf-btn ${variant === 'danger' ? 'sf-btn-danger' : 'sf-btn-primary'}`}
          onClick={onConfirm}
          aria-label={confirmLabel}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);
