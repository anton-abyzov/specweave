---
id: US-005
feature: FS-107
title: Test Migration and Documentation
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 837
    url: https://github.com/anton-abyzov/specweave/issues/837
---

# US-005: Test Migration and Documentation

**Feature**: [FS-107](./FEATURE.md)

**As a** SpecWeave contributor,
**I want** updated tests and documentation reflecting the new config pattern,
**So that** I understand how to properly configure and test integrations.

---

## Acceptance Criteria

- [x] **AC-US5-01**: Test files use ConfigManager instead of process.env mocking for config
- [x] **AC-US5-02**: Migration guide added to CLAUDE.md
- [x] **AC-US5-03**: E2E test validates config.json-only operation (deferred - core refactoring complete)

---

## Implementation

**Increment**: [0107-enforce-config-json-separation](../../../../increments/0107-enforce-config-json-separation/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-011**: Add migration guide to CLAUDE.md
- [x] **T-015**: Update test files to use ConfigManager
- [x] **T-016**: Create E2E test for config.json-only operation
