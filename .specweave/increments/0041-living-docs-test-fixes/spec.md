---
increment: 0041-living-docs-test-fixes
title: "Complete Living Docs Test Fixes"
priority: P1
status: planned
created: 2025-11-17
type: bug
structure: user-stories
dependencies:
  - 0040-vitest-living-docs-mock-fixes
tech_stack:
  detected_from: "package.json"
  language: "typescript"
  framework: "node.js"
  testing: "vitest"
estimated_effort: "2-4 hours"
---

# Bug Fix: Complete Living Docs Test Fixes

## Overview

Complete the Vitest migration for living-docs tests by fixing 9 remaining test failures that were explicitly deferred as "out of scope" in increment 0040. Remove unused ThreeLayerSyncManager stub code to clean up technical debt.

## Background

**Increment 0040** successfully completed:
- ✅ Mock syntax migration (`anyed<>` → `vi.mocked()`)
- ✅ Fixed cross-linker.test.ts (28/28 passing)
- ✅ Added deletion protection for tests

**Deferred** (PM-validated as out of scope):
- ⏳ content-distributor.test.ts: 3 failures (assertion mismatches)
- ⏳ project-detector.test.ts: 2 failures (logic changes)
- ⏳ three-layer-sync.test.ts: 4 failures (incomplete implementation)

**Current Test Health**: 61/70 tests passing (87% pass rate)
**Target**: 100% pass rate

## Problem Statement

**Test Failures Blocking Development**:
1. CI/CD shows red status (blocking merges)
2. Contributors see failing tests (confusion about test health)
3. Technical debt accumulating (unused stub code)

**Root Cause**:
- Minor assertion mismatches after logic refactoring
- Incomplete ThreeLayerSyncManager feature (stub, never integrated)

## User Stories

### US-001: Fix content-distributor Test Assertions (P1)

**As a** contributor
**I want** content-distributor tests to pass
**So that** I can confidently modify living-docs distribution logic

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Test "should skip unchanged files" passes
  - Update assertion to match new skipping logic
  - Expected: Files with identical content are marked as skipped
- [ ] **AC-US1-02**: Test "should handle errors during file write" passes
  - Update error handling check to match new error propagation
  - Expected: Errors are captured in result.errors array
- [ ] **AC-US1-03**: Test "should generate index file for category" passes
  - Update assertion to expect "**Files**: 2" (Markdown bold format)
  - Expected: Index template uses bold Markdown formatting

**Test Files**:
- `tests/unit/living-docs/content-distributor.test.ts:209,213,463`

---

### US-002: Fix project-detector Test Assertions (P1)

**As a** contributor
**I want** project-detector tests to pass
**So that** I can modify multi-project logic with confidence

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Test "should detect project from team name" passes
  - Update reasoning format expectation
  - Expected: Reasoning may not include literal word "team" (semantic match)
- [ ] **AC-US2-02**: Test "should include metadata in result" passes
  - Update totalProjects expectation from 3 to 4
  - Expected: Default project now included in count

**Test Files**:
- `tests/unit/living-docs/project-detector.test.ts:195,355`

---

### US-003: Remove ThreeLayerSyncManager Stub (P1)

**As a** maintainer
**I want** unused stub code removed
**So that** the codebase stays clean and contributors aren't confused

**Acceptance Criteria**:
- [ ] **AC-US3-01**: ThreeLayerSyncManager.ts deleted
  - Remove `src/core/living-docs/ThreeLayerSyncManager.ts`
  - Verify no imports reference this file
- [ ] **AC-US3-02**: three-layer-sync.test.ts deleted
  - Remove `tests/unit/living-docs/three-layer-sync.test.ts`
  - Update test count in CI configuration
- [ ] **AC-US3-03**: CodeValidator comment updated
  - Remove example reference in `src/core/living-docs/CodeValidator.ts`
  - Use a different example file path
- [ ] **AC-US3-04**: No remaining references
  - Grep codebase for "ThreeLayerSync" - zero results
  - Verify build succeeds with zero errors

**Rationale**:
- ThreeLayerSyncManager was a stub implementation (never integrated)
- No production code uses it (only referenced in comments)
- Test failures are due to incomplete implementation
- Removing reduces confusion and technical debt

---

## Success Criteria

1. **Test Health**: 100% pass rate in living-docs test suite
   - content-distributor.test.ts: 25/25 passing
   - project-detector.test.ts: 38/38 passing
   - three-layer-sync.test.ts: REMOVED (not applicable)
   - **Total**: 63/63 tests passing (100%)

2. **Code Quality**: Zero references to ThreeLayerSync in codebase
   - `grep -r "ThreeLayerSync" src/` → No results
   - `grep -r "ThreeLayerSync" tests/` → No results

3. **Build Health**: Zero build errors after removal
   - `npm run build` → Success
   - `npm run test:unit` → All passing

## Out of Scope

- ❌ Implementing actual ThreeLayerSyncManager feature (not needed)
- ❌ Refactoring content-distributor or project-detector logic
- ❌ Adding new tests beyond fixing existing ones
- ❌ Performance optimization

## Dependencies

- **0040-vitest-living-docs-mock-fixes**: Mock syntax migration completed

## References

- Increment 0040 PM Validation Report: `.specweave/increments/0040/PM-VALIDATION-REPORT.md`
- Ultrathink Analysis: See conversation context
- Test Failures: `npm run test:unit -- tests/unit/living-docs/`
