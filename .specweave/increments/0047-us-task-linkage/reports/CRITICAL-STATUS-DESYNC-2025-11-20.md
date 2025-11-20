# Critical Incident: Status Line & AC Desynchronization (2025-11-20)

## Severity: CRITICAL
**Impact**: False progress reporting, broken source-of-truth discipline
**Detected**: 2025-11-20 17:45 UTC
**Resolved**: 2025-11-20 17:50 UTC
**Duration**: 5 minutes
**Reporter**: User ultrathink

---

## Executive Summary

A critical data integrity violation was discovered in increment 0047-us-task-linkage:

1. **Status line showed mathematically impossible count**: `55/52 tasks` (105% completion)
2. **Frontmatter desync**: tasks.md frontmatter showed `completed: 40` when reality was `52/52`
3. **43 ACs unmarked**: Despite all implementing tasks being complete, 43 ACs remained unchecked in spec.md

**Root Cause**: Stale status line cache + manual AC checkbox updates bypassing automatic sync hooks

---

## Timeline

### 2025-11-20 17:45:00 UTC - Detection
- User observes status line: `[0047-us-task-linkage] ████████ | 55/52 tasks | 57/103 ACs`
- User questions: "How is 55/52 possible?"

### 17:45:30 - Investigation Begins
- Read tasks.md frontmatter: `total_tasks: 52, completed: 40` ← OUT OF DATE
- Grep actual task count: 52 task headers found
- Grep actual completion: 52 tasks marked `**Status**: [x] completed`
- **Finding**: ALL 52 tasks actually complete, but frontmatter shows only 40

### 17:46:00 - Status Cache Discovery
- Examine `.specweave/state/status-line.json`
- Cache shows: `"completed": 55, "total": 52, "percentage": 105`
- **Critical**: Cache corrupted with impossible values

### 17:46:30 - Root Cause Identified
- Status line uses `dist/src/cli/count-tasks.js` for accurate counting
- CLI reports correct values: `{"total":52,"completed":52,"percentage":100}`
- Cache was stale/corrupted from previous run
- Manual `update-status-line.sh` execution fixes cache

### 17:47:00 - AC Desync Discovery
- Total ACs in spec.md: 103
- Completed ACs: 57 (55%)
- Verification script checks: **43 ACs should be marked complete** based on completed tasks
- **Critical Finding**: Increment is actually 97% complete, not 55%!

### 17:48:00 - Remediation
1. ✅ Fixed tasks.md frontmatter: `completed: 40 → 52`
2. ✅ Updated status cache: `55/52 → 52/52`
3. ✅ Marked 43 ACs as complete: `57/103 → 100/103`
4. ✅ Verified remaining 3 ACs are legitimately incomplete

### 17:50:00 - Resolution Confirmed
- Status line now shows: `52/52 tasks | 100/103 ACs`
- Frontmatter synchronized
- All completed tasks have corresponding AC checkboxes updated

---

## Affected Acceptance Criteria (43 ACs Updated)

### US-005: Progress Tracking by User Story (3 ACs)
- [x] AC-US5-01: `/specweave:progress` displays task completion grouped by User Story
- [x] AC-US5-02: Progress output shows: `US-001: [8/11 tasks completed] 73%`
- [x] AC-US5-03: Progress summary includes total tasks by US (metadata.json frontmatter: `by_user_story`)

### US-007: External Item Import on Init (1 AC)
- [x] AC-US7-08: Support GitHub, JIRA, and Azure DevOps imports

### US-008: ID Collision Resolution (1 AC)
- [x] AC-US8-05: ID uniqueness validation before assignment

### US-009: Origin Tracking and Sync Direction Configuration (4 ACs)
- [x] AC-US9-02: Three independent permission settings in config.json control external tool sync behavior
- [x] AC-US9-03: When canUpsertInternalItems=true, internal US creates external item AND syncs ongoing content updates
- [x] AC-US9-04: When canUpdateExternalItems=true, external US content updates sync back to external tool
- [x] AC-US9-05: When canUpdateStatus=true, status updates sync to external tool (for BOTH internal AND external items)

### US-009A: External Item Format Preservation (10 ACs)
- [x] AC-US9A-01: External items preserve original title when syncing to external tool
- [x] AC-US9A-02: External items preserve original description structure
- [x] AC-US9A-03: Completion updates posted as comments ONLY (non-invasive)
- [x] AC-US9A-04: Status updates ONLY if canUpdateStatus=true
- [x] AC-US9A-05: Internal items enforce standard [FS-XXX][US-YYY] format
- [x] AC-US9A-06: Format preservation flag in living docs frontmatter
- [x] AC-US9A-07: Completion comment includes task, AC, and progress info
- [x] AC-US9A-08: Validation blocks format-breaking updates for external items
- [x] AC-US9A-09: Sync service routes to comment-only mode based on origin
- [x] AC-US9A-10: External title stored in metadata for validation

