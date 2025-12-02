---
increment: 0082-unified-sync-orchestration
feature_id: FS-082
title: "Unified Sync Orchestration & Code-to-Spec Discrepancy Detection"
status: active
started: 2025-12-01
priority: P0
type: feature
created: 2025-12-01
---

# 0082: Unified Sync Orchestration & Code-to-Spec Discrepancy Detection

## Overview

This increment implements a comprehensive synchronization architecture that treats **CODE as the source of truth** (not specs/living docs). It provides recurring background jobs, bidirectional external tool sync with permission enforcement, intelligent code-to-spec discrepancy detection, and a proactive notification system.

## Scope

**This Increment (0082) - Phase 1: Foundation**
- ✅ **US-001**: Recurring Sync Job Scheduler - COMPLETED
- ✅ **US-002**: Permission-Gated Bidirectional Sync - COMPLETED
- ✅ **US-004**: Proactive Notification System - COMPLETED
- ✅ **US-006**: Sync Configuration Schema - COMPLETED

**Future Increments:**
| Increment | Phase | Focus | User Stories |
|-----------|-------|-------|--------------|
| 0083 | Phase 2 | Permission Enforcement | US-002 (expanded interceptors) |
| 0084 | Phase 3 | Discrepancy Detection | US-003 |
| 0085 | Phase 4 | Monitoring & Commands | US-005 |

## Problem Statement

1. **No Recurring Sync**: Current sync is one-off (manual commands only). External tool states drift.
2. **Code ≠ Specs**: Imported living docs describe INTENDED behavior, but actual code may differ.
3. **No Proactive Notifications**: Users only see sync status when they explicitly ask.
4. **Incomplete Permission Enforcement**: SyncSettings defined but not consistently enforced.
5. **Scattered Logging**: Sync events logged but not aggregated or easily queryable.

## Core Principle: Code is Source of Truth

