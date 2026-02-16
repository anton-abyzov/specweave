// SSE event types
export type SSEEventType =
  | 'heartbeat'
  | 'increment-update'
  | 'analytics-event'
  | 'cost-update'
  | 'notification'
  | 'sync-update'
  | 'sync-audit'
  | 'error-detected'
  | 'config-changed'
  | 'activity'
  | 'command-output'
  | 'command-complete'
  | 'job-progress';

export interface SSEMessage {
  type: SSEEventType;
  data: unknown;
  timestamp: string;
}

// Overview
export interface OverviewPayload {
  project: {
    name?: string;
    totalIncrements: number;
    activeIncrements: number;
    completedIncrements: number;
    statusBreakdown: Record<string, number>;
    typeBreakdown: Record<string, number>;
    priorityBreakdown: Record<string, number>;
  };
  analytics: {
    totalEvents: number;
    successRate: number;
    last24hEvents: number;
  };
  costs: {
    totalCost: number;
    totalSavings: number;
    totalTokens: number;
    sessionCount: number;
  };
  notifications: {
    pendingCount: number;
    criticalCount: number;
  };
  sync: {
    platforms: Record<string, { lastImport: string; lastSyncResult: string }>;
  };
  generatedAt: string;
}

// Increments
export interface IncrementSummary {
  id: string;
  title: string;
  status: string;
  type: string;
  priority: string;
  project?: string;
  tasks: { total: number; completed: number };
  acs: { total: number; completed: number };
  createdAt: string;
  lastActivity: string;
}

export interface IncrementListPayload {
  increments: IncrementSummary[];
  summary: Record<string, number>;
}

export interface IncrementDetailPayload {
  id: string;
  metadata: Record<string, unknown>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    userStory?: string;
    satisfiesACs?: string[];
  }>;
  taskSummary: { total: number; completed: number; pending: number; inProgress: number };
  costs?: { totalCost: number; totalTokens: number; sessionCount: number };
}

// Sync
export interface SyncStatusPayload {
  platforms: Record<string, {
    lastImport: string;
    lastImportCount?: number;
    lastSkippedCount?: number;
    lastSyncResult?: string;
  }>;
  lastUpdated?: string;
}

// Activity stream
export interface ActivityEvent {
  timestamp: string;
  category: 'command' | 'sync' | 'hook' | 'error' | 'cost' | 'notification';
  severity: 'info' | 'warning' | 'error';
  title: string;
  detail?: string;
  source: string;
  metadata?: Record<string, unknown>;
}

// Command execution
export interface CommandExecution {
  id: string;
  command: string;
  args: string[];
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  output: string[];
  exitCode?: number;
}

// Session errors
export interface SessionSummary {
  sessionId: string;
  startTime: string;
  endTime?: string;
  messageCount: number;
  toolCallCount: number;
  errors: SessionError[];
  version: string;
  gitBranch: string;
}

export interface SessionError {
  timestamp: string;
  sessionId: string;
  type: 'prompt_too_long' | 'api_error' | 'tool_failure' | 'hook_error' | 'rate_limit' | 'unknown';
  message: string;
  context?: {
    toolName?: string;
    toolInput?: string;
    messageIndex?: number;
  };
}

export interface ErrorGroup {
  type: string;
  count: number;
  lastSeen: string;
  sessions: number;
  recentMessages: string[];
}

export interface PaginatedErrors {
  total: number;
  errors: SessionError[];
  offset: number;
  limit: number;
}

// Plugin info
export interface PluginInfo {
  name: string;
  version: string;
  skillCount: number;
  commandCount: number;
}

// Skill usage
export interface SkillUsage {
  name: string;
  plugin: string;
  count: number;
  successCount: number;
  failureCount: number;
  avgDuration?: number;
  lastUsed: string;
}

// LSP status
export interface LspStatus {
  checked: string;
  status: string;
  missing: Array<{
    language: string;
    type: string;
    binaryInstall: string;
    pluginInstall: string;
    plugin: string;
    message: string;
  }>;
  stats: {
    totalLanguages: number;
    checkedLanguages: number;
    binaryMissing: number;
    pluginMissing: number;
  };
}

// Repo info (single-repo and multi-repo support)
export interface RepoInfo {
  name: string;
  org: string;
  path: string;
  remote?: string;
  branch?: string;
  hasSpecweave: boolean;
  isCurrent?: boolean;
  lastModified?: string;
}

// Re-export CostsSummaryPayload for client access
export type { CostsSummaryPayload, SessionTokenSummary } from './server/data/cost-aggregator.js';

// Config (just use Record for flexibility)
export type ConfigPayload = Record<string, unknown>;

// Project info (multi-project support)
export interface ProjectInfo {
  id: string;          // URL-safe slug derived from path
  path: string;        // Absolute path to project root
  name: string;        // Project name from config or dir name
  hasSpecweave: boolean;
}

// Lock file for singleton instance
export interface DashboardLockFile {
  port: number;
  pid: number;
  startedAt: string;
  projects: string[];  // Array of project paths
}

// API response wrapper
export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

// Route handler type
export type RouteHandler = (
  req: import('http').IncomingMessage,
  res: import('http').ServerResponse,
  params: Record<string, string>,
) => Promise<void>;
