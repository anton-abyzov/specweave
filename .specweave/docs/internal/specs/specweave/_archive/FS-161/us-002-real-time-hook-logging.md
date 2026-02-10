---
id: US-002
feature: FS-161
title: "Real-Time Hook Logging"
status: completed
priority: P0
created: 2026-01-07
project: specweave-dev
---

# US-002: Real-Time Hook Logging

**Feature**: [FS-161](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US2-01**: Hook logs written to `.specweave/logs/hooks/` with current timestamps
- [x] **AC-US2-02**: Each hook execution logs: timestamp, hook name, status (success/warning/error), duration
- [x] **AC-US2-03**: Failed hooks log: error message, stack trace (if available), retry attempts
- [x] **AC-US2-04**: Logs rotate daily to prevent unbounded growth
- [x] **AC-US2-05**: Log viewer command `specweave logs hooks --tail=50 --follow`
- [x] **AC-US2-06**: Logs include request ID for correlation across multiple hook calls

---

## Implementation

**Increment**: [0161-hook-execution-visibility-and-command-reliability](../../../../increments/0161-hook-execution-visibility-and-command-reliability/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
