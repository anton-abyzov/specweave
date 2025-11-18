---
increment: 0043-spec-md-desync-fix
title: "Fix Sync Infrastructure: spec.md Desync + Living Docs → External Tools"
priority: P1
status: active
type: bug
created: 2025-11-18
started: 2025-11-18
test_mode: TDD
coverage_target: 90
epic: FS-043
---

# Fix Sync Infrastructure: spec.md Desync + Living Docs → External Tools

## Overview

**Problem Statement**: SpecWeave has TWO critical sync infrastructure bugs:

1. **spec.md Desync**: When closing an increment via `/specweave:done`, the system updates `metadata.json` but fails to update `spec.md` YAML frontmatter. This causes status line and hook failures because they read from spec.md (the documented source of truth), not metadata.json.

2. **Living Docs → External Tools**: When syncing living docs via `/specweave:sync-docs`, the system does NOT trigger external tool sync (GitHub, JIRA, ADO). This violates source-of-truth discipline and requires manual sync commands.

**Impact Severity**: HIGH (P1)

**Bug 1 Impact (spec.md Desync)**:
- Status line shows wrong active increment (developer confusion)
- Hooks read stale status data (potential sync failures with GitHub/JIRA/ADO)
- Violates "spec.md = source of truth" architectural principle
- Multi-increment workflows break (status line cache never updates)

**Bug 2 Impact (Living Docs → External Tools)**:
- GitHub/JIRA/ADO issues show STALE data (stakeholders see wrong information)
- Requires manual sync commands (`/specweave-github:sync` after `/specweave:sync-docs`)
- Violates source-of-truth discipline (living docs should automatically propagate)
- Developer workflow inefficiency (2 commands instead of 1)

**Target Users**:
- SpecWeave developers (primary - experience status line bugs daily)
- Framework contributors (secondary - rely on accurate increment status)
- CI/CD pipelines (tertiary - hooks must read correct status)

**Business Value**:
- **Developer productivity**: Eliminate status line confusion (save ~5 min/day checking status)
- **Data integrity**: Single source of truth (spec.md) always accurate
- **Hook reliability**: External sync hooks read correct status
- **Trust**: Developers can rely on status line as ground truth

**Dependencies**:
- MetadataManager class (`src/core/increment/metadata-manager.ts`)
- spec.md YAML frontmatter parser (`gray-matter` library)
- Status line hook (`plugins/specweave/hooks/lib/update-status-line.sh`)
- Increment closure workflow (`/specweave:done` command)

---

## Root Cause Analysis

**Discovery Date**: 2025-11-18

**Evidence**:
1. **Increment 0038** (`0038-serverless-template-verification`):
   - metadata.json: `"status": "completed"` ✅
   - spec.md frontmatter: `status: active` ❌ (STALE!)

2. **Increment 0041** (`0041-file-watcher-fix`):
   - metadata.json: `"status": "completed"` ✅
   - spec.md frontmatter: `status: active` ❌ (STALE!)

3. **Increment 0042** (`0042-test-infrastructure-cleanup`):
   - metadata.json: `"status": "in-progress"` ✅
   - spec.md frontmatter: `status: in-progress"` ✅ (CORRECT)

**Symptom**: Status line showed "0038-serverless..." instead of "0042-test..." even though 0038 was completed.

**Root Cause**:
`MetadataManager.updateStatus()` in `src/core/increment/metadata-manager.ts` (lines 268-324) updates:
- ✅ `metadata.json` (via `this.write()`)
- ✅ Active increment cache (via `activeManager.setActive()` or `smartUpdate()`)
- ❌ **spec.md YAML frontmatter** (NOT UPDATED!)

