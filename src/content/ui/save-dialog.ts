/**
 * SmartForm Saver — Save Dialog
 *
 * Renders a contextual save prompt near a form field when the user
 * enters a new value. Includes disambiguation flow for ambiguous fields.
 *
 * Rules:
 * - Non-blocking, non-modal
 * - Auto-dismiss after 10 seconds
 * - Triggers after input stabilizes (blur/change)
 * - Never prompts for sensitive fields
 * - Never prompts for empty values
 */

import type { SemanticField, FieldClassification } from '../../shared/types';
import { FIELD_TAXONOMY } from '../../shared/constants/taxonomy';
import { getShadowContainer, positionNearElement, removeFromShadow } from './shadow-container';
import { logger } from '../../shared/utils/logger';

/** Track active save dialogs to prevent duplicates. */
const activeDialogs = new Map<HTMLElement, HTMLElement>();

/** Track recently dismissed field+value combos to avoid re-prompting. */
const dismissedPrompts = new Set<string>();

/** Auto-dismiss timeout handle per field. */
const dismissTimers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();

export interface SaveDialogResult {
  action: 'save' | 'dismiss';
  field: SemanticField;
  value: string;
  label?: string;
}

/**
 * Show a save prompt near a form field.
 */
export function showSaveDialog(
  targetField: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
  classifications: FieldClassification[],
  onResult: (result: SaveDialogResult) => void
): void {
  // Don't re-prompt the same field + value
  const promptKey = `${getFieldIdentity(targetField)}:${value}`;
  if (dismissedPrompts.has(promptKey)) return;

  // Remove existing dialog for this field
  hideSaveDialog(targetField);

  const shadow = getShadowContainer();
  const bestMatch = classifications[0];
  const isAmbiguous = !bestMatch || bestMatch.confidence < 0.7;

  const dialog = document.createElement('div');
  dialog.className = 'sf-overlay sf-save-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-label', 'Save this information?');

  if (isAmbiguous) {
    renderDisambiguationDialog(dialog, value, classifications, onResult, targetField, promptKey);
  } else {
    renderSimpleSaveDialog(dialog, value, bestMatch, onResult, targetField, promptKey);
  }

  shadow.appendChild(dialog);
  positionNearElement(dialog, targetField);
  activeDialogs.set(targetField, dialog);

  // Auto-dismiss after 10 seconds
  const timer = setTimeout(() => {
    dismissSaveDialog(dialog, targetField, promptKey, () => {
      onResult({ action: 'dismiss', field: bestMatch?.field ?? 'custom', value });
    });
  }, 10000);
  dismissTimers.set(targetField, timer);

  logger.debug('Showing save dialog for field');
}

/**
 * Render simple save dialog for high-confidence matches.
 */
function renderSimpleSaveDialog(
  dialog: HTMLElement,
  value: string,
  classification: FieldClassification,
  onResult: (result: SaveDialogResult) => void,
  targetField: HTMLElement,
  promptKey: string
): void {
  const entry = FIELD_TAXONOMY.find((e) => e.key === classification.field);
  const label = entry?.label ?? classification.field;

  dialog.innerHTML = '';

  const titleDiv = document.createElement('div');
  titleDiv.className = 'sf-save-title';
  titleDiv.textContent = 'Save this information?';

  const nameDiv = document.createElement('div');
  nameDiv.className = 'sf-save-field-name';
  nameDiv.textContent = label;

  const valueDiv = document.createElement('div');
  valueDiv.className = 'sf-save-field-value';
  valueDiv.textContent = value;

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'sf-save-actions';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'sf-btn sf-btn-primary';
  saveBtn.dataset.action = 'save';
  saveBtn.setAttribute('aria-label', 'Save value');
  saveBtn.textContent = 'Save';

  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'sf-btn sf-btn-secondary';
  dismissBtn.dataset.action = 'dismiss';
  dismissBtn.setAttribute('aria-label', 'Dismiss');
  dismissBtn.textContent = 'Not now';

  actionsDiv.appendChild(saveBtn);
  actionsDiv.appendChild(dismissBtn);

  dialog.appendChild(titleDiv);
  dialog.appendChild(nameDiv);
  dialog.appendChild(valueDiv);
  dialog.appendChild(actionsDiv);

  dialog.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-action]') as HTMLElement;
    if (!btn) return;

    const action = btn.dataset.action;
    if (action === 'save') {
      dismissSaveDialog(dialog, targetField, promptKey, () => {
        onResult({ action: 'save', field: classification.field, value });
      });
    } else {
      dismissSaveDialog(dialog, targetField, promptKey, () => {
        onResult({ action: 'dismiss', field: classification.field, value });
      });
    }
  });
}

/**
 * Render disambiguation dialog for low-confidence or ambiguous matches.
 */
