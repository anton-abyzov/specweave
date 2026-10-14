import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseIncrementId, formatIncrementNumber, compareIncrementIds, matchesIncrementAlias, extractIncrementNumber } from '../../../src/utils/increment-id-validator.js';
import { resolveIncrementId } from '../../../src/utils/resolve-increment-id.js';
import { sameIncrement } from '../../../src/core/session/handoff-remote.js';
import { matchHandoff, type PendingHandoff } from '../../../src/core/session/handoff-list.js';
import { listActiveIncrementIds, resolveIncrement } from '../../../src/core/tasks/resolve-increment.js';
import { IncrementNumberManager } from '../../../src/core/increment/increment-utils.js';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });
function fixture(ids: string[]) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-identity-')); roots.push(root);
  for (const id of ids) {
    const dir = path.join(root, '.specweave/increments', id); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({ id, status: 'active' }));
  }
  return root;
}

describe('variable-width identity', () => {
  it.each(['0001-test', '9999-test', '10000-test', '100000G-import', '100001J-import', '100002A-import', '100003E-import'])('parses %s without truncation', id => {
    expect(parseIncrementId(id)?.number).toBe(Number.parseInt(id));
    expect(extractIncrementNumber(id)).toBe(Number.parseInt(id));
  });
  it('keeps legacy spellings while formatting new numbers with minimum padding', () => {
    expect(parseIncrementId('001G-old_name', { allowLegacy: true })).toMatchObject({ id: '001G-old_name', numberText: '0001', suffix: 'G' });
    expect(parseIncrementId('001-old')).toBeNull();
    expect(formatIncrementNumber(1)).toBe('0001');
    expect(formatIncrementNumber(10000)).toBe('10000');
    for (const n of [0, -1, 1.2, Infinity, Number.MAX_SAFE_INTEGER + 1]) expect(() => formatIncrementNumber(n)).toThrow();
  });
  it.each(['0000-zero','10000-../bad','10000-bad/next','10000--bad','10000-bad-','9007199254740992-bad'])('rejects unsafe IDs: %s', id => expect(parseIncrementId(id)).toBeNull());
  it('orders IDs numerically across the old boundary', () => {
    expect(['10000-z', '9999-z', '001J-old', '10001-a'].sort(compareIncrementIds)).toEqual(['001J-old', '9999-z', '10000-z', '10001-a']);
  });
  it('allocates after9999 in every lifecycle folder without changing old IDs', () => {
    for (const location of ['', '_archive/', '_paused/', '_abandoned/', '_backlog/']) {
      const root = fixture([`${location}9999G-last`]);
      expect(IncrementNumberManager.getNextIncrementNumber(root)).toBe('10000');
      expect(IncrementNumberManager.incrementNumberExists('9999', root)).toBe(true);
    }
    expect(IncrementNumberManager.getNextIncrementNumber(fixture(['10000-new']))).toBe('10001');
  });
  it('resolves exact aliases, detects duplicates and never chooses a longer numeric prefix', () => {
    const root = fixture(['10000-new','1000-old','10000J-import','9999-last']);
    expect(resolveIncrementId('1000', root)).toBe('1000-old');
    expect(resolveIncrementId('100', root)).toBeNull();
    expect(resolveIncrementId('10000', root)).toEqual(['10000-new','10000J-import']);
    expect(() => resolveIncrement(root, '10000')).toThrow(/Ambiguous/);
    expect(resolveIncrementId('10000J', root)).toBe('10000J-import');
    expect(resolveIncrementId('10000-new', root)).toBe('10000-new');
    expect(resolveIncrementId('../', root)).toBeNull();
    expect(listActiveIncrementIds(root)).toEqual(['1000-old','9999-last','10000-new','10000J-import']);
  });
  it('a legacy alias stays readable and immutable UUIDs disambiguate offline numbers', () => {
    const root = fixture(['001G-old', '10000-a', '10000-b']);
    expect(resolveIncrementId('1G', root)).toBe('001G-old');
    const uuid = 'c52379d6-2b9d-4ffd-912a-1a0f83a11e39';
    const metadata = path.join(root, '.specweave/increments/10000-b/metadata.json');
    fs.writeFileSync(metadata, JSON.stringify({ uuid }));
    expect(resolveIncrementId(uuid, root)).toBe('10000-b');
  });
  it('handoffs use complete numeric boundaries including suffixes', () => {
    expect(sameIncrement('10000-new', '1000')).toBe(false);
    expect(sameIncrement('10000-new', '10000')).toBe(true);
    expect(sameIncrement('10000J-new', '10000J')).toBe(true);
    expect(sameIncrement('10000J-new', '10000G')).toBe(false);
    expect(matchesIncrementAlias('10000-new','100')).toBe(false);
    const pending = ['10000-a','10000-b'].map(incrementId => ({ id: incrementId, incrementId, kind: 'increment', title: incrementId, at: new Date().toISOString() })) as PendingHandoff[];
    expect(matchHandoff(pending, '1000').kind).toBe('none');
    expect(matchHandoff(pending, '10000').kind).toBe('several');
    expect(matchHandoff(pending, '10000-a').kind).toBe('one');
  });
});
