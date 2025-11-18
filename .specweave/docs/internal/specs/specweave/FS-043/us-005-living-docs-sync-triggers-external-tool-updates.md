---
id: US-005
feature: FS-043
title: Living Docs Sync Triggers External Tool Updates
status: planning
project: specweave
priority: P1
created: 2025-11-18
external:
  github:
    issue: 621
    url: https://github.com/anton-abyzov/specweave/issues/621
---

# US-005: Living Docs Sync Triggers External Tool Updates

**Epic**: FS-043
**Priority**: P1
**Status**: Planning
**Story Points**: 13

---

## User Story

**As a** developer using GitHub/JIRA/ADO sync
**I want** living docs sync to automatically update external tools (GitHub issues, JIRA tickets, ADO work items)
**So that** I don't have to manually run separate sync commands and external tools stay in sync with living docs

---

## Acceptance Criteria

- [ ] **AC-US5-01**: `LivingDocsSync.syncIncrement()` detects external tool configuration from metadata.json
  - **Tests**: Unit test - mock metadata.json with github/jira/ado config → verify detection
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (unit test with mocked metadata)

- [ ] **AC-US5-02**: When GitHub configured, living docs sync triggers `updateIssueLivingDocs()`
  - **Tests**: Unit test - mock GitHub config → verify updateIssueLivingDocs called with correct params
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (unit test with mocked GitHub updater)

- [ ] **AC-US5-03**: When no external tools configured, living docs sync completes without triggering external sync
  - **Tests**: Unit test - mock metadata WITHOUT external tools → verify no external calls
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (unit test - guard clause verification)

- [ ] **AC-US5-04**: When multiple external tools configured (GitHub + JIRA), all are synced
  - **Tests**: Unit test - mock GitHub + JIRA config → verify both updaters called
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P2
  - **Testable**: Yes (unit test with multiple mocked updaters)

- [ ] **AC-US5-05**: External tool sync failures are logged but don't break living docs sync
  - **Tests**: Unit test - mock GitHub sync failure → verify error logged, living docs sync succeeds
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (unit test with mock rejection + error spy)

- [ ] **AC-US5-06**: Dry-run mode skips external tool sync
  - **Tests**: Unit test - syncIncrement with dryRun: true → verify no external calls
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P2
  - **Testable**: Yes (unit test with dry-run option)

- [ ] **AC-US5-07**: Skipped test `github-sync-living-docs.skip.test.ts` is enabled and passes
  - **Tests**: Rename .skip.test.ts → .test.ts, update test to use new implementation, verify passes
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P2
  - **Testable**: Yes (existing test file, just needs enabling)

---

## Example Scenario

```bash
# Before fix (MANUAL):
$ /specweave:sync-docs update 0040
✅ Living docs synced
# GitHub issues still show OLD data ❌

$ /specweave-github:sync  # MUST run manually
✅ GitHub issue #123 updated

# After fix (AUTOMATIC):
$ /specweave:sync-docs update 0040
✅ Living docs synced
📡 Syncing to external tools: github
✅ Synced to GitHub issue #123
# ONE command updates everything! ✅
```

---

## Implementation Notes

- Add `detectExternalTools()` private method to `LivingDocsSync` class
- Add `syncToExternalTools()` private method to `LivingDocsSync` class
- Add `collectLivingDocsPaths()` private method to extract paths from sync result
- Call `syncToExternalTools()` at end of `syncIncrement()` method
- Use dynamic imports for external tool updaters (avoid circular dependencies)
- Log all external tool sync attempts (success/failure)

**Test File Location**:
- `tests/unit/living-docs/living-docs-external-tool-sync.test.ts` (NEW)
- `tests/unit/github/github-sync-living-docs.test.ts` (ENABLE - currently .skip.test.ts)

**Root Cause Analysis**:
- Feature was planned (skipped test exists) but never implemented
- Living docs sync and external tool sync were developed independently
- No integration test to catch this gap
- Manual workflow (`/specweave:sync-docs` then `/specweave-github:sync`) hid the problem

**Why This Matters**:
- **Source of Truth Discipline**: Living docs should automatically propagate to external tools
- **Developer Experience**: One command (`/specweave:sync-docs`) should update everything
- **Stakeholder Visibility**: GitHub/JIRA issues always show latest specs, ACs, tasks
- **Automation**: Eliminates manual sync step, reduces errors

---

## Tasks

> **Note**: Tasks will be filled by test-aware-planner during increment planning

---

**Related**:
- [Epic](../../_features/FS-043/FEATURE.md)
- [Increment Spec](../../../../increments/0043-spec-md-desync-fix/spec.md)
