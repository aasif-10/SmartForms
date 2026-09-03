/**
 * SmartForm Saver — Field Classifier
 *
 * Core classification engine that maps form field metadata to semantic
 * field types using a 5-level cascade:
 *
 * Level 1 — Exact match against taxonomy labels/keys
 * Level 2 — Alias match against taxonomy aliases
 * Level 3 — Autocomplete attribute + metadata combination
 * Level 4 — Fuzzy matching (Levenshtein + token overlap)
 * Level 5 — Custom user-learned mappings (checked first for priority)
 *
 * AI classification (Level 6) is designed as an interface for future use.
 */

import type {
  FieldClassification,
  FieldMetadata,
  FieldOverride,
  SemanticField,
} from '../types';
import { FIELD_TAXONOMY } from '../constants/taxonomy';
import { isSensitiveText } from '../constants/sensitive';
import {
  normalize,
  normalizeAggressive,
  extractTokens,
  levenshteinSimilarity,
  tokenOverlap,
  containsAllTokens,
} from './text-utils';
import { findCustomMapping } from './custom-mappings';
import { resolveNameAmbiguity } from './name-resolver';
import { logger } from '../utils/logger';

/** Minimum confidence to consider a classification valid. */
const MIN_CONFIDENCE = 0.3;

/** Confidence thresholds for different match levels. */
const CONFIDENCE = {
  EXACT_LABEL: 0.99,
  EXACT_KEY: 0.97,
  ALIAS_EXACT: 0.95,
  ALIAS_CONTAINS: 0.85,
  AUTOCOMPLETE: 0.93,
  METADATA_STRONG: 0.80,
  METADATA_MEDIUM: 0.65,
  FUZZY_HIGH: 0.70,
  FUZZY_MEDIUM: 0.55,
  CUSTOM_MAPPING: 0.96,
  NAME_AMBIGUOUS: 0.55,
} as const;

/**
 * Classify a form field based on its metadata.
 *
 * @param metadata - Extracted field metadata (label, placeholder, etc.)
 * @param customMappings - User-learned and domain-specific mappings
 * @param hostname - Current page hostname (for domain-specific matching)
 * @param siblingLabels - Labels of sibling form fields (for context, e.g., name disambiguation)
 * @returns Sorted array of classifications, best match first
 */
