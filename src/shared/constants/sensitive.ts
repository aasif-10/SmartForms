/**
 * SmartForm Saver — Sensitive Field Detection
 *
 * Patterns and rules for identifying fields that should NEVER be
 * saved or suggested. Protects passwords, OTPs, credit cards, etc.
 */

/** Input types that should never be saved. */
export const SENSITIVE_INPUT_TYPES: ReadonlySet<string> = new Set([
  'password',
  'hidden',
]);

/**
 * Text patterns (lowercased) that indicate a sensitive field.
 * Matched against label, placeholder, name, aria-label, etc.
 */
export const SENSITIVE_PATTERNS: readonly string[] = [
  'password',
  'passwd',
  'passcode',
  'pass code',
  'pin code',
  'security pin',
  'otp',
  'one-time password',
  'one time password',
  'one-time code',
  'verification code',
  'verify code',
  'cvv',
  'cvc',
  'security code',
  'card verification',
  'credit card',
  'debit card',
  'card number',
  'card no',
  'account number',
  'account no',
  'routing number',
  'ssn',
  'social security',
  'social security number',
  'aadhaar',
  'aadhar',
  'pan number',
  'pan card',
  'secret',
  'secret key',
  'api key',
  'access token',
  'auth token',
  'private key',
  'security answer',
  'security question',
  'captcha',
  'recaptcha',
];

/**
 * Regex patterns for additional sensitive field detection.
 * These catch more nuanced patterns.
 */
export const SENSITIVE_REGEX_PATTERNS: readonly RegExp[] = [
  /\bpassw(or)?d\b/i,
  /\bp(ass)?code\b/i,
  /\bo\.?t\.?p\.?\b/i,
  /\bcvv\d?\b/i,
  /\bcvc\d?\b/i,
  /\bcc.?num/i,
  /\bcard.?no/i,
  /\bsecur.*(code|pin|key|answer)/i,
  /\btoken\b/i,
  /\bcaptcha\b/i,
];

/**
 * Check if a text string indicates a sensitive field.
 * Checks against both exact patterns and regex patterns.
 */
export function isSensitiveText(text: string): boolean {
  const lower = text.toLowerCase().trim();

  // Check exact patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    if (lower.includes(pattern)) {
      return true;
    }
  }

  // Check regex patterns
  for (const regex of SENSITIVE_REGEX_PATTERNS) {
    if (regex.test(lower)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a form element should be treated as sensitive.
 * Combines input type checks with semantic text analysis.
 */
export function isSensitiveElement(element: HTMLElement): boolean {
  // Check input type
  if (element instanceof HTMLInputElement) {
    if (SENSITIVE_INPUT_TYPES.has(element.type.toLowerCase())) {
      return true;
    }
  }

  // Check autocomplete attribute
  const autocomplete = element.getAttribute('autocomplete')?.toLowerCase() ?? '';
  if (
    autocomplete.includes('password') ||
    autocomplete.includes('cc-') ||
    autocomplete === 'off' ||
    autocomplete === 'one-time-code'
  ) {
    // autocomplete="off" alone is not sufficient to mark as sensitive,
    // but combined with other signals it helps.
    if (autocomplete !== 'off') {
      return true;
    }
  }

  // Check text attributes
  const textsToCheck = [
    element.getAttribute('name') ?? '',
    element.getAttribute('id') ?? '',
    element.getAttribute('placeholder') ?? '',
    element.getAttribute('aria-label') ?? '',
    element.getAttribute('title') ?? '',
  ];

  for (const text of textsToCheck) {
    if (text && isSensitiveText(text)) {
      return true;
    }
  }

  return false;
}