**Code Location**:
```typescript
// src/core/increment/metadata-manager.ts:268-324
static updateStatus(
  incrementId: string,
  newStatus: IncrementStatus,
  reason?: string
): IncrementMetadata {
  const metadata = this.read(incrementId);

  // ... validation ...

  metadata.status = newStatus;
  metadata.lastActivity = new Date().toISOString();

  // ... update status-specific fields ...

  this.write(incrementId, metadata); // ✅ Updates metadata.json

  // **CRITICAL**: Update active increment state
  const activeManager = new ActiveIncrementManager();

  if (newStatus === IncrementStatus.ACTIVE) {
    activeManager.setActive(incrementId);
  } else if (/* ... non-active states ... */) {
    activeManager.smartUpdate();
  }

  // ❌ MISSING: Update spec.md YAML frontmatter!

  return metadata;
}
```

**Why This Matters**:
- Status line hook reads spec.md (line 50): `status=$(grep -m1 "^status:" "$spec_file" ...)`
- Living docs sync hooks read spec.md frontmatter
- Architecture docs declare: "spec.md is source of truth for increment state"
- Metadata.json is internal implementation detail, spec.md is user-visible

**Architectural Principle Violated**:
> "spec.md YAML frontmatter is the **single source of truth** for increment metadata.
> metadata.json is a derived cache for performance."
> — `.specweave/docs/internal/architecture/hld-system.md`

---

## User Stories

### US-001: Status Line Shows Correct Active Increment (Priority: P1 - CRITICAL)

**As a** developer working on SpecWeave
**I want** the status line to always show the CURRENT active increment
**So that** I know which increment I'm working on without manually checking folders

**Acceptance Criteria**:
- [ ] **AC-US1-01**: When closing increment via `/specweave:done`, status line updates to next active increment
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (E2E test: close increment → verify status line)

- [ ] **AC-US1-02**: Status line never shows completed increments as active
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (scan all completed increments → verify status line excludes them)

- [ ] **AC-US1-03**: Status line hook reads spec.md and finds correct status (not stale "active")
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (integration test: call status line hook → verify parses spec.md correctly)

**Example Scenario**:
```bash
# Before fix (BUG):
$ /specweave:done 0038
✅ Increment 0038 completed
# metadata.json: "status": "completed" ✅
# spec.md: status: active ❌ (STALE!)

$ claude-code  # Start new session
Status line: [0038-serverless-template-verification] ████░░ 12/15 tasks (2 open)
# ❌ WRONG! 0038 is completed, should show 0042

# After fix (CORRECT):
$ /specweave:done 0038
✅ Increment 0038 completed
# metadata.json: "status": "completed" ✅
# spec.md: status: completed ✅ (UPDATED!)

$ claude-code  # Start new session
Status line: [0042-test-infrastructure-cleanup] ████████░ 45/50 tasks (1 open)
# ✅ CORRECT! Shows actual active increment
```

---

### US-002: spec.md and metadata.json Stay in Sync (Priority: P1 - CRITICAL)

**As a** SpecWeave framework contributor
**I want** spec.md and metadata.json to always have the same status value
**So that** I can trust either file as the source of truth without data corruption

**Acceptance Criteria**:
- [x] **AC-US2-01**: `MetadataManager.updateStatus()` updates both metadata.json AND spec.md frontmatter
  - **Tests**: `tests/unit/increment/metadata-manager-spec-sync.test.ts` (4 tests passing)
  - **Tasks**: T-005 (MetadataManager Integration)
  - **Priority**: P1
  - **Testable**: Yes (unit test: call updateStatus → verify both files updated)
  - **Status**: ✅ COMPLETE (T-005)

- [ ] **AC-US2-02**: Sync validation detects desyncs and warns user
  - **Tests**: (deferred - validation scripts optional)
  - **Tasks**: T-008, T-009 (validation scripts)
  - **Priority**: P2
  - **Testable**: Yes (create desync manually → verify validation detects it)
  - **Status**: ⏸️ DEFERRED (nice-to-have, not critical)

- [x] **AC-US2-03**: All status transitions (active→paused, active→completed, etc.) update spec.md
  - **Tests**: `tests/unit/increment/metadata-manager-spec-sync.test.ts` (verifies updateStatus() called)
  - **Tasks**: T-005 (all transitions use same updateStatus() method)
  - **Priority**: P1
  - **Testable**: Yes (test each transition → verify spec.md updated)
  - **Status**: ✅ COMPLETE (T-005, T-007)

