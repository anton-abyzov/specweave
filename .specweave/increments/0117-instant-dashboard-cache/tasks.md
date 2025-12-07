# Tasks: Instant Dashboard Cache

## Overview
Transform status commands from O(n) file parsing to O(1) cache reads.

---

### T-001: Define Cache Schema and Create Rebuild Script
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed
**Estimate**: 30 min

**Description**:
Create the dashboard cache schema and full rebuild script.

**Subtasks**:
- [ ] Create `src/types/dashboard-cache.ts` with interfaces
- [ ] Create `plugins/specweave/scripts/rebuild-dashboard-cache.sh`
- [ ] Implement atomic write pattern (temp file + rename)
- [ ] Add version field for future schema migrations

**Test Plan**:
```bash
# Run rebuild
bash plugins/specweave/scripts/rebuild-dashboard-cache.sh

# Verify output
cat .specweave/state/dashboard.json | jq '.version, .summary'

# Verify atomic write (no partial files)
ls -la .specweave/state/
```

**Acceptance Criteria Verification**:
- AC-US1-01: Check `version` field exists in output
- AC-US1-02: Check all four sections (increments, summary, jobs, costs) exist
- AC-US1-03: Verify temp file cleanup after rename

---

### T-002: Create Incremental Update Script
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04
**Status**: [x] completed
**Estimate**: 45 min

**Description**:
Create script for incremental cache updates triggered by file changes.

**Subtasks**:
- [ ] Create `plugins/specweave/scripts/update-dashboard-cache.sh`
- [ ] Accept args: `<incrementId> <changeType>` (metadata|tasks|spec|jobs)
- [ ] Update only affected increment record
- [ ] Recompute summary with delta math (not full scan)
- [ ] Add file locking for concurrent safety

**Test Plan**:
```bash
# Simulate task completion
bash plugins/specweave/scripts/update-dashboard-cache.sh 0116-livingspec-universal-standard tasks

# Verify only that increment updated (mtime check)
jq '.increments["0116-livingspec-universal-standard"]' .specweave/state/dashboard.json

# Concurrent safety test
for i in {1..5}; do
  bash plugins/specweave/scripts/update-dashboard-cache.sh 0116 tasks &
done
wait
# Should not corrupt cache
jq '.' .specweave/state/dashboard.json >/dev/null && echo "OK"
```

**Acceptance Criteria Verification**:
- AC-US2-03: Time incremental update vs full rebuild (should be 10x faster)
- AC-US2-04: Summary counts match full rebuild after incremental

---

### T-003: Create Pure Bash Readers for Progress/Status/Jobs
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05
**Status**: [x] completed
**Estimate**: 60 min

**Description**:
Create pure bash + jq scripts that read from cache and format output.

**Subtasks**:
- [ ] Create `plugins/specweave/scripts/read-progress.sh`
- [ ] Create `plugins/specweave/scripts/read-status.sh`
- [ ] Create `plugins/specweave/scripts/read-jobs.sh`
- [ ] Match existing output format exactly (visual regression test)
- [ ] Add jq availability check with fallback

**Test Plan**:
```bash
# Compare output
node plugins/specweave/scripts/progress.js > /tmp/node-progress.txt
bash plugins/specweave/scripts/read-progress.sh > /tmp/bash-progress.txt
diff /tmp/node-progress.txt /tmp/bash-progress.txt

# Performance test
time bash plugins/specweave/scripts/read-progress.sh  # Target: <10ms
time node plugins/specweave/scripts/progress.js       # Baseline: ~200ms

# Fallback test (simulate no jq)
PATH_BACKUP=$PATH
PATH=/usr/bin  # Remove jq from PATH
bash plugins/specweave/scripts/read-progress.sh  # Should fallback to Node
PATH=$PATH_BACKUP
```

**Acceptance Criteria Verification**:
- AC-US3-04: `ps aux` during read should show no node process
- AC-US3-05: Fallback warning message shown when jq missing

---

