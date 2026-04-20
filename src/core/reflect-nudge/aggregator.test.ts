/**
 * Tests for reflect-nudge aggregator.
 *
 * Covers AC-US4-01 (≥3 threshold, sorted by severity × recency),
 * AC-US4-02 (count-by-source surfaced), and AC-US4-03 (empty result
 * when nothing meets threshold).
 */

import { mkdtemp, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { aggregateSuggestions, REFINEMENT_SUGGESTION_THRESHOLD } from './aggregator.js';
import type { RefinementSignal, SignalFile, SignalSeverity, SignalSource } from '../../types/skill-signals.js';

let dir: string;
let file: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'reflect-nudge-'));
  file = path.join(dir, 'skill-signals.json');
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function refinement(partial: Partial<RefinementSignal> & { targetSkill: string; severity: SignalSeverity; detectedAt: string; source: SignalSource; incrementId?: string; id?: string }): RefinementSignal {
  return {
    type: 'refinement',
    id: partial.id ?? `sig_${Math.random().toString(16).slice(2, 10)}`,
    source: partial.source,
    targetSkill: partial.targetSkill,
    severity: partial.severity,
    incrementId: partial.incrementId ?? '0671',
    evidence: partial.evidence ?? 'test evidence',
    detectedAt: partial.detectedAt,
    consumedBy: partial.consumedBy ?? null,
  };
}

async function writeSignals(signals: RefinementSignal[]): Promise<void> {
  const content: SignalFile = { schemaVersion: 2, signals };
  await writeFile(file, JSON.stringify(content, null, 2));
}

