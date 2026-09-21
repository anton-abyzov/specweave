/**
 * Jev (TypeSafe System One) integration — public surface.
 *
 * Fast, cheap, calibrated answers to CLOSED-SET questions: which skill, which tier,
 * is this command destructive, is this AC met, did the tests pass, is this text an
 * injection attempt. Jev never generates text and never replaces a reasoning model.
 *
 * Everything is opt-in (`jev.enabled` in `.specweave/config.json`) and fails open:
 * when Jev is off, unreachable or slow, callers keep their existing behaviour.
 *
 * @module core/jev
 */

export {
  JEV_DEFAULTS,
  JEV_FALLBACK_KEY_ENV,
  JEV_PROVIDER_ENDPOINT,
  JEV_PROVIDER_KEY_ENV,
  JEV_PROVIDER_MODEL,
  isJevEnabled,
  jevEndpoint,
  loadJevConfig,
  resolveApiKey,
  type JevConfig,
  type JevProvider,
} from './config.js';

export {
  JEV_LIMITS,
  JevClient,
  JevError,
  createJevClient,
  statusToCode,
  validateQuestions,
  type Answer,
  type JevClientOptions,
  type JevErrorCode,
  type JevResponse,
  type Json,
  type Question,
} from './client.js';

export {
  COMMAND_DESTRUCTIVE,
  COMMAND_SCOPE,
  COMMAND_SCOPES,
  DUPLICATE_ISSUE,
  NEEDS_INCREMENT,
  PROMPT_INJECTION,
  REQUEST_KIND,
  REQUEST_KINDS,
  SKILL_ROUTE_NONE,
  TASK_COMPLEXITY,
  TASK_COMPLEXITY_LEVELS,
  TEST_FAILURE_KIND,
  TEST_FAILURE_KINDS,
  TEST_OUTPUT_PASSED,
  acSatisfiedQuestion,
  skillRouteQuestion,
  type CommandScope,
  type RequestKind,
  type TaskComplexity,
  type TestFailureKind,
} from './questions.js';

export {
  MAX_ACS_PER_REQUEST,
  classifyFailure,
  classifyTask,
  guardCommand,
  guardVerdict,
  judgeAcs,
  modelTierFor,
  prefilterCommand,
  routePrompt,
  screenText,
  testOutputPassed,
  type AcDecision,
  type FailureDecision,
  type GuardDecision,
  type GuardDecisionOk,
  type ModelTier,
  type RouteDecision,
  type RouteDecisionOk,
  type ScreenDecision,
  type TaskDecision,
  type TaskDecisionOk,
  type Unavailable,
} from './decide.js';

export { redactSecrets } from './redact.js';

export {
  appendUsage,
  readUsageSummary,
  usageLogPath,
  type JevUsageRecord,
  type JevUsageSummary,
} from './usage.js';

export {
  runBrowse,
  type BrowseOptions,
  type BrowseResult,
  type BrowseStep,
} from './browse.js';
