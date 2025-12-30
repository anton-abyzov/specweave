# 0220 - Analytics Module Architecture

**Date**: 2025-12-30
**Status**: Accepted
**Context**: SpecWeave v1.0.58

## Decision

Implement a usage analytics module to track command invocations, skill activations, and agent spawns across the SpecWeave framework.

## Context

As SpecWeave adoption grows, there is no visibility into:
- Which commands are most used
- Which skills provide the most value
- Which agents are spawned most frequently
- Overall framework utilization patterns

This data is essential for:
- Prioritizing feature development
- Identifying underused features
- Understanding workflow patterns
- Optimizing performance bottlenecks

## Architecture

### Storage Model: Append-Only JSONL

**Decision**: Use JSONL (JSON Lines) format for event storage.

**Rationale**:
- Append-only writes prevent data corruption
- Easy to parse and stream
- Human-readable for debugging
- Natural log rotation boundaries
- No database dependencies

**Alternatives Considered**:
- SQLite: Rejected due to added dependency and complexity
- Plain JSON: Rejected due to corruption risk on append
- Binary format: Rejected due to debugging difficulty

### Singleton Pattern

**Decision**: Use singleton for AnalyticsCollector.

**Rationale**:
- Single write stream prevents file contention
- Consistent state across the application
- Easy initialization from any module

**Trade-offs**:
- Harder to test (requires reset mechanism)
- Global state can be fragile

### Silent Failure Design

**Decision**: Analytics operations never throw exceptions.

**Rationale**:
- Analytics is secondary to core functionality
- User workflow should never be blocked by analytics
- Graceful degradation preferred

**Implementation**:
```typescript
try {
  appendEvent(event);
} catch {
  // Silently ignore - never break main flow
}
```

### Log Rotation Strategy

**Decision**: Rotate logs based on file size with time-based retention.

**Parameters**:
- Max file size: 10MB
- Retention period: 30 days
- Archive location: `analytics/archive/`

**Rationale**:
- Size-based triggers prevent runaway growth
- Time-based retention ensures old data cleanup
- Archives preserve historical data for analysis

## Data Model

### Event Structure

```typescript
interface AnalyticsEvent {
  timestamp: string;     // ISO 8601 for sortability
  type: 'command' | 'skill' | 'agent';
  name: string;          // Unique identifier
  plugin?: string;       // Source plugin for attribution
  increment?: string;    // Context for workflow analysis
  duration?: number;     // Performance tracking
  success: boolean;      // Error rate calculation
  error?: string;        // Failure analysis
  metadata?: Record<string, unknown>; // Extensibility
}
```

**Design Decisions**:
- `type` enum limits explosion of event categories
- `plugin` optional for core vs. plugin attribution
- `increment` ties events to workflow context
- `metadata` enables future extension without schema changes

### Aggregation Model

**Decision**: Compute aggregations on-demand with caching.

**Rationale**:
- Avoids maintaining separate aggregate tables
- Cache with TTL (5 min) balances freshness vs. performance
- Filtered queries bypass cache for accuracy

## Security Considerations

### Data Sensitivity

- No PII captured (no user names, emails)
- No command arguments by default (optional in metadata)
- Local storage only (no network transmission)
- No secrets captured (error messages sanitized)

### Privacy Controls

- `enabled: false` in config disables all collection
- `disable()` method for runtime control
- Clear separation of analytics from core functionality

## Consequences

### Positive

- Visibility into framework usage
- Data-driven feature prioritization
- Performance regression detection
- Plugin usage attribution

### Negative

- Slight disk I/O overhead per operation
- Additional code paths to maintain
- Potential for storage growth if not monitored

### Mitigations

- Silent failure prevents performance impact on errors
- Automatic rotation prevents unbounded growth
- Singleton prevents multiple write streams

## Related

- [0221 - Auto Mode Architecture](./0221-auto-mode-architecture.md)
- [Analytics Module Documentation](../specs/specweave/modules/analytics.md)
