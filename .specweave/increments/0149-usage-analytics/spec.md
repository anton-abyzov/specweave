---
increment: 0149-usage-analytics
title: "Usage Analytics - Command & Plugin Tracking"
type: feature
priority: P1
status: completed
---

# Usage Analytics - Command & Plugin Tracking

## Overview

Implement comprehensive usage analytics for SpecWeave to track command invocations, skill activations, agent spawns, and provide insights via the `/sw:analytics` command.

## Problem Statement

Currently, SpecWeave tracks hook execution metrics but lacks:
- Per-command usage statistics
- Skill/agent activation frequency
- Success/failure rates by command
- Usage trends over time
- Exportable analytics data

## Solution

Create a lightweight, append-only analytics system that:
1. Instruments command/skill execution points
2. Stores events in JSONL format for efficiency
3. Aggregates data on-demand for dashboard display
4. Provides export capabilities (JSON/CSV)

---

## User Stories

### US-001: Command Usage Tracking
**Project**: specweave
**As a** SpecWeave developer, I want to see which commands are used most frequently so I can prioritize improvements.

**Acceptance Criteria**:
- [x] **AC-US1-01**: Track every `/sw:*` command invocation with timestamp
- [x] **AC-US1-02**: Record command name, arguments (sanitized), and increment context
- [x] **AC-US1-03**: Store success/failure status for each invocation
- [x] **AC-US1-04**: Calculate execution duration for each command

### US-002: Skill & Agent Tracking
**Project**: specweave
**As a** SpecWeave developer, I want to know which skills and agents are activated most so I can understand usage patterns.

**Acceptance Criteria**:
- [x] **AC-US2-01**: Track skill activations via Skill tool invocations
- [x] **AC-US2-02**: Track agent spawns via Task tool with subagent_type
- [x] **AC-US2-03**: Record plugin source for each skill/agent
- [x] **AC-US2-04**: Aggregate usage counts per skill and agent

### US-003: Analytics Dashboard Command
**Project**: specweave
**As a** SpecWeave user, I want a `/sw:analytics` command that shows usage statistics in a readable format.

**Acceptance Criteria**:
- [x] **AC-US3-01**: Show top 10 commands by usage count
- [x] **AC-US3-02**: Show top 10 skills by activation count
- [x] **AC-US3-03**: Show top 10 agents by spawn count
- [x] **AC-US3-04**: Display usage timeline (last 7/30 days)
- [x] **AC-US3-05**: Support `--export json` and `--export csv` flags
- [x] **AC-US3-06**: Support `--since` date filter

### US-004: Analytics Storage
**Project**: specweave
**As a** system, I need efficient storage for analytics events that doesn't bloat over time.

**Acceptance Criteria**:
- [x] **AC-US4-01**: Store events in `.specweave/state/analytics/events.jsonl`
- [x] **AC-US4-02**: Implement daily rollup to `daily-summary.json`
- [x] **AC-US4-03**: Auto-rotate events.jsonl when > 10MB (keep last 30 days)
- [x] **AC-US4-04**: Cache aggregated stats for fast dashboard rendering

---

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

### Aggregation Strategy
- Real-time: Append to events.jsonl
- Daily: Cron/session-end rolls up to daily-summary.json
- On-demand: `/sw:analytics` reads and aggregates

---

## Out of Scope
- Real-time streaming dashboard
- Remote telemetry (all data stays local)
- User identification/tracking
