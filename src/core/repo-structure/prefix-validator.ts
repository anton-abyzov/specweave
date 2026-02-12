/**
 * Prefix Validator
 *
 * Validates user story prefixes for multi-repo setups.
 * Checks format (2-6 uppercase letters), reserved words, and uniqueness.
 */

/** SpecWeave-reserved prefixes that cannot be used as repo prefixes */
export const RESERVED_PREFIXES = ['US', 'FS', 'EP', 'T', 'AC'] as const;

/** Default prefix suggestions per role */
export const ROLE_PREFIX_DEFAULTS: Record<string, string> = {
  frontend: 'FE',
  backend: 'BE',
  mobile: 'MOB',
  infra: 'INFRA',
  shared: 'SHARED',
  other: 'MISC',
};

export interface PrefixValidationResult {
  valid: boolean;
  /** Normalized prefix (uppercase) — only set when valid */
  normalized?: string;
  /** Error message — only set when invalid */
  error?: string;
}

/**
 * Validate a story prefix for format, reserved words, and uniqueness.
 *
 * @param prefix - Prefix to validate (case-insensitive)
 * @param usedPrefixes - Set of already-assigned prefixes (uppercase)
 */
export function validatePrefix(prefix: string, usedPrefixes: Set<string>): PrefixValidationResult {
  const trimmed = prefix.trim();

  if (!trimmed) {
    return { valid: false, error: 'Prefix is required' };
  }

  const upper = trimmed.toUpperCase();

  // Format: 2-6 uppercase letters only
  if (!/^[A-Za-z]{2,6}$/.test(trimmed)) {
    if (trimmed.length < 2 || trimmed.length > 6) {
      return { valid: false, error: 'Prefix must be 2-6 letters' };
    }
    return { valid: false, error: 'Prefix must contain only letters (A-Z)' };
  }

  // Reserved words
  if ((RESERVED_PREFIXES as readonly string[]).includes(upper)) {
    return { valid: false, error: `"${upper}" is reserved by SpecWeave. Use a different prefix.` };
  }

  // Uniqueness
  if (usedPrefixes.has(upper)) {
    return { valid: false, error: `"${upper}" is already used. Choose a different prefix.` };
  }

  return { valid: true, normalized: upper };
}
