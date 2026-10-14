/** Shared increment ID syntax. Four digits are minimum padding, never a ceiling. */
export interface ParsedIncrementId {
  id: string;
  number: number;
  /** Canonical numeric alias, without an import suffix. */
  numberText: string;
  suffix: string;
  name: string;
}

export function formatIncrementNumber(number: number): string {
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new Error('Increment number must be a positive safe integer');
  }
  return String(number).padStart(4, '0');
}

/** Readers accept old three-digit IDs and underscores without renaming them. */
export function parseIncrementId(id: string, options: { allowLegacy?: boolean } = {}): ParsedIncrementId | null {
  if (typeof id !== 'string') return null;
  const pattern = options.allowLegacy
    ? /^(\d{3,})([A-Za-z]?)-([a-zA-Z0-9](?:[a-zA-Z0-9_-]*[a-zA-Z0-9])?)$/
    : /^(\d{4,})([A-Za-z]?)-([a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)$/;
  const match = id.match(pattern);
  if (!match) return null;
  const number = Number(match[1]);
  if (!Number.isSafeInteger(number) || number < 1) return null;
  return { id, number, numberText: formatIncrementNumber(number), suffix: match[2], name: match[3] };
}

export function isValidIncrementId(id: string): boolean {
  return parseIncrementId(id) !== null;
}

export function validateIncrementId(id: string, options: { allowLegacy?: boolean } = {}): void {
  if (!parseIncrementId(id, options)) {
    throw new Error(`Invalid increment ID format: "${id}". Expected format: NNNN-name (four or more digits), e.g. "0001-feature-name" or "10000G-import".`);
  }
}

/** Numeric extraction requires a boundary; it never truncates a longer number. */
export function extractIncrementNumber(id: string): number | null {
  if (typeof id !== 'string') return null;
  const match = id.match(/^(\d{4,})(?:[A-Za-z])?(?=-|$)/);
  if (!match) return null;
  const number = Number(match[1]);
  return Number.isSafeInteger(number) ? number : null;
}

export function isExternalIncrement(id: string): boolean {
  return parseIncrementId(id)?.suffix === 'E';
}

export function compareIncrementIds(a: string, b: string): number {
  const x = parseIncrementId(a, { allowLegacy: true });
  const y = parseIncrementId(b, { allowLegacy: true });
  return x && y ? x.number - y.number || a.localeCompare(b) : a.localeCompare(b);
}

/** Bare numeric aliases match the whole number, optionally an exact suffix. */
export function parseIncrementAlias(value: string): { number: number; suffix: string } | null {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d+)([A-Za-z]?)$/);
  const number = match ? Number(match[1]) : 0;
  return match && Number.isSafeInteger(number) && number > 0 ? { number, suffix: match[2].toUpperCase() } : null;
}

export function matchesIncrementAlias(id: string, alias: string): boolean {
  const parsed = parseIncrementId(id, { allowLegacy: true });
  const query = parseIncrementAlias(alias);
  return !!parsed && !!query && parsed.number === query.number && (!query.suffix || parsed.suffix.toUpperCase() === query.suffix);
}

/** Shared selection policy for readers with different filesystem adapters. */
export function matchIncrementIds(ids: string[], query: string): string[] {
  const valid = ids.filter(id => parseIncrementId(id, { allowLegacy: true }));
  if (valid.includes(query)) return [query];
  return valid.filter(id => matchesIncrementAlias(id, query)).sort(compareIncrementIds);
}
