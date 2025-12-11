---
id: US-009
feature: FS-140
title: Update Test Suite
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 906
    url: https://github.com/anton-abyzov/specweave/issues/906
---

# US-009: Update Test Suite

**Feature**: [FS-140](./FEATURE.md)

**As a** developer running tests
**I want** all tests to pass with the new resolution system
**So that** I have confidence the refactoring is correct

---

## Acceptance Criteria

- [x] **AC-US9-01**: All 47 tests referencing `frontmatter.project` updated
- [x] **AC-US9-02**: New tests for `ProjectResolutionService` added
- [x] **AC-US9-03**: Integration tests verify end-to-end project resolution
- [x] **AC-US9-04**: Tests cover single-project mode resolution
- [x] **AC-US9-05**: Tests cover multi-project mode resolution
- [x] **AC-US9-06**: Tests cover cross-project increment handling
- [x] **AC-US9-07**: Tests verify fallback mechanisms work correctly
- [x] **AC-US9-08**: All existing tests pass (no regressions)

---

## Implementation

**Increment**: [0140-remove-frontmatter-project-field](../../../../increments/0140-remove-frontmatter-project-field/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-006**: Write Comprehensive Unit Tests
- [x] **T-011**: Update Living Docs Sync Tests
- [x] **T-024**: Update Validation Hook Tests
- [x] **T-034**: Update All Test Fixtures
- [x] **T-035**: Run Full Test Suite
- [x] **T-036**: Integration Test: End-to-End Increment Creation
- [x] **T-037**: Test Single-Project Mode Resolution
- [x] **T-038**: Test Multi-Project Mode Resolution
- [x] **T-039**: Test Cross-Project Increment Handling
- [x] **T-040**: Test Fallback Mechanisms
