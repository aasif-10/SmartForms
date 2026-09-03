/**
 * SmartForm Saver — Chrome Storage Implementation
 *
 * Concrete storage implementation using chrome.storage.local.
 * Handles all CRUD operations, import/export, and settings.
 *
 * Storage keys:
 *   "sf_values"   → SavedValue[]
 *   "sf_mappings"  → FieldOverride[]
 *   "sf_settings"  → ExtensionSettings
 */

import type {
  SavedValue,
  SemanticField,
  FieldOverride,
  ExtensionSettings,
  ExportData,
} from '../types';
import { DEFAULT_SETTINGS, EXPORT_VERSION } from '../types';
import type { StorageService } from './storage-service';
import { generateId } from '../utils/id';
import { logger } from '../utils/logger';

const KEYS = {
  VALUES: 'sf_values',
  MAPPINGS: 'sf_mappings',
  SETTINGS: 'sf_settings',
} as const;

class ChromeStorageService implements StorageService {
  // ─── Internal Helpers ────────────────────────────────────────────

  private async get<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const result = await chrome.storage.local.get(key);
      return (result[key] as T) ?? defaultValue;
    } catch (err) {
      logger.error(`Storage read failed for key "${key}"`, err);
      return defaultValue;
    }
  }

  private async set(key: string, value: unknown): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (err) {
      logger.error(`Storage write failed for key "${key}"`, err);
      throw new Error('Unable to save information. Please try again.');
    }
  }

  // ─── Saved Values ───────────────────────────────────────────────

  async getAllValues(): Promise<SavedValue[]> {
    return this.get<SavedValue[]>(KEYS.VALUES, []);
  }

  async getValuesForField(field: SemanticField): Promise<SavedValue[]> {
    const all = await this.getAllValues();
    return all.filter((v) => v.field === field);
  }

  async saveValue(value: SavedValue): Promise<void> {
    const all = await this.getAllValues();
    if (!value.id) {
      value.id = generateId();
    }
    all.push(value);
    await this.set(KEYS.VALUES, all);
    logger.info(`Saved value for field: ${value.field}`);
  }

  async updateValue(id: string, updates: Partial<SavedValue>): Promise<void> {
    const all = await this.getAllValues();
    const index = all.findIndex((v) => v.id === id);
    if (index === -1) {
      logger.warn(`Value not found for update: ${id}`);
      return;
    }
    all[index] = { ...all[index], ...updates, updatedAt: Date.now() };
    await this.set(KEYS.VALUES, all);
    logger.info(`Updated value for field: ${all[index].field}`);
  }

  async deleteValue(id: string): Promise<void> {
    const all = await this.getAllValues();
    const filtered = all.filter((v) => v.id !== id);
    if (filtered.length === all.length) {
      logger.warn(`Value not found for deletion: ${id}`);
      return;
    }
    await this.set(KEYS.VALUES, filtered);
    logger.info('Deleted saved value');
  }

  async findValueByContent(field: SemanticField, content: string): Promise<SavedValue | null> {
    const values = await this.getValuesForField(field);
    return values.find((v) => v.value === content) ?? null;
  }

  // ─── Custom Mappings ─────────────────────────────────────────────

  async getCustomMappings(): Promise<FieldOverride[]> {
    return this.get<FieldOverride[]>(KEYS.MAPPINGS, []);
  }

  async saveCustomMapping(mapping: FieldOverride): Promise<void> {
    const all = await this.getCustomMappings();
    if (!mapping.id) {
      mapping.id = generateId();
    }
    // Remove any existing mapping with the same pattern + hostname
    const filtered = all.filter(
      (m) => !(m.pattern === mapping.pattern && m.hostname === mapping.hostname)
    );
    filtered.push(mapping);
    await this.set(KEYS.MAPPINGS, filtered);
    logger.info(`Saved custom mapping: "${mapping.pattern}" → ${mapping.semanticField}`);
  }

  async deleteCustomMapping(id: string): Promise<void> {
    const all = await this.getCustomMappings();
    const filtered = all.filter((m) => m.id !== id);
    await this.set(KEYS.MAPPINGS, filtered);
    logger.info('Deleted custom mapping');
  }

  // ─── Settings ────────────────────────────────────────────────────

  async getSettings(): Promise<ExtensionSettings> {
    return this.get<ExtensionSettings>(KEYS.SETTINGS, { ...DEFAULT_SETTINGS });
  }

  async updateSettings(updates: Partial<ExtensionSettings>): Promise<void> {
    const current = await this.getSettings();
    const merged = { ...current, ...updates };
    await this.set(KEYS.SETTINGS, merged);
    logger.info('Updated settings');
  }

  // ─── Import / Export ─────────────────────────────────────────────

  async exportAll(): Promise<ExportData> {
    const values = await this.getAllValues();
    const mappings = await this.getCustomMappings();

    return {
      version: EXPORT_VERSION,
      exportedAt: Date.now(),
      values: values.map((v) => ({
        field: v.field,
        value: v.value,
        label: v.label,
      })),
      customMappings: mappings,
    };
  }

  async importData(
    data: ExportData,
    mergeStrategy: 'merge' | 'replace'
  ): Promise<{ imported: number; skipped: number }> {
    // Validate
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid backup file. No data was changed.');
    }
    if (data.version !== EXPORT_VERSION) {
      throw new Error(`Unsupported export version: ${data.version}. Expected: ${EXPORT_VERSION}`);
    }
    if (!Array.isArray(data.values)) {
      throw new Error('Invalid backup file: missing values array. No data was changed.');
    }

    const existing = mergeStrategy === 'merge' ? await this.getAllValues() : [];
    let imported = 0;
    let skipped = 0;

    const now = Date.now();

    for (const item of data.values) {
      if (!item.field || !item.value || typeof item.value !== 'string') {
        skipped++;
        continue;
      }

      // In merge mode, skip duplicates (same field + value)
      if (mergeStrategy === 'merge') {
        const isDuplicate = existing.some(
          (e) => e.field === item.field && e.value === item.value
        );
        if (isDuplicate) {
          skipped++;
          continue;
        }
      }

      const newValue: SavedValue = {
        id: generateId(),
        field: item.field,
        value: item.value,
        label: item.label,
        createdAt: now,
        updatedAt: now,
        usageCount: 0,
      };

      existing.push(newValue);
      imported++;
    }

    await this.set(KEYS.VALUES, existing);

    // Import custom mappings if present
    if (Array.isArray(data.customMappings)) {
      const existingMappings =
        mergeStrategy === 'merge' ? await this.getCustomMappings() : [];
      for (const mapping of data.customMappings) {
        if (mapping.pattern && mapping.semanticField) {
          const isDuplicate = existingMappings.some(
            (m) => m.pattern === mapping.pattern && m.hostname === mapping.hostname
          );
          if (!isDuplicate) {
            existingMappings.push({
              ...mapping,
              id: generateId(),
              createdAt: mapping.createdAt ?? now,
            });
          }
        }
      }
      await this.set(KEYS.MAPPINGS, existingMappings);
    }

    logger.info(`Import complete: ${imported} imported, ${skipped} skipped`);
    return { imported, skipped };
  }

  // ─── Maintenance ─────────────────────────────────────────────────

  async clearAll(): Promise<void> {
    await chrome.storage.local.clear();
    logger.info('All data cleared');
  }
}

/** Singleton storage service instance. */
export const chromeStorage = new ChromeStorageService();
