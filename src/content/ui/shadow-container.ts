/**
 * SmartForm Saver — Shadow DOM Container
 *
 * Isolates content script UI from the host page's styles.
 * All autofill suggestions and save prompts render inside
 * a Shadow DOM to prevent style collisions.
 */

import { logger } from '../../shared/utils/logger';

const CONTAINER_ID = 'smartform-saver-shadow-host';

let shadowRoot: ShadowRoot | null = null;
let hostElement: HTMLElement | null = null;

/**
 * Get or create the Shadow DOM container for content script UI.
 */
export function getShadowContainer(): ShadowRoot {
  if (shadowRoot) return shadowRoot;

  // Remove any existing host (e.g., from hot reload)
  const existing = document.getElementById(CONTAINER_ID);
  if (existing) existing.remove();

  hostElement = document.createElement('div');
  hostElement.id = CONTAINER_ID;
  hostElement.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    overflow: visible;
    z-index: 2147483647;
    pointer-events: none;
  `;

  document.body.appendChild(hostElement);
  shadowRoot = hostElement.attachShadow({ mode: 'open' });

  // Inject base styles
  const style = document.createElement('style');
  style.textContent = getShadowStyles();
  shadowRoot.appendChild(style);

  logger.debug('Shadow DOM container initialized');
  return shadowRoot;
}

/**
 * Remove a child element from the shadow container.
 */
export function removeFromShadow(element: HTMLElement): void {
  if (shadowRoot && shadowRoot.contains(element)) {
    shadowRoot.removeChild(element);
  }
}

/**
 * Destroy the shadow container entirely.
 */
export function destroyShadowContainer(): void {
  if (hostElement) {
    hostElement.remove();
    hostElement = null;
    shadowRoot = null;
  }
}

/**
 * Position an element near a target form field.
 */
export function positionNearElement(
  overlay: HTMLElement,
  target: HTMLElement,
  offset: { top?: number; left?: number } = {}
): void {
  const rect = target.getBoundingClientRect();
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  overlay.style.position = 'fixed';
  overlay.style.left = `${rect.left + (offset.left ?? 0)}px`;
  overlay.style.top = `${rect.bottom + (offset.top ?? 4)}px`;
  overlay.style.pointerEvents = 'auto';

  // Ensure it doesn't go off-screen to the right
  window.requestAnimationFrame(() => {
    const overlayRect = overlay.getBoundingClientRect();
    if (overlayRect.right > window.innerWidth - 8) {
      overlay.style.left = `${window.innerWidth - overlayRect.width - 8}px`;
    }
    // Ensure it doesn't go off-screen at the bottom
    if (overlayRect.bottom > window.innerHeight - 8) {
      overlay.style.top = `${rect.top - overlayRect.height - 4}px`;
    }
  });
}

function getShadowStyles(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .sf-overlay {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      color: #e2e8f0;
      pointer-events: auto;
    }

    /* ─── Suggestion Chip ──────────────────────────────────── */

    .sf-suggestion {
      position: fixed;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid rgba(6, 182, 212, 0.3);
      border-radius: 10px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(6, 182, 212, 0.1);
      backdrop-filter: blur(12px);
      max-width: 320px;
      animation: sf-slide-in 0.2s ease-out;
      cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
      z-index: 2147483647;
    }

    .sf-suggestion:hover {
      border-color: rgba(6, 182, 212, 0.6);
      box-shadow: 0 4px 24px rgba(6, 182, 212, 0.15), 0 0 0 1px rgba(6, 182, 212, 0.2);
    }

    .sf-suggestion:focus {
      outline: 2px solid #06b6d4;
      outline-offset: 2px;
    }

    .sf-suggestion-icon {
      width: 20px;
      height: 20px;
      border-radius: 5px;
      background: linear-gradient(135deg, #06b6d4, #0ea5e9);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      flex-shrink: 0;
    }

    .sf-suggestion-content {
      flex: 1;
      min-width: 0;
    }

    .sf-suggestion-label {
      font-size: 10px;
      font-weight: 600;
      color: #06b6d4;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .sf-suggestion-value {
      font-size: 13px;
      font-weight: 500;
      color: #f1f5f9;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sf-suggestion-inferred {
      font-size: 9px;
      color: #f59e0b;
      font-weight: 500;
      margin-top: 1px;
    }

    .sf-suggestion-dismiss {
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      font-size: 14px;
      padding: 2px;
      border-radius: 4px;
      line-height: 1;
      transition: color 0.15s;
      flex-shrink: 0;
    }

    .sf-suggestion-dismiss:hover {
      color: #94a3b8;
    }

    .sf-suggestion-multi {
      font-size: 10px;
      color: #94a3b8;
      background: rgba(100, 116, 139, 0.15);
      border: 1px solid rgba(100, 116, 139, 0.3);
      padding: 2px 6px;
      border-radius: 4px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      margin-top: 2px;
      font-family: inherit;
      transition: all 0.15s;
    }

    .sf-suggestion-multi:hover {
      background: rgba(6, 182, 212, 0.15);
      color: #06b6d4;
      border-color: rgba(6, 182, 212, 0.4);
    }

    /* ─── Save Dialog ──────────────────────────────────────── */

    .sf-save-dialog {
      position: fixed;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid rgba(6, 182, 212, 0.3);
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(6, 182, 212, 0.1);
      backdrop-filter: blur(12px);
      max-width: 300px;
      min-width: 220px;
      animation: sf-slide-in 0.2s ease-out;
      z-index: 2147483647;
    }

    .sf-save-title {
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
      margin-bottom: 8px;
    }

    .sf-save-field-name {
      font-size: 10px;
      font-weight: 600;
      color: #06b6d4;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }

    .sf-save-field-value {
      font-size: 14px;
      font-weight: 500;
      color: #f1f5f9;
      word-break: break-word;
      margin-bottom: 10px;
      padding: 6px 8px;
      background: rgba(6, 182, 212, 0.08);
      border-radius: 6px;
      border: 1px solid rgba(6, 182, 212, 0.12);
    }

    .sf-save-actions {
      display: flex;
      gap: 8px;
    }

    .sf-btn {
      padding: 6px 14px;
      border-radius: 7px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
      font-family: inherit;
    }

    .sf-btn-primary {
      background: linear-gradient(135deg, #06b6d4, #0ea5e9);
      color: #fff;
    }

    .sf-btn-primary:hover {
      filter: brightness(1.1);
      box-shadow: 0 2px 8px rgba(6, 182, 212, 0.3);
    }

    .sf-btn-secondary {
      background: rgba(100, 116, 139, 0.2);
      color: #94a3b8;
      border: 1px solid rgba(100, 116, 139, 0.2);
    }

    .sf-btn-secondary:hover {
      background: rgba(100, 116, 139, 0.3);
      color: #cbd5e1;
    }

    .sf-btn:focus-visible {
      outline: 2px solid #06b6d4;
      outline-offset: 2px;
    }

    /* ─── Disambiguation Dialog ────────────────────────────── */

    .sf-disambig {
      margin-bottom: 10px;
    }

    .sf-disambig-title {
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
      margin-bottom: 8px;
    }

    .sf-disambig-option {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s;
      font-size: 13px;
      color: #e2e8f0;
    }

    .sf-disambig-option:hover {
      background: rgba(6, 182, 212, 0.1);
    }

    .sf-disambig-radio {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid #475569;
      transition: all 0.15s;
      flex-shrink: 0;
      position: relative;
    }

    .sf-disambig-option:hover .sf-disambig-radio {
      border-color: #06b6d4;
    }

    .sf-disambig-option.selected .sf-disambig-radio {
      border-color: #06b6d4;
      background: #06b6d4;
      box-shadow: inset 0 0 0 3px #0f172a;
    }

    /* ─── Multi-value Dropdown ─────────────────────────────── */

    .sf-multi-dropdown {
      position: fixed;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid rgba(6, 182, 212, 0.3);
      border-radius: 10px;
      padding: 6px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      max-width: 280px;
      min-width: 180px;
      animation: sf-slide-in 0.15s ease-out;
      z-index: 2147483647;
    }

    .sf-multi-item {
      display: flex;
      flex-direction: column;
      padding: 8px 10px;
      border-radius: 7px;
      cursor: pointer;
      transition: background 0.12s;
    }

    .sf-multi-item:hover {
      background: rgba(6, 182, 212, 0.12);
    }

    .sf-multi-item-label {
      font-size: 10px;
      font-weight: 600;
      color: #64748b;
    }

    .sf-multi-item-value {
      font-size: 13px;
      font-weight: 500;
      color: #f1f5f9;
    }

    /* ─── Animations ───────────────────────────────────────── */

    @keyframes sf-slide-in {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes sf-fade-out {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
        transform: translateY(-4px);
      }
    }

    .sf-exiting {
      animation: sf-fade-out 0.15s ease-in forwards;
    }
  `;
}
