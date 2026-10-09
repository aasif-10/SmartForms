/**
 * SmartForm Saver — Background Service Worker
 *
 * Central message router for the extension. All storage operations
 * are routed through here to ensure data consistency.
 *
 * Handles messages from:
 * - Content scripts (save values, get values, classify)
 * - Popup UI (CRUD, settings, import/export)
 * - Options page (settings, data management)
 */

import { chromeStorage } from '../shared/storage/chrome-storage';
import type {
  ExtensionMessage,
  ExtensionResponse,
  SavedValue,
  SemanticField,
  FieldOverride,
  ExtensionSettings,
  ExportData,
} from '../shared/types';
import { logger } from '../shared/utils/logger';

// ─── Message Router ──────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtensionResponse) => void
  ): boolean => {
    // Handle the message asynchronously
    handleMessage(message)
      .then(sendResponse)
      .catch((err) => {
        logger.error(`Message handler error for ${message.type}`, err);
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      });

    // Return true to indicate async response
    return true;
  }
);

async function handleMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
  const payload = message.payload as Record<string, unknown> | undefined;

  switch (message.type) {
    // ─── Saved Values ─────────────────────────────────────────────

    case 'GET_ALL_VALUES': {
      const values = await chromeStorage.getAllValues();
      return { success: true, data: values };
    }

    case 'GET_VALUES_FOR_FIELD': {
      const field = payload?.field as SemanticField;
      if (!field) return { success: false, error: 'Missing field parameter' };
      const values = await chromeStorage.getValuesForField(field);
      return { success: true, data: values };
    }

    case 'SAVE_VALUE': {
      const value = payload?.value as SavedValue;
      if (!value) return { success: false, error: 'Missing value parameter' };
      await chromeStorage.saveValue(value);
      return { success: true };
    }

    case 'UPDATE_VALUE': {
      const id = payload?.id as string;
      const updates = payload?.updates as Partial<SavedValue>;
      if (!id) return { success: false, error: 'Missing id parameter' };
      await chromeStorage.updateValue(id, updates ?? {});
      return { success: true };
    }

    case 'DELETE_VALUE': {
      const id = payload?.id as string;
      if (!id) return { success: false, error: 'Missing id parameter' };
      await chromeStorage.deleteValue(id);
      return { success: true };
    }

    // ─── Custom Mappings ──────────────────────────────────────────

    case 'GET_CUSTOM_MAPPINGS': {
      const mappings = await chromeStorage.getCustomMappings();
      return { success: true, data: mappings };
    }

    case 'SAVE_CUSTOM_MAPPING': {
      const mapping = payload?.mapping as FieldOverride;
      if (!mapping) return { success: false, error: 'Missing mapping parameter' };
      await chromeStorage.saveCustomMapping(mapping);
      return { success: true };
    }

    case 'DELETE_CUSTOM_MAPPING': {
      const id = payload?.id as string;
      if (!id) return { success: false, error: 'Missing id parameter' };
      await chromeStorage.deleteCustomMapping(id);
      return { success: true };
    }

    // ─── Settings ─────────────────────────────────────────────────

    case 'GET_SETTINGS': {
      const settings = await chromeStorage.getSettings();
      return { success: true, data: settings };
    }

    case 'UPDATE_SETTINGS': {
      const updates = payload as Partial<ExtensionSettings>;
      await chromeStorage.updateSettings(updates ?? {});
      // Broadcast settings change to all content scripts
      broadcastToContentScripts({ type: 'UPDATE_SETTINGS', payload: updates });
      return { success: true };
    }

    // ─── Import / Export ──────────────────────────────────────────

    case 'EXPORT_DATA': {
      const exportData = await chromeStorage.exportAll();
      return { success: true, data: exportData };
    }

    case 'IMPORT_DATA': {
      const data = payload?.data as ExportData;
      const strategy = (payload?.strategy as 'merge' | 'replace') ?? 'merge';
      if (!data) return { success: false, error: 'Missing data parameter' };
      const result = await chromeStorage.importData(data, strategy);
      return { success: true, data: result };
    }

    // ─── Maintenance ──────────────────────────────────────────────

    case 'CLEAR_ALL_DATA': {
      await chromeStorage.clearAll();
      return { success: true };
    }

    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
}

/**
 * Broadcast a message to all content scripts.
 */
async function broadcastToContentScripts(message: ExtensionMessage): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Tab may not have content script — ignore
        });
      }
    }
  } catch {
    // Broadcasting failed — non-critical
  }
}

// ─── Extension Install/Update ─────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    logger.info('SmartForm Saver installed');
  } else if (details.reason === 'update') {
    logger.info(`SmartForm Saver updated to ${chrome.runtime.getManifest().version}`);
  }
});

logger.info('Background service worker started');
