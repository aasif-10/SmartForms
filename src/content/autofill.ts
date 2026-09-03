/**
 * SmartForm Saver — Autofill Engine
 *
 * Manages the display of autofill suggestions for detected fields.
 * Follows strict rules about when to show/hide suggestions:
 *
 * - Empty field → show saved suggestion
 * - Field has saved value → do nothing
 * - Field has different value → show "saved value available"
 * - Sensitive field → never show
 * - Low confidence → show but don't auto-fill
 */

import type {
  FieldClassification,
  SavedValue,
  FieldOverride,
  ExtensionMessage,
  ExtensionResponse,
} from '../shared/types';
import { extractFieldMetadata, getSiblingFieldLabels } from './field-detector';
import { classifyField } from '../shared/classifier/field-classifier';
import { splitFullName } from '../shared/classifier/name-resolver';
import { FIELD_TAXONOMY } from '../shared/constants/taxonomy';
import { isSensitiveElement } from '../shared/constants/sensitive';
import { showSuggestion, hideSuggestion } from './ui/suggestion-chip';
import { logger } from '../shared/utils/logger';

/** Track fields with active autofill behavior. */
const autofillFields = new WeakMap<HTMLElement, {
  classifications: FieldClassification[];
  cleanup: () => void;
}>();

/**
 * Process a field for autofill: classify, fetch saved values, show suggestions.
 */
export async function processFieldForAutofill(
  element: HTMLElement,
  customMappings: FieldOverride[],
  hostname: string
): Promise<FieldClassification[]> {
  // Skip sensitive
  if (isSensitiveElement(element)) {
    logger.debug('Skipping sensitive field for autofill');
    return [];
  }

  // Extract metadata and classify
  const metadata = extractFieldMetadata(element);
  const siblingLabels = getSiblingFieldLabels(element);
  const classifications = classifyField(metadata, customMappings, hostname, siblingLabels);

  if (classifications.length === 0) {
    logger.debug('No classification for field, skipping autofill');
    return [];
  }

  const bestMatch = classifications[0];
  const fieldEntry = FIELD_TAXONOMY.find((e) => e.key === bestMatch.field);
  const fieldLabel = fieldEntry?.label ?? bestMatch.field;

  // Fetch saved values from background
  let savedValues: SavedValue[] = [];
  try {
    const response = await sendMessage<SavedValue[]>({
      type: 'GET_VALUES_FOR_FIELD',
      payload: { field: bestMatch.field },
    });
    if (response.success && response.data) {
      savedValues = response.data;
    }
  } catch (err) {
    logger.error('Failed to fetch saved values', err);
  }

  // Check for inferred values (e.g., full_name → first_name/last_name)
  let inferredValues: SavedValue[] = [];
  let isInferred = false;

  if (savedValues.length === 0) {
    const inferred = await getInferredValues(bestMatch.field);
    if (inferred.length > 0) {
      inferredValues = inferred;
      isInferred = true;
    }
  }

  const valuesToShow = savedValues.length > 0 ? savedValues : inferredValues;

  // Set up focus/blur handlers
  const inputEl = element as HTMLInputElement;

  const onFocus = () => {
    const currentValue = getFieldValue(inputEl);

    if (valuesToShow.length === 0) return;

    // Empty field → show suggestion
    if (!currentValue || currentValue.trim() === '') {
      showSuggestion(
        inputEl,
        valuesToShow,
        fieldLabel,
        isInferred,
        (selected) => handleAcceptSuggestion(inputEl, selected),
        () => { /* dismissed */ }
      );
      return;
    }

    // Field has a value that matches saved → do nothing
    const matches = valuesToShow.some((v) => v.value === currentValue);
    if (matches) return;

    // Field has a different value → show "saved value available"
    showSuggestion(
      inputEl,
      valuesToShow,
      `Saved ${fieldLabel}`,
      isInferred,
      (selected) => handleAcceptSuggestion(inputEl, selected),
      () => { /* dismissed */ }
    );
  };

  const onBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      hideSuggestion(inputEl);
    }, 200);
  };

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      hideSuggestion(inputEl);
    }
  };

  inputEl.addEventListener('focus', onFocus);
  inputEl.addEventListener('blur', onBlur);
  inputEl.addEventListener('keydown', onKeydown);

  const cleanup = () => {
    inputEl.removeEventListener('focus', onFocus);
    inputEl.removeEventListener('blur', onBlur);
    inputEl.removeEventListener('keydown', onKeydown);
    hideSuggestion(inputEl);
  };

  autofillFields.set(element, { classifications, cleanup });

  // If field is currently focused and empty, show suggestion immediately
  if (document.activeElement === element) {
    onFocus();
  }

  return classifications;
}

