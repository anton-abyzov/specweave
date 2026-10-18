import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { formatLedgerLine, parseLedger, foldLedger, clampCardLine, MAX_CARD_LINE, type LedgerEvent } from '../../../../src/core/tasks/ledger.js';

const fixture = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../../fixtures/cards/fold-fixture.json'), 'utf-8'),
) as Array<{ name: string; ledger: Array<Record<string, unknown>> }>;

const base: LedgerEvent = { t: 'T-01', e: 'claim', by: 'claude@mbp', at: '2026-10-18T10:00:00Z' };

describe('ledger line and link fields', () => {
  it('formatLedgerLine writes line and link after the fixed keys', () => {
    const s = formatLedgerLine({ ...base, note: 'n', line: 'Writing the fold', link: 'https://github.com/o/r/pull/1' });
    expect(s).toBe('{"t":"T-01","e":"claim","by":"claude@mbp","at":"2026-10-18T10:00:00Z","note":"n","line":"Writing the fold","link":"https://github.com/o/r/pull/1"}\n');
  });

  it('round-trips through parseLedger', () => {
    const ev = { ...base, line: 'Writing', link: 'reports/x.md' };
    expect(parseLedger(formatLedgerLine(ev)).events).toEqual([ev]);
  });

  it('older lines without line/link still parse; unknown keys are ignored', () => {
    const { events, malformed } = parseLedger('{"t":"T-01","e":"claim","by":"a@b","at":"2026-10-18T10:00:00Z","foo":"bar"}\n');
    expect(malformed).toBe(0);
    expect(events).toEqual([{ t: 'T-01', e: 'claim', by: 'a@b', at: '2026-10-18T10:00:00Z' }]);
  });

  it('non-string or empty line/link are dropped, never fatal', () => {
    const { events } = parseLedger('{"t":"T-01","e":"claim","by":"a@b","at":"2026-10-18T10:00:00Z","line":7,"link":"  "}');
    expect(events[0]).not.toHaveProperty('line');
    expect(events[0]).not.toHaveProperty('link');
  });

  it('a line over the limit is truncated, not rejected', () => {
    const long = 'x'.repeat(150);
    const r = clampCardLine(long);
    expect(r.truncated).toBe(true);
    expect(r.line.length).toBe(MAX_CARD_LINE);
    expect(r.line.endsWith('…')).toBe(true);
    const parsed = parseLedger(JSON.stringify({ ...base, line: long })).events[0];
    expect(parsed.line?.length).toBe(MAX_CARD_LINE);
    expect(JSON.parse(formatLedgerLine({ ...base, line: long })).line.length).toBe(MAX_CARD_LINE);
  });

  it('every fixture ledger parses without malformed lines', () => {
    for (const c of fixture) {
      const content = c.ledger.map((o) => JSON.stringify(o)).join('\n');
      expect(parseLedger(content).malformed, c.name).toBe(0);
    }
  });

  it('union merge unchanged: fold is order-independent and records the accepted line', () => {
    const a: LedgerEvent = { ...base, line: 'A' };
    const b: LedgerEvent = { ...base, by: 'codex@mbp', at: '2026-10-18T10:10:00Z', line: 'B' };
    const f1 = foldLedger([a, b]);
    const f2 = foldLedger([b, a]);
    expect(f1.tasks.get('T-01')?.by).toBe('claude@mbp');
    expect(f2.tasks.get('T-01')?.by).toBe('claude@mbp');
    expect(f1.cards.get('T-01')).toEqual({ line: 'A' });
    expect(f2.cards.get('T-01')).toEqual({ line: 'A' });
  });
});
