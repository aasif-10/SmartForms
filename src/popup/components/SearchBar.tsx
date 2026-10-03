import React from 'react';
import { SearchIcon, CloseIcon } from './Icons';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search saved fields',
}) => (
  <div className="sf-search-bar">
    <span className="sf-search-icon" aria-hidden="true">
      <SearchIcon size={14} />
    </span>
    <input
      type="text"
      className="sf-search-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label="Search saved fields"
      id="sf-search-input"
    />
    {value && (
      <button
        className="sf-search-clear"
        onClick={() => onChange('')}
        aria-label="Clear search"
        title="Clear"
      >
        <CloseIcon size={12} />
      </button>
    )}
  </div>
);
