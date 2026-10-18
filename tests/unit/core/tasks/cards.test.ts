import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseLedger, type LedgerEvent } from '../../../../src/core/tasks/ledger.js';
import { foldCards, deriveLink, renderChecklist, githubRepoUrl, type Card } from '../../../../src/core/tasks/cards.js';

interface FixtureCase {
  name: string;
  tasks: Array<{ id: string; title: string }>;
  ledger: Array<Record<string, unknown>>;
  origin?: string;
  expected: Card[];
}

const FIXTURE_PATH = path.resolve(__dirname, '../../../fixtures/cards/fold-fixture.json');
const cases = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf-8')) as FixtureCase[];

/** Fixture ledger objects go through the real line parser (truncation, unknown keys). */
function eventsOf(c: FixtureCase): LedgerEvent[] {
  return parseLedger(c.ledger.map((o) => JSON.stringify(o)).join('\n')).events;
}

describe('card fold fixture (shared with SpecWithCode)', () => {
  it('has cases', () => expect(cases.length).toBeGreaterThan(10));
  for (const c of cases) {
    it(c.name, () => {
      expect(foldCards(c.tasks, eventsOf(c), { origin: c.origin })).toEqual(c.expected);
    });
  }
});

describe('deriveLink', () => {
  it('returns null without evidence or matches', () => {
    expect(deriveLink(undefined)).toBeNull();
    expect(deriveLink('ran it by hand')).toBeNull();
  });
  it('keeps a log path that is not under .specweave/increments', () => {
    expect(deriveLink('log: ./reports/run.txt')).toBe('reports/run.txt');
  });
  it('reads https origins', () => {
    expect(githubRepoUrl('https://github.com/o/r.git')).toBe('https://github.com/o/r');
    expect(githubRepoUrl('https://gitlab.com/o/r.git')).toBeUndefined();
    expect(deriveLink('HEAD abcdef1', { origin: 'https://github.com/o/r' })).toBe('https://github.com/o/r/commit/abcdef1');
  });
});

describe('renderChecklist', () => {
  it('prints header, blank line, one mark per card with optional link', () => {
    const out = renderChecklist([
      { id: 'T-01', state: 'done', line: 'Wrote it', link: 'https://github.com/o/r/pull/1' },
      { id: 'T-02', state: 'doing', line: 'Writing', link: null },
      { id: 'T-03', state: 'todo', line: 'Docs', link: null },
      { id: 'T-04', state: 'waiting', line: 'Token', link: null },
      { id: 'T-05', state: 'skipped', line: 'Old', link: null },
    ], '0933 Task cards');
    expect(out).toBe([
      '0933 Task cards',
      '',
      '✓ Wrote it (https://github.com/o/r/pull/1)',
      '✱ Writing',
      '○ Docs',
      '⏸ Token',
      '– Old',
    ].join('\n'));
  });
});