### T-004: Wire Hooks to Use Cache (Read + Write Paths)
**User Story**: US-002, US-003
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-05, AC-US3-01, AC-US3-02, AC-US3-03
**Status**: [x] completed
**Estimate**: 45 min

**Description**:
Integrate cache into hook system for both read and write paths.

**Subtasks**:
- [ ] Update `user-prompt-submit.sh` to use bash readers
- [ ] Update `post-tool-use.sh` to trigger cache updates
- [ ] Add mtime validation before reads
- [ ] Keep Node fallback for jq-missing systems

**Test Plan**:
```bash
# End-to-end test
/specweave:progress  # Should use bash reader, <10ms

# Verify write path
echo "test" >> .specweave/increments/0116-livingspec-universal-standard/tasks.md
# Cache should auto-update on next command

# Verify mtime detection
touch .specweave/increments/0116-livingspec-universal-standard/metadata.json
/specweave:status  # Should detect change, update cache
```

**Acceptance Criteria Verification**:
- AC-US2-05: Modify file externally, run status, verify fresh data

---

### T-005: Add Cache Lifecycle Management
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04
**Status**: [x] completed
**Estimate**: 30 min

**Description**:
Add cache validation, auto-rebuild, and manual commands.

**Subtasks**:
- [ ] Update `session-start.sh` to validate/rebuild cache
- [ ] Add version check and schema migration support
- [ ] Add `specweave cache --rebuild` command
- [ ] Add cache age display in debug mode

**Test Plan**:
```bash
# Test missing cache
rm .specweave/state/dashboard.json
# Start new session - should auto-rebuild

# Test version mismatch
jq '.version = 0' .specweave/state/dashboard.json > tmp && mv tmp .specweave/state/dashboard.json
# Start new session - should rebuild

# Test manual rebuild
specweave cache --rebuild
cat .specweave/state/dashboard.json | jq '.updatedAt'
```

**Acceptance Criteria Verification**:
- AC-US4-01: Delete cache, verify rebuilt on session start
- AC-US4-02: Change version, verify rebuilt
- AC-US4-04: Check debug output shows cache age

---

### T-006: Add Instant Workflow and Costs Commands
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03
**Status**: [x] completed
**Estimate**: 45 min

**Description**:
Extend cache to support workflow suggestions and cost tracking.

**Subtasks**:
- [ ] Create `plugins/specweave/scripts/read-workflow.sh`
- [ ] Create `plugins/specweave/scripts/read-costs.sh`
- [ ] Add workflow logic: phase detection, next action suggestions
- [ ] Extend cache schema with workflow hints

**Test Plan**:
```bash
# Workflow command
/specweave:workflow
# Should show current phase (e.g., "No active increments - ready for new work")
# Should suggest next action

# Costs command
/specweave:costs
# Should show cost dashboard (or "No cost data yet" if empty)
```

**Acceptance Criteria Verification**:
- AC-US5-01: Workflow shows suggestions based on status
- AC-US5-03: Cache contains enough data for workflow logic

---

## Summary

| Task | US | ACs | Estimate |
|------|-----|-----|----------|
| T-001 | US-001 | AC-US1-01, AC-US1-02, AC-US1-03 | 30 min |
| T-002 | US-002 | AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04 | 45 min |
| T-003 | US-003 | AC-US3-01 to AC-US3-05 | 60 min |
| T-004 | US-002, US-003 | AC-US2-01, AC-US2-02, AC-US2-05, AC-US3-01-03 | 45 min |
| T-005 | US-004 | AC-US4-01 to AC-US4-04 | 30 min |
| T-006 | US-005 | AC-US5-01, AC-US5-02, AC-US5-03 | 45 min |

**Total**: 6 tasks, ~4.25 hours

**Dependencies**:
- T-002 depends on T-001 (needs cache schema)
- T-003 depends on T-001 (needs cache to exist)
- T-004 depends on T-002, T-003 (wires everything together)
- T-005 depends on T-001 (cache lifecycle)
- T-006 depends on T-003 (extends reader pattern)

**Recommended Order**: T-001 → T-002 → T-003 → T-004 → T-005 → T-006
