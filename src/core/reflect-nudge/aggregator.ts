/**
 * Reflect-nudge aggregator — groups refinement signals by target skill,
 * applies the ≥3 signal threshold, and ranks by severity × recency.
 *
 * Shared by the session-end nudge (picks the top suggestion) and the
 * `sw:reflect --status` dashboard section (lists everything above threshold).
 *
 * @module core/reflect-nudge/aggregator
 */

import { readSignals } from '../skill-signals/reader.js';
import type {
  RefinementSignal,
  SignalSource,
} from '../../types/skill-signals.js';

/** Minimum number of refinement signals a skill needs to surface. */
export const REFINEMENT_SUGGESTION_THRESHOLD = 3;

/** Per-skill aggregate used by both the nudge and the dashboard. */
export interface SkillSuggestion {
  slug: string;
  totalCount: number;
  countsBySource: Record<SignalSource, number>;
  highestSeverity: 'low' | 'medium' | 'high';
  severityScore: number;
  lastDetectedAt: string;
  sampleEvidence: string;
}

const SEVERITY_RANK: Record<'low' | 'medium' | 'high', number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Aggregate signals from disk and return skills meeting the threshold,
 * sorted by severity × recency (descending).
 *
 * `threshold` defaults to {@link REFINEMENT_SUGGESTION_THRESHOLD}. Pass `1`
 * for the nudge path (which wants the top suggestion regardless of total).
 */
export async function aggregateSuggestions(
  signalsFilePath: string,
  opts: { threshold?: number } = {},
): Promise<SkillSuggestion[]> {
  const threshold = opts.threshold ?? REFINEMENT_SUGGESTION_THRESHOLD;
  const file = await readSignals(signalsFilePath);
  const refinements = file.signals.filter(
    (s): s is RefinementSignal => s.type === 'refinement',
  );

  const bySkill = new Map<string, RefinementSignal[]>();
  for (const sig of refinements) {
    const list = bySkill.get(sig.targetSkill) ?? [];
    list.push(sig);
    bySkill.set(sig.targetSkill, list);
  }

  const suggestions: SkillSuggestion[] = [];
  for (const [slug, signals] of bySkill) {
    if (signals.length < threshold) continue;
    suggestions.push(toSuggestion(slug, signals));
  }

  return suggestions.sort(compareBySeverityThenRecency);
}

function toSuggestion(slug: string, signals: RefinementSignal[]): SkillSuggestion {
  const countsBySource: Record<SignalSource, number> = {
    'judge-llm': 0,
    rubric: 0,
    'code-reviewer': 0,
  };
  let highestSeverity: 'low' | 'medium' | 'high' = 'low';
  let lastDetectedAt = signals[0].detectedAt;
  let mostRecent: RefinementSignal = signals[0];

  for (const s of signals) {
    countsBySource[s.source] += 1;
    if (SEVERITY_RANK[s.severity] > SEVERITY_RANK[highestSeverity]) {
      highestSeverity = s.severity;
    }
    if (s.detectedAt > lastDetectedAt) {
      lastDetectedAt = s.detectedAt;
      mostRecent = s;
    }
  }

  return {
    slug,
    totalCount: signals.length,
    countsBySource,
    highestSeverity,
    severityScore: SEVERITY_RANK[highestSeverity],
    lastDetectedAt,
    sampleEvidence: mostRecent.evidence,
  };
}

function compareBySeverityThenRecency(a: SkillSuggestion, b: SkillSuggestion): number {
  const sev = b.severityScore - a.severityScore;
  if (sev !== 0) return sev;
  if (a.lastDetectedAt === b.lastDetectedAt) return 0;
  return a.lastDetectedAt < b.lastDetectedAt ? 1 : -1;
}
