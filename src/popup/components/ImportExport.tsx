import React, { useRef, useState } from 'react';
import type { ExportData } from '../../shared/types';

interface ImportExportProps {
  onExport: () => Promise<ExportData | null>;
  onImport: (data: ExportData, strategy: 'merge' | 'replace') => Promise<{ imported: number; skipped: number } | null>;
  onClearAll: () => Promise<boolean>;
}

export const ImportExport: React.FC<ImportExportProps> = ({ onExport, onImport, onClearAll }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error'>('success');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleExport = async () => {
    setStatus(null);
    const data = await onExport();
    if (data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smartform-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus(`Exported ${data.values.length} saved values`);
      setStatusType('success');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExportData;

      // Basic validation
      if (!data || typeof data !== 'object' || !Array.isArray(data.values)) {
        setStatus('Invalid backup file. No data was changed.');
        setStatusType('error');
        return;
      }

      const result = await onImport(data, 'merge');
      if (result) {
        setStatus(`Imported ${result.imported} values (${result.skipped} skipped)`);
        setStatusType('success');
      } else {
        setStatus('Import failed. No data was changed.');
        setStatusType('error');
      }
    } catch {
      setStatus('Invalid backup file. Please check the file format.');
      setStatusType('error');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearAll = async () => {
    const success = await onClearAll();
    if (success) {
      setStatus('All data cleared');
      setStatusType('success');
    }
    setShowClearConfirm(false);
  };

  return (
    <div className="sf-import-export">
      <h4 className="sf-settings-section-title">Data Management</h4>

      <div className="sf-ie-actions">
        <button className="sf-btn sf-btn-primary sf-btn-block" onClick={handleExport} id="sf-export-btn">
          📤 Export Data
        </button>

        <button className="sf-btn sf-btn-secondary sf-btn-block" onClick={handleImportClick} id="sf-import-btn">
          📥 Import Data
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          aria-label="Import data file"
        />

        {!showClearConfirm ? (
          <button
            className="sf-btn sf-btn-danger sf-btn-block"
            onClick={() => setShowClearConfirm(true)}
            id="sf-clear-btn"
          >
            🗑️ Clear All Data
          </button>
        ) : (
          <div className="sf-clear-confirm">
            <p className="sf-clear-warning">This will permanently delete all saved information. Are you sure?</p>
            <div className="sf-clear-actions">
              <button className="sf-btn sf-btn-danger" onClick={handleClearAll}>
                Yes, Delete All
              </button>
              <button className="sf-btn sf-btn-secondary" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {status && (
        <div className={`sf-ie-status sf-ie-status-${statusType}`} role="alert">
          {status}
        </div>
      )}
    </div>
  );
};
