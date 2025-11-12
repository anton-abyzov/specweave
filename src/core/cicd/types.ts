/**
 * CI/CD Monitoring Type Definitions
 *
 * Core types for GitHub Actions workflow monitoring, failure detection,
 * and state management.
 */

/**
 * GitHub Actions workflow run status
 */
export type WorkflowStatus =
  | 'queued'
  | 'in_progress'
  | 'completed';

/**
 * GitHub Actions workflow run conclusion
 */
export type WorkflowConclusion =
  | 'success'
  | 'failure'
  | 'cancelled'
  | 'skipped'
  | 'timed_out'
  | 'action_required'
  | 'neutral';

/**
 * Workflow run metadata from GitHub API
 */
export interface WorkflowRun {
  /** Unique run ID */
  id: number;

  /** Workflow name (e.g., "CI", "Deploy") */
  name: string;

  /** Run number (sequential per workflow) */
  run_number: number;

  /** Git commit SHA */
  head_sha: string;

  /** Branch name */
  head_branch: string;

  /** Run status */
  status: WorkflowStatus;

  /** Run conclusion (only when status=completed) */
  conclusion: WorkflowConclusion | null;

  /** ISO 8601 timestamp */
  created_at: string;

  /** ISO 8601 timestamp */
  updated_at: string;

  /** HTML URL to view run */
  html_url: string;

  /** GitHub repository (owner/repo) */
  repository: string;
}

/**
 * Failure record stored in state
 */
export interface FailureRecord {
  /** Workflow run ID */
  runId: number;

  /** Workflow name */
  workflowName: string;

  /** Git commit SHA */
  commitSha: string;

  /** Branch name */
  branch: string;

  /** Failure timestamp */
  detectedAt: string;

  /** Processing status */
  processed: boolean;

  /** Analysis status */
  analyzed: boolean;

  /** Fix applied status */
  fixed: boolean;

  /** GitHub URL */
  url: string;
}

/**
 * CI/CD monitor state
 */
export interface CICDMonitorState {
  /** Last poll timestamp (ISO 8601) */
  lastPoll: string | null;

  /** Failure records (keyed by run ID) */
  failures: Record<number, FailureRecord>;

  /** Total failures detected */
  totalFailures: number;

  /** Total failures processed */
  totalProcessed: number;

  /** Total failures fixed */
  totalFixed: number;

  /** Monitor version (for migrations) */
  version: string;
}

/**
 * State manager interface
 */
export interface IStateManager {
  /**
   * Load state from disk
   */
  loadState(): Promise<CICDMonitorState>;

  /**
   * Save state to disk
   */
  saveState(state: CICDMonitorState): Promise<void>;

  /**
   * Mark failure as processed (deduplication)
   */
  markProcessed(runId: number): Promise<void>;

  /**
   * Get last poll timestamp
   */
  getLastPoll(): Promise<string | null>;

  /**
   * Update last poll timestamp
   */
  updateLastPoll(): Promise<void>;

  /**
   * Add failure record
   */
  addFailure(failure: FailureRecord): Promise<void>;

  /**
   * Get all unprocessed failures
   */
  getUnprocessedFailures(): Promise<FailureRecord[]>;
}

/**
 * Default empty state
 */
export const DEFAULT_STATE: CICDMonitorState = {
  lastPoll: null,
  failures: {},
  totalFailures: 0,
  totalProcessed: 0,
  totalFixed: 0,
  version: '1.0.0'
};
