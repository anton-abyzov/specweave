/**
 * Tests for the skill-signals reader — AC-US1-04, AC-US2-01, AC-US4-01.
 *
 * BDD for T-003:
 *   Given a signals file with mixed generation + refinement entries
 *     across 3 target skills
 *   When `listForSkill("sw:architect", {lastNIncrements: 5})` is called
 *   Then only refinement signals targeting "sw:architect" within the last 5
 *     increment IDs are returned, sorted by severity × recency.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  readSignals,
  listRefinementsForSkill,
} from './reader.js';
import type { SignalFile, RefinementSignal } from '../../types/skill-signals.js';

function refinement(partial: Partial<RefinementSignal>): RefinementSignal {
  return {
    type: 'refinement',
    id: partial.id ?? 'sig_' + Math.random().toString(36).slice(2, 10),
    source: partial.source ?? 'judge-llm',
    targetSkill: partial.targetSkill ?? 'sw:architect',
    severity: partial.severity ?? 'low',
    incrementId: partial.incrementId ?? '0671',
    evidence: partial.evidence ?? 'ev',
    detectedAt: partial.detectedAt ?? '2026-04-20T00:00:00.000Z',
    consumedBy: partial.consumedBy ?? null,
  };
}

describe('readSignals', () => {
  let tempDir: string;
  let filePath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sw-signal-reader-'));
    filePath = join(tempDir, '.specweave', 'state', 'skill-signals.json');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns an empty v2 file when the path does not exist', async () => {
    const file = await readSignals(filePath);
    expect(file).toEqual({ schemaVersion: 2, signals: [] });
  });

  it('lazy-migrates a v1 file to v2 in memory without touching disk', async () => {
    await mkdir(join(tempDir, '.specweave', 'state'), { recursive: true });
    const v1 = {
      version: '1.0',
      signals: [
        {
          id: 'sig-a',
          pattern: 'p1',
          category: 'c1',
          description: 'd1',
          incrementIds: ['0650', '0651'],
          firstSeen: '2026-04-10T00:00:00Z',
          lastSeen: '2026-04-11T00:00:00Z',
          confidence: 0.66,
          evidence: ['ev1'],
          suggested: false,
          declined: false,
          generated: false,
        },
        {
          id: 'sig-b',
          pattern: 'p2',
          category: 'c2',
          description: 'd2',
          incrementIds: ['0652'],
          firstSeen: '2026-04-12T00:00:00Z',
          lastSeen: '2026-04-12T00:00:00Z',
          confidence: 0.33,
          evidence: [],
          suggested: false,
          declined: false,
          generated: false,
        },
        {
          id: 'sig-c',
          pattern: 'p3',
          category: 'c3',
          description: 'd3',
          incrementIds: ['0653'],
          firstSeen: '2026-04-13T00:00:00Z',
          lastSeen: '2026-04-13T00:00:00Z',
          confidence: 1,
          evidence: ['ev3'],
          suggested: true,
          declined: false,
          generated: false,
        },
      ],
    };
    const raw = JSON.stringify(v1, null, 2);
    await writeFile(filePath, raw, 'utf-8');

    const file = await readSignals(filePath);
    expect(file.schemaVersion).toBe(2);
    expect(file.signals).toHaveLength(3);
    expect(file.signals.every((s) => s.type === 'generation')).toBe(true);
    // Data preserved.
    expect((file.signals[0] as any).incrementIds).toEqual(['0650', '0651']);
    expect((file.signals[0] as any).pattern).toBe('p1');

    // Disk is untouched (bytes identical to what we wrote).
    const after = await readFile(filePath, 'utf-8');
    expect(after).toEqual(raw);
  });

  it('reads a v2 file unchanged', async () => {
    await mkdir(join(tempDir, '.specweave', 'state'), { recursive: true });
    const v2: SignalFile = {
      schemaVersion: 2,
      signals: [refinement({ id: 'sig_AAA' })],
    };
    await writeFile(filePath, JSON.stringify(v2), 'utf-8');

    const file = await readSignals(filePath);
    expect(file).toEqual(v2);
  });

  it('returns an empty v2 file and creates a .bak for corrupted JSON', async () => {
    await mkdir(join(tempDir, '.specweave', 'state'), { recursive: true });
    await writeFile(filePath, '{ this is not json', 'utf-8');

    const file = await readSignals(filePath);
    expect(file).toEqual({ schemaVersion: 2, signals: [] });

    // .bak was created.
    await expect(readFile(filePath + '.bak', 'utf-8')).resolves.toBeTruthy();
  });

  it('returns an empty v2 file for a schema-invalid v2 (wrong schemaVersion)', async () => {
    await mkdir(join(tempDir, '.specweave', 'state'), { recursive: true });
    await writeFile(filePath, JSON.stringify({ schemaVersion: 3, signals: [] }), 'utf-8');
    const file = await readSignals(filePath);
    expect(file).toEqual({ schemaVersion: 2, signals: [] });
  });
});

describe('listRefinementsForSkill', () => {
  let tempDir: string;
  let filePath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sw-signal-list-'));
    filePath = join(tempDir, '.specweave', 'state', 'skill-signals.json');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  async function seed(file: SignalFile): Promise<void> {
    await mkdir(join(tempDir, '.specweave', 'state'), { recursive: true });
    await writeFile(filePath, JSON.stringify(file), 'utf-8');
  }

  it('returns only refinement signals targeting the requested skill', async () => {
    await seed({
      schemaVersion: 2,
      signals: [
        // Generation signals must be ignored entirely.
        {
          type: 'generation',
          id: 'sig-gen',
          pattern: 'p',
          category: 'c',
          description: 'd',
          incrementIds: ['0671'],
          firstSeen: '2026-04-20T00:00:00Z',
          lastSeen: '2026-04-20T00:00:00Z',
          confidence: 1,
          evidence: [],
          suggested: false,
          declined: false,
          generated: false,
        },
        // Refinement for a different skill — ignored.
        refinement({ id: 'sig_OTHER', targetSkill: 'sw:pm' }),
        // Refinement for target skill.
        refinement({ id: 'sig_ARCH_1', targetSkill: 'sw:architect' }),
        // Another different skill.
        refinement({ id: 'sig_TDD', targetSkill: 'sw:tdd-cycle' }),
        // Target skill again.
        refinement({ id: 'sig_ARCH_2', targetSkill: 'sw:architect' }),
      ],
    });

    const result = await listRefinementsForSkill(filePath, 'sw:architect');
    expect(result.map((s) => s.id).sort()).toEqual(['sig_ARCH_1', 'sig_ARCH_2']);
    expect(result.every((s) => s.type === 'refinement')).toBe(true);
    expect(result.every((s) => s.targetSkill === 'sw:architect')).toBe(true);
  });

  it('sorts by severity (high > medium > low) then detectedAt desc', async () => {
    await seed({
      schemaVersion: 2,
      signals: [
        refinement({
          id: 'sig_LOW_RECENT',
          targetSkill: 'sw:architect',
          severity: 'low',
          detectedAt: '2026-04-20T10:00:00Z',
        }),
        refinement({
          id: 'sig_HIGH_OLD',
          targetSkill: 'sw:architect',
          severity: 'high',
          detectedAt: '2026-04-01T00:00:00Z',
        }),
        refinement({
          id: 'sig_MED_RECENT',
          targetSkill: 'sw:architect',
          severity: 'medium',
          detectedAt: '2026-04-20T12:00:00Z',
        }),
        refinement({
          id: 'sig_HIGH_RECENT',
          targetSkill: 'sw:architect',
          severity: 'high',
          detectedAt: '2026-04-20T09:00:00Z',
        }),
        refinement({
          id: 'sig_MED_OLD',
          targetSkill: 'sw:architect',
          severity: 'medium',
          detectedAt: '2026-04-05T00:00:00Z',
        }),
      ],
    });

    const result = await listRefinementsForSkill(filePath, 'sw:architect');
    expect(result.map((s) => s.id)).toEqual([
      'sig_HIGH_RECENT', // high + newer
      'sig_HIGH_OLD',    // high + older
      'sig_MED_RECENT',
      'sig_MED_OLD',
      'sig_LOW_RECENT',
    ]);
  });

  it('applies the lastNIncrements window across mixed signals (BDD for T-003)', async () => {
    // Seven increments present in the file: 0650..0656. lastNIncrements=5
    // should cover 0652..0656 (the 5 largest lex-sorted). Signals in 0650
    // and 0651 must be filtered out.
    await seed({
      schemaVersion: 2,
      signals: [
        // Generation signal that WIDENS the increment pool but must be ignored
        // for matching. It contributes 0650 and 0656 to the window candidates.
        {
          type: 'generation',
          id: 'sig-gen',
          pattern: 'p',
          category: 'c',
          description: 'd',
          incrementIds: ['0650', '0656'],
          firstSeen: '2026-04-20T00:00:00Z',
          lastSeen: '2026-04-20T00:00:00Z',
          confidence: 1,
          evidence: [],
          suggested: false,
          declined: false,
          generated: false,
        },
        // Different skills — must be excluded.
        refinement({ id: 'sig_PM', targetSkill: 'sw:pm', incrementId: '0656' }),
        refinement({ id: 'sig_TDD', targetSkill: 'sw:tdd-cycle', incrementId: '0655' }),

        // sw:architect signals across the increment window.
        refinement({
          id: 'sig_A_OUT_0650',
          targetSkill: 'sw:architect',
          incrementId: '0650',
          severity: 'high',
          detectedAt: '2026-04-01T00:00:00Z',
        }),
        refinement({
          id: 'sig_A_OUT_0651',
          targetSkill: 'sw:architect',
          incrementId: '0651',
          severity: 'high',
          detectedAt: '2026-04-02T00:00:00Z',
        }),
        refinement({
          id: 'sig_A_IN_0652',
          targetSkill: 'sw:architect',
          incrementId: '0652',
          severity: 'low',
          detectedAt: '2026-04-03T00:00:00Z',
        }),
        refinement({
          id: 'sig_A_IN_0653',
          targetSkill: 'sw:architect',
          incrementId: '0653',
          severity: 'medium',
          detectedAt: '2026-04-04T00:00:00Z',
        }),
        refinement({
          id: 'sig_A_IN_0654',
          targetSkill: 'sw:architect',
          incrementId: '0654',
          severity: 'high',
          detectedAt: '2026-04-05T00:00:00Z',
        }),
        refinement({
          id: 'sig_A_IN_0655',
          targetSkill: 'sw:architect',
          incrementId: '0655',
          severity: 'low',
          detectedAt: '2026-04-06T00:00:00Z',
        }),
        refinement({
          id: 'sig_A_IN_0656',
          targetSkill: 'sw:architect',
          incrementId: '0656',
          severity: 'medium',
          detectedAt: '2026-04-07T00:00:00Z',
        }),
      ],
    });

    const result = await listRefinementsForSkill(filePath, 'sw:architect', {
      lastNIncrements: 5,
    });

    // 0650 and 0651 refinements are outside the window.
    expect(result.map((s) => s.id)).not.toContain('sig_A_OUT_0650');
    expect(result.map((s) => s.id)).not.toContain('sig_A_OUT_0651');

    // Sorted by severity desc, then detectedAt desc.
    expect(result.map((s) => s.id)).toEqual([
      'sig_A_IN_0654', // high
      'sig_A_IN_0656', // medium, newer
      'sig_A_IN_0653', // medium, older
      'sig_A_IN_0655', // low, newer
      'sig_A_IN_0652', // low, older
    ]);
  });

  it('returns all matching refinements when lastNIncrements is not provided', async () => {
    await seed({
      schemaVersion: 2,
      signals: [
        refinement({
          id: 'sig_OLD',
          targetSkill: 'sw:architect',
          incrementId: '0001',
          severity: 'medium',
        }),
        refinement({
          id: 'sig_NEW',
          targetSkill: 'sw:architect',
          incrementId: '9999',
          severity: 'medium',
        }),
      ],
    });
    const result = await listRefinementsForSkill(filePath, 'sw:architect');
    expect(result).toHaveLength(2);
  });

  it('treats lastNIncrements <= 0 as no window restriction', async () => {
    await seed({
      schemaVersion: 2,
      signals: [
        refinement({ id: 'sig_1', targetSkill: 'sw:architect', incrementId: '0650' }),
        refinement({ id: 'sig_2', targetSkill: 'sw:architect', incrementId: '0651' }),
      ],
    });
    const zero = await listRefinementsForSkill(filePath, 'sw:architect', {
      lastNIncrements: 0,
    });
    expect(zero).toHaveLength(2);
  });

  it('returns an empty array when the file does not exist', async () => {
    const result = await listRefinementsForSkill(filePath, 'sw:architect');
    expect(result).toEqual([]);
  });

  it('also handles v1 files via lazy migration (refinements are absent in v1, so returns [])', async () => {
    await mkdir(join(tempDir, '.specweave', 'state'), { recursive: true });
    const v1 = {
      version: '1.0',
      signals: [
        {
          id: 'sig-gen',
          pattern: 'p',
          category: 'c',
          description: 'd',
          incrementIds: ['0650'],
          firstSeen: '2026-04-10T00:00:00Z',
          lastSeen: '2026-04-10T00:00:00Z',
          confidence: 1,
          evidence: [],
          suggested: false,
          declined: false,
          generated: false,
        },
      ],
    };
    await writeFile(filePath, JSON.stringify(v1), 'utf-8');

    const result = await listRefinementsForSkill(filePath, 'sw:architect');
    expect(result).toEqual([]);
  });
});
