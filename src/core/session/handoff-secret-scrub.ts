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
  // Runs first so no other pattern can eat the BEGIN/END markers. Covers PEM
  // and PGP armor, multiline bodies and JSON-escaped newlines. A block never
  // spans another BEGIN, so a marker quoted in prose does not swallow the text
  // up to a later real key; an unterminated block is cut off to end of text in
  // scrubSecrets.
  { type: 'private-key', regex: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY(?: BLOCK)?-----(?:(?!-----BEGIN )[\s\S])*?-----END [A-Z0-9 ]*PRIVATE KEY(?: BLOCK)?-----/g },
  // Not inside a word, so slugs like task-handoff-secret-scrub survive.
  { type: 'openai-key', regex: /(?<![A-Za-z0-9_-])sk-[A-Za-z0-9_-]{16,}/g },
  { type: 'github-token', regex: /ghp_[A-Za-z0-9]{20,}/g },
  { type: 'github-oauth', regex: /gho_[A-Za-z0-9]{20,}/g },
  { type: 'github-server', regex: /ghs_[A-Za-z0-9]{20,}/g },
  { type: 'aws-key', regex: /AKIA[0-9A-Z]{12,}/g },
  { type: 'aws-temp-key', regex: /ASIA[0-9A-Z]{12,}/g },
  { type: 'vskill-token', regex: /vsk_[A-Za-z0-9]{16,}/g },
  { type: 'slack-token', regex: /xox[bap]-[A-Za-z0-9-]{10,}/g },
  // Same line, and the token holds a digit or a dot, so prose like
  // "Bearer authentication" is left alone.
  { type: 'bearer', regex: /Bearer[ \t]+(?=[A-Za-z0-9._~+/=-]*[0-9.])[A-Za-z0-9._~+/=-]{8,}/g },
  // Skip a value an earlier pattern already redacted, so it counts once.
  { type: 'password', regex: /password=(?!\[REDACTED-)\S+/gi },
  { type: 'api-key', regex: /api_key=(?!\[REDACTED-)\S+/gi },
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

  // A private key with no END marker (a truncated diff or log) is redacted
  // from its BEGIN to end of text. That tail is only scanned so the counts
  // still report other secrets inside it.
  const cut = unterminatedKeyStart(scrubbed);
  const tail = cut < 0 ? '' : scrubbed.slice(cut);
  if (cut >= 0) scrubbed = scrubbed.slice(0, cut);

  scrubbed = applyPatterns(scrubbed, counts);

  if (cut >= 0) {
    // Same sequential pass as the head, so counts match the same text anywhere.
    applyPatterns(tail, counts);
    counts['private-key'] = (counts['private-key'] ?? 0) + 1;
    scrubbed += '[REDACTED-private-key]';
  }

  return { scrubbed, counts };
}

/** Runs every pattern in order over `text`, adding to `counts`. */
function applyPatterns(text: string, counts: Record<string, number>): string {
  let out = text;
  for (const { type, regex } of SECRET_PATTERNS) {
    // Fresh lastIndex per call (regex literals are module-scoped + global).
    regex.lastIndex = 0;
    let matched = 0;
    out = out.replace(regex, () => {
      matched += 1;
      return `[REDACTED-${type}]`;
    });
    if (matched > 0) {
      counts[type] = (counts[type] ?? 0) + matched;
    }
  }
  return out;
}

/** Index of the first private-key BEGIN marker with no END marker after it, or -1. */
function unterminatedKeyStart(text: string): number {
  const begin = /-----BEGIN [A-Z0-9 ]*PRIVATE KEY(?: BLOCK)?-----/g;
  const end = /-----END [A-Z0-9 ]*PRIVATE KEY(?: BLOCK)?-----/g;
  let lastEnd = -1;
  for (let m = end.exec(text); m; m = end.exec(text)) lastEnd = m.index;
  for (let m = begin.exec(text); m; m = begin.exec(text)) {
    if (m.index > lastEnd) return m.index;
  }
  return -1;
}

/**
 * Total number of redactions across all patterns.
 */
export function totalRedactions(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}
