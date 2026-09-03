import React, { useState } from 'react';
import { useSettings } from '../popup/hooks/useSettings';
import { useStorage } from '../popup/hooks/useStorage';
import { SettingsPanel } from '../popup/components/SettingsPanel';
import { ImportExport } from '../popup/components/ImportExport';
import { SavedValuesList } from '../popup/components/SavedValuesList';
import { AddValueForm } from '../popup/components/AddValueForm';
import { SearchBar } from '../popup/components/SearchBar';

type Section = 'saved' | 'add' | 'settings' | 'data';

export const App: React.FC = () => {
  const [section, setSection] = useState<Section>('settings');
  const [searchQuery, setSearchQuery] = useState('');
  const { settings, updateSettings } = useSettings();
  const storage = useStorage();

  return (
    <div className="sf-options">
      <header className="sf-options-header">
        <div className="sf-options-logo">
          <span className="sf-logo-icon">⚡</span>
          <div>
            <h1 className="sf-options-title">SmartForm Saver</h1>
            <p className="sf-options-subtitle">Settings & Data Management</p>
          </div>
        </div>
        <span className="sf-options-version">v1.0.0</span>
      </header>

      <div className="sf-options-layout">
        <nav className="sf-options-sidebar" aria-label="Settings navigation">
          <button
            className={`sf-sidebar-item ${section === 'settings' ? 'active' : ''}`}
            onClick={() => setSection('settings')}
          >
            ⚙️ General Settings
          </button>
          <button
            className={`sf-sidebar-item ${section === 'saved' ? 'active' : ''}`}
            onClick={() => setSection('saved')}
          >
            📋 Saved Information
          </button>
          <button
            className={`sf-sidebar-item ${section === 'add' ? 'active' : ''}`}
            onClick={() => setSection('add')}
          >
            ➕ Add Information
          </button>
          <button
            className={`sf-sidebar-item ${section === 'data' ? 'active' : ''}`}
            onClick={() => setSection('data')}
          >
            💾 Import & Export
          </button>
        </nav>

        <main className="sf-options-main">
          {storage.error && (
            <div className="sf-error-banner" role="alert">
              <span>{storage.error}</span>
              <button onClick={() => storage.setError(null)}>✕</button>
            </div>
          )}

          {section === 'settings' && (
            <div className="sf-options-section">
              <SettingsPanel settings={settings} onUpdate={updateSettings} />

              <div className="sf-options-about">
                <h4>About</h4>
                <p>SmartForm Saver intelligently saves your form responses and provides smart autofill suggestions.</p>
                <h4>Privacy</h4>
                <p>
                  All data is stored locally on your device using Chrome's storage API.
                  No information is ever sent to external servers.
                  The extension does not collect analytics or track your browsing.
                </p>
              </div>
            </div>
          )}

          {section === 'saved' && (
            <div className="sf-options-section">
              <h2 className="sf-section-heading">Saved Information</h2>
              {storage.values.length > 0 && (
                <SearchBar value={searchQuery} onChange={setSearchQuery} />
              )}
              <SavedValuesList
                values={storage.values}
                searchQuery={searchQuery}
                onEdit={(id, updates) => storage.updateValue(id, updates)}
                onDelete={(id) => storage.deleteValue(id)}
                onAddClick={() => setSection('add')}
              />
            </div>
          )}

          {section === 'add' && (
            <div className="sf-options-section">
              <AddValueForm
                onSave={storage.saveValue}
                onCancel={() => setSection('saved')}
              />
            </div>
          )}

          {section === 'data' && (
            <div className="sf-options-section">
              <ImportExport
                onExport={storage.exportData}
                onImport={storage.importData}
                onClearAll={storage.clearAll}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
