/**
 * Types for increment discipline validation
 *
 * 2.0: WIP limits are advisory. There is no hard cap.
 */

/**
 * Severity level for validation violations
 */
export type ViolationSeverity = 'error' | 'warning' | 'info';

/**
 * Type of validation violation detected
 */
export type ViolationType =
  | 'wip_limit_exceeded'         // More active increments than limits.activeIncrements (info)
  | 'incomplete_work'            // Increments not completed
  | 'metadata_inconsistency'     // metadata.json vs reality mismatch
  | 'github_sync_failed';        // GitHub issue not closed

/**
 * A single validation violation with details
 */
export interface ValidationViolation {
  /** Type of violation */
  type: ViolationType;

  /** Human-readable error message */
  message: string;

  /** Suggested fix or action */
  suggestion: string;

  /** Severity level */
  severity: ViolationSeverity;

  /** Affected increment ID (if applicable) */
  incrementId?: string;

  /** Additional context data */
  context?: Record<string, any>;
}

/**
 * Result of discipline validation check
 */
export interface ValidationResult {
  /** False only when an error-severity violation exists */
  compliant: boolean;

  /** Violations and advisory notes found */
  violations: ValidationViolation[];

  /** Summary of increment statuses */
  increments: {
    total: number;
    active: number;
    backlog: number;
    paused: number;
    completed: number;
    abandoned: number;
  };

  /** Configuration used for validation */
  config: {
    activeIncrements: number;
  };

  /** Timestamp when check was performed */
  timestamp: string;
}

/**
 * Options for discipline check command
 */
export interface DisciplineCheckOptions {
  /** Show detailed increment information */
  verbose?: boolean;

  /** Output results as JSON */
  json?: boolean;

  /** Attempt to auto-fix violations (future feature) */
  fix?: boolean;

  /** Project root directory */
  projectRoot?: string;
}

/**
 * Configuration for increment discipline limits
 */
export interface DisciplineLimits {
  /** Advisory maximum active increments (default: 3, 0 = off) */
  activeIncrements: number;
}
