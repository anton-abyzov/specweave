import { describe, it, expect } from 'vitest';
import { checkReason, findGluedWords, normalizeReason, LONG_REASON_CHARS } from '../../../../src/core/tasks/reason-text.js';

/** The note that reached the Board squeezed (a real ledger line, October 2026). */
const SQUEEZED =
  'New offline37profileattestation valid;113/148 exactartifactcopies recovered,35unresolved. ' +
  'Existingcreationloader stillFileNotFound on original artifact path; fullProofChainValid=false. ' +
  'Freshsupported159entity/3inputcapture route documented, nooriginalpathrestore orguardbypass.';

describe('normalizeReason', () => {
  it.each([
    ['valid;113/148 left', 'valid; 113/148 left'],
    ['recovered,35unresolved', 'recovered, 35unresolved'],
    ['needs copy,then review', 'needs copy, then review'],
    ['148;next step', '148; next step'],
    ['(done),then ship', '(done), then ship'],
    ['  two\n\nlines\tand   spaces ', 'two lines and spaces'],
    ['1,000 rows; 2,3 left', '1,000 rows; 2,3 left'],
    ['see `a,b;c` first', 'see `a,b;c` first'],
    ['waiting on https://github.com/o/r/pull/571,then rerun', 'waiting on https://github.com/o/r/pull/571, then rerun'],
    ['open https://x.test/a,b/c?q=1;2 now', 'open https://x.test/a,b/c?q=1;2 now'],
    ['ждём доступ,потом проверим', 'ждём доступ, потом проверим'],
    ['Already fine, nothing to change.', 'Already fine, nothing to change.'],
  ])('%j → %j', (input, expected) => {
    expect(normalizeReason(input)).toBe(expected);
  });
});

describe('findGluedWords', () => {
  it('names the glued words of the squeezed note', () => {
    expect(findGluedWords(normalizeReason(SQUEEZED))).toEqual([
      'offline37profileattestation',
      'exactartifactcopies',
      '35unresolved',
      'Existingcreationloader',
      'nooriginalpathrestore',
    ]);
  });

  it.each([
    ['Normal HTTPX grant succeeded but required SystemAdmin predicate failed; API-equivalent role representation unassessed'],
    ['merged d65dffec9 and f93b1294b8c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5 into develop'],
    ['see repositories/anton-abyzov/specweave/src/cli/commands/task.ts line 360'],
    ['waiting on https://github.com/anton-abyzov/specwithcode/pull/571 to merge'],
    ['depends on 1391-board-panel-collapsible-state-groups-machine-legend-and-filter-denser-cards'],
    ['claude-opus-5-5, muse-wonder-full-1.0 and qwen3-coder-30b all timed out'],
    ['fullProofChainValid is false in loadTaskBoard'],
    ['internationalization work remains for the settings page'],
    ['ждём доступ к серверу, человеконенавистничество не помогает'],
    ['sha256sum mismatch on utf8 input after 10ms, 24h and the 3rd retry'],
    ['PR #524 is open; needs a 2nd reviewer'],
    ['Put `offline37profileattestation` in backticks when it is a real name'],
    ['ESCALATION_REQUIRED by OPS_TEAM, see INC-2041'],
  ])('passes %j', (text) => {
    expect(findGluedWords(normalizeReason(text))).toEqual([]);
  });

  it.each([
    ['waiting on 2hours of review', '2hours'],
    ['nooriginalpathrestore is not allowed', 'nooriginalpathrestore'],
    ['the copy-exactartifactcopies step failed', 'copy-exactartifactcopies'],
  ])('flags %j', (text, word) => {
    expect(findGluedWords(normalizeReason(text))).toEqual([word]);
  });
});

describe('checkReason', () => {
  it('returns the normalized text, glued words and length flag', () => {
    expect(checkReason('needs copy,then review')).toEqual({ text: 'needs copy, then review', glued: [], long: false });
    const long = checkReason('word '.repeat(LONG_REASON_CHARS));
    expect(long.long).toBe(true);
    expect(long.glued).toEqual([]);
    expect(checkReason(SQUEEZED).glued.length).toBeGreaterThan(0);
  });
});
