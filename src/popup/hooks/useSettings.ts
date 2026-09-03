/**
 * SmartForm Saver — useSettings Hook
 */

import { useState, useEffect, useCallback } from 'react';
import type { ExtensionSettings, ExtensionMessage, ExtensionResponse } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/types';

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

export function useSettings() {
  const [settings, setSettings] = useState<ExtensionSettings>({ ...DEFAULT_SETTINGS });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const resp = await sendMessage<ExtensionSettings>({ type: 'GET_SETTINGS' });
      if (resp.success && resp.data) {
        setSettings(resp.data);
      }
      setLoading(false);
    })();
  }, []);

  const updateSettings = useCallback(async (updates: Partial<ExtensionSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    await sendMessage<void>({
      type: 'UPDATE_SETTINGS',
      payload: updates,
    });
  }, [settings]);

  return { settings, loading, updateSettings };
}
