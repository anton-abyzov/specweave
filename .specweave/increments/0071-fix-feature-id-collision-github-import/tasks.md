---
increment: 0071-fix-feature-id-collision-github-import
status: in-progress
phases:
  - analysis
  - implementation
  - testing
estimated_tasks: 13
---

# Tasks: Fix Feature ID Collision and GitHub Import

## Phase 1: Analysis & Design

### T-001: Analyze current FS-ID allocation algorithm
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed
**Priority**: P1

- Review `FSIdAllocator.allocateId()` in `fs-id-allocator.ts`
- Document current behavior for internal vs external features
- Identify exact point where collision check should be added

### T-002: Analyze GitHub import flow for missing issues
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02
**Status**: [x] completed
**Priority**: P1

- Review `github-importer.ts` pagination logic
- Check `includeClosed` default behavior
- Verify parent repo inclusion in umbrella mode
- Test with real GitHub repos to reproduce issue

---

## Phase 2: Feature ID Collision Fix

### T-003: Implement unified numeric sequence for FS-IDs (within project)
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed
**Priority**: P1

**Implementation**:
1. Added `findFirstAvailableIndex()` method to FSIdAllocator
2. Checks if numeric index is used by ANY feature (internal OR external)
3. Added `isNumericIndexUsed(index: number): boolean` helper
4. Within each project: FS-001 and FS-001E cannot coexist

**Files modified**:
- `src/living-docs/fs-id-allocator.ts` (lines 564-607)

### T-003b: Fix per-project sequences (disable global collision)
**User Story**: US-001
**Satisfies ACs**: AC-US1-03
**Status**: [x] completed
**Priority**: P1

**Problem**: `enableGlobalCollisionDetection: isUmbrellaMode` forced global sequence
**Fix**: Set `enableGlobalCollisionDetection: false` - each project is independent

**Files modified**:
- `src/cli/helpers/init/external-import.ts` (line 950)

### T-004: Add collision detection logging
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [ ] pending
**Priority**: P2

- Log warning when numeric collision would have occurred
- Include suggestion to run migration/fix command
- Format: `⚠️ Numeric collision prevented: FS-001 exists, allocated FS-002E instead`

### T-005: Update getMaxId() to consider both suffixes
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed
**Priority**: P1

**Verified**: `getMaxId()` already extracts numeric part from ALL features (line 501)
```typescript
const numbers = Array.from(this.existingFeatures.keys()).map(id => this.extractNumber(id));
```

---

## Phase 3: GitHub Import Completeness Fix

### T-006: Add prompt for including closed issues
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed
**Priority**: P1

**Implementation**:
- Added confirm prompt: "Include closed/resolved issues?" (default: Yes)
- Pass `includeClosed` value to coordinator config

**Files modified**:
- `src/cli/helpers/init/external-import.ts` (lines 393-398)

### T-007: Add progress indicator for pagination
**User Story**: US-002
**Satisfies ACs**: AC-US2-02
**Status**: [ ] pending
**Priority**: P2

**Implementation**:
1. Add callback to `paginate()` for progress updates
2. Show: "Fetching issues... page 1/N (items: 100)"
3. Update spinner text on each page

### T-008: Verify parent repo included in umbrella import
**User Story**: US-002
**Satisfies ACs**: AC-US2-03
**Status**: [x] completed
**Priority**: P1

**Verified**: Fix already exists in `getExistingSyncProfiles()` (lines 535-555)
- Parent repo from `config.umbrella.parentRepo` is included
- Handles both "owner/repo" and "repo" formats

### T-009: Add per-repo import summary
**User Story**: US-002
**Satisfies ACs**: AC-US2-05
**Status**: [x] completed
**Priority**: P2

**Implementation**:
- Group items by `sourceRepo` field
- Display per-repo breakdown with open/closed counts
- Tree format with totals

**Files modified**:
- `src/cli/helpers/init/external-import.ts` (lines 816-855)

### T-010: Implement dry-run mode for import
**User Story**: US-002
**Satisfies ACs**: AC-US2-06
**Status**: [ ] pending
**Priority**: P3

**Implementation**:
1. Add `--dry-run` flag to import commands
2. Fetch and display what WOULD be imported
3. Don't create any files in dry-run mode

---

## Phase 4: Testing

### T-011: Add unit tests for FS-ID collision prevention
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed
**Priority**: P1

**Test cases implemented**:
1. TC-133: Unified Numeric Sequence tests
   - Skip index when internal FS-001 exists → allocate FS-002E
   - Skip index when external FS-001E exists → allocate FS-002E
   - Append behavior for new features
   - isNumericIndexUsed() helper tests
2. TC-134: Per-Project Sequences tests
   - Same index allowed in different projects
   - Separate sequences per project

**Files modified**:
- `tests/unit/living-docs/fs-id-allocator.test.ts`

### T-012: Add integration test for GitHub import completeness
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03
**Status**: [ ] pending
**Priority**: P2

**Test cases**:
1. Import includes closed issues when configured
2. Pagination fetches all pages
3. Parent repo included in umbrella mode
4. Summary shows correct counts

---

## Summary

| Phase | Tasks | Status |
|-------|-------|--------|
| Analysis | T-001, T-002 | ✅ Done |
| FS-ID Fix | T-003, T-003b, T-005 | ✅ Done |
| Import Fix | T-006, T-008, T-009 | ✅ Done |
| Testing | T-011 | ✅ Done |
| Remaining | T-004, T-007, T-010, T-012 | ⏳ P2-P3 |

**Core fixes implemented**: 8/13 tasks completed (all P1 tasks done)
