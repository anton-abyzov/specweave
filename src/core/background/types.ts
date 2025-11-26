/**
 * Background Jobs - Type Definitions
 *
 * Supports long-running operations (repo cloning, issue import)
 * that can run in background while user continues working.
 */

export type JobType = 'clone-repos' | 'import-issues' | 'sync-external';

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

export type JobConfig = CloneJobConfig | ImportJobConfig | SyncJobConfig;

export interface JobState {
  jobs: BackgroundJob[];
  activeJobId?: string;
}