/**
 * Handle when a user accepts a suggestion.
 */
function handleAcceptSuggestion(
  field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  savedValue: SavedValue
): void {
  // Set the value
  setFieldValue(field, savedValue.value);

  // Update usage count
  sendMessage({
    type: 'UPDATE_VALUE',
    payload: {
      id: savedValue.id,
      updates: {
        lastUsedAt: Date.now(),
        usageCount: savedValue.usageCount + 1,
      },
    },
  }).catch((err) => logger.error('Failed to update usage count', err));

  logger.info(`Autofilled field: ${savedValue.field}`);
}

/**
 * Try to derive values from related fields.
 * E.g., full_name → first_name, last_name
 */
async function getInferredValues(field: string): Promise<SavedValue[]> {
  // If looking for first_name and full_name exists, derive it
  if (field === 'first_name' || field === 'last_name' || field === 'middle_name') {
    try {
      const response = await sendMessage<SavedValue[]>({
        type: 'GET_VALUES_FOR_FIELD',
        payload: { field: 'full_name' },
      });

      if (response.success && response.data && response.data.length > 0) {
        const fullName = response.data[0];
        const parts = splitFullName(fullName.value);

        let inferredValue = '';
        if (field === 'first_name') inferredValue = parts.first;
        else if (field === 'last_name') inferredValue = parts.last;
        else if (field === 'middle_name') inferredValue = parts.middle ?? '';

        if (inferredValue) {
          return [{
            id: `inferred-${field}-${fullName.id}`,
            field: field as SavedValue['field'],
            value: inferredValue,
            label: `From "${fullName.value}"`,
            createdAt: fullName.createdAt,
            updatedAt: fullName.updatedAt,
            usageCount: 0,
          }];
        }
      }
    } catch {
      // Inference failed — not critical
    }
  }

  // If looking for full_name and first+last exist, combine
  if (field === 'full_name') {
    try {
      const firstResp = await sendMessage<SavedValue[]>({
        type: 'GET_VALUES_FOR_FIELD',
        payload: { field: 'first_name' },
      });
      const lastResp = await sendMessage<SavedValue[]>({
        type: 'GET_VALUES_FOR_FIELD',
        payload: { field: 'last_name' },
      });

      if (firstResp.success && firstResp.data?.length && lastResp.success && lastResp.data?.length) {
        const combined = `${firstResp.data[0].value} ${lastResp.data[0].value}`;
        return [{
          id: `inferred-full_name`,
          field: 'full_name',
          value: combined,
          label: 'Combined from First + Last',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          usageCount: 0,
        }];
      }
    } catch {
      // Inference failed
    }
  }

  return [];
}

/**
 * Get classifications for a field (if already processed).
 */
export function getFieldClassifications(element: HTMLElement): FieldClassification[] {
  return autofillFields.get(element)?.classifications ?? [];
}

/**
 * Clean up autofill handlers for a field.
 */
export function cleanupField(element: HTMLElement): void {
  const data = autofillFields.get(element);
  if (data) {
    data.cleanup();
    autofillFields.delete(element);
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

function setFieldValue(element: HTMLElement, value: string): void {
  if (element instanceof HTMLInputElement) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (setter) {
      setter.call(element, value);
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (element instanceof HTMLTextAreaElement) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    if (setter) {
      setter.call(element, value);
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (element instanceof HTMLSelectElement) {
    element.value = value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (element.getAttribute('contenteditable') === 'true' || element.getAttribute('role') === 'textbox') {
    element.textContent = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
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
