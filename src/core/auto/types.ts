/**
 * Auto Types
 * Core type definitions for the autonomous execution engine
 */

export type AutoSessionStatus = 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerStatus {
  state: CircuitBreakerState;
  failures: number;
  lastFailure?: string;
  lastSuccess?: string;
  nextRetry?: string;
}

export interface HumanGateStatus {
  pending: HumanGateRequest | null;
  approved: string[];
  blocked: string[];
}

export interface HumanGateRequest {
  id: string;
  operation: string;
  pattern: string;
  requestedAt: string;
  timeout: number;
  context?: string;
}

/**
 * Completion condition types for auto mode
 * Determines when auto mode can complete
 */
export type CompletionConditionType =
  | 'build'          // Build must pass
  | 'tests'          // Tests must pass (unit + integration)
  | 'e2e'            // E2E tests must pass
  | 'integration'    // Integration tests must pass (API endpoints, service-to-service)
  | 'lint'           // Linting must pass
  | 'types'          // Type-checking must pass
  | 'coverage'       // Code coverage must meet threshold
  | 'e2e-coverage'   // E2E coverage must meet threshold
  | 'command';       // Custom command must pass

export interface CompletionCondition {
  type: CompletionConditionType;
  threshold?: number;      // For coverage conditions (percentage)
  cmd?: string;            // For custom command conditions
  autoHeal?: boolean;      // Auto-fix and retry on failure (default: true for build/lint, false for tests)
  maxRetries?: number;     // Max retry attempts for auto-heal (default: 3)
  mandatory?: boolean;     // Condition cannot be removed by user (project-type specific)
  framework?: string;      // Detected framework (npm, pytest, go, cargo, etc.)
  detectedCommand?: string; // Auto-detected command to run
}

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
  humanGates: HumanGateStatus;
  circuitBreakers: Record<string, CircuitBreakerStatus>;
  lastActivity: string;
  endReason?: string;
  simple?: boolean; // Pure Ralph mode - no session state, queues, circuit breakers
  completionConditions?: CompletionCondition[]; // Conditions that must be met before auto mode can complete
  tddMode?: boolean; // Legacy TDD flag (equivalent to --tests flag)
}

export interface AutoConfig {
  enabled: boolean;
  maxIterations: number;
  maxHours?: number;
  testCommand: string;
  coverageThreshold: number;
  enforceTestFirst: boolean;
  humanGated: {
    patterns: string[];
    timeout: number;
    neverAutoApprove: string[];
  };
  circuitBreakers: {
    failureThreshold: number;
    resetTimeout: number;
  };
  sync: {
    batchInterval: number;
    forceOnComplete: boolean;
  };
  warnOnParallelSession: boolean;
}

export interface AutoLogEntry {
  timestamp: string;
  iteration: number;
  sessionId: string;
  event: 'start' | 'iteration' | 'task_complete' | 'task_failed' | 'gate_triggered' | 'gate_approved' | 'gate_blocked' | 'circuit_open' | 'circuit_close' | 'sync' | 'complete' | 'cancel' | 'error';
  details: Record<string, unknown>;
}

export interface TaskCompletionResult {
  taskId: string;
  success: boolean;
  duration: number;
  testsRun?: number;
  testsPassed?: number;
  coveragePercent?: number;
  filesModified?: string[];
  linesAdded?: number;
  linesRemoved?: number;
  error?: string;
}

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

export const DEFAULT_AUTO_CONFIG: AutoConfig = {
  enabled: true,
  maxIterations: 500,
  maxHours: 120,
  testCommand: 'npm test',
  coverageThreshold: 80,
  enforceTestFirst: false,
  humanGated: {
    patterns: ['deploy', 'migrate', 'publish', 'push --force', 'rm -rf', 'API_KEY', 'SECRET'],
    timeout: 1800, // 30 minutes
    neverAutoApprove: ['push --force', 'rm -rf /', 'production deploy'],
  },
  circuitBreakers: {
    failureThreshold: 3,
    resetTimeout: 300, // 5 minutes
  },
  sync: {
    batchInterval: 300, // 5 minutes
    forceOnComplete: true,
  },
  warnOnParallelSession: true,
};
