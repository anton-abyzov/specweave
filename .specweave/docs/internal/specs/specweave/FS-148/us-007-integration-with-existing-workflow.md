---
id: US-007
feature: FS-148
title: "Auto-Aware Existing Workflow Commands"
status: completed
priority: P1
created: 2025-12-29
project: specweave
---

# US-007: Auto-Aware Existing Workflow Commands

**Feature**: [FS-148](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US7-01**: Update `/sw:do` to continue until ALL tasks complete (stop hook loop by default)
- [x] **AC-US7-02**: Update `/sw:do` to add `--manual` flag to opt-out of auto-continuation
- [x] **AC-US7-03**: Update `/sw:next` to auto-transition and continue execution by default
- [x] **AC-US7-04**: Update `/sw:next` to show queue and dependencies when auto session active
- [x] **AC-US7-05**: Update `/sw:done` to auto-transition to next queued increment
- [x] **AC-US7-06**: Update `/sw:progress` to show auto session info (iteration, cost, queue, circuit breakers)
- [x] **AC-US7-07**: Update `/sw:status` to show auto session indicator and pending human gates
- [x] **AC-US7-08**: All commands respect existing PM validation gates (tasks, tests, docs)
- [x] **AC-US7-09**: All commands update tasks.md and spec.md checkboxes via existing Edit operations
- [x] **AC-US7-10**: When no auto session active, commands behave as before (backwards compatible)
- [x] **AC-US7-11**: `--simple` flag for simple mode: just loop + tasks.md completion + max iterations (no session state, queues, circuit breakers)

---

## Implementation

**Increment**: [0148-autonomous-execution-auto](../../../../increments/0148-autonomous-execution-auto/spec.md)

**Tasks**: See increment tasks.md for implementation details.