### US-010: External Import Slash Command (12 ACs)
- [x] AC-US10-01: `/specweave:import-external` command invokes external tool import coordinator
- [x] AC-US10-02: Command detects configured external tools (GitHub, JIRA, ADO)
- [x] AC-US10-03: Command supports time range filtering (since last import, 1 month, 3 months, all, custom)
- [x] AC-US10-04: Command supports platform filtering (--github-only, --jira-only, --ado-only, or all)
- [x] AC-US10-05: Command creates living docs files with E suffix (NO increment creation)
- [x] AC-US10-06: Command shows progress indicator (spinner, item count, platform)
- [x] AC-US10-07: Command displays summary report (items imported, duplicates skipped, errors)
- [x] AC-US10-08: Command updates sync metadata (last import timestamp per platform)
- [x] AC-US10-09: Command handles rate limiting with retry suggestions
- [x] AC-US10-10: Command warns for large imports (> 100 items) with confirmation prompt
- [x] AC-US10-11: Command supports dry-run mode (--dry-run) showing what would be imported
- [x] AC-US10-12: Command skips duplicates (checks existing US-IDs with E suffix)

### US-011: Multi-Repo Selection Strategy (1 AC)
- [x] AC-US11-12: Allow editing repository selection after initial setup

### US-013: Archive Command for Features and Epics (11 ACs)
- [x] AC-US13-01: Create `/specweave:archive` slash command with feature and epic parameters
- [x] AC-US13-02: When archiving feature, move entire FS-XXX folder to `.specweave/docs/_archive/specs/`
- [x] AC-US13-03: When archiving feature, archive ALL related User Stories
- [x] AC-US13-04: When archiving epic (User Story), move only specific US-XXX folder to archive
- [x] AC-US13-05: Preserve folder structure in archive (maintain FS-XXX/US-XXX hierarchy)
- [x] AC-US13-06: Add archive metadata (archived_at timestamp, archived_by user, reason)
- [x] AC-US13-08: Prevent archiving if feature/epic has active increments referencing it
- [x] AC-US13-09: Support dry-run mode to preview what will be archived
- [x] AC-US13-10: Create `/specweave:restore` command to unarchive features/epics
- [x] AC-US13-11: Maintain archived ID registry to prevent reuse (archived IDs remain occupied)
- [x] AC-US13-12: Generate archive summary report (count of features/USs archived, storage size)

---

## Remaining Incomplete ACs (3 ACs, Legitimately Not Done)

1. **AC-US9-06**: External items preserve original external ID for reference
   - Status: NOT IMPLEMENTED (testing/validation pending)

2. **AC-US9-09**: Sync logs track origin-based update conflicts
   - Status: NOT IMPLEMENTED (logging infrastructure pending)

3. **AC-US13-07**: Support optional reason parameter for audit trail
   - Status: NOT IMPLEMENTED (enhancement deferred)

---

## Root Cause Analysis

### Primary Cause: Stale Status Cache
- Status line cache (`.specweave/state/status-line.json`) contained stale data
- Cache showed `55/52` tasks, which is mathematically impossible
- Running `update-status-line.sh` corrected the cache to `52/52`

### Contributing Factor: Manual AC Updates
- 43 ACs were marked complete in tasks via `**Satisfies ACs**` field
- AC checkboxes in spec.md were NOT automatically updated
- This indicates automatic AC sync (via hooks) may not be fully operational

### Why Did This Happen?
1. **Status cache corruption**: Unknown event caused cache to record 55 completed tasks instead of 52
2. **Frontmatter not updated**: tasks.md frontmatter still showed `completed: 40` from earlier state
3. **AC sync gap**: No automatic mechanism to update AC checkboxes when tasks complete

---

## Impact Assessment

### Data Integrity Impact: CRITICAL
- ❌ Source of truth violated (frontmatter ≠ reality)
- ❌ Status line showed impossible math (55/52)
- ❌ Progress reporting severely inaccurate (55% vs 97%)
- ✅ No data loss (all task completion data preserved)

### User Impact: HIGH
- Users saw increment as 55% complete when actually 97% complete
- False sense of remaining work (43 "incomplete" ACs were actually done)
- Status line showing impossible values erodes trust in framework accuracy

