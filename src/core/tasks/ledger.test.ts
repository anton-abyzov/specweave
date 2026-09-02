import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  foldLedger,
  parseLedger,
  appendEvent,
  readLedger,
  formatLedgerLine,
  getAgentId,
  detectTool,
  type LedgerEvent,
} from './ledger.js';

const ev = (t: string, e: LedgerEvent['e'], by: string, at: string, extra: Partial<LedgerEvent> = {}): LedgerEvent =>
  ({ t, e, by, at, ...extra });

const NOW = new Date('2026-09-02T12:00:00Z');

describe('foldLedger', () => {
  it('earliest claim wins; a later claim within the lease is ignored', () => {
    const fold = foldLedger([
      ev('T-01', 'claim', 'codex@b', '2026-09-02T10:00:05Z'),
      ev('T-01', 'claim', 'claude@a', '2026-09-02T10:00:01Z'),
    ], { now: NOW });
    expect(fold.tasks.get('T-01')).toMatchObject({ status: 'claimed', by: 'claude@a' });
    expect(fold.ignored).toHaveLength(1);
    expect(fold.ignored[0].event.by).toBe('codex@b');
  });

  it('two claims in the same second: lexicographically smaller agent id wins', () => {
    const fold = foldLedger([
      ev('T-01', 'claim', 'zed@host', '2026-09-02T10:00:00Z'),
      ev('T-01', 'claim', 'amy@host', '2026-09-02T10:00:00Z'),
    ], { now: NOW });
    expect(fold.tasks.get('T-01')?.by).toBe('amy@host');
  });

  it('stale takeover: a claim older than the lease can be re-claimed by another agent', () => {
    const fold = foldLedger([
      ev('T-02', 'claim', 'codex@b', '2026-09-02T07:00:00Z'),
      ev('T-02', 'claim', 'claude@a', '2026-09-02T10:00:00Z'), // 3h later > 2h lease
    ], { now: NOW, leaseHours: 2 });
    expect(fold.tasks.get('T-02')).toMatchObject({ status: 'claimed', by: 'claude@a' });
  });

  it('a live claim past the lease at fold time reads as stale', () => {
    const fold = foldLedger([ev('T-03', 'claim', 'codex@b', '2026-09-02T09:00:00Z')], { now: NOW, leaseHours: 2 });
    expect(fold.tasks.get('T-03')?.status).toBe('stale');
  });

  it('done after release: released task is open and anyone can complete it with evidence', () => {
    const fold = foldLedger([
      ev('T-04', 'claim', 'codex@b', '2026-09-02T10:00:00Z'),
      ev('T-04', 'release', 'codex@b', '2026-09-02T10:30:00Z', { note: 'handoff' }),
      ev('T-04', 'done', 'claude@a', '2026-09-02T11:00:00Z', { evidence: 'npm test → exit 0 | HEAD abc1234' }),
    ], { now: NOW });
    expect(fold.tasks.get('T-04')).toMatchObject({ status: 'done', by: 'claude@a', evidence: 'npm test → exit 0 | HEAD abc1234' });
  });

  it('done without evidence is ignored', () => {
    const fold = foldLedger([ev('T-05', 'done', 'claude@a', '2026-09-02T11:00:00Z')], { now: NOW });
    expect(fold.tasks.get('T-05')).toBeUndefined();
    expect(fold.ignored[0].reason).toMatch(/evidence/);
  });

  it('done by a non-owner on a live claim is ignored; owner done wins', () => {
    const fold = foldLedger([
      ev('T-06', 'claim', 'codex@b', '2026-09-02T10:00:00Z'),
      ev('T-06', 'done', 'claude@a', '2026-09-02T10:10:00Z', { evidence: 'x' }),
      ev('T-06', 'done', 'codex@b', '2026-09-02T10:20:00Z', { evidence: 'sha 1234567' }),
    ], { now: NOW });
    expect(fold.tasks.get('T-06')).toMatchObject({ status: 'done', by: 'codex@b' });
  });

  it('release by a non-owner is ignored', () => {
    const fold = foldLedger([
      ev('T-07', 'claim', 'codex@b', '2026-09-02T10:00:00Z'),
      ev('T-07', 'release', 'claude@a', '2026-09-02T10:05:00Z'),
    ], { now: NOW });
    expect(fold.tasks.get('T-07')).toMatchObject({ status: 'claimed', by: 'codex@b' });
  });

  it('block keeps the claim; claim on a done task is ignored', () => {
    const fold = foldLedger([
      ev('T-08', 'claim', 'codex@b', '2026-09-02T10:00:00Z'),
      ev('T-08', 'block', 'codex@b', '2026-09-02T10:05:00Z', { note: 'needs secret' }),
      ev('T-09', 'done', 'codex@b', '2026-09-02T10:06:00Z', { evidence: 'ok' }),
      ev('T-09', 'claim', 'claude@a', '2026-09-02T10:07:00Z'),
    ], { now: NOW });
    expect(fold.tasks.get('T-08')).toMatchObject({ status: 'blocked', by: 'codex@b', note: 'needs secret' });
    expect(fold.tasks.get('T-09')?.status).toBe('done');
  });

  it('skip requires a reason and is terminal', () => {
    const fold = foldLedger([
      ev('T-10', 'skip', 'anton', '2026-09-02T10:00:00Z'),
      ev('T-11', 'skip', 'anton', '2026-09-02T10:00:00Z', { note: 'out of scope' }),
      ev('T-11', 'claim', 'codex@b', '2026-09-02T10:01:00Z'),
    ], { now: NOW });
    expect(fold.tasks.get('T-10')).toBeUndefined();
    expect(fold.tasks.get('T-11')).toMatchObject({ status: 'skipped', note: 'out of scope' });
  });

  it('is order-independent (union-merged ledgers fold identically)', () => {
    const a = [
      ev('T-01', 'claim', 'codex@b', '2026-09-02T10:00:00Z'),
      ev('T-01', 'done', 'codex@b', '2026-09-02T10:30:00Z', { evidence: 'sha' }),
      ev('T-02', 'claim', 'claude@a', '2026-09-02T10:05:00Z'),
    ];
    const b = [a[2], a[1], a[0]];
    expect([...foldLedger(a, { now: NOW }).tasks]).toEqual([...foldLedger(b, { now: NOW }).tasks].sort());
  });
});

