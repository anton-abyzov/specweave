---
id: US-003
feature: FS-042
title: "Fix Dangerous Test Isolation Patterns (Priority: P1 - CRITICAL)"
status: completed
priority: P1
created: 2025-11-18
---

# US-003: Fix Dangerous Test Isolation Patterns (Priority: P1 - CRITICAL)

**Feature**: [FS-042](../../_features/FS-042/FEATURE.md)

**As a** SpecWeave contributor
**I want** all tests to use safe isolation patterns (createIsolatedTestDir)
**So that** accidental .specweave/ deletion is impossible

---

## Acceptance Criteria

- [x] **AC-US3-02**: All tests use createIsolatedTestDir() or os.tmpdir() *(for HIGH RISK tests)*
- [x] **AC-US3-03**: Eslint rule blocks process.cwd() in test files *(Pre-commit hook used instead)*
- [x] **AC-US3-04**: Pre-commit hook updated to block unsafe patterns
- [x] **AC-US3-05**: All tests with directory cleanup verified safe

---

## Implementation

**Increment**: [0042-test-infrastructure-cleanup](../../../../increments/0042-test-infrastructure-cleanup/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-006**: Audit All process.cwd() Usages
- [x] **T-007**: Fix HIGH RISK Test Files
- [x] **T-008**: Batch Migrate Remaining Unsafe Tests
- [x] **T-009**: Add ESLint Rule and Pre-commit Hook
- [x] **T-010**: Final Validation and Commit Phase 3
- [ ] **T-017**: Create Completion Report
- [ ] **T-018**: Final Validation and Increment Closure
