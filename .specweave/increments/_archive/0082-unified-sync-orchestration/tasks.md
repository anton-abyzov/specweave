# Tasks: Unified Sync Orchestration - Phase 1

**Phase Focus**: Job Scheduler, Configuration Schema, Notification Infrastructure

---

## Task Summary

| ID | Task | User Story | Status |
|----|------|------------|--------|
| T-001 | Implement Sync Configuration Schema | US-006 | [x] completed |
| T-002 | Implement Job Scheduler Core | US-001 | [x] completed |
| T-003 | Implement Schedule Persistence | US-001 | [x] completed |
| T-004 | Implement Notification Manager | US-004 | [x] completed |
| T-005 | Implement Permission Enforcer | US-002 | [x] completed |
| T-006 | Integrate Scheduler with SessionStart Hook | US-001 | [x] completed |
| T-007 | Inject Notifications into Command Output | US-004 | [x] completed |
| T-008 | Add Unit Tests for Phase 1 Components | US-001, US-004, US-006 | [x] completed |

---

### T-001: Implement Sync Configuration Schema
**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04, AC-US6-05, AC-US6-06
**Status**: [x] completed
**Completed**: 2025-12-01

#### Description
Create comprehensive TypeScript types for sync configuration and add to config.json schema.

#### Implementation
1. Create `src/core/types/sync-config.ts` with:
   - `SyncSchedulerConfig` - scheduler settings
   - `SyncPermissionsConfig` - per-platform permissions
   - `SyncDiscrepancyConfig` - discrepancy detection settings
   - `SyncNotificationsConfig` - notification preferences
   - `SyncLoggingConfig` - logging settings
   - `SyncConfig` - root config combining all

2. Add defaults and validation:
   - `getDefaultSyncConfig()` function
   - `validateSyncConfig()` function

3. Update config reader to merge sync settings:
   - Extend existing config loading in `src/core/config/`

#### Acceptance Tests
```gherkin
Given no sync config exists
When SpecWeave loads configuration
Then default sync config is applied
And scheduler.enabled defaults to false
And notifications.enabled defaults to true

Given custom sync config exists
When SpecWeave loads configuration
Then custom values override defaults
And validation errors are reported clearly
```

---

### T-002: Implement Job Scheduler Core
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-04
**Status**: [x] completed
**Completed**: 2025-12-01

#### Description
Create the core job scheduler that manages recurring jobs with configurable intervals.

#### Implementation
1. Create `src/core/scheduler/job-scheduler.ts`:
   ```typescript
   export class JobScheduler {
     private jobs: Map<string, ScheduledJob>;

     registerJob(job: ScheduledJobConfig): void;
     unregisterJob(jobId: string): void;
     pauseJob(jobId: string): void;
     resumeJob(jobId: string): void;
     getNextDueJobs(): ScheduledJob[];
     markJobComplete(jobId: string): void;
     markJobFailed(jobId: string, error: string): void;
   }
   ```

2. Create `src/core/scheduler/scheduled-job.ts`:
   ```typescript
   export interface ScheduledJob {
     id: string;
     type: JobType;
     schedule: JobSchedule;
     status: JobStatus;
   }

   export interface JobSchedule {
     intervalMs: number;
     enabled: boolean;
     lastRun?: string;
     nextRun?: string;
     retryCount: number;
     maxRetries: number;
   }
   ```

3. Create `src/core/scheduler/index.ts` with exports

#### Acceptance Tests
```gherkin
Given a job registered with 15 minute interval
When 15 minutes have passed since last run
Then job appears in getNextDueJobs()

Given a job is paused
When checking due jobs
Then paused job is not returned

Given a job fails
When retry count < max retries
Then job is scheduled for retry with backoff
```

---

### T-003: Implement Schedule Persistence
**User Story**: US-001
**Satisfies ACs**: AC-US1-03
**Status**: [x] completed
**Completed**: 2025-12-01

#### Description
Persist job schedules to disk so they survive session restarts.

#### Implementation
1. Create `src/core/scheduler/schedule-persistence.ts`:
   ```typescript
   export class SchedulePersistence {
     private filePath: string; // .specweave/state/scheduled-jobs.json

     async loadSchedules(): Promise<ScheduledJob[]>;
     async saveSchedules(jobs: ScheduledJob[]): Promise<void>;
     async updateJob(jobId: string, updates: Partial<ScheduledJob>): Promise<void>;
   }
   ```

