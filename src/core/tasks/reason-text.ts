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

/** Backtick code, URLs (scheme or scheme-less), and path-like tokens. Kept linear: no lookahead rescan. */
const PROTECTED = /`[^`]*`|\b[a-z][a-z0-9+.-]*:\/\/\S+|\b(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}(?:[/?#]\S*)?|\b[^\s()[\]{}"'`,;]*\/[^\s()[\]{}"'`,;]*/gi;

/** A token with any of these is a path, identifier, expression or reference; it is not checked. */
const CODE_CHARS = /[/\\=_.@#:<>{}|*$&+~`[\]%^]/;

/** Real English words long enough to trip the long-run rule. */
const LONG_WORDS: ReadonlySet<string> = new Set([
  'internationalization',
  'internationalisation',
  'internationalizations',
  'institutionalization',
  'institutionalisation',
  'counterrevolutionary',
  'counterrevolutionaries',
  'counterintelligence',
  'uncharacteristically',
  'incomprehensibility',
  'incomprehensibilities',
  'deinstitutionalization',
  'mischaracterization',
  'electroencephalography',
  'dehydroepiandrosterone',
  'anticonstitutionnellement',
]);

interface Span { text: string; protectedSpan: boolean }

/** Length of the protected part of a URL/path match; a `,word` sentence tail after a digit is not protected. */
function protectedLength(raw: string): number {
  if (raw.startsWith('`')) return raw.length;
  let end = raw.length;
  while (end > 0 && /[.;:!?)\]'"]/.test(raw[end - 1])) end--;
  const core = raw.slice(0, end);
  // Query/hash URLs keep comma lists whole: `?fields=name,age` is one value list, not a sentence.
  if (core.includes('?') || core.includes('#')) return end;
  // `…/pull/571,then rerun`: comma plus a letter-only tail at the end is a sentence tail.
  const tail = /^(.*\d)(,[A-Za-z]+)$/.exec(core);
  if (tail) return tail[1].length;
  return end;
}

function spans(text: string): Span[] {
  const out: Span[] = [];
  let last = 0;
  for (const m of text.matchAll(PROTECTED)) {
    const at = m.index ?? 0;
    const keep = protectedLength(m[0]);
    if (keep === 0) continue;
    if (at > last) out.push({ text: text.slice(last, at), protectedSpan: false });
    out.push({ text: m[0].slice(0, keep), protectedSpan: true });
    last = at + keep;
  }
  if (last < text.length) out.push({ text: text.slice(last), protectedSpan: false });
  return out;
}

/** Collapse whitespace and add the missing space after `,` and `;` outside code and URLs. */
export function normalizeReason(text: string): string {
  return spans(text)
    .map((s, i, all) => {
      if (s.protectedSpan) return s.text;
      let t = s.text
        .replace(/\s+/g, ' ')
        // right after a URL or code span: `…/pull/571,then`
        .replace(/^([,;])(?=[\p{L}(`])/u, (m) => (i > 0 && all[i - 1].protectedSpan ? `${m} ` : m))
        // letter, closing bracket or % before the mark: `valid;113`, `a,b`, `(x),y`
        .replace(/([\p{L})\]%])([,;])(?=[\p{L}\p{N}(])/gu, '$1$2 ')
        // digit before the mark, letter after: `148;next`; never `1,000`
        .replace(/(\p{N})([,;])(?=\p{L})/gu, '$1$2 ');
      // mark at the end of this chunk, protected token next: `valid;` + `113/148`
      if (all[i + 1]?.protectedSpan) t = t.replace(/([\p{L}\p{N})\]%:])([,;])$/u, '$1$2 ');
      return t;
    })
    .join('')
    .trim();
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
      if (/^[0-9a-f]{7,}$/i.test(token)) continue; // commit SHAs and hashes, any length
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) continue; // UUIDs
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
