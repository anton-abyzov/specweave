/**
 * Auto Types (Simplified - Stop Hook Feedback Loop)
 *
 * Core principle: The increment's metadata.json status IS the state.
 * No complex session management needed.
 *
 * Extended with Success Criteria for LLM-based completion evaluation.
 */

// ============================================================================
// SUCCESS CRITERIA TYPES (for auto mode completion evaluation)
// ============================================================================

/**
 * Success criteria type for auto mode completion evaluation
 * Determines when auto mode session should end
 */
export type SuccessCriteriaType =
  | 'tasks_complete' // All tasks marked [x] complete
  | 'acs_satisfied' // All acceptance criteria checked
  | 'tests_pass' // Tests must pass
  | 'build_succeeds' // Build must succeed
  | 'llm_evaluate' // LLM evaluates if goal is met
  | 'custom_command'; // Custom command returns 0

/**
 * Individual success criterion for auto mode
 */
export interface SuccessCriterion {
  type: SuccessCriteriaType;
  description: string; // Human-readable description
  required: boolean; // Mandatory vs optional
  command?: string; // For custom_command/tests_pass/build_succeeds type
  threshold?: number; // For coverage-based criteria
  model?: 'haiku' | 'sonnet' | 'opus'; // For llm_evaluate type (default: opus)
}

/**
 * Result of evaluating a success criterion
 */
export interface CriterionEvaluationResult {
  criterion: SuccessCriterion;
  satisfied: boolean;
  reason: string;
  durationMs?: number;
}

/**
 * Result of full completion evaluation
 */
export interface CompletionEvaluationResult {
  complete: boolean;
  overallReason: string;
  confidence: number; // 0-1 for LLM evaluations
  results: CriterionEvaluationResult[];
  nextSteps: string[];
  durationMs: number;
}

/**
 * Default success criteria - what most projects need
 */
export const DEFAULT_SUCCESS_CRITERIA: SuccessCriterion[] = [
  {
    type: 'tasks_complete',
    description: 'All tasks marked complete in tasks.md',
    required: true,
  },
  {
    type: 'acs_satisfied',
    description: 'All acceptance criteria satisfied in spec.md',
    required: true,
  },
];

// ============================================================================
// BASE AUTO TYPES
// ============================================================================

/**
 * Auto mode flag - the only state file needed
 * Stored at .specweave/state/auto-mode.json
 */
export interface AutoModeFlag {
  active: boolean;
  timestamp: string;
  incrementIds?: string[]; // Optional: specific increments to process
  tddMode?: boolean; // TDD strict mode enabled
  requireTests?: boolean; // Tests required before completion
  // Success criteria for completion evaluation
  successCriteria?: SuccessCriterion[];
  successSummary?: string; // Human-readable summary of what ends the session
  userGoal?: string; // Original user intent/prompt
}

/**
 * Completion condition types for quality gates
 * NOTE: These are checked by /sw:done, NOT by auto mode itself
 */
export type CompletionConditionType =
  | 'build' // Build must pass
  | 'tests' // Tests must pass (unit + integration)
  | 'e2e' // E2E tests must pass
  | 'integration' // Integration tests must pass
  | 'lint' // Linting must pass
  | 'types' // Type-checking must pass
  | 'coverage' // Code coverage must meet threshold
  | 'e2e-coverage' // E2E coverage must meet threshold
  | 'command'; // Custom command must pass

export interface CompletionCondition {
  type: CompletionConditionType;
  threshold?: number; // For coverage conditions (percentage)
  cmd?: string; // For custom command conditions
  autoHeal?: boolean; // Auto-fix and retry on failure
  maxRetries?: number; // Max retry attempts for auto-heal
  mandatory?: boolean; // Condition cannot be removed by user
  framework?: string; // Detected framework (npm, pytest, go, cargo, etc.)
  detectedCommand?: string; // Auto-detected command to run
}


/**
 * Auto config - includes legacy fields for backward compatibility
 */
