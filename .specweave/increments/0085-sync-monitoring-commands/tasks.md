# Tasks: Sync Monitoring & Commands - Phase 4

**Phase Focus**: User-facing commands for monitoring, notification, discrepancy, and log management

---

## Task Summary

| ID | Task | User Story | Status |
|----|------|------------|--------|
| T-001 | Implement Dashboard Data Aggregation | US-001 | [x] completed |
| T-002 | Implement Sync Monitor Command | US-001 | [x] completed |
| T-003 | Implement Notifications Command | US-002 | [x] completed |
| T-004 | Implement Discrepancies Command | US-003 | [x] completed |
| T-005 | Implement Log Aggregator | US-004 | [x] completed |
| T-006 | Implement Sync Logs Command | US-004 | [x] completed |
| T-007 | Integrate Notifications into Commands | US-002 | [x] completed |

---

### T-001: Implement Dashboard Data Aggregation
**User Story**: US-001
**Satisfies ACs**: AC-US1-01 to AC-US1-05
**Status**: [x] completed

#### Description
Create data aggregation layer for dashboard that pulls from scheduler, notifications, and logs.

#### Implementation
1. Create `src/core/dashboard/dashboard-data.ts`:
   ```typescript
   interface DashboardData {
     jobs: {
       id: string;
       type: string;
       status: string;
       lastRun?: string;
       nextRun?: string;
     }[];
     notifications: {
       total: number;
       bySeverity: Record<string, number>;
       recent: Notification[];
     };
     activity: {
       last24h: {
         synced: number;
         failed: number;
         skipped: number;
       };
       byPlatform: Record<string, number>;
     };
   }

   class DashboardDataProvider {
     async getData(): Promise<DashboardData>;
   }
   ```

2. Aggregate from:
   - JobScheduler.getAllJobs()
   - NotificationManager.getSummary()
   - SyncAuditLogger (last 24h)

3. Cache summary stats (1-minute TTL)

#### Acceptance Tests
```gherkin
Given jobs are scheduled
And notifications exist
And sync logs exist
When dashboard data is fetched
Then all sections are populated
And data reflects current state
```

---

### T-002: Implement Sync Monitor Command
**User Story**: US-001
**Satisfies ACs**: AC-US1-01 to AC-US1-05
**Status**: [x] completed

#### Description
Create the `/specweave:sync-monitor` dashboard command.

#### Implementation
1. Create `plugins/specweave/commands/specweave-sync-monitor.md`:
   - Command documentation
   - Example outputs

2. Create `src/cli/commands/sync-monitor.ts`:
   - Fetch dashboard data
   - Format as ASCII box table
   - Support `--json` for machine-readable output

3. CLI output format:
   ```
   ╔══════════════════════════════════════╗
   ║       SYNC MONITOR DASHBOARD         ║
   ╠══════════════════════════════════════╣
   ║ JOBS                                 ║
   ║ external-sync    ✅ idle   Next: 10m ║
   ...
   ```

#### Acceptance Tests
```gherkin
Given sync monitor command is run
When dashboard data exists
Then formatted dashboard is displayed
And job statuses show current state

Given --json flag is provided
When command runs
Then JSON output is returned
```

---

### T-003: Implement Notifications Command
**User Story**: US-002
**Satisfies ACs**: AC-US2-01 to AC-US2-05
**Status**: [x] completed

#### Description
Create the `/specweave:notifications` command for viewing and managing notifications.

#### Implementation
1. Create `plugins/specweave/commands/specweave-notifications.md`

2. Create `src/cli/commands/notifications.ts`:
   ```typescript
   // Subcommands
   async list(options: { all?: boolean; type?: string; severity?: string });
   async show(id: string);
   async dismiss(id: string);
   async dismissAll();
   ```

3. Command variations:
   - `/specweave:notifications` - List pending
   - `/specweave:notifications --all` - Include dismissed
   - `/specweave:notifications --type sync-failure`
   - `/specweave:notifications dismiss 123`
   - `/specweave:notifications dismiss-all`

#### Acceptance Tests
```gherkin
Given pending notifications exist
When /specweave:notifications is run
Then pending notifications are listed

Given notification ID 123
When /specweave:notifications dismiss 123
Then notification is dismissed
And confirmation is shown
```

---

### T-004: Implement Discrepancies Command
**User Story**: US-003
**Satisfies ACs**: AC-US3-01 to AC-US3-05
**Status**: [x] completed

#### Description
Create the `/specweave:discrepancies` command for viewing and acting on discrepancies.

#### Implementation
1. Create `plugins/specweave/commands/specweave-discrepancies.md`

