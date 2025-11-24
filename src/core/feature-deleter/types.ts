/**
 * Type definitions for Safe Feature Deletion Command
 * Increment: 0053-safe-feature-deletion
 * Feature: FS-052
 */

import { Logger } from '../../utils/logger.js';

/**
 * Options for feature deletion operation
 */
export interface DeletionOptions {
  /** Bypass active increment validation (force deletion) */
  force?: boolean;

  /** Preview deletion without executing (dry-run mode) */
  dryRun?: boolean;

  /** Skip git operations (use filesystem only) */
  noGit?: boolean;

  /** Skip GitHub issue cleanup */
  noGithub?: boolean;

  /** Skip confirmations (except elevated confirmation in force mode) */
  yes?: boolean;
}

/**
 * Result of feature deletion operation
 */
export interface DeletionResult {
  /** Whether deletion succeeded */
  success: boolean;

  /** Feature ID that was deleted */
  featureId: string;

  /** Number of files deleted */
  filesDeleted: number;

  /** Git commit SHA (if git operations executed) */
  commitSha?: string;

  /** Number of GitHub issues closed */
  githubIssuesClosed?: number;

  /** Increment IDs orphaned by force deletion */
  orphanedIncrements?: string[];

  /** Execution steps with checkpoints */
  steps?: CheckpointStep[];

  /** Errors encountered during deletion */
  errors?: string[];

  /** Warnings (non-blocking issues) */
  warnings?: string[];
}

/**
 * Checkpoint step for transaction tracking
 */
export interface CheckpointStep {
  /** Step name */
  name: string;

  /** Step status */
  status: 'pending' | 'in-progress' | 'completed' | 'failed';

  /** Timestamp (ISO 8601) */
  timestamp: string;

  /** Error message (if failed) */
  error?: string;
}

/**
 * Validation result for feature deletion
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Errors that block deletion */
  errors: string[];

  /** Warnings that don't block deletion */
  warnings?: string[];

  /** Feature ID being validated */
  featureId: string;

  /** All files to delete */
  files: string[];

  /** Living docs folder files */
  livingDocsFiles: string[];

  /** User story markdown files */
  userStoryFiles: string[];

  /** Active increments referencing feature (orphaned if force mode) */
  orphanedIncrements: string[];

  /** GitHub issues to close */
  githubIssues?: GitHubIssue[];

  /** Validation mode (safe or force) */
  mode: 'safe' | 'force';
}

/**
 * GitHub issue metadata
 */
export interface GitHubIssue {
  /** Issue number */
  number: number;

  /** Issue title */
  title: string;

  /** Issue URL */
  url: string;
}

/**
 * Audit log event for feature deletion
 */
export interface DeletionEvent {
  /** Feature ID deleted */
  featureId: string;

  /** Timestamp (ISO 8601) */
  timestamp: string;

  /** User who performed deletion */
  user: string;

  /** Deletion mode (safe or force) */
  mode: 'safe' | 'force';

  /** Number of files deleted */
  filesDeleted: number;

  /** Git commit SHA (if committed) */
  commitSha?: string;

  /** Orphaned increment IDs (if force mode) */
  orphanedIncrements?: string[];

  /** Number of GitHub issues closed */
  githubIssuesClosed?: number;

  /** Deletion status (success, partial, failed) */
  status: 'success' | 'partial' | 'failed';

  /** Errors encountered */
  errors?: string[];
}

/**
 * Constructor options for FeatureValidator
 */
export interface FeatureValidatorOptions {
  /** Project root directory */
  projectRoot?: string;

  /** Logger instance */
  logger?: Logger;
}

/**
 * Constructor options for FeatureDeleter
 */
export interface FeatureDeleterOptions {
  /** Project root directory */
  projectRoot?: string;

  /** Logger instance */
  logger?: Logger;
}

/**
 * Constructor options for DeletionTransaction
 */
export interface DeletionTransactionOptions {
  /** Project root directory */
  projectRoot: string;

  /** Logger instance */
  logger?: Logger;
}

/**
 * Constructor options for FeatureDeletionGitService
 */
export interface GitServiceOptions {
  /** Project root directory */
  projectRoot: string;

  /** Logger instance */
  logger?: Logger;
}

/**
 * Constructor options for FeatureDeletionGitHubService
 */
export interface GitHubServiceOptions {
  /** GitHub repository owner */
  owner: string;

  /** GitHub repository name */
  repo: string;

  /** Logger instance */
  logger?: Logger;
}

/**
 * Increment metadata structure
 */
export interface IncrementMetadata {
  /** Increment ID */
  id: string;

  /** Increment status */
  status: string;

  /** Feature ID (if linked) */
  feature_id?: string;

  /** Other metadata fields */
  [key: string]: unknown;
}
