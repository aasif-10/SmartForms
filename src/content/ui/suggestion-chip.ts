/**
 * SmartForm Saver — Suggestion Chip
 *
 * Renders autofill suggestions near form fields.
 * Supports single-value and multi-value display.
 * Respects keyboard navigation (Tab/Enter to accept, Escape to dismiss).
 */

import type { SavedValue } from '../../shared/types';
import { getShadowContainer, positionNearElement, removeFromShadow } from './shadow-container';
import { logger } from '../../shared/utils/logger';

/** Track active suggestions to prevent duplicates. */
const activeSuggestions = new Map<HTMLElement, HTMLElement>();

/**
 * Show an autofill suggestion near a form field.
 */
export function showSuggestion(
  targetField: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  savedValues: SavedValue[],
  fieldLabel: string,
  isInferred: boolean,
  onAccept: (value: SavedValue) => void,
  onDismiss: () => void
): void {
  // Remove existing suggestion for this field
  hideSuggestion(targetField);

  if (savedValues.length === 0) return;

  const shadow = getShadowContainer();
  const primaryValue = savedValues[0];

  const chip = document.createElement('div');
  chip.className = 'sf-overlay sf-suggestion';
  chip.setAttribute('role', 'tooltip');
  chip.setAttribute('aria-label', `Saved value for ${fieldLabel}: ${primaryValue.value}`);
  chip.tabIndex = 0;

  const iconDiv = document.createElement('div');
  iconDiv.className = 'sf-suggestion-icon';
  iconDiv.textContent = '⚡';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'sf-suggestion-content';

  const labelDiv = document.createElement('div');
  labelDiv.className = 'sf-suggestion-label';
  labelDiv.textContent = fieldLabel;

  const valueDiv = document.createElement('div');
  valueDiv.className = 'sf-suggestion-value';
  valueDiv.textContent = primaryValue.value;

  contentDiv.appendChild(labelDiv);
  contentDiv.appendChild(valueDiv);

  if (isInferred) {
    const inferredDiv = document.createElement('div');
    inferredDiv.className = 'sf-suggestion-inferred';
    inferredDiv.textContent = '⚠ Inferred value';
    contentDiv.appendChild(inferredDiv);
  }

  if (savedValues.length > 1) {
    const multiBtn = document.createElement('button');
    multiBtn.className = 'sf-suggestion-multi';
    multiBtn.title = 'See more options';
    multiBtn.textContent = `+${savedValues.length - 1} more ▼`;
    contentDiv.appendChild(multiBtn);
  }

  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'sf-suggestion-dismiss';
  dismissBtn.setAttribute('aria-label', 'Dismiss suggestion');
  dismissBtn.title = 'Dismiss';
  dismissBtn.textContent = '✕';

  chip.appendChild(iconDiv);
  chip.appendChild(contentDiv);
  chip.appendChild(dismissBtn);

  // Position near the field
  shadow.appendChild(chip);
  positionNearElement(chip, targetField);

  // ─── Event Handlers ──────────────────────────────────────────

  const handleClick = (e: Event) => {
    e.stopPropagation();
    const target = e.target as HTMLElement;

    // Dismiss button
    if (target.classList.contains('sf-suggestion-dismiss')) {
      dismissWithAnimation(chip, targetField, onDismiss);
      return;
    }

    // Multi-value dropdown
    if (target.classList.contains('sf-suggestion-multi') && savedValues.length > 1) {
      showMultiValueDropdown(targetField, savedValues, fieldLabel, chip, onAccept, onDismiss);
      return;
    }

    // Accept primary value
    onAccept(primaryValue);
    dismissWithAnimation(chip, targetField, onDismiss);
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      dismissWithAnimation(chip, targetField, onDismiss);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      onAccept(primaryValue);
      dismissWithAnimation(chip, targetField, onDismiss);
    }
  };

  chip.addEventListener('click', handleClick);
  chip.addEventListener('keydown', handleKeydown);

  activeSuggestions.set(targetField, chip);
  logger.debug(`Showing suggestion for field: ${fieldLabel}`);
}

/**
 * Show a dropdown with multiple saved values.
 */
function showMultiValueDropdown(
  targetField: HTMLElement,
  savedValues: SavedValue[],
  fieldLabel: string,
  parentChip: HTMLElement,
  onAccept: (value: SavedValue) => void,
  onDismiss: () => void
): void {
  const shadow = getShadowContainer();

  // Remove any existing dropdown
  const existingDropdown = shadow.querySelector('.sf-multi-dropdown');
  if (existingDropdown) existingDropdown.remove();

  const dropdown = document.createElement('div');
  dropdown.className = 'sf-overlay sf-multi-dropdown';
  dropdown.setAttribute('role', 'listbox');
  dropdown.setAttribute('aria-label', `Saved values for ${fieldLabel}`);

  for (const sv of savedValues) {
    const item = document.createElement('div');
    item.className = 'sf-multi-item';
    item.setAttribute('role', 'option');
    item.tabIndex = 0;
    if (sv.label) {
      const labelDiv = document.createElement('div');
      labelDiv.className = 'sf-multi-item-label';
      labelDiv.textContent = sv.label;
      item.appendChild(labelDiv);
    }

    const valueDiv = document.createElement('div');
    valueDiv.className = 'sf-multi-item-value';
    valueDiv.textContent = sv.value;
    item.appendChild(valueDiv);

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      onAccept(sv);
      dropdown.remove();
      dismissWithAnimation(parentChip, targetField as HTMLInputElement, onDismiss);
    });

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onAccept(sv);
        dropdown.remove();
        dismissWithAnimation(parentChip, targetField as HTMLInputElement, onDismiss);
      }
    });

    dropdown.appendChild(item);
  }

  shadow.appendChild(dropdown);
  positionNearElement(dropdown, parentChip, { top: 4 });

  // Close dropdown on outside click
  const closeDropdown = (e: Event) => {
    if (!dropdown.contains(e.target as Node)) {
      dropdown.remove();
      document.removeEventListener('click', closeDropdown);
    }
  };
  setTimeout(() => document.addEventListener('click', closeDropdown), 0);
}

/**
 * Hide the suggestion for a field.
 */
export function hideSuggestion(field: HTMLElement): void {
  const existing = activeSuggestions.get(field);
  if (existing) {
    removeFromShadow(existing);
    activeSuggestions.delete(field);
  }
}

/**
 * Hide all active suggestions.
 */
export function hideAllSuggestions(): void {
  for (const [field, chip] of activeSuggestions) {
    removeFromShadow(chip);
  }
  activeSuggestions.clear();
}

/**
 * Animate out and remove.
 */
function dismissWithAnimation(
  element: HTMLElement,
  field: HTMLElement,
  onDismiss: () => void
): void {
  element.classList.add('sf-exiting');
  setTimeout(() => {
    removeFromShadow(element);
    activeSuggestions.delete(field);
    onDismiss();
  }, 150);
}