2. Create `src/cli/commands/discrepancies.ts`:
   ```typescript
   // Subcommands
   async list(options: { severity?: string });
   async show(id: string);
   async check();      // Run detection now
   async accept(id: string);   // Apply patch
   async dismiss(id: string);  // Mark intentional
   ```

3. Command variations:
   - `/specweave:discrepancies` - List all
   - `/specweave:discrepancies --check` - Run check
   - `/specweave:discrepancies show 456`
   - `/specweave:discrepancies accept 456`
   - `/specweave:discrepancies dismiss 456`

#### Acceptance Tests
```gherkin
Given discrepancies exist
When /specweave:discrepancies is run
Then discrepancies are listed with severity

Given --check flag
When command runs
Then discrepancy detection runs
And new discrepancies are reported
```

---

### T-005: Implement Log Aggregator
**User Story**: US-004
**Satisfies ACs**: AC-US4-01 to AC-US4-05
**Status**: [x] completed

#### Description
Create log aggregation layer that queries across multiple log files.

#### Implementation
1. Create `src/core/logs/log-aggregator.ts`:
   ```typescript
   interface LogQuery {
     since?: Date;
     until?: Date;
     platform?: SyncPlatform;
     operation?: SyncOperation;
     result?: 'success' | 'denied' | 'error';
     limit?: number;
     offset?: number;
   }

   interface LogEntry {
     timestamp: string;
     platform: string;
     operation: string;
     itemId: string;
     result: string;
     reason?: string;
   }

   class LogAggregator {
     async query(query: LogQuery): Promise<LogEntry[]>;
     async count(query: LogQuery): Promise<number>;
   }
   ```

2. Implementation:
   - Find log files in date range
   - Stream line by line
   - Filter as we go
   - Stop at limit

3. Create `src/core/logs/log-exporter.ts`:
   - Export to JSON file
   - Support pagination for large exports

#### Acceptance Tests
```gherkin
Given sync logs from last week
When querying --since "2025-11-25"
Then only logs from that date onward are returned

Given platform filter is github
When querying
Then only GitHub logs are returned
```

---

### T-006: Implement Sync Logs Command
**User Story**: US-004
**Satisfies ACs**: AC-US4-01 to AC-US4-05
**Status**: [x] completed

#### Description
Create the `/specweave:sync-logs` command for querying sync logs.

#### Implementation
1. Create `plugins/specweave/commands/specweave-sync-logs.md`

2. Create `src/cli/commands/sync-logs.ts`:
   ```typescript
   // Options
   interface SyncLogsOptions {
     since?: string;       // Date string
     until?: string;       // Date string
     platform?: string;    // github|jira|ado
     operation?: string;   // read|upsert|etc
     result?: string;      // success|denied|error
     limit?: number;       // Default 100
     export?: string;      // Export file path
     json?: boolean;       // JSON output
   }
   ```

3. Command variations:
   - `/specweave:sync-logs` - Last 24h
   - `/specweave:sync-logs --since "2025-12-01"`
   - `/specweave:sync-logs --platform github`
   - `/specweave:sync-logs --result denied`
   - `/specweave:sync-logs --export logs.json`

#### Acceptance Tests
```gherkin
Given sync logs command is run
When no filters provided
Then last 24h of logs are shown

Given --export flag
When command runs
Then logs are exported to specified file
```

---

### T-007: Integrate Notifications into Commands
**User Story**: US-002
**Satisfies ACs**: AC-US2-01 (from 0082 US-004)
**Status**: [x] completed

#### Description
Inject notification summary into existing SpecWeave commands.

#### Implementation
1. Modify command output hook:
   - Add notification check after command completes
   - Display notification summary if pending

2. Target commands:
   - `/specweave:next`
   - `/specweave:progress`
   - `/specweave:status`
   - `/specweave:done`

3. Output format:
   ```
   [Normal command output]

   📬 3 pending notifications: 1 critical, 2 warnings
   Run /specweave:notifications to view
   ```

4. Use `formatNotificationsForOutput()` from 0082

#### Acceptance Tests
```gherkin
Given 3 pending notifications
When /specweave:progress is run
Then normal output is shown
And notification summary is appended

Given no pending notifications
When command runs
Then no notification section is shown
```

---

## Feature Complete Checklist

After completing 0085, the Unified Sync Orchestration feature (FS-082) is complete:

- [x] Phase 1 (0082): Foundation - Job scheduler, notifications, permissions, config
- [x] Phase 2 (0083): Permission Enforcement - Interceptor pattern for all sync
- [x] Phase 3 (0084): Discrepancy Detection - Code-to-spec comparison
- [x] Phase 4 (0085): Monitoring & Commands - Dashboard, notification/discrepancy commands, log queries

## Success Criteria

- Dashboard loads in < 1 second
- All commands work correctly
- Notifications display on target commands
- Log queries are performant
- Full test coverage for new code
