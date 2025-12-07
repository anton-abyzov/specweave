# Tasks: Bidirectional Sync with Change Detection

## Status Summary
- Total: 8 tasks
- Completed: 8
- In Progress: 0

---

### T-001: Add external-pull Job Type to Scheduler
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02
**Status**: [x] completed

Add new job type `external-pull` to scheduler:
- Add to `JobType` union in `scheduled-job.ts`
- Set default interval to 1 hour (configurable)
- Add job handler that calls `ExternalChangePuller.fetchRecentChanges()`

---

### T-002: Implement ADO Change Detection
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-04
**Status**: [x] completed

Add `fetchRecentChanges()` to ADO client:
- Execute WIQL query: `[System.ChangedDate] > @Today - 1`
- Return `ExternalChange[]` with `changedAt`, `changedBy`, `changedFields`
- Include status, priority, assignee in changed fields
- Handle pagination for large result sets

---

### T-003: Implement JIRA Change Detection
**User Story**: US-001
**Satisfies ACs**: AC-US1-02, AC-US1-04
**Status**: [x] completed

Add `fetchRecentChanges()` to JIRA client:
- Execute JQL query: `updated >= -Nh` where N = hours since last sync
- Request `changelog` expansion to get field changes
- Return `ExternalChange[]` with old/new values from changelog
- Handle pagination for large result sets

---

### T-004: Implement GitHub Change Detection
**User Story**: US-001
**Satisfies ACs**: AC-US1-03, AC-US1-04
**Status**: [x] completed

Add `fetchRecentChanges()` to GitHub client:
- Use Issues API with `since` parameter for updated timestamp
- Filter to only linked issues (by issue number)
- Return `ExternalChange[]` with current state (no changelog available)
- Handle pagination for large result sets

---

### T-005: Create ExternalChangePuller Class
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04
**Status**: [x] completed

Create `src/sync/external-change-puller.ts`:
- `fetchRecentChanges(since: Date)`: Aggregate changes from all platforms
- Platform-specific fetch methods: `fetchAdoChanges`, `fetchJiraChanges`, `fetchGitHubChanges`
- `mapToLivingDocsUpdate()`: Map external changes to living docs format
- Only pull configured fields (status, priority, assignee by default)
- Skip format-preserved fields (title, description, ACs)

---

### T-006: Enhance ConflictResolver with Timestamp Comparison
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04
**Status**: [x] completed

Enhance `src/sync/conflict-resolver.ts`:
- Add `compareTimestamps()` method
- Compare local `lastModified` vs external `ChangedDate`
- Return `ConflictResult` with winner, both timestamps, and reason
- External wins if external timestamp is more recent
- Log conflict resolution with both timestamps

---

### T-007: Create LivingDocsUpdater for Frontmatter Updates
**User Story**: US-002, US-004
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US4-03, AC-US4-04
**Status**: [x] completed

Create `src/sync/living-docs-updater.ts`:
- `applyChanges(changes: ExternalChange[])`: Apply pulled changes
- `updateFrontmatter(filePath, field, value)`: Update YAML frontmatter
- Add sync metadata: `lastPulledAt`, `externalModifiedAt`, `externalModifiedBy`
- Add `/specweave:sync-pull` command for manual trigger
- Call on session start for overnight changes

---

### T-008: Enhance SyncAuditLogger with Pull Fields
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04
**Status**: [x] completed

Enhance audit logging for pull operations:
- Add `direction: 'pull' | 'push'` field to `AuditLogEntry`
- Add `externalChangedBy`, `externalChangedAt` fields
- Add `oldValue`, `newValue` for changed fields
- Add `conflictResolution: 'local-wins' | 'external-wins' | 'no-conflict'`
- Update `/specweave:sync-logs` to show pull operations

---
