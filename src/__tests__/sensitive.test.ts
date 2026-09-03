/**
 * SmartForm Saver — Sensitive Field Tests
 */

import { describe, it, expect } from 'vitest';
import { isSensitiveText } from '../shared/constants/sensitive';
import { classifyField } from '../shared/classifier/field-classifier';
import type { FieldMetadata } from '../shared/types';

function makeMetadata(label: string): FieldMetadata {
  return {
    label,
    placeholder: '',
    name: '',
    id: '',
    ariaLabel: '',
    autocomplete: '',
    title: '',
    type: 'text',
    nearbyText: '',
    combinedText: label,
  };
}

describe('Sensitive Field Detection', () => {
  describe('isSensitiveText', () => {
    const sensitiveLabels = [
      'Password',
      'Enter your password',
      'OTP',
      'One-time password',
      'CVV',
      'CVC',
      'Security Code',
      'Credit Card Number',
      'Card Number',
      'Account Number',
      'SSN',
      'Social Security Number',
      'Secret Key',
      'API Key',
      'Access Token',
      'Captcha',
    ];

    for (const label of sensitiveLabels) {
      it(`should detect "${label}" as sensitive`, () => {
        expect(isSensitiveText(label)).toBe(true);
      });
    }

    const nonSensitiveLabels = [
      'First Name',
      'Email',
      'Phone Number',
      'Register Number',
      'College',
      'Address',
      'Date of Birth',
    ];

    for (const label of nonSensitiveLabels) {
      it(`should NOT detect "${label}" as sensitive`, () => {
        expect(isSensitiveText(label)).toBe(false);
      });
    }
  });

  describe('Classifier skips sensitive fields', () => {
    it('should return no classifications for password fields', () => {
      const meta = makeMetadata('Password');
      const results = classifyField(meta);
      expect(results.length).toBe(0);
    });

    it('should return no classifications for OTP fields', () => {
      const meta = makeMetadata('OTP');
      const results = classifyField(meta);
      expect(results.length).toBe(0);
    });

    it('should return no classifications for CVV fields', () => {
      const meta = makeMetadata('CVV');
      const results = classifyField(meta);
      expect(results.length).toBe(0);
    });

    it('should return no classifications for credit card fields', () => {
      const meta = makeMetadata('Credit Card Number');
      const results = classifyField(meta);
      expect(results.length).toBe(0);
    });
  });
});
