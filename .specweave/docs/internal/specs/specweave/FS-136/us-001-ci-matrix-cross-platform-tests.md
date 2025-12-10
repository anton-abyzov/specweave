---
id: US-001
feature: FS-136
title: CI Matrix Cross-Platform Tests
status: completed
priority: P2
created: 2025-12-09
project: specweave
external:
  github:
    issue: 817
    url: https://github.com/anton-abyzov/specweave/issues/817
---

# US-001: CI Matrix Cross-Platform Tests

**Feature**: [FS-136](./FEATURE.md)

**As a** SpecWeave developer
**I want** automated tests running on macOS, Linux, and Windows
**So that** platform-specific bugs are caught before release

---

## Acceptance Criteria

- [x] **AC-US1-01**: GitHub Actions workflow with matrix strategy defined
- [x] **AC-US1-02**: Tests run on ubuntu-latest, macos-latest, windows-latest
- [x] **AC-US1-03**: Platform-specific utilities validated (stat commands, process checks, notifications)
- [x] **AC-US1-04**: Build fails if any platform test fails
- [x] **AC-US1-05**: Workflow triggers on pull requests to main/develop
- [x] **AC-US1-06**: Test results visible in PR checks

---

## Implementation

**Increment**: [0136-process-lifecycle-test-suite](../../../../increments/0136-process-lifecycle-test-suite/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create GitHub Actions Workflow for Cross-Platform Tests
