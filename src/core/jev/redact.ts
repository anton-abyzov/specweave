/**
 * Jev — the single redaction choke point.
 *
 * Every byte that leaves this machine for the System One endpoint goes through
 * {@link redactSecrets} first: the client scrubs the serialized state before any
 * request, and the PreToolUse Bash guard scrubs the command text it scores.
 * One function, one set of patterns, one set of markers — a second copy is how a
 * key eventually ships.
 *
 * Layers, in order:
 *   1. the shared handoff scrubber (`sk-…`, `sk-or-…`, `ghp_`/`gho_`/`ghs_`,
 *      `vsk_`, `xox[abp]-`, `AKIA…`/`ASIA…`, `Bearer …`, PEM headers,
 *      `password=`, `api_key=`);
 *   2. key shapes it does not carry (`github_pat_…`, JWT-looking `eyJ….….…`);
 *   3. command-shaped secrets (`scheme:// USER : PASS @host`, `--otp=`/`--token …`,
 *      `SOMETHING_TOKEN=value`).
 *
 * Later layers carry a `(?!\[REDACTED)` guard so an already-masked span is never
 * masked twice. Markers are normalised to `<REDACTED-…>` at the end: masking
 * removes text, and removed text could otherwise turn a command the guard's
 * prefilter calls 'check' into one it calls 'skip' (`echo PASSWORD="x; rm -rf ~"`
 * → `echo PASSWORD=<…>`). `<` is in the prefilter's shell-power set, so a
 * redacted command always still reaches Jev.
 *
 * HEURISTIC, never a guarantee: zero redactions does not mean the text is clean.
 * That is why every Jev integration is opt-in and the docs state the export.
 *
 * @module core/jev/redact
 */

import { scrubSecrets, totalRedactions } from '../session/handoff-secret-scrub.js';

/** A pattern applied after {@link scrubSecrets}. */
interface RedactPattern {
  type: string;
  regex: RegExp;
  replace: string;
}

/**
 * Key shapes the shared scrubber does not carry.
 *
 * Fixed-literal prefixes, so they can never match inside a `[REDACTED-…]` marker.
 */
const KEY_SHAPE_PATTERNS: ReadonlyArray<RedactPattern> = [
  {
    // GitHub fine-grained PAT: `github_pat_11ABCDEF0…`
    type: 'github-pat',
    regex: /github_pat_[A-Za-z0-9_]{20,}/g,
    replace: '[REDACTED-github-pat]',
  },
  {
    // JWT-looking: `eyJhbGciOi….eyJzdWIi….<signature>` (the signature is optional).
    type: 'jwt',
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]+)?/g,
    replace: '[REDACTED-jwt]',
  },
];

/**
 * Command-shaped secrets: the value is identified by the flag or variable in
 * front of it rather than by its own shape.
 */
const COMMAND_SECRET_PATTERNS: ReadonlyArray<RedactPattern> = [
  {
    // `psql postgres:// USER : PASS @host/db`, `git clone https:// U : TOK @github.com/...`
    type: 'url-credentials',
    regex: /([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+:[^\s/@]*@/gi,
    replace: '$1[REDACTED-url-credentials]@',
  },
  {
    // `npm publish --otp=123456`, `--token <value>`, `--password=…`
    type: 'secret-flag',
    regex:
      /(?<![\w-])(--?(?:otp|tokens?|passwords?|passwd|secrets?|api[-_]?keys?|access[-_]?tokens?|credentials?)[=\s])(?!\[REDACTED)("[^"]*"|'[^']*'|\S+)/gi,
    replace: '$1[REDACTED-secret-flag]',
  },
  {
    // `GITHUB_TOKEN=ghp_… cmd`, `MY_API_KEY="…"`, `DB_PASSWORD=…`
    type: 'env-secret',
    regex:
      /(^|[\s;&|(])([A-Za-z_][A-Za-z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|KEY|CREDENTIALS?)[A-Za-z0-9_]*=)(?!\[REDACTED)("[^"]*"|'[^']*'|\S*)/gi,
    replace: '$1$2[REDACTED-env-secret]',
  },
];

const EXTRA_PATTERNS: ReadonlyArray<RedactPattern> = [...KEY_SHAPE_PATTERNS, ...COMMAND_SECRET_PATTERNS];

/**
 * Mask secret-shaped values before text leaves this machine.
 *
 * The markers keep the text's shape, so a command still scores the same way for
 * scope and destructiveness and a state object still reads the same way.
 *
 * @param text - anything about to be sent to the System One endpoint
 * @returns the redacted text and how many spans were masked (0 = nothing matched,
 *          which is not the same as "clean")
 */
export function redactSecrets(text: string): { text: string; redactions: number } {
  const base = scrubSecrets(text ?? '');
  let redacted = base.scrubbed;
  let redactions = totalRedactions(base.counts);

  for (const { regex, replace } of EXTRA_PATTERNS) {
    regex.lastIndex = 0;
    const hits = redacted.match(regex);
    if (!hits) continue;
    redactions += hits.length;
    regex.lastIndex = 0;
    redacted = redacted.replace(regex, replace);
  }

  if (redactions > 0) redacted = redacted.replace(/\[REDACTED-([A-Za-z-]+)\]/g, '<REDACTED-$1>');

  return { text: redacted, redactions };
}