**CRITICAL**: When there's a discrepancy between living docs and actual code:
- The **CODE is correct** (it's what runs in production)
- The **living docs need updating** (they describe outdated intent)
- User should be **notified of drift** before auto-updating docs

## User Stories

### US-001: Recurring Sync Job Scheduler
**As a** developer using external tools (GitHub/JIRA/ADO),
**I want** automatic recurring synchronization,
**So that** my SpecWeave state stays current with external tool changes.

#### Acceptance Criteria
- [x] **AC-US1-01**: Job scheduler supports configurable intervals (minutes to hours)
- [x] **AC-US1-02**: Different job types can have independent schedules
- [x] **AC-US1-03**: Jobs persist across sessions (resume on restart)
- [x] **AC-US1-04**: Jobs support pause/resume/kill operations
- [x] **AC-US1-05**: Failed jobs retry with exponential backoff
- [x] **AC-US1-06**: Jobs respect permission settings before sync

### US-002: Permission-Gated Bidirectional Sync
**As a** project admin,
**I want** fine-grained control over what syncs where,
**So that** I can prevent unauthorized changes to external tools.

#### Acceptance Criteria
- [x] **AC-US2-01**: Runtime permission check before every sync operation
- [x] **AC-US2-02**: Permission levels: read-only, status-update, full-upsert
- [x] **AC-US2-03**: Per-platform permission configuration (GitHub/JIRA/ADO)
- [x] **AC-US2-04**: Permission denial logged with reason
- [x] **AC-US2-05**: External items (FS-XXE) respect original tool's permissions

### US-003: Code-to-Spec Discrepancy Detection [DEFERRED → 0084]
**As a** developer,
**I want** to know when my code implementation differs from specs,
**So that** I can update documentation or fix implementation bugs.

#### Acceptance Criteria
- [ ] **AC-US3-01**: Detect API route changes (added/removed/modified endpoints) `[Phase 3]`
- [ ] **AC-US3-02**: Detect function signature changes (params, return types) `[Phase 3]`
- [ ] **AC-US3-03**: Detect type/interface changes affecting specs `[Phase 3]`
- [ ] **AC-US3-04**: Configurable check types (can disable specific checks) `[Phase 3]`
- [ ] **AC-US3-05**: Smart decision: auto-update trivial changes, flag major ones `[Phase 3]`
- [ ] **AC-US3-06**: Discrepancy reports stored in `.specweave/logs/discrepancies/` `[Phase 3]`

### US-004: Proactive Notification System
**As a** developer,
**I want** to be notified of important sync events automatically,
**So that** I don't miss critical updates or drift.

#### Acceptance Criteria
- [x] **AC-US4-01**: Notifications shown on :next, :progress, :status, :done *(display module ready, hook deferred to 0085)*
- [x] **AC-US4-02**: Notification types: import-complete, discrepancy, sync-failure, drift
- [x] **AC-US4-03**: Notifications persist until dismissed
- [ ] **AC-US4-04**: Notification history viewable via /specweave:notifications `[Phase 4]`
- [x] **AC-US4-05**: Severity levels: info, warning, critical
- [x] **AC-US4-06**: Import summary: "107 items imported for project X"

### US-005: Centralized Sync Logging & Monitoring [DEFERRED → 0085]
**As a** project admin,
**I want** comprehensive sync logs in one location,
**So that** I can audit sync operations and troubleshoot issues.

#### Acceptance Criteria
- [ ] **AC-US5-01**: All sync operations logged to `.specweave/logs/sync/` `[Phase 4]`
- [ ] **AC-US5-02**: Discrepancy logs in `.specweave/logs/discrepancies/` `[Phase 4]`
- [ ] **AC-US5-03**: Job execution logs in `.specweave/logs/jobs/` `[Phase 4]`
- [ ] **AC-US5-04**: Log rotation with configurable retention (default 30 days) `[Phase 4]`
- [ ] **AC-US5-05**: Query logs by date, operation type, status `[Phase 4]`
- [ ] **AC-US5-06**: Monitor command: /specweave:sync-monitor `[Phase 4]`

### US-006: Sync Configuration Schema
**As a** project admin,
**I want** comprehensive sync configuration options,
**So that** I can tune sync behavior for my team's needs.

#### Acceptance Criteria
- [x] **AC-US6-01**: Configuration in `.specweave/config.json` under `sync` key
- [x] **AC-US6-02**: Scheduler settings: intervals, enabled jobs
- [x] **AC-US6-03**: Permission settings per platform
- [x] **AC-US6-04**: Discrepancy detection settings
- [x] **AC-US6-05**: Notification preferences
- [x] **AC-US6-06**: Logging verbosity and retention

## Technical Architecture

### 1. Job Scheduler (`src/core/scheduler/`)

```typescript
// job-scheduler.ts
interface ScheduledJob {
  id: string;
  type: JobType;
  schedule: {
    intervalMs: number;      // Poll interval
    enabled: boolean;        // Can be disabled
    lastRun?: string;        // ISO timestamp
    nextRun?: string;        // ISO timestamp
    retryCount: number;      // For backoff
    maxRetries: number;      // Default 3
  };
  status: 'idle' | 'running' | 'failed' | 'disabled';
}

type JobType =
  | 'external-sync'          // Sync with GitHub/JIRA/ADO
  | 'discrepancy-check'      // Code vs spec comparison
  | 'status-line-update'     // Refresh status line cache
  | 'living-docs-sync'       // Sync living docs changes
  | 'notification-cleanup';  // Clean old notifications
```

### 2. Permission Enforcer (`src/core/sync/permission-enforcer.ts`)

```typescript
interface SyncPermissions {
  canRead: boolean;           // Pull changes from external
  canUpdateStatus: boolean;   // Update status field only
  canUpsert: boolean;         // Create/update items
  canDelete: boolean;         // Delete items (dangerous)
}

class PermissionEnforcer {
  async checkAndLog(
    platform: 'github' | 'jira' | 'ado',
    operation: SyncOperation,
    itemId: string
  ): Promise<{ allowed: boolean; reason?: string }>;
}
```

### 3. Discrepancy Detector (`src/core/discrepancy/`)

```typescript
// discrepancy-detector.ts
interface Discrepancy {
  id: string;
  type: 'api-route' | 'function-signature' | 'type-definition' | 'config';
  severity: 'trivial' | 'minor' | 'major' | 'breaking';
  specPath: string;           // Path in living docs
  codePath: string;           // Path in source code
  specValue: string;          // What spec says
  codeValue: string;          // What code does
  recommendation: 'auto-update' | 'review-required' | 'flag-only';
  detectedAt: string;         // ISO timestamp
}

// Code analyzers
interface CodeAnalyzer {
  type: 'typescript' | 'api-routes' | 'openapi' | 'graphql';
  analyze(codebase: string): Promise<CodeSignature[]>;
}

// Compare spec descriptions to actual code
class SpecCodeComparator {
  compare(
    specs: LivingDocsSpec[],
    code: CodeSignature[]
  ): Discrepancy[];
}
```

### 4. Notification Manager (`src/core/notifications/`)

```typescript
interface Notification {
  id: string;
  type: 'import-complete' | 'discrepancy' | 'sync-failure' | 'drift' | 'job-complete';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  data?: Record<string, unknown>;  // Type-specific data
  createdAt: string;
  readAt?: string;                  // When user saw it
  dismissedAt?: string;             // When user dismissed
}

// Storage: .specweave/state/notifications.json
class NotificationManager {
  async add(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<void>;
  async getPending(): Promise<Notification[]>;
  async markRead(ids: string[]): Promise<void>;
  async dismiss(ids: string[]): Promise<void>;
  async getForDisplay(): Promise<{ summary: string; count: number }>;
}
```

### 5. Sync Monitor (`src/cli/commands/sync-monitor.ts`)

```bash
# New CLI command
/specweave:sync-monitor

# Output:
╔══════════════════════════════════════════════════════════════╗
║                    SYNC MONITOR DASHBOARD                     ║
╠══════════════════════════════════════════════════════════════╣
║ SCHEDULED JOBS                                                ║
╟──────────────────────────────────────────────────────────────╢
║ external-sync      │ ✅ idle    │ Last: 5m ago │ Next: 10m   ║
║ discrepancy-check  │ 🔄 running │ Started: 2m ago            ║
║ living-docs-sync   │ ⏸️ disabled                             ║
╠══════════════════════════════════════════════════════════════╣
║ PENDING NOTIFICATIONS (3)                                     ║
╟──────────────────────────────────────────────────────────────╢
║ ⚠️ WARNING: 2 discrepancies detected in FS-045               ║
║ ℹ️ INFO: 107 items imported from JIRA (project CORE)         ║
║ ❗ CRITICAL: GitHub sync failed (rate limited)                ║
╠══════════════════════════════════════════════════════════════╣
║ RECENT SYNC ACTIVITY (last 24h)                               ║
╟──────────────────────────────────────────────────────────────╢
║ GitHub: 45 synced │ JIRA: 12 synced │ ADO: 0 synced          ║
║ Success: 55 │ Failed: 2 │ Skipped (no permission): 8         ║
╚══════════════════════════════════════════════════════════════╝
```

### 6. Configuration Schema

```typescript
// In .specweave/config.json
interface SyncConfig {
  sync: {
    scheduler: {
      enabled: boolean;           // Master switch
      runOnStartup: boolean;      // Run sync on session start
      jobs: {
        externalSync: {
          enabled: boolean;
          intervalMinutes: number;  // Default: 15
        };
        discrepancyCheck: {
          enabled: boolean;
          intervalMinutes: number;  // Default: 60
        };
        livingDocsSync: {
          enabled: boolean;
          intervalMinutes: number;  // Default: 30
        };
      };
    };

    permissions: {
      github: {
        canRead: boolean;
        canUpdateStatus: boolean;
        canUpsert: boolean;
      };
      jira: {
        canRead: boolean;
        canUpdateStatus: boolean;
        canUpsert: boolean;
      };
      ado: {
        canRead: boolean;
        canUpdateStatus: boolean;
        canUpsert: boolean;
      };
    };

    discrepancy: {
      enabled: boolean;
      autoUpdateTrivial: boolean;     // Auto-fix trivial changes
      requireReviewFor: string[];     // ['major', 'breaking']
      checkTypes: string[];           // ['api-routes', 'types', 'functions']
      ignorePaths: string[];          // Paths to ignore
    };

    notifications: {
      enabled: boolean;
      showOnCommands: string[];       // ['next', 'progress', 'status', 'done']
      types: {
        importComplete: boolean;
        discrepancy: boolean;
        syncFailure: boolean;
        drift: boolean;
      };
    };

    logging: {
      verbosity: 'minimal' | 'normal' | 'verbose';
      retentionDays: number;          // Default: 30
    };
  };
}
```

## File Structure

```
.specweave/
├── config.json                    # Sync configuration
├── state/
│   ├── scheduled-jobs.json        # Job schedules & state
│   ├── notifications.json         # Pending notifications
│   └── sync-state.json            # Last sync timestamps per platform
├── logs/
│   ├── sync/
│   │   ├── 2025-12-01.jsonl       # Daily sync logs
│   │   └── ...
│   ├── discrepancies/
│   │   ├── 2025-12-01.jsonl       # Daily discrepancy logs
│   │   └── ...
│   └── jobs/
│       ├── external-sync/
│       │   └── 2025-12-01.log     # Job execution logs
│       └── ...
└── cache/
    └── discrepancy-baseline.json  # Baseline for comparison
```

## New Commands

| Command | Description |
|---------|-------------|
| `/specweave:sync-monitor` | Dashboard showing jobs, notifications, activity |
| `/specweave:notifications` | List and manage pending notifications |
| `/specweave:discrepancies` | Show code-to-spec discrepancies |
| `/specweave:sync-config` | View/edit sync configuration |
| `/specweave:sync-now` | Force immediate sync (all platforms) |

## Integration Points

### Hook Integration
```typescript
// On command execution, check for pending notifications
// Modify existing commands: :next, :progress, :status, :done

// In post-tool-use hook:
if (isPendingNotifications()) {
  displayNotificationSummary();  // "3 notifications pending"
}
```

### Status Line Integration
```typescript
// Add sync indicator to status line
// [inc-1] ████░░ 3/6 tasks | 🔄 Syncing... | ⚠️ 2 notifications
```

## Implementation Notes

### Code-to-Spec Comparison Strategy

1. **API Routes**: Parse Express/Fastify/Next routes → compare to spec API descriptions
2. **Function Signatures**: Parse TypeScript AST → compare to documented interfaces
3. **Types**: Extract exported types → compare to spec type definitions
4. **Configuration**: Parse config files → compare to documented options

### Smart Update Decision Tree

```
Discrepancy Detected
       │
       ▼
Is it trivial? (typo, formatting, comment)
       │
  Yes ─┼─ No
       │     │
       ▼     ▼
Auto-update  Is it minor? (param rename, type narrowing)
             │
        Yes ─┼─ No
             │     │
             ▼     ▼
    Flag for   Is it breaking? (API change, removed feature)
    review           │
                Yes ─┼─ No
                     │     │
                     ▼     ▼
             Critical   Major discrepancy
             notification  notification
```

## Out of Scope

- Real-time websocket sync (future increment)
- Conflict resolution UI (CLI-only for now)
- Multi-tenant sync (single workspace focus)

## Dependencies

- Existing: JobManager, JobLauncher, SyncCoordinator, SyncEventLogger
- New: TypeScript AST parsing (ts-morph or typescript compiler API)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Code parsing complexity | Start with TypeScript only, add languages later |
| False positive discrepancies | Conservative detection, require review by default |
| Sync storms during outages | Circuit breaker with exponential backoff |
| Large log files | Daily rotation, configurable retention |

## Success Metrics

- Sync drift detected within configured interval
- Zero unauthorized external tool updates
- Discrepancies flagged before they cause confusion
- Notification read rate > 80%
