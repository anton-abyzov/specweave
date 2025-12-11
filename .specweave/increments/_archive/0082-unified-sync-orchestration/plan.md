# Implementation Plan: Unified Sync Orchestration

## Executive Summary

This increment implements SpecWeave's core sync infrastructure: recurring background jobs, permission-gated bidirectional sync, code-to-spec discrepancy detection, and proactive notifications. The key principle: **CODE is source of truth**, not specs.

## Implementation Phases

Given the scope, this work is organized into 4 phases, each kept under the 25-task soft limit:

---

## Phase 1: Foundation (This Increment - 0082)

**Focus**: Job Scheduler, Configuration Schema, Basic Notification Infrastructure

### Components

1. **Job Scheduler Core** (`src/core/scheduler/`)
   - `job-scheduler.ts` - Manages recurring jobs with intervals
   - `scheduled-job.ts` - Job definition and state types
   - `schedule-persistence.ts` - Persists schedules to disk

2. **Sync Configuration** (`src/core/types/sync-config.ts`)
   - Define comprehensive config schema
   - Migration for existing config.json
   - Validation and defaults

3. **Notification Manager** (`src/core/notifications/`)
   - `notification-manager.ts` - CRUD for notifications
   - `notification-types.ts` - Type definitions
   - `notification-display.ts` - CLI display helpers

4. **Hook Integration**
   - Inject notification display into existing commands
   - Add scheduler startup to SessionStart hook

### Deliverables
- Jobs can be scheduled with configurable intervals
- Notifications can be stored and retrieved
- Config schema defined and validated
- Basic CLI display of pending notifications

---

## Phase 2: Permission Enforcement (Increment 0083)

**Focus**: Runtime permission checks, audit logging, per-platform settings

### Components

1. **Permission Enforcer** (`src/core/sync/permission-enforcer.ts`)
   - Check permissions before any sync operation
   - Log permission denials with reasons
   - Support per-platform configuration

2. **Sync Interceptor Pattern**
   - Wrap existing sync methods with permission checks
   - Apply to GitHub, JIRA, ADO sync paths

3. **Audit Trail**
   - Log all permission decisions
   - Track who/what triggered the sync

### Deliverables
- No sync operation without permission check
- Audit log of all sync attempts
- Per-platform permission configuration

---

## Phase 3: Discrepancy Detection (Increment 0084)

**Focus**: Code analysis, spec comparison, smart update decisions

### Components

1. **Code Analyzers** (`src/core/discrepancy/analyzers/`)
   - `typescript-analyzer.ts` - Parse TS files for signatures
   - `api-route-analyzer.ts` - Detect Express/Fastify routes
   - `type-extractor.ts` - Extract exported types

2. **Spec Parser** (`src/core/discrepancy/spec-parser.ts`)
   - Parse living docs for documented behavior
   - Extract API descriptions, type definitions

3. **Discrepancy Detector** (`src/core/discrepancy/detector.ts`)
   - Compare code signatures to spec descriptions
   - Classify severity (trivial/minor/major/breaking)
   - Generate recommendations

4. **Smart Updater** (`src/core/discrepancy/updater.ts`)
   - Auto-update trivial discrepancies
   - Flag major ones for review
   - Track update history

### Deliverables
- Detect code changes that differ from specs
- Classify and report discrepancies
- Auto-update safe changes, flag risky ones

---

## Phase 4: Monitoring & Commands (Increment 0085)

**Focus**: Dashboard CLI, log aggregation, advanced querying

### Components

1. **Sync Monitor Command** (`src/cli/commands/sync-monitor.ts`)
   - Dashboard view of jobs, notifications, activity
   - Real-time progress display

2. **Notification Command** (`src/cli/commands/notifications.ts`)
   - List pending notifications
   - Dismiss/archive notifications

3. **Discrepancy Command** (`src/cli/commands/discrepancies.ts`)
   - Show detected discrepancies
   - Accept/reject recommendations

4. **Log Aggregation** (`src/core/logs/log-aggregator.ts`)
   - Query across log files
   - Filter by date, type, status
   - Rotation and cleanup

### Deliverables
- Complete monitoring dashboard
- Full notification management
- Discrepancy review workflow
- Log querying and management

---

## Architecture Decisions

### ADR-0201: Recurring Job Scheduling Pattern

