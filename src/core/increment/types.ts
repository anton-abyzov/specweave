/**
 * Types for increment discipline validation
 *
 * These types support the strict enforcement of increment discipline,
 * preventing multiple active increments and ensuring completion tracking.
 */

/**
 * Severity level for validation violations
 */
export type ViolationSeverity = 'error' | 'warning' | 'info';

/**
 * Type of validation violation detected
 */
export type ViolationType =
  | 'hard_cap_exceeded'          // More than 2 active increments
  | 'wip_limit_exceeded'         // More than maxActiveIncrements
  | 'incomplete_work'            // Increments not completed
  | 'emergency_violation'        // 2 active without hotfix/bug
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
  /** Whether the project is compliant with discipline rules */
  compliant: boolean;

  /** List of violations found (empty if compliant) */
  violations: ValidationViolation[];

  /** Summary of increment statuses */
  increments: {
    total: number;
    active: number;
    paused: number;
    completed: number;
    abandoned: number;
  };

  /** Configuration used for validation */
  config: {
    maxActiveIncrements: number;
    hardCap: number;
    allowEmergencyInterrupt: boolean;
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
  /** Recommended maximum active increments (default: 1) */
  maxActiveIncrements: number;

  /** Absolute maximum active increments (default: 2, never exceeded) */
  hardCap: number;

  /** Allow hotfix/bug to interrupt and create 2nd active (default: true) */
  allowEmergencyInterrupt: boolean;

  /** Type-specific behaviors */
  typeBehaviors?: {
    /** Types that can interrupt to create 2nd active */
    canInterrupt: string[];

    /** Auto-abandon after N days of inactivity */
    autoAbandonDays?: Record<string, number>;
  };
}
