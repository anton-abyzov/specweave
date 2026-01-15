---
id: US-001
feature: FS-148
title: "Stop Hook-Based Continuation Loop"
status: completed
priority: P1
created: 2025-12-29
project: specweave
---

# US-001: Stop Hook-Based Continuation Loop

**Feature**: [FS-148](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US1-01**: Create `plugins/specweave/hooks/stop-auto.sh` that implements the Stop Hook logic
- [x] **AC-US1-02**: Stop hook checks `.specweave/state/auto-session.json` for active session state
- [x] **AC-US1-03**: When auto active, hook blocks exit and re-feeds original prompt with iteration context
- [x] **AC-US1-04**: Hook tracks `stop_hook_active` flag to detect continuation loops (prevent infinite nesting)
- [x] **AC-US1-05**: Hook reads transcript from `transcript_path` to analyze completion status
- [x] **AC-US1-06**: Completion promise detection: when output contains `<auto-complete>DONE</auto-complete>`, allow exit
- [x] **AC-US1-07**: Max iterations safety: configurable limit (default: 100) prevents runaway execution
- [x] **AC-US1-08**: Session state persisted to disk for recovery after crashes

---

## Implementation

**Increment**: [0148-autonomous-execution-auto](../../../../increments/0148-autonomous-execution-auto/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create session state types and manager
- [x] **T-004**: Create auto index exports
- [x] **T-005**: Create stop-auto.sh hook script
- [x] **T-006**: Implement completion promise detection
- [x] **T-007**: Implement max iterations safety
- [x] **T-008**: Implement stop_hook_active detection
