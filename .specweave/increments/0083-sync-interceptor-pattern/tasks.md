# Tasks: Sync Interceptor Pattern - Phase 2

**Phase Focus**: Integrate PermissionEnforcer into all sync paths

---

## Task Summary

| ID | Task | User Story | Status |
|----|------|------------|--------|
| T-001 | Implement SyncInterceptor | US-001, US-002, US-003 | [x] completed |
| T-002 | Implement SyncAuditLogger | US-004 | [x] completed |
| T-003 | Wrap GitHub Sync with Interceptor | US-001 | [x] completed |
| T-004 | Wrap JIRA Sync with Interceptor | US-002 | [x] completed |
| T-005 | Wrap ADO Sync with Interceptor | US-003 | [x] completed |
| T-006 | Add Unit Tests for Interceptor & Logger | US-001-US-004 | [x] completed |
| T-007 | Add Integration Tests | US-001-US-004 | [x] completed |

---

### T-001: Implement SyncInterceptor
**User Story**: US-001, US-002, US-003
**Satisfies ACs**: AC-US1-01 to AC-US1-05, AC-US2-01 to AC-US2-05, AC-US3-01 to AC-US3-05
**Status**: [x] completed

#### Description
Create the central SyncInterceptor class that wraps all sync operations with permission checks.

#### Implementation
1. Create `src/core/sync/sync-interceptor.ts`:
   - `intercept<T>()` method for wrapping operations
   - Integrates PermissionEnforcer
   - Delegates to audit logger

2. Handle all operation types:
   - read: always allowed
   - update-status: check canUpdateStatus
   - upsert-internal: check canUpsertInternalItems
   - upsert-external: check canUpdateExternalItems

3. Return null for denied operations (caller handles)

#### Acceptance Tests
```gherkin
Given canUpsertInternalItems=false
When interceptor wraps a create operation
Then operation is denied
And null is returned
And denial is logged

Given canUpdateStatus=true
When interceptor wraps a status update
Then operation is executed
And success is logged
```

---

### T-002: Implement SyncAuditLogger
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05
**Status**: [x] completed

#### Description
Create audit logging for all sync operations.

#### Implementation
1. Create `src/core/sync/sync-audit-logger.ts`:
   ```typescript
   interface AuditLogEntry {
     timestamp: string;
     platform: SyncPlatform;
     operation: SyncOperation;
     itemId: string;
     result: 'success' | 'denied' | 'error';
     reason?: string;
     error?: string;
     durationMs?: number;
   }
   ```

2. Implement methods:
   - `logSuccess(platform, operation, itemId, durationMs)`
   - `logDenied(platform, operation, itemId, reason)`
   - `logError(platform, operation, itemId, error)`

3. Storage: `.specweave/logs/sync/audit.jsonl`

4. Log rotation: New file when > 100MB or new day

#### Acceptance Tests
```gherkin
Given a sync operation succeeds
When logged
Then entry includes timestamp, platform, operation, itemId, result=success

Given a sync operation is denied
When logged
Then entry includes reason field

Given audit log exceeds 100MB
When new entry is added
Then new log file is created
And old file is preserved
```

---

### T-003: Wrap GitHub Sync with Interceptor
**User Story**: US-001
**Satisfies ACs**: AC-US1-01 to AC-US1-05
**Status**: [x] completed

#### Description
Integrate SyncInterceptor into GitHub sync operations.

#### Implementation
1. Identify GitHub sync entry points:
   - `GitHubSyncManager.createIssue()`
   - `GitHubSyncManager.updateIssue()`
   - `GitHubSyncManager.syncStatus()`

2. Wrap each with interceptor:
   ```typescript
   async createIssue(item: InternalItem): Promise<Issue | null> {
     return this.interceptor.intercept(
       'github',
       'upsert-internal',
       item.id,
       () => this.client.createIssue(item)
     );
   }
   ```

3. Handle null returns (operation denied)

#### Acceptance Tests
```gherkin
Given canUpsertInternalItems=false for GitHub
When creating a GitHub issue
Then issue is NOT created
And "permission denied" is logged

Given canUpdateStatus=true for GitHub
When updating issue status
Then status is updated successfully
```

---

### T-004: Wrap JIRA Sync with Interceptor
**User Story**: US-002
**Satisfies ACs**: AC-US2-01 to AC-US2-05
**Status**: [x] completed

#### Description
Integrate SyncInterceptor into JIRA sync operations.

#### Implementation
1. Identify JIRA sync entry points:
   - `JiraSyncManager.createIssue()`
   - `JiraSyncManager.updateIssue()`
   - `JiraSyncManager.syncStatus()`

2. Wrap each with interceptor (same pattern as GitHub)

3. Handle null returns

#### Acceptance Tests
```gherkin
Given canUpdateExternalItems=false for JIRA
When updating an external JIRA issue
Then issue is NOT updated
And "permission denied" is logged
```

---

### T-005: Wrap ADO Sync with Interceptor
**User Story**: US-003
**Satisfies ACs**: AC-US3-01 to AC-US3-05
**Status**: [x] completed

#### Description
Integrate SyncInterceptor into Azure DevOps sync operations.

#### Implementation
1. Identify ADO sync entry points:
   - `AdoSyncManager.createWorkItem()`
   - `AdoSyncManager.updateWorkItem()`
   - `AdoSyncManager.syncStatus()`

2. Wrap each with interceptor

3. Handle null returns

#### Acceptance Tests
```gherkin
Given canUpsertInternalItems=false for ADO
When creating an ADO work item
Then work item is NOT created
```

---

### T-006: Add Unit Tests for Interceptor & Logger
**User Story**: US-001, US-002, US-003, US-004
**Satisfies ACs**: All ACs
**Status**: [x] completed

#### Description
Comprehensive unit tests for SyncInterceptor and SyncAuditLogger.

#### Implementation
1. Create `tests/unit/core/sync/sync-interceptor.test.ts`:
   - Test permission enforcement for each operation type
   - Test null return on denial
   - Test success execution

2. Create `tests/unit/core/sync/sync-audit-logger.test.ts`:
   - Test log entry format
   - Test file rotation
   - Test error handling

#### Acceptance Tests
```gherkin
Given all test files created
When npm test runs
Then all interceptor tests pass
And coverage > 80%
```

---

### T-007: Add Integration Tests
**User Story**: US-001, US-002, US-003, US-004
**Satisfies ACs**: All ACs
**Status**: [x] completed

#### Description
Integration tests verifying end-to-end permission enforcement.

#### Implementation
1. Create `tests/integration/sync/interceptor-integration.test.ts`:
   - Mock external APIs
   - Verify permission enforcement end-to-end
   - Verify audit log entries created

2. Test scenarios:
   - Create internal item (allowed/denied)
   - Update external item (allowed/denied)
   - Status sync (allowed/denied)

#### Acceptance Tests
```gherkin
Given integration test environment
When running full sync simulation
Then permissions are enforced correctly
And audit log reflects all operations
```

---

## Preview: Future Phases

**Phase 3 (0084)**: Discrepancy Detection
- TypeScript code analyzer
- Spec-to-code comparison
- Smart update recommendations

**Phase 4 (0085)**: Monitoring & Commands
- `/specweave:sync-monitor` dashboard
- `/specweave:notifications` command
- Log aggregation and querying