### Business Impact: MEDIUM
- Incorrect progress reporting could lead to wrong prioritization decisions
- Trust in SpecWeave's automatic sync mechanisms questioned
- Demonstrates need for validation layers

---

## Remediation Actions

### Immediate Actions (Completed)
1. ✅ **Fixed status cache**: Re-ran `update-status-line.sh` to sync cache with reality
2. ✅ **Updated frontmatter**: Changed `completed: 40 → 52` in tasks.md
3. ✅ **Marked 43 ACs**: Updated all ACs linked to completed tasks
4. ✅ **Verified 3 remaining ACs**: Confirmed these are legitimately incomplete

### Verification Script Created
Created `/tmp/verify-acs.sh` to cross-check:
- Completed tasks → their linked ACs → AC checkbox status in spec.md
- Identified mismatches automatically
- Can be integrated into `/specweave:validate` command

---

## Prevention Measures

### Short-Term (For This Increment)
1. **Validation gate**: Before `/specweave:done`, run verification script to ensure AC sync
2. **Manual verification**: User confirms all ACs are correctly marked
3. **Status cache refresh**: Always run `update-status-line.sh` before closing increment

### Medium-Term (Next Increments)
1. **Implement automatic AC sync**: When task marked complete, automatically check linked ACs
2. **Add AC validation to pre-commit hook**: Block commits if ACs desynchronized from tasks
3. **Status cache validation**: Detect impossible values (completed > total) and auto-correct

### Long-Term (Framework Enhancement)
1. **ADR-0048**: "AC Checkbox Auto-Sync on Task Completion" (proposed)
2. **Implement dual-write pattern**: Update both tasks.md and spec.md atomically
3. **Add AC coverage validator**: Integrate into `/specweave:validate` command
4. **Status cache integrity checks**: Validate cache values on read, reject impossible data

---

## Lessons Learned

### What Went Wrong
1. **No automatic AC sync**: Manual checkbox updates prone to human error/forgetting
2. **Stale cache accepted**: No validation layer to reject impossible status values
3. **No cross-check**: AC completion not validated against task completion

### What Went Right
1. **User vigilance**: User immediately noticed impossible 55/52 math
2. **Quick diagnosis**: Verification scripts quickly identified all 43 missing ACs
3. **No data loss**: All completion data was preserved in tasks.md

### Recommendations
1. **Automate AC sync**: Never rely on manual checkbox updates for ACs linked to tasks
2. **Validate status cache**: Reject any cache data with impossible values
3. **Add coverage validation**: Include AC coverage checks in `/specweave:validate`
4. **Pre-closure checks**: Run full validation before allowing increment closure

---

## Related Incidents

- **2025-11-19**: Increment 0044 incorrectly closed with tasks.md desync ([INCIDENT-SOURCE-OF-TRUTH-VIOLATION.md](../../0044-integration-testing-status-hooks/reports/INCIDENT-SOURCE-OF-TRUTH-VIOLATION.md))
- **2025-11-20**: Status line showing 21/52 instead of 26/52 due to missing TodoWrite ([increment 0047 autonomous report](./AUTONOMOUS-SESSION-SUMMARY-2025-11-20.md))

**Pattern**: Recurring theme of sync desynchronization between tasks, ACs, and metadata. Points to need for stronger validation and automatic sync mechanisms.

---

## Verification

### Before Fix
```
Status Line: [0047] ████████ | 55/52 tasks (105%) | 57/103 ACs (55%)
Frontmatter: total_tasks: 52, completed: 40
Reality:     52/52 tasks complete (100%)
```

### After Fix
```
Status Line: [0047] ████████ | 52/52 tasks (100%) | 100/103 ACs (97%)
Frontmatter: total_tasks: 52, completed: 52
Reality:     52/52 tasks complete, 100/103 ACs complete
Remaining:   AC-US9-06, AC-US9-09, AC-US13-07 (legitimately incomplete)
```

---

## Sign-Off

**Resolved By**: Claude (via user ultrathink)
**Verified By**: Automated verification script + manual inspection
**Incident Closed**: 2025-11-20 17:50 UTC
**Status**: ✅ RESOLVED

**Next Actions**:
1. Complete remaining 3 ACs (AC-US9-06, AC-US9-09, AC-US13-07)
2. Run `/specweave:validate` before closure
3. Consider implementing ADR-0048 (automatic AC sync) in next increment

---

**Reference**: `.specweave/increments/0047-us-task-linkage/reports/CRITICAL-STATUS-DESYNC-2025-11-20.md`
