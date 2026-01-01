# FS-149: Usage Analytics - Command & Plugin Tracking

**Status**: ✅ Completed
**Increment**: 0149-usage-analytics
**Completed**: 2025-12-31
**Priority**: P1
**Type**: Feature

## Summary

Comprehensive usage analytics system for SpecWeave that tracks command invocations, skill activations, agent spawns, and provides insights via the `/sw:analytics` command.

## Problem Solved

SpecWeave lacked visibility into:
- Per-command usage statistics
- Skill/agent activation frequency
- Success/failure rates by command
- Usage trends over time
- Exportable analytics data

## Solution

Lightweight, append-only analytics system that:
1. Instruments command/skill execution points
2. Stores events in JSONL format for efficiency
3. Aggregates data on-demand for dashboard display
4. Provides export capabilities (JSON/CSV)

## User Stories

### US-001: Command Usage Tracking
- Track every `/sw:*` command invocation with timestamp
- Record command name, arguments (sanitized), and increment context
- Store success/failure status and execution duration

### US-002: Skill & Agent Tracking
- Track skill activations via Skill tool invocations
- Track agent spawns via Task tool with subagent_type
- Record plugin source for each skill/agent

### US-003: Analytics Dashboard Command
- Show top 10 commands, skills, agents by usage
- Display usage timeline (last 7/30 days)
- Support `--export json` and `--export csv` flags
- Support `--since` date filter

### US-004: Analytics Storage
- Store events in `.specweave/state/analytics/events.jsonl`
- Implement daily rollup to `daily-summary.json`
- Auto-rotate events.jsonl when > 10MB
- Cache aggregated stats for fast dashboard rendering

## Technical Design

### Storage Structure
```
.specweave/state/analytics/
├── events.jsonl          # Append-only event log
├── daily-summary.json    # Rolled-up daily stats
├── cache.json            # Pre-computed aggregations
└── exports/              # User-requested exports
```

### Event Schema
```typescript
interface AnalyticsEvent {
  timestamp: string;      // ISO 8601
  type: 'command' | 'skill' | 'agent';
  name: string;           // Command/skill/agent name
  plugin?: string;        // Source plugin
  increment?: string;     // Current increment context
  duration?: number;      // Execution time (ms)
  success: boolean;
  error?: string;         // Error message if failed
  metadata?: Record<string, any>;
}
```

## Implementation

- **Module**: `src/core/analytics/`
  - `AnalyticsCollector` - Singleton for event collection
  - `AnalyticsAggregator` - Summaries, caching, export
- **Command**: `/sw:analytics` - Dashboard display

## Privacy

- All data stays local (no remote telemetry)
- No user identification/tracking
- Arguments are sanitized before storage

---
*Synced from increment: 2025-12-30*
