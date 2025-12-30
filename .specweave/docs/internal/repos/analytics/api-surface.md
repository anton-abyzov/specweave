# Analytics API Surface

## Exports

### From `src/core/analytics/index.ts`

```typescript
// Classes
export { AnalyticsCollector } from './analytics-collector.js';
export { AnalyticsAggregator } from './analytics-aggregator.js';

// Convenience functions
export { trackCommand, trackSkill, trackAgent } from './analytics-collector.js';

// Types
export type {
  AnalyticsEvent,
  AnalyticsEventType,
  UsageCount,
  DailySummary,
  AnalyticsSummary,
  AnalyticsQueryOptions,
  AnalyticsConfig,
} from './types.js';
```

## AnalyticsCollector API

```typescript
class AnalyticsCollector {
  // Singleton
  static getInstance(projectRoot?: string): AnalyticsCollector;
  static reset(): void;  // For testing

  // Tracking
  trackCommand(name: string, options?: TrackOptions): void;
  trackSkill(name: string, options?: TrackOptions): void;
  trackAgent(name: string, options?: TrackOptions): void;

  // Reading
  readEvents(): AnalyticsEvent[];
  readEventsFiltered(filter: EventFilter): AnalyticsEvent[];

  // Control
  enable(): void;
  disable(): void;

  // Utilities
  getAnalyticsDir(): string;
}

interface TrackOptions {
  plugin?: string;
  increment?: string;
  duration?: number;
  success?: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

interface EventFilter {
  since?: string;
  until?: string;
  type?: AnalyticsEventType;
  plugin?: string;
}
```

## AnalyticsAggregator API

```typescript
class AnalyticsAggregator {
  constructor(projectRoot?: string);

  // Summary
  getSummary(options?: AnalyticsQueryOptions): AnalyticsSummary;
  getSummaryWithCache(options?: AnalyticsQueryOptions): AnalyticsSummary;

  // Export
  export(format: 'json' | 'csv', options?: AnalyticsQueryOptions): {
    filename: string;
    content: string;
  };

  // Caching
  getCachedSummary(): AnalyticsSummary | null;
  cacheSummary(summary: AnalyticsSummary): void;

  // Daily rollup
  generateDailySummary(): void;
}
```

## CLI Command

`src/cli/commands/analytics.ts`

```typescript
interface AnalyticsCommandOptions {
  since?: string;     // ISO date
  until?: string;     // ISO date
  export?: 'json' | 'csv';
  limit?: number;     // Default: 10
  type?: 'command' | 'skill' | 'agent';
  plugin?: string;
}

async function analyticsCommand(options?: AnalyticsCommandOptions): Promise<void>;
```

## Script Integration

### `plugins/specweave/scripts/track-analytics.sh`

```bash
# Usage: track-analytics.sh <type> <name> [--plugin <plugin>] [--increment <id>]
bash track-analytics.sh command "/sw:do" --plugin specweave --increment 0149
bash track-analytics.sh skill "planner" --plugin specweave
bash track-analytics.sh agent "architect"
```

### `plugins/specweave/scripts/read-analytics.sh`

```bash
# Usage: read-analytics.sh [--since <date>] [--export json|csv]
bash read-analytics.sh                    # Dashboard
bash read-analytics.sh --export json      # Export JSON
bash read-analytics.sh --since 2025-01-01 # Filter by date
```
