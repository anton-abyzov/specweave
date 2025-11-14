---
increment: 0032-prevent-increment-number-gaps
title: "Prevent Increment Number Gaps When Increments Are Abandoned or Paused"
type: bug
priority: P1
status: planned
created: 2025-11-14
epic: FS-25-11-14
test_mode: TDD
coverage_target: 95
---

# Increment 0032: Prevent Increment Number Gaps

## Quick Overview

Fix critical bug where increment ID generation (`getNextIncrementId()` / `getNextFeatureNumber()`) only scans the main `.specweave/increments/` directory, ignoring `_abandoned/` and `_paused/` subdirectories. This causes number reuse when increments are moved to these subdirectories (e.g., increment 0029 was abandoned, next increment tried to use 0029 again).

**Impact**: Data integrity issue - duplicate increment numbers break living docs sync, status line tracking, and external tool integration.

**Solution**: Update all three affected functions to scan ALL increment locations (main directory + `_abandoned/` + `_paused/`) to maintain sequential numbering and complete audit trail.

## User Stories

### US-001: Scan All Increment Directories (P1 - Critical)

**As a** SpecWeave developer
**I want** increment ID generation to scan all increment directories (_abandoned, _paused)
**So that** increment numbers remain sequential even when increments are moved to subdirectories

**Acceptance Criteria**:
- **AC-US1-01**: `getNextFeatureNumber()` scans `.specweave/increments/` directory (main)
- **AC-US1-02**: `getNextFeatureNumber()` scans `.specweave/increments/_abandoned/` directory
- **AC-US1-03**: `getNextFeatureNumber()` scans `.specweave/increments/_paused/` directory
- **AC-US1-04**: Function returns highest number + 1 across ALL three directories
- **AC-US1-05**: Zero-pads result to 4 digits (e.g., "0032")

**Priority**: P1 (Critical - prevents data integrity issues)

---

### US-002: Preserve Audit Trail for Abandoned Increments (P1 - Critical)

**As a** SpecWeave user
**I want** abandoned increments to count in the increment sequence
**So that** the audit trail remains complete and numbers are never reused

**Acceptance Criteria**:
- **AC-US2-01**: Abandoned increment numbers are NOT reused
- **AC-US2-02**: Moving increment to `_abandoned/` doesn't "free up" its number
- **AC-US2-03**: Increment sequence shows gaps where increments were abandoned (e.g., 0028, [0029 abandoned], 0030)
- **AC-US2-04**: User can reconstruct full project history from increment numbers

**Priority**: P1 (Critical - audit trail integrity)

---

### US-003: Prevent Duplicate Increment Numbers (P1 - Critical)

**As a** SpecWeave developer
**I want** the system to prevent creating duplicate increment numbers
**So that** living docs, metadata, and external sync remain consistent

**Acceptance Criteria**:
- **AC-US3-01**: `incrementNumberExists()` checks all three directories (main, _abandoned, _paused)
- **AC-US3-02**: System throws error if duplicate increment number detected
- **AC-US3-03**: Error message indicates which directory contains the duplicate
- **AC-US3-04**: PM agent cannot create increment with existing number
- **AC-US3-05**: JIRA/GitHub import cannot create duplicate increment

**Priority**: P1 (Critical - data integrity)

## Functional Requirements

### FR-001: Comprehensive Directory Scanning
The system MUST scan three directories when determining next increment number:
1. `.specweave/increments/` (active increments)
2. `.specweave/increments/_abandoned/` (abandoned increments)
3. `.specweave/increments/_paused/` (paused increments)

### FR-002: Backward Compatibility
The fix MUST remain backward compatible with existing codebases:
- Legacy 3-digit increment numbers (001-999) still detected
- New 4-digit increment numbers (0001-9999) used going forward
- Both formats handled correctly in mixed environments

### FR-003: Performance Requirements
Directory scanning MUST complete within acceptable time limits:
- **Target**: < 50ms for uncached operation (up to 1000 increments)
- **Caching**: < 1ms for cached operation
- **Cache TTL**: 5 seconds (prevent stale data)

