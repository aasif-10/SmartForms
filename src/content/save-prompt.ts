/**
 * SmartForm Saver — Save Prompt Manager
 *
 * Manages the flow of prompting users to save new values.
 * Triggers on blur/change events when a new value is detected.
 *
 * Rules:
 * - Never prompt for sensitive fields
 * - Never prompt for empty values
 * - Don't re-prompt the same value on the same field
 * - Debounce to avoid prompting during active typing
 * - After save, store a custom mapping if the user disambiguated
 */

import type {
  ExtensionMessage,
  ExtensionResponse,
  SavedValue,
  FieldOverride,
  SemanticField,
} from '../shared/types';
import { extractFieldMetadata, getSiblingFieldLabels } from './field-detector';
import { classifyField } from '../shared/classifier/field-classifier';
import { isSensitiveElement } from '../shared/constants/sensitive';
import { showSaveDialog, hideSaveDialog } from './ui/save-dialog';
import type { SaveDialogResult } from './ui/save-dialog';
import { generateId } from '../shared/utils/id';
import { logger } from '../shared/utils/logger';

/** Track fields with save-prompt handlers attached. */
const promptFields = new WeakMap<HTMLElement, () => void>();

/** Track values already prompted to avoid re-prompting. */
const promptedValues = new Set<string>();

/** Debounce timers per field. */
const promptTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

/**
 * Attach save-prompt behavior to a field.
 */
export function attachSavePrompt(
  element: HTMLElement,
  customMappings: FieldOverride[],
  hostname: string
): void {
  if (promptFields.has(element)) return;

  const inputEl = element as HTMLInputElement;

  const handleBlur = () => {
    // Debounce: wait a moment after blur before checking
    const existingTimer = promptTimers.get(element);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      checkAndPrompt(inputEl, customMappings, hostname);
    }, 500);

    promptTimers.set(element, timer);
  };

  const handleChange = () => {
    handleBlur();
  };

  inputEl.addEventListener('blur', handleBlur);
  inputEl.addEventListener('change', handleChange);

  const cleanup = () => {
    inputEl.removeEventListener('blur', handleBlur);
    inputEl.removeEventListener('change', handleChange);
    hideSaveDialog(inputEl);
    const timer = promptTimers.get(element);
    if (timer) clearTimeout(timer);
  };

  promptFields.set(element, cleanup);
}

/**
 * Clean up save-prompt handlers for a field.
 */
export function detachSavePrompt(element: HTMLElement): void {
  const cleanup = promptFields.get(element);
  if (cleanup) {
    cleanup();
    promptFields.delete(element);
  }
}

/**
 * Check if a field has a new value worth saving and show the prompt.
 */
async function checkAndPrompt(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  customMappings: FieldOverride[],
  hostname: string
): Promise<void> {
  // Get current value
  const value = getFieldValue(element).trim();

  // Skip empty, very short, or password-like values
  if (!value || value.length < 1) return;
  if (isSensitiveElement(element)) return;

  // Build a prompt key to prevent re-prompting
  const promptKey = `${getFieldIdentity(element)}:${value}`;
  if (promptedValues.has(promptKey)) return;

  // Classify the field
  const metadata = extractFieldMetadata(element);
  const siblingLabels = getSiblingFieldLabels(element);
  const classifications = classifyField(metadata, customMappings, hostname, siblingLabels);

  if (classifications.length === 0) return;

  const bestMatch = classifications[0];

  // Check if this value is already saved
  try {
    const response = await sendMessage<SavedValue | null>({
      type: 'GET_VALUES_FOR_FIELD',
      payload: { field: bestMatch.field },
    });

    if (response.success && response.data) {
      const existing = Array.isArray(response.data) ? response.data : [response.data];
      const alreadySaved = existing.some((v: SavedValue) => v.value === value);
      if (alreadySaved) {
        promptedValues.add(promptKey);
        return;
      }
    }
  } catch {
    // Continue even if check fails
  }

  // Show the save dialog
  promptedValues.add(promptKey);

  showSaveDialog(element, value, classifications, async (result: SaveDialogResult) => {
    if (result.action === 'save') {
      await saveNewValue(result.field, result.value, hostname);

      // If the user disambiguated, save a custom mapping
      if (bestMatch.confidence < 0.7 && result.field !== bestMatch.field) {
        const primaryLabel = metadata.label || metadata.ariaLabel || metadata.placeholder;
        if (primaryLabel) {
          await saveCustomMapping(primaryLabel, result.field, hostname);
        }
      }
    }
  });
}

/**
 * Save a new value to storage via the background service worker.
 */
async function saveNewValue(
  field: SemanticField,
  value: string,
  hostname: string
): Promise<void> {
  const now = Date.now();
  const newValue: SavedValue = {
    id: generateId(),
    field,
    value,
    source: {
      hostname,
      pageTitle: document.title,
    },
    createdAt: now,
    updatedAt: now,
    usageCount: 0,
  };

  try {
    const response = await sendMessage<void>({
      type: 'SAVE_VALUE',
      payload: { value: newValue },
    });

    if (response.success) {
      logger.info(`Saved new value for field: ${field}`);
    } else {
      logger.error(`Failed to save value: ${response.error}`);
    }
  } catch (err) {
    logger.error('Failed to save value', err);
  }
}

/**
 * Save a custom mapping from user disambiguation.
 */
async function saveCustomMapping(
  pattern: string,
  semanticField: SemanticField,
  hostname: string
): Promise<void> {
  try {
    await sendMessage({
      type: 'SAVE_CUSTOM_MAPPING',
      payload: {
        mapping: {
          id: generateId(),
          pattern: pattern.toLowerCase().trim(),
          semanticField,
          hostname,
          createdAt: Date.now(),
        },
      },
    });
    logger.info(`Saved custom mapping: "${pattern}" → ${semanticField}`);
  } catch {
    // Non-critical
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getFieldValue(element: HTMLElement): string {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    return element.value;
  }
  if (element.getAttribute('contenteditable') === 'true' || element.getAttribute('role') === 'textbox') {
    return element.textContent ?? '';
  }
  return '';
}

function getFieldIdentity(el: HTMLElement): string {
  return el.getAttribute('name') || el.getAttribute('id') || el.getAttribute('aria-label') || String(Math.random());
}

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