export interface AutoConfig {
  enabled: boolean;
  maxIterations: number; // Safety limit (default: 2500)
  // Session turn limit (HARD STOP)
  maxTurns?: number; // Max total turns in auto session before hard stop (default: 50)
  // Stop hook retry settings (for stuck detection)
  maxRetries?: number; // Max retries on same incomplete work before escalating (default: 20)
  requireTests?: boolean; // Require tests to pass before completion (default: false)
  requireValidation?: boolean; // Require /sw:validate before completion (default: true)
  requireJudgeLLM?: boolean; // Require /sw:judge-llm before completion (default: false)
  requireLLMEval?: boolean; // Use LLM to evaluate completion (default: false)
  // Legacy fields (still supported in config but not used by simplified auto mode)
  maxHours?: number;
  testCommand?: string;
  coverageThreshold?: number;
  enforceTestFirst?: boolean;
  humanGated?: {
    patterns: string[];
    timeout: number;
    neverAutoApprove: string[];
  };
  circuitBreakers?: {
    failureThreshold: number;
    resetTimeout: number;
  };
  sync?: {
    batchInterval: number;
    forceOnComplete: boolean;
  };
}

export const DEFAULT_AUTO_CONFIG: AutoConfig = {
  enabled: true,
  maxIterations: 2500,
  maxTurns: 20, // HARD STOP: Max total turns in auto session (never resets during session)
  maxRetries: 20, // Attempts before escalating stuck session warning (resets when work changes)
  requireTests: false, // Set true to require tests pass before completion
  requireValidation: true, // Run /sw:validate before completion
  requireJudgeLLM: false, // Set true to require AI quality verification
  requireLLMEval: false, // Set true to use LLM completion evaluation
  maxHours: 600,
  testCommand: 'npm test',
  coverageThreshold: 80,
  enforceTestFirst: false,
  humanGated: {
    patterns: ['deploy', 'migrate', 'publish', 'push --force', 'rm -rf', 'API_KEY', 'SECRET'],
    timeout: 1800,
    neverAutoApprove: ['push --force', 'rm -rf /', 'production deploy'],
  },
  circuitBreakers: {
    failureThreshold: 3,
    resetTimeout: 300,
  },
  sync: {
    batchInterval: 300,
    forceOnComplete: true,
  },
};

// ============================================================================
// DEPRECATED TYPES - Kept for backward compatibility, will be removed in v2.0
// ============================================================================

/**
 * @deprecated Use increment metadata.json status instead
 */
export type AutoSessionStatus = 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

/**
 * @deprecated Session state is no longer tracked - increment status IS the state
 */
export interface AutoSession {
  sessionId: string;
  status: AutoSessionStatus;
  startTime: string;
  endTime?: string;
  iteration: number;
  maxIterations: number;
  maxHours?: number;
  incrementQueue: string[];
  currentIncrement: string | null;
  completedIncrements: string[];
  failedIncrements: string[];
  humanGates: {
    pending: null;
    approved: string[];
    blocked: string[];
  };
  circuitBreakers: Record<string, unknown>;
  lastActivity: string;
  endReason?: string;
  simple?: boolean;
  completionConditions?: CompletionCondition[];
  tddMode?: boolean;
}

/**
 * @deprecated Log entries are no longer tracked in simplified auto mode
 */
export interface AutoLogEntry {
  timestamp: string;
  iteration: number;
  sessionId: string;
  event:
    | 'start'
    | 'iteration'
    | 'task_complete'
    | 'task_failed'
    | 'gate_triggered'
    | 'gate_approved'
    | 'gate_blocked'
    | 'circuit_open'
    | 'circuit_close'
    | 'sync'
    | 'complete'
    | 'cancel'
    | 'error';
  details: Record<string, unknown>;
}

/**
 * @deprecated Session summary is no longer generated in simplified auto mode
 */
export interface SessionSummary {
  sessionId: string;
  startTime: string;
  endTime: string;
  duration: number;
  iterations: number;
  incrementsCompleted: number;
  incrementsFailed: number;
  totalTasks: number;
  totalTests: number;
  averageCoverage: number;
  humanGatesTriggered: number;
  circuitBreakerTrips: number;
  syncOperations: number;
  success: boolean;
  endReason: string;
}

/**
 * @deprecated Increment completion reports are no longer generated in simplified auto mode
 */
export interface IncrementCompletionReport {
  incrementId: string;
  sessionId: string;
  startTime: string;
  endTime: string;
  duration: number;
  tasksCompleted: number;
  tasksTotal: number;
  testsPassed: number;
  testsTotal: number;
  coveragePercent: number;
  humanGatesTriggered: number;
  humanGatesApproved: number;
  circuitBreakerTrips: number;
  syncOperations: number;
  success: boolean;
  endReason?: string;
}
