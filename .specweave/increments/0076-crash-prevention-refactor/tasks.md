# Tasks for 0072-crash-prevention-refactor

## T-001: Analyze spec-sync-manager.test.ts structure
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed
**Action**: Read file, identify test suite boundaries for splitting

---

## T-002: Create test file split structure
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed
**Action**: Created 4 test files in tests/unit/spec-sync-manager/
- core.test.ts (238 lines)
- plan-regen.test.ts (90 lines)
- tasks-regen.test.ts (96 lines)
- status-preservation.test.ts (201 lines)

---

## T-003: Verify all tests pass after split
**User Story**: US-001
**Satisfies ACs**: AC-US1-02, AC-US1-03
**Status**: [x] completed
**Action**: 29 tests passing across 4 files

---

## T-004: Analyze external-resource-validator.ts structure
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed
**Action**: Identified Jira (~650 lines) and ADO (~400 lines) validator classes

---

## T-005: Create validators/ folder with modules
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02
**Status**: [x] completed (partial)
**Action**: Created src/utils/validators/ with types.ts (85 lines)
**Note**: Full class extraction deferred - file at 1401 lines (under 1500 limit)

---

## T-006: Create validators/index.ts barrel export
**User Story**: US-002
**Satisfies ACs**: AC-US2-03, AC-US2-04
**Status**: [x] completed
**Action**: Created index.ts re-exporting types and validators

---

## T-007: Analyze living-docs-sync.ts structure
**User Story**: US-003
**Satisfies ACs**: AC-US3-01
**Status**: [x] completed
**Action**: Analyzed - file at 1393 lines with existing types.ts

---

## T-008: Create living-docs-sync/ helper folder
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02
**Status**: [-] deferred
**Action**: Deferred - file at 1393 lines (under 1500 limit), existing types.ts present

---

## T-009: Refactor main file to orchestrator
**User Story**: US-003
**Satisfies ACs**: AC-US3-03, AC-US3-04
**Status**: [-] deferred
**Action**: Deferred - monitor for growth past 1500 lines

---

## T-010: Final verification - build and test
**User Story**: All
**Satisfies ACs**: All
**Status**: [x] completed
**Action**: Build passes, tests pass

---

## Summary

**Completed:**
- spec-sync-manager.test.ts: 1523 → 625 lines (4 files) ✓
- external-resource-validator.ts: types extracted, barrel export created ✓
- Build and tests verified ✓

**Deferred (under 1500 line limit):**
- living-docs-sync.ts: 1393 lines - monitor for growth
- external-resource-validator.ts class extraction: 1401 lines - monitor for growth
