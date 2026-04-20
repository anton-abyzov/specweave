/**
 * Tests for renderRefinementSuggestionsSection — validates the
 * `sw:reflect --status` Skill Refinement Suggestions section (T-015, T-016).
 *
 * BDD (T-015 AC-US4-01, AC-US4-02):
 *   Given 2 skills have ≥3 negative signals and 1 skill has 2 signals
 *   When `sw:reflect --status` runs
 *   Then the 2 qualifying skills are listed with counts and a
 *        `sw:skill-refine <slug>` hint; the 3rd skill is omitted
 *
 * BDD (T-016 AC-US4-03):
 *   Given zero skills meet the threshold
 *   When status runs
 *   Then the Refinement Suggestions heading is not emitted at all
 */

import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { renderRefinementSuggestionsSection } from './reflect-status.js';
import type { RefinementSignal, SignalFile, SignalSeverity, SignalSource } from '../types/skill-signals.js';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'reflect-status-'));
  await mkdir(path.join(root, '.specweave', 'state'), { recursive: true });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function refinement(partial: {
  targetSkill: string;
  severity: SignalSeverity;
  source: SignalSource;
  detectedAt?: string;
}): RefinementSignal {
  return {
    type: 'refinement',
    id: `sig_${Math.random().toString(16).slice(2, 10)}`,
    source: partial.source,
    targetSkill: partial.targetSkill,
    severity: partial.severity,
    incrementId: '0671',
    evidence: 'e',
    detectedAt: partial.detectedAt ?? '2026-04-20T10:00:00Z',
    consumedBy: null,
  };
}

async function writeSignals(signals: RefinementSignal[]): Promise<void> {
  const file: SignalFile = { schemaVersion: 2, signals };
  await writeFile(path.join(root, '.specweave', 'state', 'skill-signals.json'), JSON.stringify(file));
}

describe('renderRefinementSuggestionsSection', () => {
  it('returns null when the signals file is missing (AC-US4-03)', async () => {
    const result = await renderRefinementSuggestionsSection({ projectRoot: root });
    expect(result).toBeNull();
  });

  it('returns null when no skills meet the ≥3 threshold (AC-US4-03, T-016)', async () => {
    await writeSignals([
      refinement({ targetSkill: 'sw:architect', severity: 'high', source: 'judge-llm' }),
      refinement({ targetSkill: 'sw:architect', severity: 'high', source: 'rubric' }),
      refinement({ targetSkill: 'sw:pm', severity: 'medium', source: 'code-reviewer' }),
    ]);

    const result = await renderRefinementSuggestionsSection({ projectRoot: root });
    expect(result).toBeNull();
  });

  it('lists qualifying skills and omits the one below threshold (AC-US4-01, T-015)', async () => {
    await writeSignals([
      // sw:architect — 3 signals, qualifies
      refinement({ targetSkill: 'sw:architect', severity: 'medium', source: 'judge-llm', detectedAt: '2026-04-20T10:00:00Z' }),
      refinement({ targetSkill: 'sw:architect', severity: 'high', source: 'rubric', detectedAt: '2026-04-20T11:00:00Z' }),
      refinement({ targetSkill: 'sw:architect', severity: 'low', source: 'code-reviewer', detectedAt: '2026-04-20T09:00:00Z' }),
      // sw:pm — 3 signals, qualifies
      refinement({ targetSkill: 'sw:pm', severity: 'high', source: 'judge-llm', detectedAt: '2026-04-19T12:00:00Z' }),
      refinement({ targetSkill: 'sw:pm', severity: 'high', source: 'judge-llm', detectedAt: '2026-04-19T13:00:00Z' }),
      refinement({ targetSkill: 'sw:pm', severity: 'high', source: 'rubric', detectedAt: '2026-04-19T14:00:00Z' }),
      // sw:tdd — only 2 signals, below threshold
      refinement({ targetSkill: 'sw:tdd', severity: 'high', source: 'judge-llm' }),
      refinement({ targetSkill: 'sw:tdd', severity: 'high', source: 'judge-llm' }),
    ]);

    const result = await renderRefinementSuggestionsSection({ projectRoot: root });
    expect(result).not.toBeNull();
    expect(result).toContain('## Skill Refinement Suggestions');
    expect(result).toContain('sw:architect');
    expect(result).toContain('sw:pm');
    expect(result).not.toContain('sw:tdd');
  });

  it('includes counts by source (AC-US4-02)', async () => {
    await writeSignals([
      refinement({ targetSkill: 'sw:architect', severity: 'high', source: 'judge-llm' }),
      refinement({ targetSkill: 'sw:architect', severity: 'high', source: 'judge-llm' }),
      refinement({ targetSkill: 'sw:architect', severity: 'medium', source: 'rubric' }),
      refinement({ targetSkill: 'sw:architect', severity: 'low', source: 'code-reviewer' }),
    ]);

    const result = await renderRefinementSuggestionsSection({ projectRoot: root });
    expect(result).toContain('judge-llm: 2');
    expect(result).toContain('rubric: 1');
    expect(result).toContain('code-review: 1');
  });

  it('shows the last signal timestamp and one-click command (AC-US4-02)', async () => {
    await writeSignals([
      refinement({ targetSkill: 'sw:architect', severity: 'high', source: 'judge-llm', detectedAt: '2026-04-20T10:00:00Z' }),
      refinement({ targetSkill: 'sw:architect', severity: 'high', source: 'rubric', detectedAt: '2026-04-20T11:00:00Z' }),
      refinement({ targetSkill: 'sw:architect', severity: 'medium', source: 'code-reviewer', detectedAt: '2026-04-20T09:00:00Z' }),
    ]);

    const result = await renderRefinementSuggestionsSection({ projectRoot: root });
    expect(result).toContain('2026-04-20T11:00:00Z');
    expect(result).toContain('`sw:skill-refine sw:architect`');
  });

  it('sorts output by severity × recency (AC-US4-01)', async () => {
    await writeSignals([
      // sw:architect — medium max severity
      refinement({ targetSkill: 'sw:architect', severity: 'medium', source: 'judge-llm', detectedAt: '2026-04-20T15:00:00Z' }),
      refinement({ targetSkill: 'sw:architect', severity: 'medium', source: 'rubric', detectedAt: '2026-04-20T16:00:00Z' }),
      refinement({ targetSkill: 'sw:architect', severity: 'low', source: 'code-reviewer', detectedAt: '2026-04-20T17:00:00Z' }),
      // sw:pm — high max severity
      refinement({ targetSkill: 'sw:pm', severity: 'high', source: 'judge-llm', detectedAt: '2026-04-19T10:00:00Z' }),
      refinement({ targetSkill: 'sw:pm', severity: 'low', source: 'rubric', detectedAt: '2026-04-19T11:00:00Z' }),
      refinement({ targetSkill: 'sw:pm', severity: 'low', source: 'rubric', detectedAt: '2026-04-19T12:00:00Z' }),
    ]);

    const result = await renderRefinementSuggestionsSection({ projectRoot: root });
    expect(result).not.toBeNull();
    const pmIndex = result!.indexOf('sw:pm');
    const archIndex = result!.indexOf('sw:architect');
    expect(pmIndex).toBeGreaterThan(-1);
    expect(archIndex).toBeGreaterThan(-1);
    expect(pmIndex).toBeLessThan(archIndex);
  });
});
