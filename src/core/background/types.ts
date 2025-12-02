/**
 * Background Jobs - Type Definitions
 *
 * Supports long-running operations (repo cloning, issue import)
 * that can run in background while user continues working.
 */

export type JobType = 'clone-repos' | 'import-issues' | 'sync-external' | 'brownfield-analysis';

export type JobStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';

export interface JobProgress {
  current: number;
  total: number;
  percentage: number;
  currentItem?: string;        // e.g., "sw-meeting-cost-be" or "PROJ-123"
  itemsCompleted: string[];    // List of completed items
  itemsFailed: string[];       // List of failed items
  rate?: number;               // items per second
  eta?: number;                // seconds remaining
}

export interface BackgroundJob {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: JobProgress;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
  config: JobConfig;
  /** Job-specific result data (available after completion) */
  result?: Record<string, unknown>;
}

export interface CloneJobConfig {
  type: 'clone-repos';
  repositories: Array<{
    owner: string;
    name: string;
    path: string;
  }>;
  projectPath: string;
}

export interface ImportJobConfig {
  type: 'import-issues';
  provider: 'github' | 'jira' | 'ado';
  repositories?: string[];     // For GitHub multi-repo
  projectKey?: string;         // For JIRA
  timeRangeMonths: number;
  projectPath: string;
}

export interface SyncJobConfig {
  type: 'sync-external';
  provider: 'github' | 'jira' | 'ado';
  direction: 'import' | 'export' | 'bidirectional';
  profileId: string;
  projectPath: string;
}

/**
 * Brownfield analysis phases
 */
export type BrownfieldPhase =
  | 'discovery'           // Find all code/doc files
  | 'code-analysis'       // Extract signatures, APIs
  | 'doc-matching'        // Match code to docs
  | 'discrepancy-detect'  // Find gaps
  | 'reporting';          // Generate summary

/**
 * Brownfield analysis job configuration
 */
export interface BrownfieldJobConfig {
  type: 'brownfield-analysis';
  projectPath: string;
  sourceDocsPath?: string;
  analysisDepth: 'quick' | 'standard' | 'deep';

  /** Checkpoint for pause/resume */
  checkpoint?: {
    phase: BrownfieldPhase;
    lastProcessedPath: string;
    processedCount: number;
  };
}

export type JobConfig = CloneJobConfig | ImportJobConfig | SyncJobConfig | BrownfieldJobConfig;

export interface JobState {
  jobs: BackgroundJob[];
  activeJobId?: string;
}