2. File format:
   ```json
   {
     "version": 1,
     "jobs": [
       {
         "id": "external-sync",
         "type": "external-sync",
         "schedule": {
           "intervalMs": 900000,
           "enabled": true,
           "lastRun": "2025-12-01T10:00:00.000Z",
           "nextRun": "2025-12-01T10:15:00.000Z"
         },
         "status": "idle"
       }
     ],
     "lastUpdated": "2025-12-01T10:00:00.000Z"
   }
   ```

3. Atomic writes with temp file + rename

#### Acceptance Tests
```gherkin
Given job schedules are saved
When session restarts
Then schedules are restored from disk

Given a job completes
When schedule is updated
Then file is written atomically

Given corrupted schedule file
When loading schedules
Then recovery to defaults occurs
And warning is logged
```

---

### T-004: Implement Notification Manager
**User Story**: US-004
**Satisfies ACs**: AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05
**Status**: [x] completed
**Completed**: 2025-12-01

#### Description
Create notification storage and retrieval system.

#### Implementation
1. Create `src/core/notifications/notification-types.ts`:
   ```typescript
   export type NotificationType =
     | 'import-complete'
     | 'discrepancy'
     | 'sync-failure'
     | 'drift'
     | 'job-complete';

   export type NotificationSeverity = 'info' | 'warning' | 'critical';

   export interface Notification {
     id: string;
     type: NotificationType;
     severity: NotificationSeverity;
     title: string;
     message: string;
     data?: Record<string, unknown>;
     createdAt: string;
     readAt?: string;
     dismissedAt?: string;
   }
   ```

2. Create `src/core/notifications/notification-manager.ts`:
   ```typescript
   export class NotificationManager {
     async add(notification: CreateNotification): Promise<Notification>;
     async getPending(): Promise<Notification[]>;
     async getAll(options?: QueryOptions): Promise<Notification[]>;
     async markRead(ids: string[]): Promise<void>;
     async dismiss(ids: string[]): Promise<void>;
     async cleanup(olderThanDays: number): Promise<number>;
   }
   ```

3. Storage: `.specweave/state/notifications.json`

#### Acceptance Tests
```gherkin
Given a notification is added
When getPending() is called
Then notification is returned

Given a notification is marked read
When getPending() is called
Then notification is still returned (read != dismissed)

Given a notification is dismissed
When getPending() is called
Then notification is not returned

Given notifications older than 30 days
When cleanup() is called
Then old notifications are removed
```

---

### T-005: Implement Permission Enforcer
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04
**Status**: [x] completed
**Completed**: 2025-12-01

#### Description
Create permission checking layer that validates operations before sync.

#### Implementation
1. Create `src/core/sync/permission-enforcer.ts`:
   ```typescript
   export class PermissionEnforcer {
     constructor(private config: SyncPermissionsConfig);

     checkPermission(
       platform: 'github' | 'jira' | 'ado',
       operation: SyncOperation,
       itemId: string
     ): PermissionResult;

     logDecision(result: PermissionResult): void;
   }

   export type SyncOperation =
     | 'read'
     | 'update-status'
     | 'upsert'
     | 'delete';

   export interface PermissionResult {
     allowed: boolean;
     reason?: string;
     platform: string;
     operation: SyncOperation;
     itemId: string;
     timestamp: string;
   }
   ```

2. Decision logging to `.specweave/logs/sync/permissions.jsonl`

3. Integration with existing SyncSettings validation

#### Acceptance Tests
```gherkin
Given canUpdateStatus is false for GitHub
When attempting status update on GitHub item
Then permission is denied
And denial is logged with reason

Given canUpsert is true for JIRA
When attempting upsert on JIRA item
Then permission is allowed

Given external item (FS-001E) from GitHub
When attempting any modification
Then original tool's permissions apply
```

---

### T-006: Integrate Scheduler with SessionStart Hook
**User Story**: US-001
**Satisfies ACs**: AC-US1-03
**Status**: [x] completed
**Completed**: 2025-12-01

#### Description
Start the job scheduler on session start and check for due jobs.

#### Implementation
1. Create `src/plugins/specweave/hooks/lib/scheduler-startup.ts`:
   ```typescript
   export async function startScheduler(): Promise<void> {
     const persistence = new SchedulePersistence();
     const scheduler = new JobScheduler(persistence);

     // Load persisted schedules
     await scheduler.loadFromDisk();

     // Check for due jobs
     const dueJobs = scheduler.getNextDueJobs();

     // Launch due jobs (non-blocking)
     for (const job of dueJobs) {
       await launchJobWorker(job);
     }
   }
   ```

