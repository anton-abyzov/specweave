# Analytics Module

## Overview

The analytics module provides usage tracking for SpecWeave commands, skills, and agents. It enables developers and users to understand usage patterns, identify frequently-used features, and export analytics data.

## Location

`src/core/analytics/`

## Key Components

### AnalyticsCollector

Singleton class that tracks events and writes to JSONL storage.

```typescript
import { AnalyticsCollector, trackCommand, trackSkill, trackAgent } from './core/analytics';

// Using singleton
const collector = AnalyticsCollector.getInstance();
collector.trackCommand('/sw:do', { duration: 150, success: true });

// Or convenience functions
trackCommand('/sw:progress');
trackSkill('planner', { plugin: 'specweave' });
trackAgent('architect', { plugin: 'specweave', increment: '0149' });
```

### AnalyticsAggregator

Aggregates raw events into summaries, top lists, and daily breakdowns.

```typescript
import { AnalyticsAggregator } from './core/analytics';

const aggregator = new AnalyticsAggregator();
const summary = aggregator.getSummary({ limit: 10, since: '2025-01-01' });

// Export
const { filename, content } = aggregator.export('json');
```

## Storage

```
.specweave/state/analytics/
├── events.jsonl          # Append-only event log
├── daily-summary.json    # Rolled-up daily stats
├── cache.json            # Pre-computed aggregations
└── exports/              # User-requested exports
```

## Event Schema

```typescript
interface AnalyticsEvent {
  timestamp: string;      // ISO 8601
  type: 'command' | 'skill' | 'agent';
  name: string;
  plugin?: string;
  increment?: string;
  duration?: number;      // ms
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}
```

## CLI Command

```bash
/sw:analytics              # Show dashboard
/sw:analytics --export json
/sw:analytics --since 2025-01-01
/sw:analytics --type command --limit 20
```

## Hook Integration

Commands are tracked automatically via `user-prompt-submit.sh` hook when any `/sw:*` command is invoked.

## Performance

- Event tracking: <10ms (non-blocking background write)
- Dashboard: <50ms (uses bash script delegation)
- Log rotation: Automatic when events.jsonl > 10MB
