/**
 * Type definitions for GitHub sync plugin
 */
export interface Task {
    id: string;
    title: string;
    priority: 'P0' | 'P1' | 'P2' | 'P3';
    estimate: string;
    status: 'pending' | 'in_progress' | 'completed' | 'blocked';
    githubIssue?: number;
    assignee?: string;
    description: string;
    subtasks?: Subtask[];
    filesToCreate?: string[];
    filesToModify?: string[];
    implementation?: string;
    acceptanceCriteria?: string[];
    dependencies?: string[];
    blocks?: string[];
    phase?: string;
}
export interface Subtask {
    id: string;
    description: string;
    estimate: string;
    completed: boolean;
}
export interface IncrementMetadata {
    id: string;
    title: string;
    version?: string;
    priority: 'P0' | 'P1' | 'P2' | 'P3';
    status: 'planning' | 'in-progress' | 'completed' | 'cancelled';
    github?: {
        milestone?: number;
        epic_issue?: number;
        task_issues?: Record<string, number>;
        last_sync?: string;
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
    force?: boolean;
    dryRun?: boolean;
    batchDelay?: number;
    batchSize?: number;
    milestoneDays?: number;
    projectName?: string;
    fastMode?: boolean;
}
//# sourceMappingURL=types.d.ts.map