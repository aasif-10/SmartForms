/**
 * SmartForm Saver — Text Utilities
 *
 * Low-level string manipulation for field classification.
 * Includes normalization, tokenization, Levenshtein distance,
 * and token overlap scoring.
 */

/**
 * Normalize text for comparison: lowercase, strip punctuation
 * (except periods in abbreviations), collapse whitespace.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s.]/g, ' ')   // keep periods for abbreviations like "reg. no."
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Aggressively normalize: remove ALL non-alphanumeric, lowercase.
 * Used for fuzzy matching where punctuation shouldn't matter at all.
 */
export function normalizeAggressive(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Extract meaningful tokens from text.
 * Splits on whitespace and punctuation, filters short noise tokens.
 */
export function extractTokens(text: string): string[] {
  return normalize(text)
    .split(/[\s.]+/)
    .filter((t) => t.length > 0);
}

/**
 * Levenshtein distance between two strings.
 * Used for fuzzy matching of similar field labels.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  // Use single-row optimization for memory efficiency
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);

  for (let j = 0; j <= n; j++) {
    prev[j] = j;
  }

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,      // insertion
        prev[j] + 1,          // deletion
        prev[j - 1] + cost    // substitution
      );
    }
    for (let j = 0; j <= n; j++) {
      prev[j] = curr[j];
    }
  }

  return prev[n];
}

/**
 * Normalized Levenshtein similarity (0-1).
 * 1 = identical, 0 = completely different.
 */
export function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

/**
 * Token overlap score (Jaccard coefficient).
 * Measures how many tokens are shared between two strings.
 */
export function tokenOverlap(a: string, b: string): number {
  const tokensA = new Set(extractTokens(a));
  const tokensB = new Set(extractTokens(b));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersection++;
    }
  }

  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Check if text contains all tokens from a pattern.
 * More lenient than exact matching.
 */
export function containsAllTokens(text: string, pattern: string): boolean {
  const textTokens = new Set(extractTokens(text));
  const patternTokens = extractTokens(pattern);
  return patternTokens.every((t) => textTokens.has(t));
}

/**
 * Check if an aggressive-normalized text starts with or equals another.
 */
export function aggressiveMatch(text: string, target: string): boolean {
  const normText = normalizeAggressive(text);
  const normTarget = normalizeAggressive(target);
  return normText === normTarget || normText.includes(normTarget) || normTarget.includes(normText);
}
