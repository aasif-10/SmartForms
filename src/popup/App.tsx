import React, { useState } from 'react';
import { useStorage } from './hooks/useStorage';
import { useSettings } from './hooks/useSettings';
import { SearchBar } from './components/SearchBar';
import { SavedValuesList } from './components/SavedValuesList';
import { AddValueForm } from './components/AddValueForm';
import { SettingsPanel } from './components/SettingsPanel';
import { ImportExport } from './components/ImportExport';
import {
  LogoIcon,
  SavedIcon,
  AddIcon,
  SettingsIcon,
  LockIcon,
} from './components/Icons';

type Tab = 'saved' | 'add' | 'settings';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('saved');
  const [searchQuery, setSearchQuery] = useState('');
  const storage = useStorage();
  const { settings, updateSettings } = useSettings();

  const handleEdit = async (id: string, updates: Record<string, unknown>) => {
    await storage.updateValue(id, updates);
  };

  const handleDelete = async (id: string) => {
    await storage.deleteValue(id);
  };

  return (
    <div className="sf-popup">
      {/* Header */}
      <header className="sf-popup-header">
        <div className="sf-popup-logo">
          <div className="sf-logo-badge">
            <LogoIcon size={14} />
          </div>
          <h1 className="sf-logo-text">SmartForm Saver</h1>
        </div>
        <div className="sf-header-status">
          {settings.enabled ? (
            <span className="sf-status-active">
              <span className="sf-status-dot">•</span> Autofill on
            </span>
          ) : (
            <span className="sf-disabled-badge" aria-label="Extension disabled">
              Autofill off
            </span>
          )}
        </div>
      </header>

      {/* Navigation */}
      <nav className="sf-popup-nav" role="tablist" aria-label="Main navigation">
        <button
          className={`sf-nav-tab ${activeTab === 'saved' ? 'active' : ''}`}
          onClick={() => setActiveTab('saved')}
          role="tab"
          aria-selected={activeTab === 'saved'}
          id="tab-saved"
        >
          <SavedIcon size={15} />
          <span>Saved</span>
        </button>
        <button
          className={`sf-nav-tab ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
          role="tab"
          aria-selected={activeTab === 'add'}
          id="tab-add"
        >
          <AddIcon size={15} />
          <span>Add</span>
        </button>
        <button
          className={`sf-nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          role="tab"
          aria-selected={activeTab === 'settings'}
          id="tab-settings"
        >
          <SettingsIcon size={15} />
          <span>Settings</span>
        </button>
      </nav>

      {/* Content */}
      <main className="sf-popup-content">
        {/* Error Banner */}
        {storage.error && (
          <div className="sf-error-banner" role="alert">
            <span>{storage.error}</span>
            <button onClick={() => storage.setError(null)} aria-label="Dismiss error">✕</button>
          </div>
        )}

        {activeTab === 'saved' && (
          <>
            {storage.values.length > 0 && (
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
            )}
            {storage.loading ? (
              <div className="sf-loading">
                <div className="sf-spinner" aria-label="Loading" />
              </div>
            ) : (
              <SavedValuesList
                values={storage.values}
                searchQuery={searchQuery}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAddClick={() => setActiveTab('add')}
              />
            )}
          </>
        )}

        {activeTab === 'add' && (
          <AddValueForm
            onSave={storage.saveValue}
            onCancel={() => setActiveTab('saved')}
          />
        )}

        {activeTab === 'settings' && (
          <>
            <SettingsPanel settings={settings} onUpdate={updateSettings} />
            <ImportExport
              onExport={storage.exportData}
              onImport={storage.importData}
              onClearAll={storage.clearAll}
            />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="sf-popup-footer">
        <span className="sf-footer-left">
          <LockIcon size={13} />
          <span>Stored on this device only</span>
        </span>
        <button
          className="sf-footer-link"
          onClick={() => chrome.runtime.openOptionsPage()}
          aria-label="Open settings page"
        >
          All settings
        </button>
      </footer>
    </div>
  );
};
