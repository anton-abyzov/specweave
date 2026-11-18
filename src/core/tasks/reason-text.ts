/**
 * Block and skip reasons are read by a person (on the SpecWithCode Board, in
 * `task list`, in handoffs), so they are checked where they are written:
 *
 * - `normalizeReason` makes safe spacing fixes only: runs of whitespace become
 *   one space, and a missing space after a comma or semicolon is added
 *   (`valid;113/148` → `valid; 113/148`). Numbers (`1,000`), URLs and text in
 *   backticks are never changed.
 * - `findGluedWords` finds words written without their spaces
 *   (`offline37profileattestation`, `exactartifactcopies`, `35unresolved`).
 *   Word splits are never guessed; the writer is asked to rewrite the reason.
 *
 * Only writers call this. Reading a ledger never applies these rules, so old
 * lines still load as written.
 *
 * @module core/tasks/reason-text
 */

/** Reasons longer than this get a warning; nothing is cut or refused for length. */
export const LONG_REASON_CHARS = 280;

/** Backtick code, and URLs up to (not including) trailing punctuation or a `,word` tail. */
const PROTECTED = /`[^`]*`|\b[a-z][a-z0-9+.-]*:\/\/\S*?(?=[.,;:!?)\]'"]*(?:\s|$)|[,;]\p{L}[^\s/?=&#.]*[.,;:!?)\]'"]*(?:\s|$))/giu;

/** A token with any of these is a path, identifier, expression or reference; it is not checked. */
const CODE_CHARS = /[/\\=_.@#:<>{}|*$&+~`[\]%^]/;

/** Real English words long enough to trip the long-run rule. */
const LONG_WORDS: ReadonlySet<string> = new Set([
  'internationalization',
  'internationalisation',
  'institutionalization',
  'institutionalisation',
  'counterrevolutionary',
  'counterrevolutionaries',
  'uncharacteristically',
  'incomprehensibilities',
  'electroencephalography',
]);

interface Span { text: string; protectedSpan: boolean }

function spans(text: string): Span[] {
  const out: Span[] = [];
  let last = 0;
  for (const m of text.matchAll(PROTECTED)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ text: text.slice(last, at), protectedSpan: false });
    out.push({ text: m[0], protectedSpan: true });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), protectedSpan: false });
  return out;
}

/** Collapse whitespace and add the missing space after `,` and `;` outside code and URLs. */
export function normalizeReason(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return spans(flat)
    .map((s, i, all) => s.protectedSpan
      ? s.text
      : s.text
        // right after a URL or code span: `…/pull/571,then`
        .replace(/^([,;])(?=[\p{L}(`])/u, (m) => (i > 0 && all[i - 1].protectedSpan ? `${m} ` : m))
        // letter, closing bracket or % before the mark: `valid;113`, `a,b`, `(x),y`
        .replace(/([\p{L})\]%])([,;])(?=[\p{L}\p{N}(])/gu, '$1$2 ')
        // digit before the mark, letter after: `148;next`; never `1,000`
        .replace(/(\p{N})([,;])(?=\p{L})/gu, '$1$2 '))
    .join('');
}

function isGluedPart(part: string): boolean {
  // One long run of Latin lowercase letters: `exactartifactcopies`, `Existingcreationloader`.
  if (/^[A-Za-z]?[a-z]+$/.test(part) && part.length >= 19 && !LONG_WORDS.has(part.toLowerCase())) return true;
  // Words joined by a number: `offline37profileattestation`, `Freshsupported159entity`.
  if (/[a-z]{4,}\d+[a-z]{4,}/.test(part)) return true;
  // A number glued to the next word: `35unresolved` (short units like `10ms`, `24h`, `3rd` pass).
  if (/^\d+[a-z]{5,}$/.test(part)) return true;
  return false;
}

/** Words written without their spaces, in the order they appear (deduplicated). */
export function findGluedWords(text: string): string[] {
  const found: string[] = [];
  for (const s of spans(text)) {
    if (s.protectedSpan) continue;
    for (const raw of s.text.split(/\s+/)) {
      const token = raw.replace(/^[("'[]+/, '').replace(/[)"'\].,;:!?]+$/, '');
      if (!token || CODE_CHARS.test(token)) continue;
      if (/^[0-9a-f]{7,64}$/i.test(token)) continue; // commit SHAs and hashes
      if (token.split(/[-,;]/).some((part) => part && isGluedPart(part))) found.push(token);
    }
  }
  return [...new Set(found)];
}

export interface ReasonCheck {
  /** The reason as it will be stored. */
  text: string;
  /** Glued words; a writer refuses the reason when this is not empty. */
  glued: string[];
  /** Longer than LONG_REASON_CHARS; a writer warns but stores it. */
  long: boolean;
}

export function checkReason(text: string): ReasonCheck {
  const normalized = normalizeReason(text);
  return { text: normalized, glued: findGluedWords(normalized), long: normalized.length > LONG_REASON_CHARS };
}

/** The error a writer prints when it refuses a reason with glued words. */
export function gluedReasonMessage(glued: string[]): string {
  const words = glued.slice(0, 5).map((w) => `"${w}"`).join(', ');
  return [
    `The reason has words written without spaces: ${words}.`,
    'A person reads it on the board. Rewrite it as one short plain sentence with normal spaces,',
    'and put file names, ids and code in backticks. Nothing was recorded.',
  ].join('\n');
}

/** The warning a writer prints when a reason is long. */
export function longReasonWarning(length: number): string {
  return `warning: the reason is ${length} characters; one short sentence reads best on the board (put details in a report and link it).`;
}
