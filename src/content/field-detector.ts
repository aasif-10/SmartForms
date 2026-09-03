/**
 * SmartForm Saver — Field Detector
 *
 * Scans the DOM for form fields (input, textarea, select) and extracts
 * rich metadata from each. Handles both standard HTML forms and
 * Google Forms' specific DOM structures.
 *
 * Google Forms uses a complex nested structure with aria-labels,
 * data-params, and role attributes instead of standard form elements.
 */

import type { FieldMetadata } from '../shared/types';
import { isSensitiveElement } from '../shared/constants/sensitive';
import { logger } from '../shared/utils/logger';

/**
 * Detect all form input fields on the page.
 * Returns only visible, non-sensitive, non-hidden fields.
 */
export function detectFields(root: ParentNode = document): HTMLElement[] {
  const selectors = [
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]):not([type="file"])',
    'textarea',
    'select',
    // Google Forms specific: contenteditable areas
    '[contenteditable="true"]',
    // Google Forms text inputs that may not be standard inputs
    '[role="textbox"]',
    '[role="combobox"]',
    '[role="listbox"]',
  ];

  const elements = root.querySelectorAll<HTMLElement>(selectors.join(','));
  const fields: HTMLElement[] = [];

  for (const el of elements) {
    // Skip hidden/invisible fields
    if (!isVisible(el)) continue;

    // Skip fields inside our own shadow container
    if (el.closest('#smartform-saver-shadow-host')) continue;

    // Skip sensitive fields
    if (isSensitiveElement(el)) continue;

    fields.push(el);
  }

  logger.debug(`Detected ${fields.length} form fields`);
  return fields;
}

/**
 * Extract metadata from a form field element.
 * Gathers information from multiple sources for classification.
 */
export function extractFieldMetadata(element: HTMLElement): FieldMetadata {
  const label = findLabel(element);
  const placeholder = element.getAttribute('placeholder') ?? '';
  const name = element.getAttribute('name') ?? '';
  const id = element.getAttribute('id') ?? '';
  const ariaLabel = element.getAttribute('aria-label') ?? '';
  const autocomplete = element.getAttribute('autocomplete') ?? '';
  const title = element.getAttribute('title') ?? '';
  const type = (element as HTMLInputElement).type ?? '';
  const nearbyText = extractNearbyText(element);

  // Combine all text signals
  const texts = [label, ariaLabel, placeholder, name, title, nearbyText]
    .filter((t) => t.length > 0);
  const combinedText = texts.join(' ');

  return {
    label,
    placeholder,
    name,
    id,
    ariaLabel,
    autocomplete,
    title,
    type,
    nearbyText,
    combinedText,
  };
}

/**
 * Find the label text for a form field.
 * Tries multiple strategies in priority order.
 */
function findLabel(element: HTMLElement): string {
  // Strategy 1: Explicit <label for="...">
  const id = element.getAttribute('id');
  if (id) {
    const labelEl = document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(id)}"]`);
    if (labelEl) {
      return cleanLabelText(labelEl.textContent ?? '');
    }
  }

  // Strategy 2: Ancestor <label>
  const parentLabel = element.closest('label');
  if (parentLabel) {
    // Get label text excluding the input's own text
    const clone = parentLabel.cloneNode(true) as HTMLElement;
    const inputs = clone.querySelectorAll('input, textarea, select');
    inputs.forEach((i) => i.remove());
    return cleanLabelText(clone.textContent ?? '');
  }

  // Strategy 3: aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const ids = labelledBy.split(/\s+/);
    const texts = ids
      .map((lid) => document.getElementById(lid)?.textContent ?? '')
      .filter(Boolean);
    if (texts.length > 0) {
      return cleanLabelText(texts.join(' '));
    }
  }

  // Strategy 4: Google Forms specific — find the question text
  const gformLabel = findGoogleFormsLabel(element);
  if (gformLabel) return gformLabel;

  // Strategy 5: Previous sibling text
  const prevSibling = element.previousElementSibling;
  if (prevSibling && isLabelLike(prevSibling)) {
    return cleanLabelText(prevSibling.textContent ?? '');
  }

  // Strategy 6: Parent's first text node or heading
  const parent = element.parentElement;
  if (parent) {
    const heading = parent.querySelector('h1, h2, h3, h4, h5, h6, legend');
    if (heading && !heading.querySelector('input, textarea, select')) {
      return cleanLabelText(heading.textContent ?? '');
    }
  }

  return '';
}

