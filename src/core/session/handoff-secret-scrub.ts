/**
 * Handoff Secret Scrub
 *
 * Regex-based redaction over both the handoff doc's free-text fields AND the
 * captured git diff. This is a HEURISTIC baseline (regex only) — an empty
 * redaction list is NOT a guarantee the content is clean. Opportunistic
 * scanner support (gitleaks/trufflehog) is a deferred enhancement.
 *
 * Each match is replaced with a `[REDACTED-<type>]` marker, and the function
 * returns a per-pattern counts map so the doc's "Redaction" section can report
 * how many token-like strings were masked.
 *
 * Part of increment 0867: Cross-Tool Work Handoff (AC-US6-01, AC-US6-02).
 *
 * @module core/session/handoff-secret-scrub
 */

/**
 * A single secret-detection pattern.
 */
export interface SecretPattern {
  /** Stable type slug used in the `[REDACTED-<type>]` marker + counts map. */
  type: string;
  /** Regex matching the secret. MUST use the global flag for replace + count. */
  regex: RegExp;
}

/**
 * The 12 redaction patterns (AC-US6-01).
 *
 * Patterns are intentionally conservative: they match the well-known token
 * prefixes plus enough trailing characters to avoid masking the prefix alone.
 * Assignment-style secrets (`password=`, `api_key=`) capture the value up to
 * whitespace.
 */
export const SECRET_PATTERNS: readonly SecretPattern[] = [
  { type: 'openai-key', regex: /sk-[A-Za-z0-9_-]{16,}/g },
  { type: 'github-token', regex: /ghp_[A-Za-z0-9]{20,}/g },
  { type: 'github-oauth', regex: /gho_[A-Za-z0-9]{20,}/g },
  { type: 'github-server', regex: /ghs_[A-Za-z0-9]{20,}/g },
  { type: 'aws-key', regex: /AKIA[0-9A-Z]{12,}/g },
  { type: 'aws-temp-key', regex: /ASIA[0-9A-Z]{12,}/g },
  { type: 'private-key', regex: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/g },
  { type: 'vskill-token', regex: /vsk_[A-Za-z0-9]{16,}/g },
  { type: 'slack-token', regex: /xox[bap]-[A-Za-z0-9-]{10,}/g },
  { type: 'bearer', regex: /Bearer\s+[A-Za-z0-9._~+/=-]{8,}/g },
  { type: 'password', regex: /password=\S+/gi },
  { type: 'api-key', regex: /api_key=\S+/gi },
] as const;

/**
 * Result of a scrub: the redacted text plus per-pattern occurrence counts.
 */
export interface ScrubResult {
  /** Text with every matched secret replaced by `[REDACTED-<type>]`. */
  scrubbed: string;
  /** Map of pattern `type` → number of redactions (only non-zero entries). */
  counts: Record<string, number>;
}

/**
 * Scrub secrets from a block of text.
 *
 * Runs each declared pattern in order. Patterns are applied sequentially over
 * the progressively-scrubbed text, so an already-redacted span cannot be
 * matched a second time by a later pattern.
 *
 * @param text - Free-text or diff content to scrub.
 * @returns Scrubbed text + per-pattern counts (only patterns that fired).
 */
export function scrubSecrets(text: string): ScrubResult {
  const counts: Record<string, number> = {};
  let scrubbed = text ?? '';

  for (const { type, regex } of SECRET_PATTERNS) {
    // Fresh lastIndex per call (regex literals are module-scoped + global).
    regex.lastIndex = 0;
    let matched = 0;
    scrubbed = scrubbed.replace(regex, () => {
      matched += 1;
      return `[REDACTED-${type}]`;
    });
    if (matched > 0) {
      counts[type] = matched;
    }
  }

  return { scrubbed, counts };
}

/**
 * Total number of redactions across all patterns.
 */
export function totalRedactions(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}