**Context**: Need recurring jobs without external dependencies (no cron, no pm2).

**Decision**: Implement in-process scheduler that:
1. Stores schedules in `.specweave/state/scheduled-jobs.json`
2. Checks due jobs on SessionStart hook
3. Runs due jobs as detached workers (existing JobLauncher)
4. Updates next-run time after completion

**Consequences**:
- Jobs only run when Claude session is active
- Schedules persist between sessions
- Can catch up on missed jobs (configurable)

### ADR-0202: Permission Enforcement Strategy

**Context**: SyncSettings defined but not consistently enforced.

**Decision**: Implement interceptor pattern:
1. Wrap all sync methods with permission check
2. Check happens at call time, not config time
3. Denied operations logged and silently skipped (no errors)

**Consequences**:
- Consistent permission enforcement
- Easy to add new sync paths
- Audit trail of all decisions

### ADR-0203: Discrepancy Detection Approach

**Context**: Need to detect when code differs from specs without full AST parsing.

**Decision**: Two-tier approach:
1. **Fast pass**: Hash-based change detection (detect if file changed)
2. **Deep pass**: AST parsing only for changed files

**Consequences**:
- Minimal performance impact for unchanged files
- Detailed analysis only when needed
- Can run frequently (every 30-60 min)

---

## File Locations

```
src/
├── core/
│   ├── scheduler/
│   │   ├── index.ts
│   │   ├── job-scheduler.ts         # Main scheduler
│   │   ├── scheduled-job.ts         # Types
│   │   └── schedule-persistence.ts  # Disk persistence
│   ├── notifications/
│   │   ├── index.ts
│   │   ├── notification-manager.ts  # CRUD operations
│   │   ├── notification-types.ts    # Type definitions
│   │   └── notification-display.ts  # CLI formatting
│   ├── sync/
│   │   ├── permission-enforcer.ts   # Permission checks
│   │   └── sync-interceptor.ts      # Wrap sync methods
│   ├── discrepancy/                 # Phase 3
│   │   ├── detector.ts
│   │   ├── spec-parser.ts
│   │   ├── updater.ts
│   │   └── analyzers/
│   ├── logs/
│   │   └── log-aggregator.ts        # Phase 4
│   └── types/
│       └── sync-config.ts           # Config schema
├── cli/commands/
│   ├── sync-monitor.ts              # Phase 4
│   ├── notifications.ts             # Phase 4
│   └── discrepancies.ts             # Phase 4
└── plugins/specweave/
    └── hooks/lib/
        └── scheduler-startup.ts     # Start scheduler on session
```

---

## Dependencies

### Internal (Existing)
- `JobManager` - For running background workers
- `JobLauncher` - For detached process spawning
- `SyncEventLogger` - For logging sync events
- `SyncCoordinator` - For existing sync logic
- `StatusSyncEngine` - For status sync operations

### External (New)
- `ts-morph` (optional) - For TypeScript AST parsing
  - Alternative: Use TypeScript compiler API directly (0 deps)

---

## Testing Strategy

### Unit Tests
- Job scheduler interval calculations
- Permission enforcement logic
- Notification CRUD operations
- Discrepancy classification

### Integration Tests
- End-to-end job scheduling and execution
- Permission denial scenarios
- Config migration
- Hook integration

### Smoke Tests
- `/specweave:sync-monitor` displays correctly
- Notifications appear on `:next`/`:progress`
- Discrepancies detected on code change

---

## Rollout Plan

1. **Phase 1**: Foundation
   - Deploy job scheduler (disabled by default)
   - Add config schema with opt-in
   - Basic notification storage

2. **Phase 2**: Permissions
   - Enable permission checks
   - Monitor for false positives
   - Tune defaults based on feedback

3. **Phase 3**: Discrepancy
   - Enable for TypeScript projects only
   - Conservative detection (high precision)
   - Expand to other languages later

4. **Phase 4**: Monitoring
   - Add monitoring commands
   - Collect usage metrics
   - Iterate on UX

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Scheduler not running (session inactive) | Clear "catch up" behavior, warn on stale data |
| False positive discrepancies | Conservative thresholds, require review by default |
| Permission breaking existing workflows | Opt-in, easy rollback, clear error messages |
| Log files growing large | Daily rotation, configurable retention |
| Performance impact from code analysis | Incremental analysis, caching, background execution |