/**
 * Find label text specific to Google Forms' DOM structure.
 *
 * Google Forms typically has a structure like:
 * <div class="question-container">
 *   <div class="question-header">
 *     <span>Question Text</span>
 *   </div>
 *   <div class="question-body">
 *     <input ...>
 *   </div>
 * </div>
 *
 * The actual class names are obfuscated, so we use structural patterns.
 */
function findGoogleFormsLabel(element: HTMLElement): string {
  // Strategy A: Look for data-params attribute on ancestor
  let ancestor = element.parentElement;
  const maxDepth = 10;
  let depth = 0;

  while (ancestor && depth < maxDepth) {
    const dataParams = ancestor.getAttribute('data-params');
    if (dataParams) {
      const extracted = extractFromDataParams(dataParams);
      if (extracted) return extracted;
    }

    // Strategy B: Look for a [role="heading"] inside the question container
    const heading = ancestor.querySelector('[role="heading"]');
    if (heading) {
      const text = cleanLabelText(heading.textContent ?? '');
      if (text.length > 0 && text.length < 200) {
        return text;
      }
    }

    // Strategy C: Look for the first text-heavy div that isn't the input container
    if (ancestor.getAttribute('role') === 'listitem' ||
        ancestor.classList.length > 0) {
      const textDivs = ancestor.querySelectorAll('div, span');
      for (const div of textDivs) {
        if (div.contains(element)) continue;
        if (div.querySelector('input, textarea, select, [role="textbox"]')) continue;

        const text = cleanLabelText(div.textContent ?? '');
        if (text.length >= 2 && text.length < 200) {
          // Heuristic: if this div is above the input in the DOM and looks like a label
          const divRect = div.getBoundingClientRect();
          const elRect = element.getBoundingClientRect();
          if (divRect.top < elRect.top || divRect.left < elRect.left) {
            return text;
          }
        }
      }
    }

    ancestor = ancestor.parentElement;
    depth++;
  }

  return '';
}

/**
 * Extract question text from Google Forms' data-params attribute.
 * data-params is a JSON-like structure containing the question text.
 */
function extractFromDataParams(dataParams: string): string {
  try {
    // data-params format: %.@.[...,"Question Text",...]
    // The question text is typically the second string in the array
    const matches = dataParams.match(/,"([^"]{2,})"/g);
    if (matches && matches.length > 0) {
      // Usually the first meaningful string is the question text
      const text = matches[0].replace(/^,"/, '').replace(/"$/, '');
      if (text.length >= 2 && text.length < 200) {
        return cleanLabelText(text);
      }
    }
  } catch {
    // data-params parsing can fail — that's fine
  }
  return '';
}

/**
 * Extract nearby text from the DOM around a field.
 * This captures context that isn't in formal label elements.
 */
function extractNearbyText(element: HTMLElement): string {
  const texts: string[] = [];
  const parent = element.parentElement;
  if (!parent) return '';

  // Walk siblings
  for (const sibling of parent.children) {
    if (sibling === element) continue;
    if (sibling.querySelector('input, textarea, select')) continue;

    const text = cleanLabelText(sibling.textContent ?? '');
    if (text.length >= 2 && text.length < 100) {
      texts.push(text);
    }
  }

  return texts.join(' ').substring(0, 200);
}

/**
 * Get labels of all sibling fields (for context-aware classification).
 * Used for disambiguating "Name" fields.
 */
export function getSiblingFieldLabels(element: HTMLElement): string[] {
  const labels: string[] = [];

  // Find the form or a reasonable container
  const container = element.closest('form') || element.closest('[role="form"]') ||
    element.closest('[role="list"]') || element.parentElement?.parentElement?.parentElement;

  if (!container) return labels;

  const allFields = container.querySelectorAll('input, textarea, select, [role="textbox"]');
  for (const field of allFields) {
    if (field === element) continue;
    const meta = extractFieldMetadata(field as HTMLElement);
    const label = meta.label || meta.ariaLabel || meta.placeholder;
    if (label) labels.push(label);
  }

  return labels;
}

// ─── Utilities ────────────────────────────────────────────────────────

function isVisible(element: HTMLElement): boolean {
  if (element.offsetParent === null && element.style.position !== 'fixed') {
    return false;
  }
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

function isLabelLike(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  return (
    tag === 'label' ||
    tag === 'span' ||
    tag === 'div' ||
    tag === 'p' ||
    tag === 'legend' ||
    tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6'
  );
}

function cleanLabelText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\*/g, '')      // Remove required asterisks
    .replace(/:\s*$/, '')    // Remove trailing colons
    .trim();
}
