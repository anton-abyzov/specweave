---
id: US-004
feature: FS-146
title: Unit Tests for Token Passthrough
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 943
    url: https://github.com/anton-abyzov/specweave/issues/943
---

# US-004: Unit Tests for Token Passthrough

**Feature**: [FS-146](./FEATURE.md)

**As a** SpecWeave maintainer,
**I want** unit tests that verify token passthrough behavior,
**So that** this bug doesn't regress in future changes.

---

## Acceptance Criteria

- [x] **AC-US4-01**: Test that `GitHubClientV2` methods pass `GH_TOKEN` in env
- [x] **AC-US4-02**: Test that token from constructor is used, not `process.env`
- [x] **AC-US4-03**: Test that `process.env` values are preserved (not overwritten)
- [x] **AC-US4-04**: Integration test with mock that verifies env passthrough

---

## Implementation

**Increment**: [0146-github-cli-token-passthrough-fix](../../../../increments/0146-github-cli-token-passthrough-fix/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-005**: Create unit tests for token passthrough
- [x] **T-006**: Integration test with mock
- [x] **T-007**: Rebuild and run tests
