/**
 * SmartForm Saver — Text Utilities Tests
 */

import { describe, it, expect } from 'vitest';
import {
  normalize,
  normalizeAggressive,
  extractTokens,
  levenshteinDistance,
  levenshteinSimilarity,
  tokenOverlap,
  containsAllTokens,
} from '../shared/classifier/text-utils';

describe('Text Utilities', () => {
  describe('normalize', () => {
    it('should lowercase text', () => {
      expect(normalize('Hello World')).toBe('hello world');
    });

    it('should collapse whitespace', () => {
      expect(normalize('hello   world')).toBe('hello world');
    });

    it('should keep periods for abbreviations', () => {
      expect(normalize('Reg. No.')).toBe('reg. no.');
    });

    it('should strip special characters except periods', () => {
      expect(normalize('First-Name:')).toBe('first name');
    });
  });

  describe('normalizeAggressive', () => {
    it('should remove all non-alphanumeric', () => {
      expect(normalizeAggressive('Reg. No.')).toBe('regno');
    });
  });

  describe('extractTokens', () => {
    it('should split into tokens', () => {
      expect(extractTokens('First Name')).toEqual(['first', 'name']);
    });

    it('should handle period-separated text', () => {
      expect(extractTokens('Reg. No.')).toEqual(['reg', 'no']);
    });
  });

  describe('levenshteinDistance', () => {
    it('should return 0 for identical strings', () => {
      expect(levenshteinDistance('abc', 'abc')).toBe(0);
    });

    it('should return correct distance', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    });

    it('should handle empty strings', () => {
      expect(levenshteinDistance('', 'abc')).toBe(3);
      expect(levenshteinDistance('abc', '')).toBe(3);
    });
  });

  describe('levenshteinSimilarity', () => {
    it('should return 1 for identical strings', () => {
      expect(levenshteinSimilarity('abc', 'abc')).toBe(1);
    });

    it('should return 0 for completely different strings', () => {
      expect(levenshteinSimilarity('abc', 'xyz')).toBeLessThan(0.5);
    });

    it('should return high similarity for close strings', () => {
      expect(levenshteinSimilarity('register', 'registor')).toBeGreaterThan(0.8);
    });
  });

  describe('tokenOverlap', () => {
    it('should return 1 for identical token sets', () => {
      expect(tokenOverlap('first name', 'first name')).toBe(1);
    });

    it('should return 0.5 for half overlap', () => {
      expect(tokenOverlap('first name', 'first thing')).toBeCloseTo(1 / 3);
    });

    it('should return 0 for no overlap', () => {
      expect(tokenOverlap('abc', 'xyz')).toBe(0);
    });
  });

  describe('containsAllTokens', () => {
    it('should match when all tokens present', () => {
      expect(containsAllTokens('Enter your first name', 'first name')).toBe(true);
    });

    it('should not match when tokens missing', () => {
      expect(containsAllTokens('Enter your name', 'first name')).toBe(false);
    });
  });
});
