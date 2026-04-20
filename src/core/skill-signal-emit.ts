/**
 * Shared emitter helpers for closure gates (judge-llm, rubric, code-reviewer).
 *
 * Each gate has its own orchestration, but the steps after a gate failure are
 * the same: attribute → map severity → append to `skill-signals.json`. This
 * module centralises that pipeline so the three call sites stay thin and the
 * best-effort/never-throw behaviour is uniform.
 *
 * @module core/skill-signal-emit
 */

import * as path from 'path';
import { appendRefinementSignal } from './skill-signals/index.js';
import {
  attributeSkill,
  type AttributeSkillInput,
} from './skill-attribution.js';
import type {
  SignalSeverity,
  SignalSource,
} from '../types/skill-signals.js';

export interface EmitRefinementInput {
  /** SpecWeave project root — used to resolve `.specweave/state/skill-signals.json`. */
  projectRoot: string;
  /** The originating gate. */
  source: SignalSource;
  /** Target severity for the emitted signal. */
  severity: SignalSeverity;
  /** The increment whose closure produced the failure. */
  incrementId: string;
  /** Short human-readable evidence excerpt persisted to the signal. */
  evidence: string;
  /** Inputs forwarded to `attributeSkill`. */
  attribution: AttributeSkillInput;
}

export interface EmitRefinementOutput {
  /** True when a signal was persisted. False when attribution was ambiguous. */
  emitted: boolean;
  /** Attributed skill (when emitted). */
  targetSkill: string | null;
  /** Attribution heuristic that matched. */
  method: 'direct' | 'slash' | 'pattern' | 'none';
}

/**
 * Resolve the conventional path to `.specweave/state/skill-signals.json`
 * under `projectRoot`. Matches the convention used by `SignalCollector` and
 * `suggestion-engine` so the same file is read/written across features.
 */
export function resolveSignalFilePath(projectRoot: string): string {
  return path.join(projectRoot, '.specweave', 'state', 'skill-signals.json');
}

/**
 * Attribute + emit a single refinement signal. Best-effort: swallows all I/O
 * errors. Returns a structured result for observability/testing.
 */
export async function emitRefinementIfAttributable(
  input: EmitRefinementInput,
): Promise<EmitRefinementOutput> {
  const attribution = attributeSkill(input.attribution);
  if (!attribution.skill) {
    return { emitted: false, targetSkill: null, method: attribution.method };
  }

  try {
    await appendRefinementSignal(resolveSignalFilePath(input.projectRoot), {
      source: input.source,
      targetSkill: attribution.skill,
      severity: input.severity,
      incrementId: input.incrementId,
      evidence: truncateEvidence(input.evidence),
    });
    return {
      emitted: true,
      targetSkill: attribution.skill,
      method: attribution.method,
    };
  } catch {
    return {
      emitted: false,
      targetSkill: attribution.skill,
      method: attribution.method,
    };
  }
}

const EVIDENCE_MAX = 500;

function truncateEvidence(text: string): string {
  if (text.length <= EVIDENCE_MAX) return text;
  return text.slice(0, EVIDENCE_MAX - 1).trimEnd() + '…';
}
