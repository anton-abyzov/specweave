/**
 * Analytics Types
 *
 * Type definitions for the SpecWeave usage analytics system.
 * Tracks command invocations, skill activations, and agent spawns.
 */

/**
 * Type of analytics event
 */
export type AnalyticsEventType = 'command' | 'skill' | 'agent';

/**
 * Individual analytics event
 */
export interface AnalyticsEvent {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Type of event */
  type: AnalyticsEventType;
  /** Command, skill, or agent name */
  name: string;
  /** Source plugin (e.g., 'specweave', 'specweave-github') */
  plugin?: string;
  /** Current increment context if available */
  increment?: string;
  /** Execution duration in milliseconds */
  duration?: number;
  /** Whether the execution succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Aggregated count for a single item
 */
export interface UsageCount {
  /** Item name */
  name: string;
  /** Total invocation count */
  count: number;
  /** Success count */
  successCount: number;
  /** Failure count */
  failureCount: number;
  /** Average duration in ms */
  avgDuration?: number;
  /** Source plugin */
  plugin?: string;
  /** Last used timestamp */
  lastUsed: string;
}

/**
 * Daily summary of usage
 */
export interface DailySummary {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Total events */
  totalEvents: number;
  /** Command invocations */
  commands: number;
  /** Skill activations */
  skills: number;
  /** Agent spawns */
  agents: number;
  /** Unique commands used */
  uniqueCommands: number;
  /** Unique skills used */
  uniqueSkills: number;
  /** Unique agents used */
  uniqueAgents: number;
}

/**
 * Complete analytics summary
 */
export interface AnalyticsSummary {
  /** When this summary was generated */
  generatedAt: string;
  /** Date range start */
  since: string;
  /** Date range end */
  until: string;
  /** Total events in range */
  totalEvents: number;
  /** Top commands by usage */
  topCommands: UsageCount[];
  /** Top skills by activation */
  topSkills: UsageCount[];
  /** Top agents by spawn count */
  topAgents: UsageCount[];
  /** Daily breakdown */
  dailySummaries: DailySummary[];
  /** Overall success rate */
  successRate: number;
}

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'csv';

/**
 * Analytics query options
 */
export interface AnalyticsQueryOptions {
  /** Start date (ISO 8601 or YYYY-MM-DD) */
  since?: string;
  /** End date (ISO 8601 or YYYY-MM-DD) */
  until?: string;
  /** Filter by event type */
  type?: AnalyticsEventType;
  /** Filter by plugin */
  plugin?: string;
  /** Maximum results for top lists */
  limit?: number;
}

/**
 * Configuration for analytics storage
 */
export interface AnalyticsConfig {
  /** Maximum events.jsonl size in bytes before rotation (default: 10MB) */
  maxLogSizeBytes: number;
  /** Days to keep in events.jsonl after rotation (default: 30) */
  retentionDays: number;
  /** Whether analytics collection is enabled */
  enabled: boolean;
}

/**
 * Default analytics configuration
 */
export const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = {
  maxLogSizeBytes: 10 * 1024 * 1024, // 10MB
  retentionDays: 30,
  enabled: true,
};
