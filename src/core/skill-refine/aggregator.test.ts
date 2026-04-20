import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { aggregate, summarize } from './aggregator';
import type { RefinementSignal } from '../../types/skill-signals';

function sig(partial: Partial<RefinementSignal>): RefinementSignal {
  return {
    type: 'refinement',
    id: partial.id ?? 'sig_x',
    source: partial.source ?? 'judge-llm',
    targetSkill: partial.targetSkill ?? 'sw:architect',
    severity: partial.severity ?? 'medium',
    incrementId: partial.incrementId ?? '0671',
    evidence: partial.evidence ?? 'evidence text',
    detectedAt: partial.detectedAt ?? '2026-04-20T12:00:00.000Z',
    consumedBy: null,
  };
}

describe('skill-refine aggregator', () => {
  it('summarize: zeros when no signals', () => {
    const res = summarize([], 'sw:architect', 5);
    expect(res.totalSignals).toBe(0);
    expect(res.bySource).toEqual({ 'judge-llm': 0, rubric: 0, 'code-reviewer': 0 });
    expect(res.bySeverity).toEqual({ low: 0, medium: 0, high: 0 });
    expect(res.incrementIds).toEqual([]);
    expect(res.evidence).toEqual([]);
    expect(res.window.lastNIncrements).toBe(5);
  });

  it('summarize: counts by source and severity, collects evidence and increments', () => {
    const signals: RefinementSignal[] = [
      sig({ id: 's1', source: 'judge-llm', severity: 'high', incrementId: '0670', evidence: 'e1' }),
      sig({ id: 's2', source: 'rubric', severity: 'medium', incrementId: '0671', evidence: 'e2' }),
      sig({ id: 's3', source: 'judge-llm', severity: 'low', incrementId: '0671', evidence: 'e3' }),
      sig({ id: 's4', source: 'code-reviewer', severity: 'high', incrementId: '0669', evidence: 'e4' }),
    ];
    const res = summarize(signals, 'sw:architect', 3);
    expect(res.totalSignals).toBe(4);
    expect(res.bySource).toEqual({ 'judge-llm': 2, rubric: 1, 'code-reviewer': 1 });
    expect(res.bySeverity).toEqual({ low: 1, medium: 1, high: 2 });
    // Sorted desc
    expect(res.incrementIds).toEqual(['0671', '0670', '0669']);
    expect(res.evidence).toEqual(['e1', 'e2', 'e3', 'e4']);
  });

  it('aggregate: reads + summarizes from disk file (default N=5)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'agg-'));
    const filePath = join(dir, 'skill-signals.json');
    try {
      writeFileSync(
        filePath,
        JSON.stringify({
          schemaVersion: 2,
          signals: [
            sig({ id: 'sig_1', targetSkill: 'sw:architect', incrementId: '0671', severity: 'high' }),
            sig({ id: 'sig_2', targetSkill: 'sw:pm', incrementId: '0671', severity: 'low' }),
            sig({ id: 'sig_3', targetSkill: 'sw:architect', incrementId: '0670', severity: 'medium' }),
          ],
        }),
      );

      const res = await aggregate(filePath, 'sw:architect');
      // Only sw:architect signals
      expect(res.totalSignals).toBe(2);
      expect(res.signals.every((s) => s.targetSkill === 'sw:architect')).toBe(true);
      expect(res.window.lastNIncrements).toBe(5);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('aggregate: missing signals file returns zeroed result', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'agg-'));
    try {
      const res = await aggregate(join(dir, 'missing.json'), 'sw:architect');
      expect(res.totalSignals).toBe(0);
      expect(res.signals).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('aggregate: respects custom lastNIncrements window', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'agg-'));
    const filePath = join(dir, 'skill-signals.json');
    try {
      writeFileSync(
        filePath,
        JSON.stringify({
          schemaVersion: 2,
          signals: [
            sig({ id: 'a', targetSkill: 'sw:architect', incrementId: '0671' }),
            sig({ id: 'b', targetSkill: 'sw:architect', incrementId: '0670' }),
            sig({ id: 'c', targetSkill: 'sw:architect', incrementId: '0669' }),
            sig({ id: 'd', targetSkill: 'sw:architect', incrementId: '0668' }),
          ],
        }),
      );

      const res = await aggregate(filePath, 'sw:architect', { lastNIncrements: 2 });
      expect(res.totalSignals).toBe(2);
      expect(res.incrementIds.sort()).toEqual(['0670', '0671']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
