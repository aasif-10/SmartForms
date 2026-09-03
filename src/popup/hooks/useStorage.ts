/**
 * SmartForm Saver — useStorage Hook
 *
 * React hook for interacting with extension storage via the background
 * service worker. Provides CRUD operations and reactive state.
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  SavedValue,
  SemanticField,
  ExtensionMessage,
  ExtensionResponse,
  ExportData,
} from '../../shared/types';
import { generateId } from '../../shared/utils/id';

function sendMessage<T>(message: ExtensionMessage): Promise<ExtensionResponse<T>> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: ExtensionResponse<T>) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(response ?? { success: false, error: 'No response' });
      }
    });
  });
}

export function useStorage() {
  const [values, setValues] = useState<SavedValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadValues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await sendMessage<SavedValue[]>({ type: 'GET_ALL_VALUES' });
      if (resp.success && resp.data) {
        setValues(resp.data);
      } else {
        setError(resp.error ?? 'Failed to load values');
      }
    } catch (err) {
      setError('Failed to load saved information');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadValues();
  }, [loadValues]);

  const saveValue = useCallback(async (field: SemanticField, value: string, label?: string) => {
    const now = Date.now();
    const newValue: SavedValue = {
      id: generateId(),
      field,
      value,
      label,
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    };

    const resp = await sendMessage<void>({ type: 'SAVE_VALUE', payload: { value: newValue } });
    if (resp.success) {
      await loadValues();
      return true;
    }
    setError(resp.error ?? 'Failed to save');
    return false;
  }, [loadValues]);

  const updateValue = useCallback(async (id: string, updates: Partial<SavedValue>) => {
    const resp = await sendMessage<void>({
      type: 'UPDATE_VALUE',
      payload: { id, updates },
    });
    if (resp.success) {
      await loadValues();
      return true;
    }
    setError(resp.error ?? 'Failed to update');
    return false;
  }, [loadValues]);

  const deleteValue = useCallback(async (id: string) => {
    const resp = await sendMessage<void>({
      type: 'DELETE_VALUE',
      payload: { id },
    });
    if (resp.success) {
      await loadValues();
      return true;
    }
    setError(resp.error ?? 'Failed to delete');
    return false;
  }, [loadValues]);

  const exportData = useCallback(async (): Promise<ExportData | null> => {
    const resp = await sendMessage<ExportData>({ type: 'EXPORT_DATA' });
    if (resp.success && resp.data) {
      return resp.data;
    }
    setError(resp.error ?? 'Failed to export');
    return null;
  }, []);

  const importData = useCallback(async (
    data: ExportData,
    strategy: 'merge' | 'replace' = 'merge'
  ): Promise<{ imported: number; skipped: number } | null> => {
    const resp = await sendMessage<{ imported: number; skipped: number }>({
      type: 'IMPORT_DATA',
      payload: { data, strategy },
    });
    if (resp.success && resp.data) {
      await loadValues();
      return resp.data;
    }
    setError(resp.error ?? 'Failed to import');
    return null;
  }, [loadValues]);

  const clearAll = useCallback(async () => {
    const resp = await sendMessage<void>({ type: 'CLEAR_ALL_DATA' });
    if (resp.success) {
      setValues([]);
      return true;
    }
    setError(resp.error ?? 'Failed to clear data');
    return false;
  }, []);

  return {
    values,
    loading,
    error,
    setError,
    saveValue,
    updateValue,
    deleteValue,
    exportData,
    importData,
    clearAll,
    refresh: loadValues,
  };
}
