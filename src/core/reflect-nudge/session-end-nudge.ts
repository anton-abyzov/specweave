/**
 * Orchestrator for the /sw:done close-path nudge.
 *
 * Composes eligibility + renderer + prompt. Single entry point consumed
 * by `completeIncrement` so the close-path adds <100ms even when no
 * signals are present (spec: Non-Functional Performance).
 *
 * @module core/reflect-nudge/session-end-nudge
 */

import { checkNudgeEligibility } from './eligibility.js';
import { renderNudgePrompt } from './prompt-renderer.js';
import { promptNudge, type PromptResponse, type PromptOptions } from './interactive-prompt.js';

export interface NudgeRunResult {
  printed: boolean;
  response: PromptResponse | 'skipped';
  reason: 'disabled' | 'no-signal' | 'has-refinement' | 'has-learning';
}

export interface NudgeRunOptions {
  projectRoot?: string;
  incrementId: string;
  /** Suppress side effects (fully silent). Used when the caller is silent/json. */
  silent?: boolean;
  /** Overrides forwarded to the interactive prompt — stdin/stdout/timeout. */
  prompt?: PromptOptions;
  /** Override autoNudge for tests. */
  autoNudge?: boolean;
}

/**
 * Run the nudge. Never throws; any failure returns `{printed: false, response: 'skipped'}`.
 * Caller should not branch on the response — AC-US3-04 forbids auto-execution.
 */
export async function runSessionEndNudge(
  opts: NudgeRunOptions,
): Promise<NudgeRunResult> {
  if (opts.silent) {
    return { printed: false, response: 'skipped', reason: 'disabled' };
  }

  try {
    const eligibility = await checkNudgeEligibility({
      projectRoot: opts.projectRoot,
      incrementId: opts.incrementId,
      autoNudge: opts.autoNudge,
    });

    if (!eligibility.shouldNudge) {
      return { printed: false, response: 'skipped', reason: eligibility.reason };
    }

    const line = renderNudgePrompt({
      topRefinement: eligibility.topRefinement,
      hasHighConfidenceLearning: eligibility.hasHighConfidenceLearning,
    });

    if (!line) {
      return { printed: false, response: 'skipped', reason: eligibility.reason };
    }

    const response = await promptNudge(line, opts.prompt);
    return { printed: true, response, reason: eligibility.reason };
  } catch {
    return { printed: false, response: 'skipped', reason: 'no-signal' };
  }
}
