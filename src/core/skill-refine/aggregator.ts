/**
 * Signal aggregator for `sw:skill-refine`.
 *
 * Wraps `listRefinementsForSkill` and produces a shape consumed by both the
 * Haiku diff prompt and the `--show-signals` output: counts by source,
 * severity distribution, evidence excerpts, and the N-increment window.
 *
 * @module core/skill-refine/aggregator
 */

import { listRefinementsForSkill } from '../skill-signals/reader';
import type {
  RefinementSignal,
  SignalSeverity,
  SignalSource,
} from '../../types/skill-signals';

export interface AggregateResult {
  targetSkill: string;
  window: { lastNIncrements: number };
  totalSignals: number;
  bySource: Record<SignalSource, number>;
  bySeverity: Record<SignalSeverity, number>;
  incrementIds: string[];
  signals: RefinementSignal[];
  evidence: string[];
}

export interface AggregateOptions {
  lastNIncrements?: number;
}

const DEFAULT_LAST_N = 5;

/**
 * Load + summarize refinement signals for `targetSkill` from the signals
 * file at `signalsFilePath`. When no signals exist, the result still carries
 * a valid shape with zeroed counts — callers can downstream-check `totalSignals`.
 */
export async function aggregate(
  signalsFilePath: string,
  targetSkill: string,
  opts: AggregateOptions = {},
): Promise<AggregateResult> {
  const lastN = opts.lastNIncrements ?? DEFAULT_LAST_N;
  const signals = await listRefinementsForSkill(signalsFilePath, targetSkill, {
    lastNIncrements: lastN,
  });

  return summarize(signals, targetSkill, lastN);
}

/**
 * Pure summarizer — exposed for tests that want to feed signals directly.
 */
export function summarize(
  signals: RefinementSignal[],
  targetSkill: string,
  lastN: number,
): AggregateResult {
  const bySource: Record<SignalSource, number> = {
    'judge-llm': 0,
    rubric: 0,
    'code-reviewer': 0,
  };
  const bySeverity: Record<SignalSeverity, number> = {
    low: 0,
    medium: 0,
    high: 0,
  };
  const incrementIdSet = new Set<string>();
  const evidence: string[] = [];

  for (const s of signals) {
    bySource[s.source] += 1;
    bySeverity[s.severity] += 1;
    incrementIdSet.add(s.incrementId);
    if (s.evidence) evidence.push(s.evidence);
  }

  return {
    targetSkill,
    window: { lastNIncrements: lastN },
    totalSignals: signals.length,
    bySource,
    bySeverity,
    incrementIds: Array.from(incrementIdSet).sort().reverse(),
    signals,
    evidence,
  };
}
