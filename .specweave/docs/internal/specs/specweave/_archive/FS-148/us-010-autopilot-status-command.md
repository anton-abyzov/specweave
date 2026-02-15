---
id: US-010
feature: FS-148
title: 'Intelligent "Ask User When Stuck" Behavior'
status: completed
priority: P1
created: 2025-12-29
project: specweave
---

# US-010: Intelligent "Ask User When Stuck" Behavior

**Feature**: [FS-148](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US10-01**: When no work available (empty queue, no backlog, no external items), prompt user for next action
- [x] **AC-US10-02**: When tests fail 3x consecutively, offer options: review error, fix manually, skip task
- [x] **AC-US10-03**: When ambiguous technical decision arises, present options with tradeoffs
- [x] **AC-US10-04**: When dependency is blocked (increment depends on incomplete work), offer: wait, skip, ask
- [x] **AC-US10-05**: When "stuck" (no progress for N iterations), escalate to user with context
- [x] **AC-US10-06**: Track "stuck" metrics: consecutive failures, no-progress iterations, blocked time

---

## Implementation

**Increment**: [0148-autonomous-execution-auto](../../../../increments/0148-autonomous-execution-auto/spec.md)

**Tasks**: See increment tasks.md for implementation details.