### FR-004: Error Handling
The system MUST gracefully handle error scenarios:
- Missing `_abandoned/` or `_paused/` directories (skip, don't error)
- Permission denied on directory (log warning, continue)
- Malformed increment names (ignore, log warning)
- Empty directories (return "0001" for first increment)

### FR-005: Multiple Affected Files
The fix MUST be applied to ALL three locations:
1. `plugins/specweave/skills/increment-planner/scripts/feature-utils.js` (lines 63-85)
2. `src/integrations/jira/jira-mapper.ts` (lines 395-406)
3. `src/integrations/jira/jira-incremental-mapper.ts` (similar implementation)

### FR-006: Centralized Utility (Recommended)
To avoid code duplication, create centralized utility:
- **Location**: `src/core/increment-utils.ts`
- **Class**: `IncrementNumberManager`
- **Methods**: `getNextIncrementNumber()`, `incrementNumberExists()`, `scanAllIncrementDirectories()`
- All three affected files delegate to this utility

### FR-007: Test Coverage
The fix MUST include comprehensive tests:
- **Unit tests**: 40+ test cases covering all edge cases
- **Integration tests**: 8+ test cases for real-world workflows
- **E2E tests**: 5+ test cases for PM agent, JIRA import, concurrent creation
- **Coverage target**: 95%+ overall, 100% for `IncrementNumberManager`

## Non-Functional Requirements

### NFR-001: Code Quality
- Follow TypeScript/JavaScript best practices
- ESLint/Prettier compliant
- JSDoc comments for all public methods
- Clear error messages with actionable guidance

### NFR-002: Documentation
- Update `.specweave/docs/public/guides/increment-lifecycle.md` with fix details
- Add inline code comments explaining directory scanning logic
- Update ADR with implementation notes
- Create developer quick start guide

### NFR-003: Migration Safety
- Zero breaking changes to existing API
- Deprecation warnings for old function signatures (if centralized)
- Safe to deploy without migration scripts
- Existing increments unaffected

## Test Strategy

### Unit Tests (40+ test cases)
**File**: `tests/unit/increment-utils.test.ts`

Test suites:
1. **Basic Functionality** (8 tests)
   - Empty directory returns "0001"
   - Single increment returns next number
   - Multiple increments return highest + 1
   - Zero-padding to 4 digits

2. **Comprehensive Directory Scanning** (10 tests)
   - Scan main directory only
   - Scan _abandoned only
   - Scan _paused only
   - Scan all three directories
   - Highest number from any directory wins

3. **Caching Behavior** (7 tests)
   - Cache hit returns cached value
   - Cache miss scans filesystem
   - Cache expires after TTL
   - Cache cleared on demand

4. **Error Handling** (8 tests)
   - Missing _abandoned directory (skip, no error)
   - Permission denied (log warning, continue)
   - Malformed increment names (ignore)
   - Invalid paths (throw error)

5. **Backward Compatibility** (7 tests)
   - Detect 3-digit increments (001-999)
   - Detect 4-digit increments (0001-9999)
   - Mixed 3-digit and 4-digit environments
   - Return 4-digit format always

### Integration Tests (8+ test cases)
**File**: `tests/integration/increment-numbering.test.ts`

Test scenarios:
1. Create increment → Abandon → Create next → Verify sequential
2. Create increment → Pause → Resume → Create next
3. PM agent workflow (full end-to-end)
4. JIRA import workflow
5. GitHub sync workflow
6. Concurrent increment creation (race conditions)
7. Cross-file delegation (feature-utils → increment-utils)
8. Real filesystem with actual increments

### E2E Tests (5+ test cases)
**File**: `tests/e2e/increment-creation.spec.ts`

Test flows:
1. `/specweave:increment` command with abandoned increments
2. JIRA epic import with gaps in sequence
3. GitHub issue sync creating new increment
4. Concurrent CLI commands (multiple terminals)
5. Migration from old to new implementation

### Performance Tests
**File**: `tests/benchmarks/increment-numbering.bench.ts`

Benchmarks:
1. Uncached: 10 increments → < 50ms
2. Uncached: 100 increments → < 50ms
3. Uncached: 1000 increments → < 50ms
4. Cached: Any number → < 1ms

## Success Criteria

Post-implementation validation:
- ✅ **Zero duplicate increment numbers** (all tests pass)
- ✅ **Audit trail complete** (abandoned increments preserved in sequence)
- ✅ **Performance acceptable** (< 50ms uncached, < 1ms cached)
- ✅ **Test coverage** ≥ 95% overall
- ✅ **No breaking changes** (backward compatible)
- ✅ **Documentation updated** (user guide, ADR, inline comments)

## Out of Scope

This increment does NOT include:
- ❌ Database-backed sequence numbers (future enhancement)
- ❌ Distributed locking for concurrent creation (low priority)
- ❌ Migration of existing increments (not needed - backward compatible)
- ❌ UI for managing abandoned increments (separate feature)

## Dependencies

**Blocked by**: None (can start immediately)

**Blocks**: None (bug fix, doesn't block other work)

**Related**:
- Increment lifecycle guide (documentation reference)
- Status line feature (uses increment metadata)
- External sync (GitHub/Jira/ADO) - relies on correct increment IDs

## References

**Living Docs Spec** (Permanent Source of Truth):
- `.specweave/docs/internal/specs/default/FS-25-11-14-prevent-increment-number-gaps/FEATURE.md`

**Architecture**:
- `.specweave/docs/internal/architecture/adr/0032-increment-number-gap-prevention.md`
- `.specweave/docs/internal/architecture/diagrams/increment-number-management.mmd`
- `.specweave/docs/internal/architecture/test-strategy-increment-numbering.md`

**Implementation Plan**:
- `.specweave/increments/0032-prevent-increment-number-gaps/plan.md`
- `.specweave/increments/0032-prevent-increment-number-gaps/ARCHITECTURE-SUMMARY.md`
- `.specweave/increments/0032-prevent-increment-number-gaps/DEVELOPER-QUICK-START.md`

**Tasks**:
- `.specweave/increments/0032-prevent-increment-number-gaps/tasks.md` (15 tasks with embedded test plans)

---

**Created**: 2025-11-14
**Type**: Bug Fix (Root Cause Analysis + Fix)
**Priority**: P1 (Critical - Data Integrity)
**Estimated Effort**: 7 hours (6 coding + 1 contingency)
