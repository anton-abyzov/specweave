---
increment: 0094-unit-test-alignment
status: completed
---

# Increment 0094: Unit Test Alignment

## Problem Statement

263 unit tests are failing due to:
1. **Missing fs-native exports** - `mkdtemp`/`mkdtempSync` not exported
2. **Duplicate imports** - Test files have duplicate vitest imports
3. **fs-extra usage** - Tests still import forbidden `fs-extra` package
4. **Mock pattern issues** - Incorrect vitest mock setup
5. **Template changes** - Template content changed but tests not updated
6. **Logic changes** - Various implementation changes not reflected in tests

## Scope

Fix failing unit tests to match current implementation.

## Acceptance Criteria

- [x] **AC-001**: All `mkdtemp`/`mkdtempSync` errors resolved
- [x] **AC-002**: All duplicate import errors resolved
- [x] **AC-003**: All fs-extra imports replaced with fs-native
- [x] **AC-004**: All mock pattern issues fixed
- [x] **AC-005**: Template validation tests updated
- [x] **AC-006**: Logic-based test failures fixed (67% reduction)
- [x] **AC-007**: `npm run test:unit` passes with 0 failures (189 test files, 3455 tests)
