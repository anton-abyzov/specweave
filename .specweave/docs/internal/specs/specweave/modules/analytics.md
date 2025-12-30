# Analytics Module

**Location**: `src/core/analytics/`
**Last Updated**: 2025-12-30
**Status**: Active

## Overview

The Analytics module provides usage tracking and reporting for SpecWeave. It tracks command invocations, skill activations, and agent spawns to help users understand their workflow patterns and framework utilization.

## Architecture

```
src/core/analytics/
  index.ts              # Module exports
  types.ts              # Type definitions
  analytics-collector.ts # Singleton event collector
  analytics-aggregator.ts # Aggregation and summaries
```

## Key Components

### AnalyticsCollector

Singleton class for collecting and storing usage analytics events.

**Features**:
- Append-only JSONL storage for durability
- Automatic log rotation when file exceeds threshold
- Event retention with configurable days
- Silent failure (never breaks main workflow)

**Storage Location**: `.specweave/state/analytics/events.jsonl`

**Public API**:
```typescript
// Singleton access
AnalyticsCollector.getInstance(projectRoot?: string): AnalyticsCollector

// Track events
trackCommand(name: string, options?: TrackOptions): void
trackSkill(name: string, options?: TrackOptions): void
trackAgent(name: string, options?: TrackOptions): void
track(event: Omit<AnalyticsEvent, 'timestamp'>): void

// Read events
readEvents(): AnalyticsEvent[]
readEventsFiltered(options: FilterOptions): AnalyticsEvent[]

// Control
enable(): void
disable(): void
isEnabled(): boolean
```

### AnalyticsAggregator

Aggregates raw events into summaries with caching support.

**Features**:
- Top commands/skills/agents by usage count
- Daily summaries with unique counts
- Success rate calculations
- JSON and CSV export

**Caching**:
- 5-minute TTL for default queries
- Cache stored in `.specweave/state/analytics/cache.json`
- Filtered queries bypass cache

**Public API**:
```typescript
getSummary(options?: AnalyticsQueryOptions): AnalyticsSummary
getSummaryWithCache(options?: AnalyticsQueryOptions): AnalyticsSummary
export(format: 'json' | 'csv', options?: AnalyticsQueryOptions): { filename: string; content: string }
generateDailySummary(): void
```

## Type Definitions

### AnalyticsEvent

```typescript
interface AnalyticsEvent {
  timestamp: string;          // ISO 8601
  type: 'command' | 'skill' | 'agent';
  name: string;               // Command/skill/agent name
  plugin?: string;            // Source plugin
  increment?: string;         // Current increment context
  duration?: number;          // Execution duration (ms)
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}
```

### AnalyticsSummary

```typescript
interface AnalyticsSummary {
  generatedAt: string;
  since: string;
  until: string;
  totalEvents: number;
  topCommands: UsageCount[];
  topSkills: UsageCount[];
  topAgents: UsageCount[];
  dailySummaries: DailySummary[];
  successRate: number;
}
```

### UsageCount

```typescript
interface UsageCount {
  name: string;
  count: number;
  successCount: number;
  failureCount: number;
  avgDuration?: number;
  plugin?: string;
  lastUsed: string;
}
```

## Configuration

```typescript
interface AnalyticsConfig {
  maxLogSizeBytes: number;    // Default: 10MB
  retentionDays: number;      // Default: 30
  enabled: boolean;           // Default: true
}
```

## Data Flow

```
User Action (command/skill/agent)
        |
        v
AnalyticsCollector.track()
        |
        v
Append to events.jsonl (JSONL format)
        |
        v (if size > threshold)
Log Rotation -> Archive old events
        |
        v (on query)
AnalyticsAggregator.getSummary()
        |
        v
Aggregate -> Cache -> Return Summary
```

## Log Rotation

When `events.jsonl` exceeds `maxLogSizeBytes`:
1. Read all events
2. Filter by retention window (`retentionDays`)
3. Archive old events to `archive/events-YYYY-MM-DD.jsonl`
4. Write recent events back to `events.jsonl`

## Integration Points

### With Hooks
Analytics tracking can be integrated into command hooks to automatically track all framework operations.

### With CLI Commands
The `/sw:analytics` command (if implemented) would use the aggregator to display usage statistics.

### With External Reporting
Export functionality supports integration with external analytics platforms via JSON/CSV export.

## Error Handling

**Principle**: Analytics should NEVER break the main workflow.

- All operations wrapped in try-catch
- Silent failures (no errors thrown to caller)
- Graceful degradation if storage unavailable

## Testing

Test files: `tests/unit/core/analytics/*.test.ts`

Key test scenarios:
- Event tracking and storage
- Log rotation at threshold
- Aggregation accuracy
- Cache invalidation
- Export format correctness

## Future Enhancements

- [ ] Real-time analytics dashboard
- [ ] Webhook notifications for usage milestones
- [ ] Plugin-specific analytics views
- [ ] Trend analysis and predictions
- [ ] Privacy controls for team usage

## Related Documentation

- [Auto Module](./auto.md) - Uses analytics for session reporting
- [Hooks System](../architecture/hooks.md) - Integration point
- [Configuration](../configuration.md) - Global config options
