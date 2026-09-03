/**
 * SmartForm Saver — DOM Observer
 *
 * Watches for dynamically added form fields using MutationObserver.
 * Critical for Google Forms which renders fields progressively and
 * re-renders on navigation between form sections.
 *
 * Uses a WeakSet to track already-processed elements and debounces
 * mutation callbacks to avoid excessive processing.
 */

import { logger } from '../shared/utils/logger';

type FieldCallback = (fields: HTMLElement[]) => void;

/** Track processed elements to avoid duplicate handling. */
const processedElements = new WeakSet<Element>();

/** The active MutationObserver instance. */
let observer: MutationObserver | null = null;

/** Debounce timer for mutation callbacks. */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** The current callback for new field detection. */
let onNewFields: FieldCallback | null = null;

const DEBOUNCE_MS = 250;

/**
 * Field selectors to watch for.
 */
const FIELD_SELECTORS = [
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '[role="textbox"]',
  '[role="combobox"]',
  '[role="listbox"]',
].join(',');

/**
 * Start observing the DOM for new form fields.
 */
export function startObserving(callback: FieldCallback): void {
  if (observer) {
    stopObserving();
  }

  onNewFields = callback;

  observer = new MutationObserver((mutations) => {
    // Check if any mutation actually added relevant nodes
    let hasNewNodes = false;

    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            // Check if the added node is or contains a form field
            if (node.matches?.(FIELD_SELECTORS) || node.querySelector?.(FIELD_SELECTORS)) {
              hasNewNodes = true;
              break;
            }
          }
        }
      }
      if (hasNewNodes) break;
    }

    if (!hasNewNodes) return;

    // Debounce to batch-process mutations
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      processNewFields();
    }, DEBOUNCE_MS);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  logger.info('DOM observer started');
}

/**
 * Stop observing the DOM.
 */
export function stopObserving(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  onNewFields = null;
  logger.info('DOM observer stopped');
}

/**
 * Scan for new (unprocessed) form fields and notify callback.
 */
function processNewFields(): void {
  if (!onNewFields) return;

  const allFields = document.querySelectorAll<HTMLElement>(FIELD_SELECTORS);
  const newFields: HTMLElement[] = [];

  for (const field of allFields) {
    if (!processedElements.has(field)) {
      // Skip fields inside our shadow container
      if (field.closest('#smartform-saver-shadow-host')) continue;

      processedElements.add(field);
      newFields.push(field);
    }
  }

  if (newFields.length > 0) {
    logger.debug(`Found ${newFields.length} new fields`);
    onNewFields(newFields);
  }
}

/**
 * Mark an element as processed (prevents re-processing).
 */
export function markProcessed(element: Element): void {
  processedElements.add(element);
}

/**
 * Check if an element has been processed.
 */
export function isProcessed(element: Element): boolean {
  return processedElements.has(element);
}

/**
 * Force a rescan of the entire page for new fields.
 * Useful after navigation or major DOM changes.
 */
export function rescan(): void {
  processNewFields();
}