2. Add to SessionStart hook in `hooks.json`:
   ```json
   {
     "event": "SessionStart",
     "hooks": ["scheduler-startup.sh"]
   }
   ```

3. Create worker script for each job type

#### Acceptance Tests
```gherkin
Given scheduler enabled in config
When session starts
Then scheduler loads persisted schedules

Given jobs are due
When session starts
Then due jobs are launched as background workers

Given scheduler disabled in config
When session starts
Then no scheduler operations occur
```

---

### T-007: Inject Notifications into Command Output
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-06
**Status**: [x] completed
**Completed**: 2025-12-01

#### Description
Show pending notification summary when running key commands.

> **Note**: Display module (`notification-display.ts`) is complete. Full hook integration
> with commands (`:next`, `:progress`, `:status`, `:done`) deferred to Phase 4 (0085)
> where the `/specweave:notifications` command will also be implemented.

#### Implementation
1. Create `src/core/notifications/notification-display.ts`:
   ```typescript
   export function formatNotificationSummary(
     notifications: Notification[]
   ): string {
     // Returns: "⚠️ 3 notifications: 1 critical, 2 warnings"
   }

   export function formatNotificationList(
     notifications: Notification[]
   ): string {
     // Returns formatted list for CLI display
   }
   ```

2. Create notification display hook for commands:
   - Modify existing commands or add post-command hook
   - Target commands: :next, :progress, :status, :done

3. Format examples:
   ```
   ╭──────────────────────────────────────────────╮
   │ 📬 3 pending notifications                   │
   ├──────────────────────────────────────────────┤
   │ ❗ CRITICAL: GitHub sync failed (rate limit) │
   │ ⚠️ WARNING: 2 discrepancies in FS-045       │
   │ ℹ️ INFO: 107 items imported from JIRA       │
   ╰──────────────────────────────────────────────╯
   ```

#### Acceptance Tests
```gherkin
Given 3 pending notifications
When user runs /specweave:progress
Then notification summary is displayed after output

Given no pending notifications
When user runs /specweave:status
Then no notification section is shown

Given import just completed with 107 items
When user runs /specweave:next
Then "107 items imported" notification is shown
```

---

### T-008: Add Unit Tests for Phase 1 Components
**User Story**: US-001, US-004, US-006
**Satisfies ACs**: All Phase 1 ACs
**Status**: [x] completed
**Completed**: 2025-12-01

#### Description
Comprehensive unit tests for all Phase 1 components.

#### Implementation
1. Create test files:
   - `tests/unit/core/scheduler/job-scheduler.test.ts`
   - `tests/unit/core/scheduler/schedule-persistence.test.ts`
   - `tests/unit/core/notifications/notification-manager.test.ts`
   - `tests/unit/core/sync/permission-enforcer.test.ts`
   - `tests/unit/core/types/sync-config.test.ts`

2. Test coverage targets:
   - Job scheduler: interval calculations, state transitions
   - Persistence: load/save, atomic writes, corruption recovery
   - Notifications: CRUD, filtering, cleanup
   - Permissions: all operation/platform combinations
   - Config: defaults, validation, merging

3. Mock dependencies:
   - File system operations
   - Logger
   - Existing JobLauncher

#### Acceptance Tests
```gherkin
Given all test files created
When npm test runs
Then all Phase 1 tests pass
And coverage > 80% for new code
```

---

## Phase 2 Tasks (Future - Increment 0083)

Preview of next phase tasks:
- T-009: Wrap GitHub Sync with Permission Checks
- T-010: Wrap JIRA Sync with Permission Checks
- T-011: Wrap ADO Sync with Permission Checks
- T-012: Implement Sync Audit Trail
- T-013: Add Sync Interceptor Pattern
- T-014: Integration Tests for Permission Enforcement

## Phase 3 Tasks (Future - Increment 0084)

Preview of discrepancy detection tasks:
- TypeScript Code Analyzer
- API Route Analyzer
- Spec Parser
- Discrepancy Detector
- Smart Updater
- Discrepancy Classification

## Phase 4 Tasks (Future - Increment 0085)

Preview of monitoring tasks:
- Sync Monitor Dashboard Command
- Notifications Command
- Discrepancies Command
- Log Aggregation Service
