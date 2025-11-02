/**
 * Type definitions for GitHub sync plugin
 */

export interface Task {
  id: string; // e.g., "T-001"
  title: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  estimate: string; // e.g., "2 hours"
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  githubIssue?: number; // GitHub issue number
  assignee?: string; // GitHub username (without @)
  description: string;
  subtasks?: Subtask[];
  filesToCreate?: string[];
  filesToModify?: string[];
  implementation?: string; // Code snippets
  acceptanceCriteria?: string[];
  dependencies?: string[]; // e.g., ["T-001", "T-002"]
  blocks?: string[]; // e.g., ["T-005", "T-006"]
  phase?: string; // e.g., "Phase 1: Foundation"
}

export interface Subtask {
  id: string; // e.g., "S-001-01"
  description: string;
  estimate: string; // e.g., "30min"
  completed: boolean;
}

export interface IncrementMetadata {
  id: string; // e.g., "0004-plugin-architecture"
  title: string;
  version?: string; // e.g., "0.4.0"
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'planning' | 'in-progress' | 'completed' | 'cancelled';
  github?: {
    milestone?: number; // GitHub milestone number
    epic_issue?: number; // Epic issue number
    task_issues?: Record<string, number>; // Task ID → GitHub issue number
    last_sync?: string; // ISO timestamp
  };
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  html_url: string;
  labels: string[];
  milestone?: {
    number: number;
    title: string;
  };
}

export interface GitHubMilestone {
  number: number;
  title: string;
  description: string;
  state: 'open' | 'closed';
}

export interface SyncResult {
  milestone?: GitHubMilestone;
  epic: GitHubIssue;
  tasks: Array<{
    taskId: string;
    issue: GitHubIssue;
  }>;
  errors: Array<{
    taskId?: string;
    error: string;
  }>;
}

export interface GitHubSyncOptions {
  force?: boolean; // Overwrite existing issues
  dryRun?: boolean; // Don't actually create issues
  batchDelay?: number; // Delay between batches (ms, default: 6000)
  batchSize?: number; // Issues per batch (default: 10)
  milestoneDays?: number; // Days until milestone due (default: 2 - SpecWeave AI velocity)
  projectName?: string; // Optional: Add issues to GitHub Project (e.g., "SpecWeave v0.4.0")
  fastMode?: boolean; // Skip rate limiting (for increments < 10 tasks)
}
