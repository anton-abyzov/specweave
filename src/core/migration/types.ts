/**
 * Migration Types for Umbrella Migration Tool
 *
 * Defines types for converting single-repo SpecWeave projects
 * to umbrella/multi-repo structure.
 *
 * @module core/migration/types
 */

/**
 * Detected single-repo project eligible for migration
 */
export interface MigrationCandidate {
  /** Absolute path to the project root */
  projectRoot: string;
  /** Path to .specweave/config.json */
  configPath: string;
  /** GitHub organization or user name */
  orgName: string;
  /** Repository name (from config or directory name) */
  repoName: string;
  /** Whether CLAUDE.md exists at project root */
  hasClaudeMd: boolean;
  /** Whether AGENTS.md exists at project root */
  hasAgentsMd: boolean;
  /** Whether docs-site/ exists at project root */
  hasDocsSite: boolean;
}

/**
 * Types of migration operations
 */
export type MigrationStepType =
  | 'create-dir'
  | 'move'
  | 'copy'
  | 'update-config'
  | 'create-file';

/**
 * Single operation in the migration plan
 */
export interface MigrationStep {
  /** Operation type */
  type: MigrationStepType;
  /** Source path (for move/copy operations) */
  source?: string;
  /** Destination path */
  destination: string;
  /** Human-readable description */
  description: string;
}

/**
 * Ordered list of operations to execute
 */
export interface MigrationPlan {
  /** The candidate being migrated */
  candidate: MigrationCandidate;
  /** Ordered steps to execute */
  steps: MigrationStep[];
  /** Target umbrella directory path */
  umbrellaPath: string;
  /** Umbrella directory name */
  umbrellaName: string;
}

/**
 * Result of a migration execution
 */
export interface MigrationResult {
  /** Whether migration succeeded */
  success: boolean;
  /** Number of steps completed */
  stepsCompleted: number;
  /** Total number of steps */
  stepsTotal: number;
  /** Path to backup directory */
  backupPath?: string;
  /** Error messages (if any) */
  errors: string[];
  /** Path to the created umbrella directory */
  umbrellaPath?: string;
}

/**
 * Options for the migration command
 */
export interface MigrationOptions {
  /** Custom umbrella directory name */
  umbrellaName?: string;
  /** Custom umbrella directory path (absolute) */
  umbrellaPath?: string;
  /** GitHub organization name */
  orgName?: string;
  /** Execute the migration (false = dry-run) */
  execute?: boolean;
  /** Rollback a previous migration */
  rollback?: boolean;
  /** Skip confirmation prompts */
  yes?: boolean;
  /** Add a new repo to existing umbrella */
  addRepo?: string;
}

/**
 * Result of adding a new repo to an umbrella
 */
export interface AddRepoResult {
  /** Whether the repo was created/cloned successfully */
  success: boolean;
  /** Repository name */
  repoName: string;
  /** Path where repo was created */
  repoPath: string;
  /** Whether gh CLI was used */
  usedGhCli: boolean;
  /** Error message if failed */
  error?: string;
}
