---
id: US-001
feature: FS-168
title: Security Fix - Command Injection
status: completed
priority: P1
created: 2026-01-14
project: specweave
external:
  github:
    issue: 1015
    url: https://github.com/anton-abyzov/specweave/issues/1015
---

# US-001: Security Fix - Command Injection

**Feature**: [FS-168](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US1-01**: Fix command injection in command-invoker.ts using execFile instead of exec
- [x] **AC-US1-02**: Add tests for command-invoker with malicious input scenarios
- [x] **AC-US1-03**: Verify no shell interpretation of special characters

---

## Implementation

**Increment**: [0168-code-review-fixes](../../../../increments/0168-code-review-fixes/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Fix Command Injection Vulnerability
