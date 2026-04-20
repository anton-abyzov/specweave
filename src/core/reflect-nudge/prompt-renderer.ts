/**
 * Renders the one-line session-end nudge prompt shown at /sw:done close.
 *
 * Format (AC-US3-01): `Detected: <short summary> — run <command>? (y/N)`
 *
 * Picks between refinement and learning suggestions deterministically —
 * prefers highest-severity refinement over highest-confidence learning so
 * repeat invocations with the same state render the same prompt.
 *
 * @module core/reflect-nudge/prompt-renderer
 */

import type { SkillSuggestion } from './aggregator.js';

export interface NudgeInputs {
  /** Top refinement suggestion (threshold=1 aggregator output), or null. */
  topRefinement: SkillSuggestion | null;
  /** True when a high-confidence learning was captured this session. */
  hasHighConfidenceLearning: boolean;
}

/**
 * Returns the nudge line, or null if nothing should be printed.
 */
export function renderNudgePrompt(inputs: NudgeInputs): string | null {
  const { topRefinement, hasHighConfidenceLearning } = inputs;

  if (topRefinement) {
    const count = topRefinement.totalCount;
    return `Detected: ${topRefinement.slug} (${count} ${count === 1 ? 'signal' : 'signals'}) — run \`sw:skill-refine ${topRefinement.slug}\`? (y/N)`;
  }

  if (hasHighConfidenceLearning) {
    return 'Detected: new learning worth persisting — run `sw:reflect`? (y/N)';
  }

  return null;
}
