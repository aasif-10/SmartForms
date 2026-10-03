/**
 * SmartForm Saver — Onboarding & Installation Tests
 *
 * Tests the installation listener behavior and onboarding integration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from '../onboarding/App';

// Mocks for Chrome Extension APIs
const mockTabsCreate = vi.fn();
const mockGetURL = vi.fn((path: string) => `chrome-extension://mock-id/${path}`);
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

  it('should open the onboarding page on fresh installation (reason: install)', () => {
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
  });
});

describe('Onboarding App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call chrome.action.openPopup when Start using SmartForms is clicked', async () => {
    render(React.createElement(App));

    const button = screen.getByRole('button', { name: /start using smartforms/i });
    expect(button).toBeDefined();

    fireEvent.click(button);

    expect(mockOpenPopup).toHaveBeenCalledTimes(1);
  });
});
