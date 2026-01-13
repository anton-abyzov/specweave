/**
 * Auto Types (Simplified - Ralph Wiggum Pattern)
 *
 * Core principle: The increment's metadata.json status IS the state.
 * No complex session management needed.
 */

/**
 * Auto mode flag - the only state file needed
 * Stored at .specweave/state/auto-mode.json
 */
export interface AutoModeFlag {
  active: boolean;
  timestamp: string;
  incrementIds?: string[]; // Optional: specific increments to process
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
  // Legacy fields (still supported in config but not used by simplified auto mode)
  maxHours?: number;
  testCommand?: string;
  coverageThreshold?: number;
  enforceTestFirst?: boolean;
  warnOnParallelSession?: boolean;
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
  maxHours: 600,
  testCommand: 'npm test',
  coverageThreshold: 80,
  enforceTestFirst: false,
  warnOnParallelSession: true,
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
