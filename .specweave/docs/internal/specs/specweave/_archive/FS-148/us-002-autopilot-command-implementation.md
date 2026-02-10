---
id: US-002
feature: FS-148
title: "Auto Mode as Default in /sw:increment"
status: completed
priority: P1
created: 2025-12-29
project: specweave
---

# US-002: Auto Mode as Default in /sw:increment

**Feature**: [FS-148](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US2-01**: Update `plugins/specweave/commands/increment.md` to enable auto-execution by default
- [x] **AC-US2-02**: Analyze project description for complexity (count features, estimate tasks)
- [x] **AC-US2-03**: If estimated tasks > 25 OR features > 5, trigger multi-increment splitting (10-25 tasks is sweet spot)
- [x] **AC-US2-04**: Present split plan to user with dependency graph before creating
- [x] **AC-US2-05**: Auto-detect dependencies based on feature relationships (auth is foundation, etc.)
- [x] **AC-US2-06**: Create all increments with proper `dependencies: []` field in spec.md
- [x] **AC-US2-07**: After creation, immediately start auto session on first increment in queue
- [x] **AC-US2-08**: Display cost estimate and human gates before starting
- [x] **AC-US2-09**: `--manual` flag skips auto-execution (creates increment but waits)
- [x] **AC-US2-10**: `--dry-run` shows split plan without creating anything

---

## Implementation

**Increment**: [0148-autonomous-execution-auto](../../../../increments/0148-autonomous-execution-auto/spec.md)

**Tasks**: See increment tasks.md for implementation details.
