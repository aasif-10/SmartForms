import React from 'react';
import type { SavedValue } from '../../shared/types';
import { CATEGORY_CONFIG } from '../../shared/constants/taxonomy';
import { FIELD_TAXONOMY } from '../../shared/constants/taxonomy';
import { SavedValueCard } from './SavedValueCard';
import { EmptyState } from './EmptyState';
import { getCategoryIcon, SavedIcon, SearchIcon } from './Icons';
import type { FieldCategory } from '../../shared/types';

interface SavedValuesListProps {
  values: SavedValue[];
  searchQuery: string;
  onEdit: (id: string, updates: Partial<SavedValue>) => void;
  onDelete: (id: string) => void;
  onAddClick: () => void;
}

export const SavedValuesList: React.FC<SavedValuesListProps> = ({
  values,
  searchQuery,
  onEdit,
  onDelete,
  onAddClick,
}) => {
  // Filter values by search query
  const filteredValues = searchQuery
    ? values.filter((v) => {
        const q = searchQuery.toLowerCase();
        const entry = FIELD_TAXONOMY.find((e) => e.key === v.field);
        return (
          v.value.toLowerCase().includes(q) ||
          v.field.toLowerCase().includes(q) ||
          (entry?.label ?? '').toLowerCase().includes(q) ||
          (v.label ?? '').toLowerCase().includes(q)
        );
      })
    : values;

  if (values.length === 0) {
    return (
      <EmptyState
        title="No saved information yet"
        subtitle="Fill out a form and SmartForm will offer to save your entries, or add information manually."
        icon={<SavedIcon size={32} />}
        action={{ label: 'Add Information', onClick: onAddClick }}
      />
    );
  }

  if (filteredValues.length === 0) {
    return (
      <EmptyState
        title="No results found"
        subtitle={`No saved information matches "${searchQuery}"`}
        icon={<SearchIcon size={32} />}
      />
    );
  }

  // Group by category
  const grouped = new Map<FieldCategory, SavedValue[]>();

  for (const value of filteredValues) {
    const entry = FIELD_TAXONOMY.find((e) => e.key === value.field);
    const category: FieldCategory = entry?.category ?? 'other';
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(value);
  }

  return (
    <div className="sf-values-list" role="list">
      {CATEGORY_CONFIG.map((cat) => {
        const catValues = grouped.get(cat.key);
        if (!catValues || catValues.length === 0) return null;

        return (
          <div key={cat.key} className="sf-category-group">
            <div className="sf-category-header">
              <span className="sf-category-icon" aria-hidden="true">
                {getCategoryIcon(cat.key, 15)}
              </span>
              <span className="sf-category-label">{cat.label}</span>
              <span className="sf-category-count">{catValues.length}</span>
            </div>
            <div className="sf-category-card-container">
              {catValues.map((v) => (
                <SavedValueCard
                  key={v.id}
                  value={v}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
