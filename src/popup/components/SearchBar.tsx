import React from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search saved information...',
}) => (
  <div className="sf-search-bar">
    <span className="sf-search-icon" aria-hidden="true">🔍</span>
    <input
      type="text"
      className="sf-search-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label="Search saved information"
      id="sf-search-input"
    />
    {value && (
      <button
        className="sf-search-clear"
        onClick={() => onChange('')}
        aria-label="Clear search"
        title="Clear"
      >
        ✕
      </button>
    )}
  </div>
);