- [x] **AC-US2-04**: spec.md status field matches IncrementStatus enum values exactly
  - **Tests**: `tests/unit/increment/spec-frontmatter-updater.test.ts` (enum validation test)
  - **Tasks**: T-001 (SpecFrontmatterUpdater validates enum)
  - **Priority**: P1
  - **Testable**: Yes (verify status in spec.md is valid enum value)
  - **Status**: ✅ COMPLETE (T-001)

**Implementation Notes**:
- Use `gray-matter` library to parse/update YAML frontmatter
- Atomic update: write spec.md AFTER metadata.json succeeds (rollback on failure)
- Preserve existing frontmatter fields (don't overwrite unrelated fields)
- Update ONLY the `status` field in frontmatter

---

### US-003: Hooks Read Correct Increment Status (Priority: P1 - CRITICAL)

**As a** developer using GitHub/JIRA/ADO sync
**I want** hooks to read the latest increment status from spec.md
**So that** external tools stay in sync with SpecWeave state

**Acceptance Criteria**:
- [ ] **AC-US3-01**: Status line hook (`update-status-line.sh`) reads spec.md and finds correct status
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (integration test: call hook → verify reads updated spec.md)

- [ ] **AC-US3-02**: Living docs sync hooks read spec.md frontmatter and get correct status
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P2
  - **Testable**: Yes (mock sync hook → verify reads spec.md not metadata.json)

- [ ] **AC-US3-03**: GitHub sync reads completed status from spec.md and closes GitHub issue
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P2
  - **Testable**: Yes (E2E test: close increment → verify GitHub issue closed)

**Hook Contract**:
```bash
# Status line hook (plugins/specweave/hooks/lib/update-status-line.sh:50)
status=$(grep -m1 "^status:" "$spec_file" 2>/dev/null | cut -d: -f2 | tr -d ' ')

# Expected behavior:
# - spec.md has "status: completed" → hook finds "completed"
# - Cache excludes completed increments
# - Status line shows next active increment
```

---

### US-004: Existing Desyncs Detected and Repaired (Priority: P2 - Important)

**As a** SpecWeave maintainer
**I want** a script to detect and repair existing spec.md/metadata.json desyncs
**So that** the codebase is in a clean state before deploying the fix

**Acceptance Criteria**:
- [ ] **AC-US4-01**: Validation script scans all increments and finds desyncs
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P2
  - **Testable**: Yes (create test desyncs → verify script finds them)

- [ ] **AC-US4-02**: Repair script updates spec.md to match metadata.json (metadata.json is source of truth for repair)
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P2
  - **Testable**: Yes (create desync → run repair → verify spec.md fixed)

- [ ] **AC-US4-03**: Repair script logs all changes for audit trail
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P3
  - **Testable**: Yes (verify log file contains all repaired increments)

**Known Desyncs to Repair**:
- Increment 0038: metadata.json="completed", spec.md="active"
- Increment 0041: metadata.json="completed", spec.md="active"
- Any others discovered by validation script

---

### US-005: Living Docs Sync Triggers External Tool Updates (Priority: P1 - CRITICAL)

**As a** developer using GitHub/JIRA/ADO sync
**I want** living docs sync to automatically update external tools (GitHub issues, JIRA tickets, ADO work items)
**So that** I don't have to manually run separate sync commands and external tools stay in sync with living docs

**Acceptance Criteria**:
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

**Implementation Notes**:
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

**Example Scenario**:
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

## Functional Requirements

**FR-001**: spec.md Frontmatter Update on Status Change
- System SHALL update spec.md YAML frontmatter `status` field when `MetadataManager.updateStatus()` is called
- Update SHALL happen atomically with metadata.json update (both succeed or both fail)
- Priority: P1
- Testable: Yes (unit test)

**FR-002**: Preserve Existing Frontmatter Fields
- System SHALL preserve all existing frontmatter fields when updating status
- System SHALL NOT overwrite fields like `title`, `priority`, `created`, `test_mode`, etc.
- Priority: P1
- Testable: Yes (unit test: update status → verify other fields unchanged)

**FR-003**: Rollback on Failure
- If spec.md update fails, system SHALL rollback metadata.json update
- User SHALL see error message with rollback notification
- Priority: P1
- Testable: Yes (simulate spec.md write failure → verify metadata.json not updated)

**FR-004**: Validation Command
- System SHALL provide `/specweave:validate-sync` command to detect desyncs
- Command SHALL scan all increments and report mismatches
- Priority: P2
- Testable: Yes (integration test)

**FR-005**: Repair Script
- System SHALL provide `repair-spec-desync.ts` script to fix existing desyncs
- Script SHALL update spec.md to match metadata.json (for backward compat)
- Script SHALL create backup before making changes
- Priority: P2
- Testable: Yes (E2E test)

---

## Non-Functional Requirements

**NFR-001**: Performance
- spec.md update SHALL add < 10ms overhead to status change operations
- Validation script SHALL scan 100 increments in < 5 seconds
- Priority: P2
- Testable: Yes (benchmark test)

**NFR-002**: Reliability
- spec.md update SHALL succeed 99.9% of the time (atomic write, temp file → rename)
- Rollback mechanism SHALL prevent partial updates
- Priority: P1
- Testable: Yes (failure injection test)

**NFR-003**: Backward Compatibility
- Existing increments with desync SHALL continue to work (graceful degradation)
- Repair script SHALL be optional (framework doesn't break without it)
- Priority: P1
- Testable: Yes (test with desynced increments)

**NFR-004**: Auditability
- All status changes SHALL be logged with timestamp and old/new values
- Repair script SHALL create audit log of all changes
- Priority: P3
- Testable: Yes (verify log files)

---

## Test Strategy

### Unit Tests (90% coverage target)

**File**: `tests/unit/increment/metadata-manager-spec-sync.test.ts`
- Test `updateStatus()` updates both metadata.json AND spec.md
- Test frontmatter preservation (other fields not overwritten)
- Test rollback on spec.md write failure
- Test all status transitions (active→completed, active→paused, etc.)
- Test invalid status value rejection

**File**: `tests/unit/increment/spec-frontmatter-updater.test.ts`
- Test YAML frontmatter parsing with `gray-matter`
- Test frontmatter update preserves field order
- Test frontmatter update handles missing status field
- Test frontmatter update validates status enum values

### Integration Tests

**File**: `tests/integration/core/increment-status-sync.test.ts`
- Test E2E: `/specweave:done` → verify spec.md updated
- Test E2E: `/specweave:pause` → verify spec.md updated
- Test E2E: `/specweave:resume` → verify spec.md updated
- Test status line hook reads updated spec.md
- Test validation command detects desyncs

### E2E Tests (Playwright)

**File**: `tests/e2e/increment-closure.spec.ts`
- Test full workflow: create increment → do work → close → verify status line
- Test multiple increments: close 0038 → verify status line shows 0042
- Test repair script: create desync → run repair → verify fixed

### Manual Testing Checklist

- [ ] Close increment 0038 (currently desynced) → verify spec.md updated
- [ ] Run status line hook → verify reads "completed" from spec.md
- [ ] Create new increment → close it → verify status line updates
- [ ] Run validation script → verify finds 0038, 0041 desyncs
- [ ] Run repair script → verify 0038, 0041 fixed

---

## Success Criteria

**Metric 1**: Zero Desync Incidents (Production)
- **Target**: 0 desyncs reported in production after deployment
- **Measurement**: Monitor GitHub issues, Discord, user reports
- **Timeframe**: 30 days post-deployment

**Metric 2**: Status Line Accuracy (Developer Experience)
- **Target**: 100% of developers report status line shows correct increment
- **Measurement**: Survey 10 active contributors
- **Timeframe**: 2 weeks post-deployment

**Metric 3**: Repair Script Effectiveness (Technical Debt)
- **Target**: All existing desyncs (0038, 0041, etc.) repaired
- **Measurement**: Run validation script → 0 desyncs found
- **Timeframe**: Immediate (before deployment)

**Metric 4**: Test Coverage (Quality)
- **Target**: 90%+ coverage for spec.md sync code
- **Measurement**: Vitest coverage report
- **Timeframe**: Before PR merge

**Metric 5**: Performance Impact (Regression Prevention)
- **Target**: < 10ms overhead on status change operations
- **Measurement**: Benchmark test comparing old vs new implementation
- **Timeframe**: Before PR merge

---

## Implementation Notes

### Technical Approach

**1. Add SpecFrontmatterUpdater Class** (`src/core/increment/spec-frontmatter-updater.ts`):
```typescript
export class SpecFrontmatterUpdater {
  /**
   * Update spec.md YAML frontmatter status field
   * Preserves all other fields
   */
  static async updateStatus(
    incrementId: string,
    status: IncrementStatus
  ): Promise<void> {
    const specPath = path.join(process.cwd(), '.specweave', 'increments', incrementId, 'spec.md');

    // Read spec.md
    const content = await fs.readFile(specPath, 'utf-8');
    const { data, content: body } = matter(content);

    // Update status field
    data.status = status;

    // Write back atomically
    const updated = matter.stringify(body, data);
    const tempPath = `${specPath}.tmp`;
    await fs.writeFile(tempPath, updated, 'utf-8');
    await fs.rename(tempPath, specPath);
  }
}
```

**2. Update MetadataManager.updateStatus()** (add spec.md sync):
```typescript
static updateStatus(
  incrementId: string,
  newStatus: IncrementStatus,
  reason?: string
): IncrementMetadata {
  // ... existing validation ...

  // Update metadata.json
  this.write(incrementId, metadata);

  // **NEW**: Update spec.md frontmatter
  try {
    await SpecFrontmatterUpdater.updateStatus(incrementId, newStatus);
  } catch (error) {
    // Rollback metadata.json update
    this.write(incrementId, originalMetadata);
    throw new MetadataError(
      `Failed to update spec.md, rolled back metadata.json: ${error}`,
      incrementId
    );
  }

  // Update active increment cache
  // ...
}
```

**3. Validation Script** (`.specweave/increments/0043-spec-md-desync-fix/scripts/validate-sync.ts`):
```typescript
#!/usr/bin/env tsx
import { MetadataManager } from '../../../../src/core/increment/metadata-manager.js';
import matter from 'gray-matter';

const desyncs: string[] = [];

const allIncrements = MetadataManager.getAll();
for (const metadata of allIncrements) {
  const specPath = path.join(process.cwd(), '.specweave', 'increments', metadata.id, 'spec.md');
  const content = await fs.readFile(specPath, 'utf-8');
  const { data } = matter(content);

  if (data.status !== metadata.status) {
    desyncs.push(`${metadata.id}: metadata.json="${metadata.status}", spec.md="${data.status}"`);
  }
}

if (desyncs.length > 0) {
  console.error('❌ Desyncs detected:');
  desyncs.forEach(d => console.error(`  - ${d}`));
  process.exit(1);
} else {
  console.log('✅ All increments in sync');
}
```

**4. Repair Script** (`.specweave/increments/0043-spec-md-desync-fix/scripts/repair-desync.ts`):
```typescript
#!/usr/bin/env tsx
// Repairs existing desyncs by updating spec.md to match metadata.json
// (metadata.json is source of truth for repair)

const repaired: string[] = [];

for (const desync of desyncs) {
  await SpecFrontmatterUpdater.updateStatus(desync.id, desync.metadataStatus);
  repaired.push(desync.id);
}

console.log(`✅ Repaired ${repaired.length} desyncs:`, repaired);
```

---

## Migration Plan

**Phase 1: Repair Existing Desyncs** (Pre-deployment)
1. Run validation script → find all desyncs
2. Run repair script → fix spec.md for 0038, 0041, etc.
3. Verify: run validation script → 0 desyncs

**Phase 2: Deploy Fix** (Code changes)
1. Merge PR with `SpecFrontmatterUpdater` class
2. Update `MetadataManager.updateStatus()` to sync spec.md
3. Add tests (unit + integration + E2E)

**Phase 3: Monitoring** (Post-deployment)
1. Run validation script daily (CI job)
2. Monitor GitHub issues for desync reports
3. Survey contributors about status line accuracy

---

## Dependencies

**External Libraries**:
- `gray-matter` (already in use) - YAML frontmatter parsing
- `fs-extra` (already in use) - Atomic file operations

**Internal Modules**:
- `MetadataManager` - Needs modification to sync spec.md
- `IncrementStatus` enum - Used for validation
- Active increment cache - Already updated by MetadataManager

**Hooks Affected**:
- `update-status-line.sh` - Already reads spec.md, no changes needed
- `post-increment-completion.sh` - May need to verify spec.md updated
- Living docs sync hooks - Already read spec.md, no changes needed

---

## Risk Assessment

**Risk 1: Backward Compatibility Breaking**
- **Probability**: Low
- **Impact**: Medium
- **Mitigation**: Repair script fixes existing desyncs before deployment

**Risk 2: spec.md Write Failure (File System Issues)**
- **Probability**: Low
- **Impact**: High (status change fails)
- **Mitigation**: Rollback mechanism, atomic writes, comprehensive error handling

**Risk 3**: Performance Regression (File I/O Overhead)**
- **Probability**: Low
- **Impact**: Low
- **Mitigation**: Benchmark tests, async I/O, temp file strategy

**Risk 4: Merge Conflicts (Multi-Session Edits)**
- **Probability**: Low (status field rarely edited manually)
- **Impact**: Low
- **Mitigation**: Atomic writes (temp → rename), last-write-wins strategy

---

## Related Documentation

**Architecture**:
- `.specweave/docs/internal/architecture/hld-system.md` - Source of truth principle
- `.specweave/docs/internal/architecture/increment-lifecycle.md` - Status transitions

**Implementation**:
- `src/core/increment/metadata-manager.ts` - Current status management
- `plugins/specweave/hooks/lib/update-status-line.sh` - Status line hook

**Testing**:
- `tests/unit/increment/` - Unit test location
- `tests/integration/core/` - Integration test location

---

## Questions for Tech Lead / Architect

1. **Rollback Strategy**: Should we rollback metadata.json if spec.md update fails, or treat metadata.json as source of truth and retry spec.md update?
   - **Recommendation**: Rollback metadata.json (atomicity principle)

2. **Repair Script**: Should repair use metadata.json or spec.md as source of truth for existing desyncs?
   - **Recommendation**: Use metadata.json (it has been updated correctly, spec.md is stale)

3. **Validation Frequency**: Should validation script run in pre-commit hook, CI, or both?
   - **Recommendation**: CI only (pre-commit would be too slow)

4. **Status Enum Values**: Should we add validation to ensure spec.md status matches IncrementStatus enum?
   - **Recommendation**: Yes (fail fast on invalid values)

---

## Glossary

- **Desync**: State where metadata.json and spec.md have different status values
- **Source of Truth**: The authoritative data source (spec.md for increment metadata)
- **Frontmatter**: YAML metadata at the top of Markdown files (between `---` delimiters)
- **Atomic Update**: All-or-nothing operation (both files updated or neither)
- **Rollback**: Reverting changes when an operation fails partway through
- **WIP Limit**: Work-in-progress limit (max 1 active increment at a time)

---

**Last Updated**: 2025-11-18
**Status**: Planning (spec.md completed, awaiting architect review)
**Next Steps**:
1. Review by Tech Lead / Architect
2. Invoke test-aware-planner for tasks.md
3. Invoke Architect for plan.md
4. Execute validation script to confirm desyncs exist
