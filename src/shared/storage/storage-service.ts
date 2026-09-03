/**
 * SmartForm Saver — Storage Service Interface
 *
 * Abstract storage layer. All UI and content script code should use
 * this interface rather than directly accessing chrome.storage.
 * This enables future migration to IndexedDB, encrypted storage, etc.
 */

import type {
  SavedValue,
  SemanticField,
  FieldOverride,
  ExtensionSettings,
  ExportData,
} from '../types';

export interface StorageService {
  // ─── Saved Values ────────────────────────────────────────────────
  getAllValues(): Promise<SavedValue[]>;
  getValuesForField(field: SemanticField): Promise<SavedValue[]>;
  saveValue(value: SavedValue): Promise<void>;
  updateValue(id: string, updates: Partial<SavedValue>): Promise<void>;
  deleteValue(id: string): Promise<void>;
  findValueByContent(field: SemanticField, content: string): Promise<SavedValue | null>;

  // ─── Custom Mappings ─────────────────────────────────────────────
  getCustomMappings(): Promise<FieldOverride[]>;
  saveCustomMapping(mapping: FieldOverride): Promise<void>;
  deleteCustomMapping(id: string): Promise<void>;

  // ─── Settings ────────────────────────────────────────────────────
  getSettings(): Promise<ExtensionSettings>;
  updateSettings(updates: Partial<ExtensionSettings>): Promise<void>;

  // ─── Import / Export ─────────────────────────────────────────────
  exportAll(): Promise<ExportData>;
  importData(data: ExportData, mergeStrategy: 'merge' | 'replace'): Promise<{ imported: number; skipped: number }>;

  // ─── Maintenance ─────────────────────────────────────────────────
  clearAll(): Promise<void>;
}
