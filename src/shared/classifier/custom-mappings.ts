/**
 * SmartForm Saver — Custom Mappings Manager
 *
 * Manages user-learned field associations and domain-specific overrides.
 * When a user manually classifies a field, the association is stored
 * and used for future matching on the same or similar fields.
 */

import type { FieldOverride, SemanticField } from '../types';
import { normalize } from './text-utils';
import { logger } from '../utils/logger';

/**
 * Look up a custom mapping for a given text pattern.
 * Optionally scoped to a hostname.
 */
export function findCustomMapping(
  mappings: FieldOverride[],
  text: string,
  hostname?: string
): FieldOverride | null {
  const normalizedText = normalize(text);

  // First, try hostname-specific mappings
  if (hostname) {
    const hostSpecific = mappings.find(
      (m) => m.hostname === hostname && normalize(m.pattern) === normalizedText
    );
    if (hostSpecific) {
      logger.debug(`Custom mapping hit (host-specific): "${text}" → ${hostSpecific.semanticField}`);
      return hostSpecific;
    }
  }

  // Then, try global mappings (no hostname set)
  const global = mappings.find(
    (m) => !m.hostname && normalize(m.pattern) === normalizedText
  );
  if (global) {
    logger.debug(`Custom mapping hit (global): "${text}" → ${global.semanticField}`);
    return global;
  }

  return null;
}

/**
 * Create a new custom mapping from a user's classification decision.
 */
export function createCustomMapping(
  pattern: string,
  semanticField: SemanticField,
  hostname?: string
): FieldOverride {
  return {
    id: '', // Will be assigned by storage
    pattern: normalize(pattern),
    semanticField,
    hostname,
    createdAt: Date.now(),
  };
}
