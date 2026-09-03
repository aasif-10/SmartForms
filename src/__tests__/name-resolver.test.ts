/**
 * SmartForm Saver — Name Resolver Tests
 */

import { describe, it, expect } from 'vitest';
import { splitFullName, combineNameParts, resolveNameAmbiguity } from '../shared/classifier/name-resolver';

describe('Name Resolver', () => {
  describe('splitFullName', () => {
    it('should split two-part names', () => {
      const result = splitFullName('Aasif Mohammed');
      expect(result.first).toBe('Aasif');
      expect(result.last).toBe('Mohammed');
      expect(result.middle).toBeUndefined();
    });

    it('should split three-part names', () => {
      const result = splitFullName('Aasif Ahmed Mohammed');
      expect(result.first).toBe('Aasif');
      expect(result.middle).toBe('Ahmed');
      expect(result.last).toBe('Mohammed');
    });

    it('should handle single names', () => {
      const result = splitFullName('Aasif');
      expect(result.first).toBe('Aasif');
      expect(result.last).toBe('');
    });

    it('should handle four-part names', () => {
      const result = splitFullName('John Paul Michael Smith');
      expect(result.first).toBe('John');
      expect(result.middle).toBe('Paul Michael');
      expect(result.last).toBe('Smith');
    });

    it('should handle empty string', () => {
      const result = splitFullName('');
      expect(result.first).toBe('');
      expect(result.last).toBe('');
    });

    it('should handle extra whitespace', () => {
      const result = splitFullName('  Aasif   Mohammed  ');
      expect(result.first).toBe('Aasif');
      expect(result.last).toBe('Mohammed');
    });
  });

  describe('combineNameParts', () => {
    it('should combine first and last', () => {
      expect(combineNameParts({ first: 'Aasif', last: 'Mohammed' })).toBe('Aasif Mohammed');
    });

    it('should combine with middle name', () => {
      expect(combineNameParts({ first: 'Aasif', middle: 'Ahmed', last: 'Mohammed' })).toBe('Aasif Ahmed Mohammed');
    });

    it('should handle single name', () => {
      expect(combineNameParts({ first: 'Aasif', last: '' })).toBe('Aasif');
    });
  });

  describe('resolveNameAmbiguity', () => {
    it('should return first_name when Last Name sibling exists', () => {
      expect(resolveNameAmbiguity(['Last Name', 'Email'])).toBe('first_name');
    });

    it('should return first_name when Surname sibling exists', () => {
      expect(resolveNameAmbiguity(['Surname', 'Email'])).toBe('first_name');
    });

    it('should return full_name when First Name sibling exists', () => {
      expect(resolveNameAmbiguity(['First Name', 'Email'])).toBe('full_name');
    });

    it('should return ambiguous when no name-related siblings', () => {
      expect(resolveNameAmbiguity(['Email', 'Phone', 'City'])).toBe('ambiguous');
    });

    it('should return ambiguous for empty siblings', () => {
      expect(resolveNameAmbiguity([])).toBe('ambiguous');
    });
  });
});
