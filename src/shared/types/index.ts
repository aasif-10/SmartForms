/**
 * SmartForm Saver — Core Type Definitions
 *
 * Central type system for semantic field classification, saved values,
 * settings, and messaging between extension components.
 */

// ─── Semantic Field Types ──────────────────────────────────────────────

/** All recognized semantic field identifiers. */
export type SemanticField =
  | 'full_name'
  | 'first_name'
  | 'middle_name'
  | 'last_name'
  | 'email'
  | 'phone'
  | 'register_number'
  | 'student_id'
  | 'employee_id'
  | 'college'
  | 'university'
  | 'department'
  | 'course'
  | 'year'
  | 'section'
  | 'address'
  | 'city'
  | 'state'
  | 'country'
  | 'postal_code'
  | 'date_of_birth'
  | 'gender'
  | 'blood_group'
  | 'father_name'
  | 'mother_name'
  | 'organization'
  | 'designation'
  | 'custom';

/** Category groupings for display and organization. */
export type FieldCategory =
  | 'personal'
  | 'contact'
  | 'education'
  | 'identification'
  | 'address'
  | 'professional'
  | 'other';

// ─── Field Taxonomy ────────────────────────────────────────────────────

/** A single entry in the field taxonomy. */
export interface FieldTaxonomyEntry {
  key: SemanticField;
  label: string;
  aliases: string[];
  category: FieldCategory;
  /** If true, values for this field should never be stored. */
  sensitive: boolean;
  /** Optional autocomplete attribute values that map to this field. */
  autocompleteValues?: string[];
}

// ─── Saved Values ──────────────────────────────────────────────────────

/** A user-saved value for a semantic field. */
export interface SavedValue {
  id: string;
  field: SemanticField;
  value: string;
  label?: string;

  source?: {
    hostname?: string;
    pageTitle?: string;
  };

  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
  usageCount: number;
}

// ─── Field Classification ──────────────────────────────────────────────

/** The source/level of a classification match. */
export type ClassificationSource =
  | 'exact'
  | 'alias'
  | 'autocomplete'
  | 'metadata'
  | 'fuzzy'
  | 'custom_mapping'
  | 'ai';

/** Result of classifying a form field. */
export interface FieldClassification {
  field: SemanticField;
  confidence: number;
  source: ClassificationSource;
}

/** Metadata extracted from a form field element. */
export interface FieldMetadata {
  label: string;
  placeholder: string;
  name: string;
  id: string;
  ariaLabel: string;
  autocomplete: string;
  title: string;
  type: string;
  nearbyText: string;
  /** The raw text combined for classification. */
  combinedText: string;
}

// ─── Custom Mappings ───────────────────────────────────────────────────

/** A user-learned or domain-specific field mapping. */
export interface FieldOverride {
  id: string;
  /** If set, this mapping only applies on this hostname. */
  hostname?: string;
  /** The text pattern (normalized) that triggered the mapping. */
  pattern: string;
  /** The semantic field it maps to. */
  semanticField: SemanticField;
  createdAt: number;
}

// ─── Settings ──────────────────────────────────────────────────────────

export interface ExtensionSettings {
  enabled: boolean;
  showAutofillSuggestions: boolean;
  askBeforeSaving: boolean;
  autoFillHighConfidence: boolean;
  /** Confidence threshold for auto-fill (0-1). */
  autoFillThreshold: number;
  enableAIClassification: boolean;
  /** Log level: 'debug' | 'info' | 'warn' | 'error' | 'none' */
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'none';
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  showAutofillSuggestions: true,
  askBeforeSaving: true,
  autoFillHighConfidence: true,
  autoFillThreshold: 0.85,
  enableAIClassification: false,
  logLevel: 'warn',
};

// ─── Import / Export ───────────────────────────────────────────────────

export interface ExportData {
  version: number;
  exportedAt: number;
  values: Array<{
    field: SemanticField;
    value: string;
    label?: string;
  }>;
  customMappings?: FieldOverride[];
}

export const EXPORT_VERSION = 1;

// ─── Messaging ─────────────────────────────────────────────────────────

/** Message types for communication between extension components. */
export type MessageType =
  | 'GET_ALL_VALUES'
  | 'GET_VALUES_FOR_FIELD'
  | 'SAVE_VALUE'
  | 'UPDATE_VALUE'
  | 'DELETE_VALUE'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'GET_CUSTOM_MAPPINGS'
  | 'SAVE_CUSTOM_MAPPING'
  | 'DELETE_CUSTOM_MAPPING'
  | 'EXPORT_DATA'
  | 'IMPORT_DATA'
  | 'CLEAR_ALL_DATA'
  | 'CLASSIFY_FIELD'
  | 'GET_SUGGESTIONS';

export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
}

export interface ExtensionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Content Script Types ──────────────────────────────────────────────

/** Represents a detected form field with its element and classification. */
export interface DetectedField {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  metadata: FieldMetadata;
  classifications: FieldClassification[];
  bestMatch: FieldClassification | null;
}

/** Suggestion for a field based on saved values. */
export interface FieldSuggestion {
  field: DetectedField;
  savedValues: SavedValue[];
  primaryValue: SavedValue | null;
  isInferred: boolean;
  inferredFrom?: SemanticField;
}
