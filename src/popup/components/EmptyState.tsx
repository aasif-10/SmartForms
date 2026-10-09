import React from 'react';
import { SavedIcon } from './Icons';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  subtitle,
  icon = <SavedIcon size={32} />,
  action,
}) => (
  <div className="sf-empty-state">
    <div className="sf-empty-icon">{icon}</div>
    <h3 className="sf-empty-title">{title}</h3>
    {subtitle && <p className="sf-empty-subtitle">{subtitle}</p>}
    {action && (
      <button className="sf-btn sf-btn-primary" onClick={action.onClick}>
        {action.label}
      </button>
    )}
  </div>
);
