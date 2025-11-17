/**
 * Type definitions for /specweave:plan command
 *
 * Based on ADR-0046: Plan Command Architecture
 * Part of increment 0039: Ultra-Smart Next Command
 */

import { IncrementStatus } from '../../../core/types/increment-metadata.js';

/**
 * Configuration for plan command execution
 */
export interface PlanCommandConfig {
  /** Target increment ID (optional - auto-detected if not provided) */
  incrementId?: string;

  /** Force regeneration even if plan.md/tasks.md exist */
  force?: boolean;

  /** Preserve existing task completion status */
  preserveTaskStatus?: boolean;

  /** Verbose output for debugging */
  verbose?: boolean;
}

/**
 * Result of increment detection
 */
export interface IncrementDetectionResult {
  /** Whether detection was successful */
  success: boolean;

  /** Detected increment ID (if found) */
  incrementId?: string;

  /** Reason for detection result */
  reason: string;

  /** All candidates considered during detection */
  candidates?: string[];
}

/**
 * Result of plan validation
 */
export interface PlanValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Validation errors (if any) */
  errors: PlanValidationError[];

  /** Validation warnings (non-blocking) */
  warnings: PlanValidationWarning[];
}

/**
 * Validation error (blocks execution)
 */
export interface PlanValidationError {
  /** Error code */
  code: PlanErrorCode;

  /** Human-readable error message */
  message: string;

  /** Suggested fix (optional) */
  suggestion?: string;
}

/**
 * Validation warning (non-blocking)
 */
export interface PlanValidationWarning {
  /** Warning code */
  code: PlanWarningCode;

  /** Human-readable warning message */
  message: string;
}

/**
 * Error codes for plan command
 */
export enum PlanErrorCode {
  // Detection errors
  NO_ACTIVE_INCREMENT = 'NO_ACTIVE_INCREMENT',
  MULTIPLE_ACTIVE_INCREMENTS = 'MULTIPLE_ACTIVE_INCREMENTS',
  INCREMENT_NOT_FOUND = 'INCREMENT_NOT_FOUND',

  // Validation errors
  SPEC_NOT_FOUND = 'SPEC_NOT_FOUND',
  SPEC_EMPTY = 'SPEC_EMPTY',
  INVALID_INCREMENT_STATUS = 'INVALID_INCREMENT_STATUS',
  PLAN_ALREADY_EXISTS = 'PLAN_ALREADY_EXISTS',
  TASKS_ALREADY_EXIST = 'TASKS_ALREADY_EXIST',

  // Agent errors
  ARCHITECT_AGENT_FAILED = 'ARCHITECT_AGENT_FAILED',
  TASK_GENERATOR_FAILED = 'TASK_GENERATOR_FAILED',

  // File system errors
  FILE_WRITE_FAILED = 'FILE_WRITE_FAILED',
  METADATA_UPDATE_FAILED = 'METADATA_UPDATE_FAILED',

  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Warning codes for plan command
 */
export enum PlanWarningCode {
  SPEC_TOO_SHORT = 'SPEC_TOO_SHORT',
  SPEC_TOO_LONG = 'SPEC_TOO_LONG',
  NO_ACCEPTANCE_CRITERIA = 'NO_ACCEPTANCE_CRITERIA',
  OVERWRITING_EXISTING_PLAN = 'OVERWRITING_EXISTING_PLAN',
  OVERWRITING_EXISTING_TASKS = 'OVERWRITING_EXISTING_TASKS'
}

/**
 * Result of Architect Agent invocation
 */
export interface ArchitectAgentResult {
  /** Whether invocation was successful */
  success: boolean;

  /** Generated plan.md content */
  planContent?: string;

  /** Error message (if failed) */
  error?: string;

  /** Agent execution time (ms) */
  executionTime?: number;
}

/**
 * Result of Task Generator invocation
 */
export interface TaskGeneratorResult {
  /** Whether invocation was successful */
  success: boolean;

  /** Generated tasks.md content */
  tasksContent?: string;

  /** Error message (if failed) */
  error?: string;

  /** Agent execution time (ms) */
  executionTime?: number;
}

/**
 * Complete result of plan command execution
 */
export interface PlanCommandResult {
  /** Whether command succeeded */
  success: boolean;

  /** Target increment ID */
  incrementId: string;

  /** Files created/updated */
  filesCreated: string[];

  /** Status transition (if any) */
  statusTransition?: {
    from: IncrementStatus;
    to: IncrementStatus;
  };

  /** Error (if failed) */
  error?: PlanValidationError;

  /** Warnings (non-blocking) */
  warnings: PlanValidationWarning[];

  /** Total execution time (ms) */
  executionTime: number;
}

/**
 * Internal pipeline context (passed between components)
 */
export interface PlanPipelineContext {
  /** Configuration */
  config: PlanCommandConfig;

  /** Target increment ID */
  incrementId: string;

  /** Increment directory path */
  incrementPath: string;

  /** spec.md content */
  specContent: string;

  /** Existing plan.md content (if any) */
  existingPlanContent?: string;

  /** Existing tasks.md content (if any) */
  existingTasksContent?: string;

  /** Generated plan.md content */
  generatedPlanContent?: string;

  /** Generated tasks.md content */
  generatedTasksContent?: string;

  /** Validation result */
  validationResult?: PlanValidationResult;

  /** Start timestamp */
  startTime: number;

  /** Errors accumulated during execution */
  errors: PlanValidationError[];

  /** Warnings accumulated during execution */
  warnings: PlanValidationWarning[];
}
