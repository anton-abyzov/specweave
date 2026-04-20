/**
 * Barrel export for the reflect-nudge module.
 *
 * Consumers: `completeIncrement` (session-end nudge at /sw:done close),
 * `sw:reflect --status` (dashboard section).
 *
 * @module core/reflect-nudge
 */

export {
  aggregateSuggestions,
  REFINEMENT_SUGGESTION_THRESHOLD,
  type SkillSuggestion,
} from './aggregator.js';

export { checkNudgeEligibility, type NudgeEligibility } from './eligibility.js';

export { renderNudgePrompt, type NudgeInputs } from './prompt-renderer.js';

export { promptNudge, type PromptResponse, type PromptOptions } from './interactive-prompt.js';

export { runSessionEndNudge, type NudgeRunResult } from './session-end-nudge.js';
