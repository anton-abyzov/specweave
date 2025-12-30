---
id: US-004
feature: FS-148
title: "Multi-Increment Orchestration"
status: completed
priority: P1
created: 2025-12-29
project: specweave
---

# US-004: Multi-Increment Orchestration

**Feature**: [FS-148](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US4-01**: Auto session state tracks `incrementQueue: string[]` (ordered list of increment IDs)
- [x] **AC-US4-02**: After completing increment N, automatically transitions to increment N+1
- [x] **AC-US4-03**: Respects WIP limits from config (default: 1 active increment)
- [x] **AC-US4-04**: Validates dependencies before starting each increment
- [x] **AC-US4-05**: Option `--increments <id1,id2,id3>` specifies explicit queue
- [x] **AC-US4-06**: Option `--all-backlog` processes all backlog items in priority order
- [x] **AC-US4-07**: Generates per-increment completion reports
- [x] **AC-US4-08**: Saves overall session summary with cost, duration, and outcomes

---

## Implementation

**Increment**: [0148-autonomous-execution-auto](../../../../increments/0148-autonomous-execution-auto/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-018**: Create increment queue manager
- [x] **T-019**: Implement dependency validation
- [x] **T-020**: Implement WIP limit checking
- [x] **T-021**: Implement --increments option
- [x] **T-022**: Implement --all-backlog option
- [x] **T-023**: Generate per-increment completion reports
