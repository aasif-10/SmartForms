/**
 * SmartForm Saver — Content Script Entry Point
 *
 * Bootstraps the extension's content script on the page.
 * Coordinates field detection, classification, autofill, and save prompts.
 *
 * Flow:
 * 1. Check if extension is enabled
 * 2. Load custom mappings and settings
 * 3. Detect existing form fields
 * 4. Start MutationObserver for dynamic fields
 * 5. Process each field: classify → autofill → attach save prompt
 */

import type {
  ExtensionMessage,
  ExtensionResponse,
  ExtensionSettings,
  FieldOverride,
} from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/types';
import { detectFields } from './field-detector';
import { startObserving, stopObserving } from './observer';
import { processFieldForAutofill } from './autofill';
import { attachSavePrompt } from './save-prompt';
import { destroyShadowContainer } from './ui/shadow-container';
import { logger } from '../shared/utils/logger';

let isInitialized = false;
let customMappings: FieldOverride[] = [];
let settings: ExtensionSettings = { ...DEFAULT_SETTINGS };
let hostname = '';

/**
 * Initialize the content script.
 */
async function initialize(): Promise<void> {
  if (isInitialized) return;

  hostname = window.location.hostname;
  logger.info(`Initializing SmartForm Saver on ${hostname}`);

  // Load settings
  try {
    const settingsResp = await sendMessage<ExtensionSettings>({
      type: 'GET_SETTINGS',
    });
    if (settingsResp.success && settingsResp.data) {
      settings = settingsResp.data;
      logger.setLevel(settings.logLevel);
    }
  } catch {
    logger.warn('Failed to load settings, using defaults');
  }

  // Check if extension is enabled
  if (!settings.enabled) {
    logger.info('Extension is disabled, stopping');
    return;
  }

  // Load custom mappings
  try {
    const mappingsResp = await sendMessage<FieldOverride[]>({
      type: 'GET_CUSTOM_MAPPINGS',
    });
    if (mappingsResp.success && mappingsResp.data) {
      customMappings = mappingsResp.data;
    }
  } catch {
    logger.warn('Failed to load custom mappings');
  }

  // Process initial fields
  const initialFields = detectFields();
  await processFields(initialFields);

  // Start observing for dynamic fields
  startObserving(async (newFields) => {
    logger.debug(`Observer detected ${newFields.length} new fields`);
    await processFields(newFields);
  });

  isInitialized = true;
  logger.info('SmartForm Saver initialized successfully');
}

/**
 * Process a batch of form fields.
 */
async function processFields(fields: HTMLElement[]): Promise<void> {
  for (const field of fields) {
    try {
      // Process for autofill (classify + show suggestions)
      if (settings.showAutofillSuggestions) {
        await processFieldForAutofill(field, customMappings, hostname);
      }

      // Attach save prompt behavior
      if (settings.askBeforeSaving) {
        attachSavePrompt(field, customMappings, hostname);
      }
    } catch (err) {
      logger.error('Error processing field', err);
      // Continue processing other fields
    }
  }
}

/**
 * Clean up the content script.
 */
function cleanup(): void {
  stopObserving();
  destroyShadowContainer();
  isInitialized = false;
  logger.info('SmartForm Saver cleaned up');
}

// ─── Message Helper ──────────────────────────────────────────────────

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

// ─── Listen for settings updates from popup/options ──────────────────

chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (message.type === 'UPDATE_SETTINGS') {
    const updates = message.payload as Partial<ExtensionSettings>;
    settings = { ...settings, ...updates };

    if (!settings.enabled) {
      cleanup();
    } else if (!isInitialized) {
      initialize();
    }
  }
});

// ─── Bootstrap ──────────────────────────────────────────────────────

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initialize());
} else {
  // Small delay to let frameworks finish rendering
  setTimeout(() => initialize(), 300);
}

// Cleanup on page unload
window.addEventListener('unload', cleanup);