describe('aggregateSuggestions', () => {
  it('returns [] when the signals file is missing', async () => {
    const result = await aggregateSuggestions(file);
    expect(result).toEqual([]);
  });

  it('omits skills below the ≥3 threshold (AC-US4-03)', async () => {
    await writeSignals([
      refinement({ targetSkill: 'sw:architect', severity: 'medium', detectedAt: '2026-04-20T10:00:00Z', source: 'judge-llm' }),
      refinement({ targetSkill: 'sw:architect', severity: 'low', detectedAt: '2026-04-20T11:00:00Z', source: 'rubric' }),
      refinement({ targetSkill: 'sw:pm', severity: 'high', detectedAt: '2026-04-20T12:00:00Z', source: 'code-reviewer' }),
    ]);

    const result = await aggregateSuggestions(file);
    expect(result).toEqual([]);
  });

  it('returns skills at or above threshold with count-by-source (AC-US4-01, AC-US4-02)', async () => {
    await writeSignals([
      refinement({ targetSkill: 'sw:architect', severity: 'medium', detectedAt: '2026-04-20T10:00:00Z', source: 'judge-llm' }),
      refinement({ targetSkill: 'sw:architect', severity: 'high', detectedAt: '2026-04-20T11:00:00Z', source: 'rubric' }),
      refinement({ targetSkill: 'sw:architect', severity: 'low', detectedAt: '2026-04-20T09:00:00Z', source: 'code-reviewer' }),
      refinement({ targetSkill: 'sw:pm', severity: 'high', detectedAt: '2026-04-19T12:00:00Z', source: 'judge-llm' }),
      refinement({ targetSkill: 'sw:pm', severity: 'medium', detectedAt: '2026-04-19T13:00:00Z', source: 'judge-llm' }),
      refinement({ targetSkill: 'sw:pm', severity: 'low', detectedAt: '2026-04-19T14:00:00Z', source: 'rubric' }),
    ]);

    const result = await aggregateSuggestions(file);
    expect(result).toHaveLength(2);

    const arch = result.find((s) => s.slug === 'sw:architect');
    expect(arch).toBeDefined();
    expect(arch!.totalCount).toBe(3);
    expect(arch!.countsBySource).toEqual({ 'judge-llm': 1, rubric: 1, 'code-reviewer': 1 });
    expect(arch!.highestSeverity).toBe('high');
    expect(arch!.lastDetectedAt).toBe('2026-04-20T11:00:00Z');
  });

  it('sorts by severity first then recency (AC-US4-01)', async () => {
    // Both skills meet threshold. sw:pm has high severity, sw:architect has medium severity.
    // sw:pm must come first.
    await writeSignals([
      refinement({ targetSkill: 'sw:architect', severity: 'medium', detectedAt: '2026-04-20T15:00:00Z', source: 'judge-llm' }),
      refinement({ targetSkill: 'sw:architect', severity: 'medium', detectedAt: '2026-04-20T16:00:00Z', source: 'rubric' }),
      refinement({ targetSkill: 'sw:architect', severity: 'low', detectedAt: '2026-04-20T17:00:00Z', source: 'code-reviewer' }),
      refinement({ targetSkill: 'sw:pm', severity: 'high', detectedAt: '2026-04-19T10:00:00Z', source: 'judge-llm' }),
      refinement({ targetSkill: 'sw:pm', severity: 'low', detectedAt: '2026-04-19T11:00:00Z', source: 'rubric' }),
      refinement({ targetSkill: 'sw:pm', severity: 'low', detectedAt: '2026-04-19T12:00:00Z', source: 'rubric' }),
    ]);

    const result = await aggregateSuggestions(file);
    expect(result.map((s) => s.slug)).toEqual(['sw:pm', 'sw:architect']);
  });

  it('breaks severity ties by recency (most recent first)', async () => {
    await writeSignals([
      refinement({ targetSkill: 'skill-A', severity: 'high', detectedAt: '2026-04-18T10:00:00Z', source: 'judge-llm' }),
      refinement({ targetSkill: 'skill-A', severity: 'high', detectedAt: '2026-04-18T11:00:00Z', source: 'judge-llm' }),
      refinement({ targetSkill: 'skill-A', severity: 'high', detectedAt: '2026-04-18T12:00:00Z', source: 'judge-llm' }),
      refinement({ targetSkill: 'skill-B', severity: 'high', detectedAt: '2026-04-20T10:00:00Z', source: 'rubric' }),
      refinement({ targetSkill: 'skill-B', severity: 'high', detectedAt: '2026-04-20T11:00:00Z', source: 'rubric' }),
      refinement({ targetSkill: 'skill-B', severity: 'high', detectedAt: '2026-04-20T12:00:00Z', source: 'rubric' }),
    ]);

    const result = await aggregateSuggestions(file);
    expect(result.map((s) => s.slug)).toEqual(['skill-B', 'skill-A']);
  });

  it('accepts a custom threshold (used by the nudge path)', async () => {
    await writeSignals([
      refinement({ targetSkill: 'sw:architect', severity: 'high', detectedAt: '2026-04-20T10:00:00Z', source: 'judge-llm' }),
    ]);

    const withDefault = await aggregateSuggestions(file);
    expect(withDefault).toEqual([]);

    const withThresholdOne = await aggregateSuggestions(file, { threshold: 1 });
    expect(withThresholdOne).toHaveLength(1);
    expect(withThresholdOne[0].slug).toBe('sw:architect');
  });

  it('ignores generation signals', async () => {
    const signalsFile: SignalFile = {
      schemaVersion: 2,
      signals: [
        {
          type: 'generation',
          id: 'sig_gen',
          pattern: 'x',
          category: 'y',
          description: 'z',
          incrementIds: ['0670'],
          firstSeen: '2026-04-15T00:00:00Z',
          lastSeen: '2026-04-15T00:00:00Z',
          confidence: 0.9,
          evidence: [],
          suggested: false,
          declined: false,
          generated: false,
        },
        refinement({ targetSkill: 'sw:pm', severity: 'low', detectedAt: '2026-04-20T10:00:00Z', source: 'rubric' }),
        refinement({ targetSkill: 'sw:pm', severity: 'low', detectedAt: '2026-04-20T11:00:00Z', source: 'rubric' }),
        refinement({ targetSkill: 'sw:pm', severity: 'low', detectedAt: '2026-04-20T12:00:00Z', source: 'rubric' }),
      ],
    };
    await writeFile(file, JSON.stringify(signalsFile));

    const result = await aggregateSuggestions(file);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe('sw:pm');
    expect(result[0].totalCount).toBe(3);
  });

  it('exports a default threshold of 3', () => {
    expect(REFINEMENT_SUGGESTION_THRESHOLD).toBe(3);
  });
});
