---
id: US-003
feature: FS-148
title: "Leverage Claude Code's Built-in Session Recovery"
status: completed
priority: P1
created: 2025-12-29
project: specweave
---

# US-003: Leverage Claude Code's Built-in Session Recovery

**Feature**: [FS-148](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US3-01**: Track progress in `tasks.md` (source of truth), NOT in separate session state
- [x] **AC-US3-02**: On `/sw:do`, detect incomplete tasks and continue from last incomplete task
- [x] **AC-US3-03**: Use Claude Code's `/resume` for session recovery (don't reinvent)
- [x] **AC-US3-04**: Generate session summary in `.specweave/logs/` on graceful completion
- [x] **AC-US3-05**: `/sw:progress` shows resumable state based on tasks.md checkboxes
- [x] **AC-US3-06**: Recovery is **increment-based**, not session-based: "Increment 0148 has 5/12 tasks done. Continuing..."

---

## Implementation

**Increment**: [0148-autonomous-execution-auto](../../../../increments/0148-autonomous-execution-auto/spec.md)

**Tasks**: See increment tasks.md for implementation details.
