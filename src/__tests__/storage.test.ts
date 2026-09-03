/**
 * SmartForm Saver — Storage Tests
 *
 * Tests the ChromeStorageService using a mock chrome.storage.local.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SavedValue, ExportData, SemanticField } from '../shared/types';
import { EXPORT_VERSION } from '../shared/types';

// ─── Mock chrome.storage.local ───────────────────────────────────────

const store: Record<string, unknown> = {};

const mockChromeStorage = {
  local: {
    get: vi.fn((key: string) => {
      return Promise.resolve({ [key]: store[key] });
    }),
    set: vi.fn((items: Record<string, unknown>) => {
      Object.assign(store, items);
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((k) => delete store[k]);
      return Promise.resolve();
    }),
  },
};

// Set up the global chrome mock before importing the module
vi.stubGlobal('chrome', { storage: mockChromeStorage });

// Need dynamic import so the mock is in place
const { chromeStorage } = await import('../shared/storage/chrome-storage');

describe('ChromeStorageService', () => {
  beforeEach(() => {
    // Clear store
    Object.keys(store).forEach((k) => delete store[k]);
    vi.clearAllMocks();
  });

  // ─── CRUD ──────────────────────────────────────────────────────

  describe('CRUD Operations', () => {
    it('should return empty array when no values exist', async () => {
      const values = await chromeStorage.getAllValues();
      expect(values).toEqual([]);
    });

    it('should save and retrieve a value', async () => {
      const value: SavedValue = {
        id: 'test-1',
        field: 'first_name',
        value: 'Test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0,
      };

      await chromeStorage.saveValue(value);
      const all = await chromeStorage.getAllValues();
      expect(all.length).toBe(1);
      expect(all[0].value).toBe('Test');
    });

    it('should get values for a specific field', async () => {
      const v1: SavedValue = {
        id: 'test-1', field: 'email', value: 'a@b.com',
        createdAt: Date.now(), updatedAt: Date.now(), usageCount: 0,
      };
      const v2: SavedValue = {
        id: 'test-2', field: 'phone', value: '12345',
        createdAt: Date.now(), updatedAt: Date.now(), usageCount: 0,
      };

      await chromeStorage.saveValue(v1);
      await chromeStorage.saveValue(v2);

      const emails = await chromeStorage.getValuesForField('email');
      expect(emails.length).toBe(1);
      expect(emails[0].field).toBe('email');
    });

    it('should update a value', async () => {
      const value: SavedValue = {
        id: 'test-1', field: 'first_name', value: 'Old',
        createdAt: Date.now(), updatedAt: Date.now(), usageCount: 0,
      };

      await chromeStorage.saveValue(value);
      await chromeStorage.updateValue('test-1', { value: 'New' });

      const all = await chromeStorage.getAllValues();
      expect(all[0].value).toBe('New');
    });

    it('should delete a value', async () => {
      const value: SavedValue = {
        id: 'test-1', field: 'first_name', value: 'Test',
        createdAt: Date.now(), updatedAt: Date.now(), usageCount: 0,
      };

      await chromeStorage.saveValue(value);
      await chromeStorage.deleteValue('test-1');

      const all = await chromeStorage.getAllValues();
      expect(all.length).toBe(0);
    });

    it('should find value by content', async () => {
      const value: SavedValue = {
        id: 'test-1', field: 'email', value: 'test@example.com',
        createdAt: Date.now(), updatedAt: Date.now(), usageCount: 0,
      };

      await chromeStorage.saveValue(value);
      const found = await chromeStorage.findValueByContent('email', 'test@example.com');
      expect(found).not.toBeNull();
      expect(found!.id).toBe('test-1');
    });

    it('should support multiple values per field', async () => {
      const v1: SavedValue = {
        id: 'e1', field: 'email', value: 'personal@gmail.com', label: 'Personal',
        createdAt: Date.now(), updatedAt: Date.now(), usageCount: 0,
      };
      const v2: SavedValue = {
        id: 'e2', field: 'email', value: 'work@corp.com', label: 'Work',
        createdAt: Date.now(), updatedAt: Date.now(), usageCount: 0,
      };

      await chromeStorage.saveValue(v1);
      await chromeStorage.saveValue(v2);

      const emails = await chromeStorage.getValuesForField('email');
      expect(emails.length).toBe(2);
    });
  });

  // ─── Import / Export ───────────────────────────────────────────

  describe('Import / Export', () => {
    it('should export data correctly', async () => {
      const value: SavedValue = {
        id: 'test-1', field: 'first_name', value: 'Aasif',
        createdAt: Date.now(), updatedAt: Date.now(), usageCount: 0,
      };

      await chromeStorage.saveValue(value);
      const exported = await chromeStorage.exportAll();

      expect(exported.version).toBe(EXPORT_VERSION);
      expect(exported.values.length).toBe(1);
      expect(exported.values[0].field).toBe('first_name');
      expect(exported.values[0].value).toBe('Aasif');
    });

    it('should import data with merge strategy', async () => {
      const existing: SavedValue = {
        id: 'e1', field: 'email', value: 'existing@test.com',
        createdAt: Date.now(), updatedAt: Date.now(), usageCount: 0,
      };
      await chromeStorage.saveValue(existing);

      const importData: ExportData = {
        version: EXPORT_VERSION,
        exportedAt: Date.now(),
        values: [
          { field: 'first_name', value: 'New' },
          { field: 'email', value: 'existing@test.com' }, // duplicate
        ],
      };

      const result = await chromeStorage.importData(importData, 'merge');
      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);

      const all = await chromeStorage.getAllValues();
      expect(all.length).toBe(2); // existing + new
    });

    it('should reject invalid import data', async () => {
      await expect(chromeStorage.importData(null as unknown as ExportData, 'merge'))
        .rejects.toThrow('Invalid backup file');
    });

    it('should reject wrong version', async () => {
      const data: ExportData = {
        version: 999,
        exportedAt: Date.now(),
        values: [],
      };
      await expect(chromeStorage.importData(data, 'merge'))
        .rejects.toThrow('Unsupported export version');
    });

    it('should skip invalid entries during import', async () => {
      const data: ExportData = {
        version: EXPORT_VERSION,
        exportedAt: Date.now(),
        values: [
          { field: 'email', value: 'valid@test.com' },
          { field: '' as SemanticField, value: '' }, // invalid
        ],
      };

      const result = await chromeStorage.importData(data, 'merge');
      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
    });
  });

  // ─── Settings ──────────────────────────────────────────────────

  describe('Settings', () => {
    it('should return default settings when none are saved', async () => {
      const settings = await chromeStorage.getSettings();
      expect(settings.enabled).toBe(true);
      expect(settings.showAutofillSuggestions).toBe(true);
    });

    it('should update settings', async () => {
      await chromeStorage.updateSettings({ enabled: false });
      const settings = await chromeStorage.getSettings();
      expect(settings.enabled).toBe(false);
    });
  });

  // ─── Clear All ─────────────────────────────────────────────────

  describe('Clear All', () => {
    it('should clear all data', async () => {
      await chromeStorage.saveValue({
        id: 't1', field: 'email', value: 'test',
        createdAt: Date.now(), updatedAt: Date.now(), usageCount: 0,
      });

      await chromeStorage.clearAll();
      const all = await chromeStorage.getAllValues();
      expect(all.length).toBe(0);
    });
  });
});
