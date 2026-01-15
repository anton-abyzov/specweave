---
id: US-001
feature: FS-161
title: "Hook Execution Warnings"
status: completed
priority: P0
created: 2026-01-07
project: specweave-dev
---

# US-001: Hook Execution Warnings

**Feature**: [FS-161](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US1-01**: Hook responses include `warnings` array with failure messages
- [x] **AC-US1-02**: Claude Code displays warnings to user in conversation
- [x] **AC-US1-03**: Warnings include actionable recommendations (e.g., "Run specweave check-hooks")
- [x] **AC-US1-04**: Silent `{"continue":true}` replaced with `{"continue":true, "warnings": [...]}`
- [x] **AC-US1-05**: Critical failures (merge conflicts, syntax errors) show ERROR severity
- [x] **AC-US1-06**: Timeout failures show WARNING severity
- [x] **AC-US1-07**: Hook execution time logged for performance monitoring

---

## Implementation

**Increment**: [0161-hook-execution-visibility-and-command-reliability](../../../../increments/0161-hook-execution-visibility-and-command-reliability/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