export function classifyField(
  metadata: FieldMetadata,
  customMappings: FieldOverride[] = [],
  hostname?: string,
  siblingLabels: string[] = []
): FieldClassification[] {
  const results: FieldClassification[] = [];

  // Skip sensitive fields entirely
  if (isSensitiveText(metadata.combinedText)) {
    logger.debug('Field classified as sensitive, skipping');
    return [];
  }

  // ─── Level 0: Custom Mappings (highest priority) ────────────────

  const primaryText = metadata.label || metadata.ariaLabel || metadata.placeholder || metadata.name;
  if (primaryText) {
    const customMatch = findCustomMapping(customMappings, primaryText, hostname);
    if (customMatch) {
      results.push({
        field: customMatch.semanticField,
        confidence: CONFIDENCE.CUSTOM_MAPPING,
        source: 'custom_mapping',
      });
      return results; // Custom mapping overrides everything
    }
  }

  // Collect all text signals for matching
  const textsToMatch = [
    { text: metadata.label, weight: 1.0 },
    { text: metadata.ariaLabel, weight: 0.95 },
    { text: metadata.placeholder, weight: 0.8 },
    { text: metadata.name, weight: 0.7 },
    { text: metadata.id, weight: 0.5 },
    { text: metadata.title, weight: 0.6 },
    { text: metadata.nearbyText, weight: 0.4 },
  ].filter((t) => t.text.length > 0);

  // Score tracking: best score per field
  const fieldScores = new Map<
    SemanticField,
    { confidence: number; source: FieldClassification['source'] }
  >();

  const updateBest = (
    field: SemanticField,
    confidence: number,
    source: FieldClassification['source']
  ) => {
    const existing = fieldScores.get(field);
    if (!existing || confidence > existing.confidence) {
      fieldScores.set(field, { confidence, source });
    }
  };

  // ─── Level 1: Exact match ──────────────────────────────────────

  for (const { text, weight } of textsToMatch) {
    const norm = normalize(text);

    for (const entry of FIELD_TAXONOMY) {
      if (entry.sensitive) continue;

      // Match against label (exact)
      if (norm === normalize(entry.label)) {
        updateBest(entry.key, CONFIDENCE.EXACT_LABEL * weight, 'exact');
        continue;
      }

      // Match against key (exact)
      if (norm === entry.key || normalizeAggressive(text) === normalizeAggressive(entry.key.replace(/_/g, ' '))) {
        updateBest(entry.key, CONFIDENCE.EXACT_KEY * weight, 'exact');
      }
    }
  }

  // ─── Level 2: Alias match ─────────────────────────────────────

  for (const { text, weight } of textsToMatch) {
    const norm = normalize(text);

    for (const entry of FIELD_TAXONOMY) {
      if (entry.sensitive) continue;

      for (const alias of entry.aliases) {
        const normAlias = normalize(alias);

        // Exact alias match
        if (norm === normAlias) {
          updateBest(entry.key, CONFIDENCE.ALIAS_EXACT * weight, 'alias');
          break;
        }

        // Text contains the full alias
        if (norm.includes(normAlias) && normAlias.length > 3) {
          updateBest(entry.key, CONFIDENCE.ALIAS_CONTAINS * weight, 'alias');
        }

        // Alias contains the text (for very short field labels)
        if (normAlias.includes(norm) && norm.length > 3) {
          updateBest(entry.key, (CONFIDENCE.ALIAS_CONTAINS - 0.1) * weight, 'alias');
        }
      }
    }
  }

  // ─── Level 3: Autocomplete attribute ───────────────────────────

  if (metadata.autocomplete) {
    const autoVal = metadata.autocomplete.toLowerCase().trim();
    for (const entry of FIELD_TAXONOMY) {
      if (entry.autocompleteValues) {
        for (const av of entry.autocompleteValues) {
          if (autoVal === av || autoVal.includes(av)) {
            updateBest(entry.key, CONFIDENCE.AUTOCOMPLETE, 'autocomplete');
          }
        }
      }
    }
  }

  // ─── Level 3b: Metadata combination ────────────────────────────

  for (const { text, weight } of textsToMatch) {
    if (text.length < 2) continue;
    const tokens = extractTokens(text);

    for (const entry of FIELD_TAXONOMY) {
      if (entry.sensitive) continue;

      // Check if text tokens contain all tokens from label
      const labelTokens = extractTokens(entry.label);
      if (labelTokens.length > 0 && containsAllTokens(text, entry.label)) {
        updateBest(entry.key, CONFIDENCE.METADATA_STRONG * weight, 'metadata');
      }

      // Check aliases with token overlap
      for (const alias of entry.aliases) {
        const overlap = tokenOverlap(text, alias);
        if (overlap >= 0.6) {
          const conf = CONFIDENCE.METADATA_MEDIUM + overlap * 0.15;
          updateBest(entry.key, Math.min(conf, CONFIDENCE.METADATA_STRONG) * weight, 'metadata');
        }
      }
    }
  }

  // ─── Level 4: Fuzzy matching ───────────────────────────────────

  for (const { text, weight } of textsToMatch) {
    if (text.length < 3) continue;
    const normText = normalize(text);

    for (const entry of FIELD_TAXONOMY) {
      if (entry.sensitive) continue;

      // Fuzzy against label
      const labelSim = levenshteinSimilarity(normText, normalize(entry.label));
      if (labelSim >= 0.7) {
        const conf = CONFIDENCE.FUZZY_HIGH * labelSim;
        updateBest(entry.key, conf * weight, 'fuzzy');
      }

      // Fuzzy against aliases
      for (const alias of entry.aliases) {
        const aliasSim = levenshteinSimilarity(normText, normalize(alias));
        if (aliasSim >= 0.65) {
          const conf = CONFIDENCE.FUZZY_MEDIUM + aliasSim * 0.2;
          updateBest(entry.key, Math.min(conf, CONFIDENCE.FUZZY_HIGH) * weight, 'fuzzy');
        }
      }
    }
  }

  // ─── Special: "Name" Ambiguity Handling ─────────────────────────

  const nameScore = fieldScores.get('full_name');
  const firstNameScore = fieldScores.get('first_name');

  // If the primary text is just "Name" or "Your Name", handle ambiguity
  if (primaryText) {
    const normPrimary = normalize(primaryText);
    const isAmbiguousName = (
      normPrimary === 'name' ||
      normPrimary === 'your name' ||
      normPrimary === 'student name' ||
      normPrimary === 'candidate name'
    );

    if (isAmbiguousName && siblingLabels.length > 0) {
      const resolution = resolveNameAmbiguity(siblingLabels);

      if (resolution === 'first_name') {
        // Boost first_name, lower full_name
        updateBest('first_name', CONFIDENCE.ALIAS_CONTAINS, 'metadata');
        fieldScores.delete('full_name');
      } else if (resolution === 'full_name') {
        updateBest('full_name', CONFIDENCE.ALIAS_CONTAINS, 'metadata');
        fieldScores.delete('first_name');
      } else {
        // Ambiguous — keep full_name as default but at lower confidence
        updateBest('full_name', CONFIDENCE.NAME_AMBIGUOUS, 'metadata');
      }
    }
  }

  // ─── Collect and sort results ───────────────────────────────────

  for (const [field, score] of fieldScores) {
    if (score.confidence >= MIN_CONFIDENCE) {
      results.push({
        field,
        confidence: Math.round(score.confidence * 100) / 100,
        source: score.source,
      });
    }
  }

  results.sort((a, b) => b.confidence - a.confidence);

  if (results.length > 0) {
    logger.debug(
      `Classified field: best="${results[0].field}" conf=${results[0].confidence} source=${results[0].source}`
    );
  }

  return results;
}

/**
 * Get the best classification for a field, or null if confidence is too low.
 */
export function getBestClassification(
  metadata: FieldMetadata,
  customMappings: FieldOverride[] = [],
  hostname?: string,
  siblingLabels: string[] = []
): FieldClassification | null {
  const results = classifyField(metadata, customMappings, hostname, siblingLabels);
  return results.length > 0 ? results[0] : null;
}
