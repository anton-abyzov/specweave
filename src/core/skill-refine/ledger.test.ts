import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { readLedger, appendApplied, appendRejected } from './ledger';

describe('skill-refine ledger', () => {
  let dir: string;
  let filePath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'ledger-'));
    filePath = join(dir, 'skill-refinements.json');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns empty ledger when file is missing', async () => {
    const ledger = await readLedger(filePath);
    expect(ledger).toEqual({ refinements: [] });
  });

  it('appends an applied refinement with generated id/timestamp', async () => {
    const entry = await appendApplied(filePath, {
      targetSkill: 'sw:architect',
      author: 'alice@example.com',
      signalIds: ['sig_1', 'sig_2'],
      diffSha: 'abc123',
      rationale: 'relax microservices default',
    });

    expect(entry.id).toMatch(/^ref_[0-9A-F]{20}$/);
    expect(entry.status).toBe('applied');
    expect(entry.diffSha).toBe('abc123');
    expect(entry.appliedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const ledger = await readLedger(filePath);
    expect(ledger.refinements).toHaveLength(1);
    expect(ledger.refinements[0]).toEqual(entry);
  });

  it('appends a rejected refinement with reason and empty diffSha', async () => {
    const entry = await appendRejected(filePath, {
      targetSkill: 'sw:pm',
      author: 'bob@example.com',
      signalIds: ['sig_9'],
      rationale: 'diff proposal ignored prior ADR',
      rejectionReason: 'violates ADR-0671-04 (Goodhart loop)',
    });

    expect(entry.status).toBe('rejected');
    expect(entry.diffSha).toBe('');
    expect(entry.rejectionReason).toBe('violates ADR-0671-04 (Goodhart loop)');

    const ledger = await readLedger(filePath);
    expect(ledger.refinements[0].status).toBe('rejected');
  });

  it('preserves existing entries when appending (append-only)', async () => {
    await appendApplied(filePath, {
      targetSkill: 'sw:a',
      author: 'a@x',
      signalIds: ['s1'],
      diffSha: 'sha1',
      rationale: 'r1',
      id: 'ref_FIRST',
      appliedAt: '2026-01-01T00:00:00.000Z',
    });
    await appendRejected(filePath, {
      targetSkill: 'sw:b',
      author: 'b@x',
      signalIds: ['s2'],
      rationale: 'r2',
      rejectionReason: 'no',
      id: 'ref_SECOND',
      appliedAt: '2026-01-02T00:00:00.000Z',
    });

    const ledger = await readLedger(filePath);
    expect(ledger.refinements.map((r) => r.id)).toEqual(['ref_FIRST', 'ref_SECOND']);
  });

  it('recovers from a corrupt file by returning empty ledger and backing it up', async () => {
    writeFileSync(filePath, 'not-json-{{{', 'utf-8');
    const ledger = await readLedger(filePath);
    expect(ledger.refinements).toEqual([]);
    // Backup should exist
    const backup = readFileSync(filePath + '.bak', 'utf-8');
    expect(backup).toContain('not-json-{{{');
  });

  it('honors overrides for id and appliedAt (deterministic tests)', async () => {
    const entry = await appendApplied(filePath, {
      targetSkill: 'sw:x',
      author: 'x@x',
      signalIds: [],
      diffSha: 'sha',
      rationale: 'r',
      id: 'ref_OVERRIDE',
      appliedAt: '2026-04-20T12:00:00.000Z',
    });
    expect(entry.id).toBe('ref_OVERRIDE');
    expect(entry.appliedAt).toBe('2026-04-20T12:00:00.000Z');
  });
});