describe('parseLedger / appendEvent', () => {
  it('skips malformed lines, tolerates BOM + CRLF, counts them', () => {
    const content = '﻿{"t":"T-01","e":"claim","by":"a","at":"2026-09-02T10:00:00Z"}\r\nnot json\r\n{"t":"T-01","e":"nope","by":"a","at":"x"}\n\n';
    const { events, malformed } = parseLedger(content);
    expect(events).toHaveLength(1);
    expect(malformed).toBe(2);
  });

  it('appends single lines that read back identically', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-'));
    const file = path.join(dir, 'ledger.jsonl');
    const e1 = ev('T-01', 'claim', 'a@h', '2026-09-02T10:00:00Z');
    const e2 = ev('T-01', 'done', 'a@h', '2026-09-02T10:10:00Z', { evidence: 'npm test → exit 0', note: 'n' });
    appendEvent(file, e1);
    appendEvent(file, e2);
    const raw = fs.readFileSync(file, 'utf-8');
    expect(raw.split('\n').filter(Boolean)).toHaveLength(2);
    expect(raw).toBe(formatLedgerLine(e1) + formatLedgerLine(e2));
    expect(readLedger(file).events).toEqual([e1, e2]);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('getAgentId', () => {
  it('prefers SPECWEAVE_AGENT, else <tool>@<host>', () => {
    expect(getAgentId({ SPECWEAVE_AGENT: 'anton' })).toBe('anton');
    expect(getAgentId({ CLAUDECODE: '1' })).toMatch(/^claude@[a-z0-9-]+$/);
    expect(detectTool({ CODEX_SANDBOX: '1' })).toBe('codex');
    expect(detectTool({ OPENCODE_SESSION: '1' })).toBe('opencode');
    expect(detectTool({})).toBe('cli');
  });
});
