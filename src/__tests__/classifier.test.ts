/**
 * SmartForm Saver — Field Classifier Tests
 *
 * Tests all 5 matching levels plus name ambiguity handling.
 */

import { describe, it, expect } from 'vitest';
import { classifyField, getBestClassification } from '../shared/classifier/field-classifier';
import type { FieldMetadata } from '../shared/types';

function makeMetadata(overrides: Partial<FieldMetadata> = {}): FieldMetadata {
  return {
    label: '',
    placeholder: '',
    name: '',
    id: '',
    ariaLabel: '',
    autocomplete: '',
    title: '',
    type: 'text',
    nearbyText: '',
    combinedText: '',
    ...overrides,
  };
}

function withCombined(meta: FieldMetadata): FieldMetadata {
  meta.combinedText = [meta.label, meta.ariaLabel, meta.placeholder, meta.name, meta.title, meta.nearbyText]
    .filter(Boolean).join(' ');
  return meta;
}

describe('Field Classifier', () => {
  // ─── Level 1: Exact Match ──────────────────────────────────────

  describe('Level 1 — Exact Match', () => {
    it('should match "First Name" exactly', () => {
      const meta = withCombined(makeMetadata({ label: 'First Name' }));
      const result = getBestClassification(meta);
      expect(result).not.toBeNull();
      expect(result!.field).toBe('first_name');
      expect(result!.confidence).toBeGreaterThan(0.9);
      expect(result!.source).toBe('exact');
    });

    it('should match "Last Name" exactly', () => {
      const meta = withCombined(makeMetadata({ label: 'Last Name' }));
      const result = getBestClassification(meta);
      expect(result!.field).toBe('last_name');
    });

    it('should match "Full Name" exactly', () => {
      const meta = withCombined(makeMetadata({ label: 'Full Name' }));
      const result = getBestClassification(meta);
      expect(result!.field).toBe('full_name');
    });

    it('should match "Email" exactly', () => {
      const meta = withCombined(makeMetadata({ label: 'Email' }));
      const result = getBestClassification(meta);
      expect(result!.field).toBe('email');
    });

    it('should match "Register Number" exactly', () => {
      const meta = withCombined(makeMetadata({ label: 'Register Number' }));
      const result = getBestClassification(meta);
      expect(result!.field).toBe('register_number');
    });

    it('should match "Phone" exactly', () => {
      const meta = withCombined(makeMetadata({ label: 'Phone' }));
      const result = getBestClassification(meta);
      expect(result!.field).toBe('phone');
    });
  });

  // ─── Level 2: Alias Match ─────────────────────────────────────

  describe('Level 2 — Alias Match', () => {
    it('should match "Given Name" to first_name', () => {
      const meta = withCombined(makeMetadata({ label: 'Given Name' }));
      const result = getBestClassification(meta);
      expect(result!.field).toBe('first_name');
    });

    it('should match "Surname" to last_name', () => {
      const meta = withCombined(makeMetadata({ label: 'Surname' }));
      const result = getBestClassification(meta);
      expect(result!.field).toBe('last_name');
    });

    it('should match "E-mail Address" to email', () => {
      const meta = withCombined(makeMetadata({ label: 'E-mail Address' }));
      const result = getBestClassification(meta);
      expect(result!.field).toBe('email');
    });

    it('should match "Mobile Number" to phone', () => {
      const meta = withCombined(makeMetadata({ label: 'Mobile Number' }));
      const result = getBestClassification(meta);
      expect(result!.field).toBe('phone');
    });

    it('should match "Student ID" to student_id', () => {
      const meta = withCombined(makeMetadata({ label: 'Student ID' }));
      const result = getBestClassification(meta);
      expect(result!.field).toBe('student_id');
    });

    it('should match "Reg No" to register_number', () => {
      const meta = withCombined(makeMetadata({ label: 'Reg No' }));
      const result = getBestClassification(meta);
      expect(result!.field).toBe('register_number');
    });
  });

  // ─── Level 3: Metadata Matching ───────────────────────────────

  describe('Level 3 — Metadata Matching', () => {
    it('should combine aria-label and placeholder for classification', () => {
      const meta = withCombined(makeMetadata({
        ariaLabel: 'Enter your register number',
        placeholder: 'Register Number',
      }));
      const result = getBestClassification(meta);
      expect(result!.field).toBe('register_number');
    });

    it('should use autocomplete attribute', () => {
      const meta = withCombined(makeMetadata({
        autocomplete: 'email',
      }));
      const result = getBestClassification(meta);
      expect(result!.field).toBe('email');
    });

    it('should use autocomplete "given-name"', () => {
      const meta = withCombined(makeMetadata({
        label: 'Given Name',
        autocomplete: 'given-name',
      }));
      const result = getBestClassification(meta);
      expect(result!.field).toBe('first_name');
    });
  });

  // ─── Level 4: Fuzzy Match ────────────────────────────────────

  describe('Level 4 — Fuzzy Match', () => {
    it('should fuzzy match "Reg. No." to register_number', () => {
      const meta = withCombined(makeMetadata({ label: 'Reg. No.' }));
      const result = getBestClassification(meta);
      expect(result).not.toBeNull();
      expect(result!.field).toBe('register_number');
    });

    it('should fuzzy match "Registration Number" to register_number', () => {
      const meta = withCombined(makeMetadata({ label: 'Registration Number' }));
      const result = getBestClassification(meta);
      expect(result!.field).toBe('register_number');
    });

    it('should fuzzy match "Reg Number" to register_number', () => {
      const meta = withCombined(makeMetadata({ label: 'Reg Number' }));
      const result = getBestClassification(meta);
      expect(result!.field).toBe('register_number');
    });

    it('should fuzzy match "Phone No." to phone', () => {
      const meta = withCombined(makeMetadata({ label: 'Phone No.' }));
      const result = getBestClassification(meta);
      expect(result!.field).toBe('phone');
    });
  });

  // ─── Name Ambiguity ───────────────────────────────────────────

  describe('Name Ambiguity', () => {
    it('should classify "Name" as full_name when alone (with no siblings)', () => {
      const meta = withCombined(makeMetadata({ label: 'Name' }));
      const result = getBestClassification(meta, [], undefined, []);
      expect(result).not.toBeNull();
      expect(result!.field).toBe('full_name');
    });

    it('should classify "Name" as first_name when sibling has "Last Name"', () => {
      const meta = withCombined(makeMetadata({ label: 'Name' }));
      const result = getBestClassification(meta, [], undefined, ['Last Name', 'Email']);
      expect(result).not.toBeNull();
      expect(result!.field).toBe('first_name');
    });

    it('should distinguish full_name from first_name', () => {
      const fullMeta = withCombined(makeMetadata({ label: 'Full Name' }));
      const firstMeta = withCombined(makeMetadata({ label: 'First Name' }));

      const fullResult = getBestClassification(fullMeta);
      const firstResult = getBestClassification(firstMeta);

      expect(fullResult!.field).toBe('full_name');
      expect(firstResult!.field).toBe('first_name');
      expect(fullResult!.field).not.toBe(firstResult!.field);
    });
  });

  // ─── Custom Mapping ──────────────────────────────────────────

  describe('Custom Mapping', () => {
    it('should prioritize custom mapping over other matches', () => {
      const meta = withCombined(makeMetadata({ label: 'My Custom Field' }));
      const customMappings = [{
        id: '1',
        pattern: 'my custom field',
        semanticField: 'register_number' as const,
        createdAt: Date.now(),
      }];

      const result = getBestClassification(meta, customMappings);
      expect(result!.field).toBe('register_number');
      expect(result!.source).toBe('custom_mapping');
    });
  });

  // ─── Multiple Classifications ─────────────────────────────────

  describe('Multiple Classifications', () => {
    it('should return results sorted by confidence', () => {
      const meta = withCombined(makeMetadata({ label: 'College' }));
      const results = classifyField(meta);
      expect(results.length).toBeGreaterThan(0);

      // Check sorted descending
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].confidence).toBeGreaterThanOrEqual(results[i].confidence);
      }
    });
  });

  // ─── Edge Cases ───────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should return empty for empty metadata', () => {
      const meta = withCombined(makeMetadata());
      const results = classifyField(meta);
      expect(results.length).toBe(0);
    });

    it('should handle very long text gracefully', () => {
      const meta = withCombined(makeMetadata({
        label: 'Please enter your first name as it appears on your official documents',
      }));
      const result = getBestClassification(meta);
      expect(result).not.toBeNull();
      // Contains "first name" tokens, should match first_name
      expect(['first_name', 'full_name']).toContain(result!.field);
    });
  });
});