function renderDisambiguationDialog(
  dialog: HTMLElement,
  value: string,
  classifications: FieldClassification[],
  onResult: (result: SaveDialogResult) => void,
  targetField: HTMLElement,
  promptKey: string
): void {
  // Get top candidates + common options
  const candidateFields: SemanticField[] = [];
  const seen = new Set<SemanticField>();

  for (const c of classifications.slice(0, 3)) {
    if (!seen.has(c.field)) {
      candidateFields.push(c.field);
      seen.add(c.field);
    }
  }

  // Add common fields that might be relevant
  const commonFields: SemanticField[] = ['full_name', 'first_name', 'email', 'register_number'];
  for (const f of commonFields) {
    if (!seen.has(f) && candidateFields.length < 5) {
      candidateFields.push(f);
      seen.add(f);
    }
  }

  let selectedField: SemanticField | null = candidateFields[0] ?? null;

  dialog.innerHTML = '';

  const disambigDiv = document.createElement('div');
  disambigDiv.className = 'sf-disambig';

  const titleDiv = document.createElement('div');
  titleDiv.className = 'sf-disambig-title';
  titleDiv.textContent = 'What type of information is this?';

  const valueDiv = document.createElement('div');
  valueDiv.className = 'sf-save-field-value';
  valueDiv.textContent = value;

  const radioGroup = document.createElement('div');
  radioGroup.setAttribute('role', 'radiogroup');
  radioGroup.setAttribute('aria-label', 'Field type selection');

  candidateFields.forEach((f, i) => {
    const entry = FIELD_TAXONOMY.find((e) => e.key === f);
    const label = entry?.label ?? f;

    const optionDiv = document.createElement('div');
    optionDiv.className = `sf-disambig-option ${i === 0 ? 'selected' : ''}`;
    optionDiv.dataset.field = f;
    optionDiv.setAttribute('role', 'radio');
    optionDiv.tabIndex = 0;
    optionDiv.setAttribute('aria-checked', i === 0 ? 'true' : 'false');

    const radioCircle = document.createElement('div');
    radioCircle.className = 'sf-disambig-radio';

    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;

    optionDiv.appendChild(radioCircle);
    optionDiv.appendChild(labelSpan);
    radioGroup.appendChild(optionDiv);
  });

  disambigDiv.appendChild(titleDiv);
  disambigDiv.appendChild(valueDiv);
  disambigDiv.appendChild(radioGroup);

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'sf-save-actions';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'sf-btn sf-btn-primary';
  saveBtn.dataset.action = 'save';
  saveBtn.setAttribute('aria-label', 'Save value');
  saveBtn.textContent = 'Save';

  const skipBtn = document.createElement('button');
  skipBtn.className = 'sf-btn sf-btn-secondary';
  skipBtn.dataset.action = 'dismiss';
  skipBtn.setAttribute('aria-label', 'Dismiss');
  skipBtn.textContent = 'Skip';

  actionsDiv.appendChild(saveBtn);
  actionsDiv.appendChild(skipBtn);

  dialog.appendChild(disambigDiv);
  dialog.appendChild(actionsDiv);

  // Handle option selection
  dialog.addEventListener('click', (e) => {
    const option = (e.target as HTMLElement).closest('.sf-disambig-option') as HTMLElement;
    if (option) {
      // Deselect all
      dialog.querySelectorAll('.sf-disambig-option').forEach((o) => {
        o.classList.remove('selected');
        o.setAttribute('aria-checked', 'false');
      });
      option.classList.add('selected');
      option.setAttribute('aria-checked', 'true');
      selectedField = option.dataset.field as SemanticField;
      return;
    }

    const btn = (e.target as HTMLElement).closest('[data-action]') as HTMLElement;
    if (!btn) return;

    if (btn.dataset.action === 'save' && selectedField) {
      dismissSaveDialog(dialog, targetField, promptKey, () => {
        onResult({ action: 'save', field: selectedField!, value });
      });
    } else {
      dismissSaveDialog(dialog, targetField, promptKey, () => {
        onResult({ action: 'dismiss', field: selectedField ?? 'custom', value });
      });
    }
  });
}

/**
 * Hide the save dialog for a field.
 */
export function hideSaveDialog(field: HTMLElement): void {
  const existing = activeDialogs.get(field);
  if (existing) {
    removeFromShadow(existing);
    activeDialogs.delete(field);
  }
  const timer = dismissTimers.get(field);
  if (timer) {
    clearTimeout(timer);
    dismissTimers.delete(field);
  }
}

/**
 * Hide all active save dialogs.
 */
export function hideAllSaveDialogs(): void {
  for (const [field, dialog] of activeDialogs) {
    removeFromShadow(dialog);
  }
  activeDialogs.clear();
  for (const timer of dismissTimers.values()) {
    clearTimeout(timer);
  }
  dismissTimers.clear();
}

function dismissSaveDialog(
  dialog: HTMLElement,
  field: HTMLElement,
  promptKey: string,
  callback: () => void
): void {
  dismissedPrompts.add(promptKey);
  dialog.classList.add('sf-exiting');
  const timer = dismissTimers.get(field);
  if (timer) {
    clearTimeout(timer);
    dismissTimers.delete(field);
  }
  setTimeout(() => {
    removeFromShadow(dialog);
    activeDialogs.delete(field);
    callback();
  }, 150);
}

function getFieldIdentity(el: HTMLElement): string {
  return el.getAttribute('name') || el.getAttribute('id') || el.getAttribute('aria-label') || String(el.dataset.params || '');
}


