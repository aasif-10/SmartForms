/**
 * SmartForm Saver — Onboarding & Installation Tests
 *
 * Tests the installation listener behavior, onboarding integration,
 * build output, and UI error handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
/* eslint-disable @typescript-eslint/ban-ts-comment */
// Ambient declaration for Node process
declare const process: { cwd(): string };
// @ts-ignore
import fs from 'fs';
// @ts-ignore
import path from 'path';
// @ts-ignore
import { execSync } from 'child_process';
import { App } from '../onboarding/App';

// Mocks for Chrome Extension APIs
const mockTabsCreate = vi.fn();
const mockGetURL = vi.fn((p: string) => `chrome-extension://mock-id/${p}`);
const mockGetManifest = vi.fn(() => ({ version: '1.0.0' }));
const mockOpenPopup = vi.fn().mockResolvedValue(undefined);

let installListener: ((details: { reason: string }) => void) | null = null;

const mockOnInstalled = {
  addListener: vi.fn((listener: (details: { reason: string }) => void) => {
    installListener = listener;
  }),
};

const mockOnMessage = {
  addListener: vi.fn(),
};

vi.stubGlobal('chrome', {
  runtime: {
    onInstalled: mockOnInstalled,
    onMessage: mockOnMessage,
    getURL: mockGetURL,
    getManifest: mockGetManifest,
  },
  action: {
    openPopup: mockOpenPopup,
  },
  tabs: {
    create: mockTabsCreate,
  },
});

describe('Production Build Output', () => {
  it('should generate onboarding index.html at dist/src/onboarding/index.html after build', () => {
    const distPath = path.resolve(process.cwd(), 'dist/src/onboarding/index.html');
    if (!fs.existsSync(distPath)) {
      execSync('npm run build', { stdio: 'ignore' });
    }
    expect(fs.existsSync(distPath)).toBe(true);
    const htmlContent = fs.readFileSync(distPath, 'utf-8');
    expect(htmlContent).toContain('<div id="root"></div>');
    // Verify no external Google Fonts present in built HTML
    expect(htmlContent).not.toContain('fonts.googleapis.com');
    expect(htmlContent).not.toContain('fonts.gstatic.com');
  });
});

describe('Background Onboarding Listener', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    installListener = null;

    // Reset module registry and dynamically import service worker
    vi.resetModules();
    await import('../background/service-worker');
  });

  it('should register an onInstalled listener', () => {
    expect(mockOnInstalled.addListener).toHaveBeenCalled();
    expect(installListener).not.toBeNull();
  });

  it('should open the onboarding page ONLY on fresh installation (reason: install)', () => {
    expect(installListener).toBeDefined();
    installListener!({ reason: 'install' });

    expect(mockGetURL).toHaveBeenCalledWith('src/onboarding/index.html');
    expect(mockTabsCreate).toHaveBeenCalledWith({
      url: 'chrome-extension://mock-id/src/onboarding/index.html',
    });
  });

  it('should NOT open the onboarding page on extension update (reason: update)', () => {
    expect(installListener).toBeDefined();
    installListener!({ reason: 'update' });

    expect(mockTabsCreate).not.toHaveBeenCalled();
    expect(mockGetURL).not.toHaveBeenCalled();
  });
});

describe('Onboarding App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenPopup.mockResolvedValue(undefined);
  });

  it('should call chrome.action.openPopup when Start using SmartForms is clicked', async () => {
    render(React.createElement(App));

    const button = screen.getByRole('button', { name: /start using smartforms/i });
    expect(button).toBeDefined();

    fireEvent.click(button);

    expect(mockOpenPopup).toHaveBeenCalledTimes(1);
  });

  it('should display fallback alert when chrome.action.openPopup fails or rejects', async () => {
    mockOpenPopup.mockRejectedValueOnce(new Error('Popup failed'));

    render(React.createElement(App));

    const button = screen.getByRole('button', { name: /start using smartforms/i });
    fireEvent.click(button);

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeDefined();
      expect(alert.textContent).toContain('Could not open the extension popup automatically');
    });
  });
});
