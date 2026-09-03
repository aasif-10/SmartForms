/**
 * SmartForm Saver — Name Resolver
 *
 * Handles the critical requirement of distinguishing and deriving
 * relationships between full_name, first_name, middle_name, and last_name.
 *
 * Can split a full name into parts, and derive suggestions when
 * only one form exists but another is needed.
 */

export interface NameParts {
  first: string;
  middle?: string;
  last: string;
}

/**
 * Split a full name string into first, optional middle, and last parts.
 *
 * Rules:
 * - Single word: first = word, last = ""
 * - Two words: first = word[0], last = word[1]
 * - Three+ words: first = word[0], last = word[-1], middle = everything between
 */
export function splitFullName(fullName: string): NameParts {
  const parts = fullName.trim().split(/\s+/);

  if (parts.length === 0 || (parts.length === 1 && parts[0] === '')) {
    return { first: '', last: '' };
  }

  if (parts.length === 1) {
    return { first: parts[0], last: '' };
  }

  if (parts.length === 2) {
    return { first: parts[0], last: parts[1] };
  }

  // Three or more parts
  return {
    first: parts[0],
    middle: parts.slice(1, -1).join(' '),
    last: parts[parts.length - 1],
  };
}

/**
 * Combine name parts back into a full name string.
 */
export function combineNameParts(parts: NameParts): string {
  const segments = [parts.first];
  if (parts.middle) {
    segments.push(parts.middle);
  }
  if (parts.last) {
    segments.push(parts.last);
  }
  return segments.join(' ').trim();
}

/**
 * Check if a "Name" field likely refers to full_name vs first_name.
 *
 * Heuristics:
 * - If sibling fields contain "Last Name", "Surname", etc. → this is first_name
 * - If sibling fields do NOT contain last name fields → this is likely full_name
 * - Context words like "Personal Details" lean toward full_name
 */
export function resolveNameAmbiguity(siblingLabels: string[]): 'full_name' | 'first_name' | 'ambiguous' {
  const lowerSiblings = siblingLabels.map((l) => l.toLowerCase().trim());

  const hasLastNameSibling = lowerSiblings.some((l) =>
    l.includes('last name') ||
    l.includes('surname') ||
    l.includes('family name') ||
    l.includes('last')
  );

  const hasFirstNameSibling = lowerSiblings.some((l) =>
    l.includes('first name') ||
    l.includes('given name') ||
    l.includes('first')
  );

  // If there's a "Last Name" sibling, "Name" probably means "First Name"
  if (hasLastNameSibling) {
    return 'first_name';
  }

  // If there's already a "First Name" sibling, this "Name" probably means full_name
  if (hasFirstNameSibling) {
    return 'full_name';
  }

  // No strong signal — it's ambiguous
  return 'ambiguous';
}
