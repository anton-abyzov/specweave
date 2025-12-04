---
id: US-002
feature: FS-090
title: "Job Dependency System"
status: completed
priority: P1
created: 2025-12-02
---

**Origin**: 🏠 **Internal**


# US-002: Job Dependency System

**Feature**: [FS-090](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US2-01**: Jobs can specify `dependsOn: string[]` array of job IDs in config
- [x] **AC-US2-02**: Worker checks dependencies before starting and waits if not ready
- [x] **AC-US2-03**: Job status shows "waiting for dependencies" when blocked
- [ ] **AC-US2-04**: If dependency fails, job proceeds with available data (graceful degradation)
- [ ] **AC-US2-05**: Circular dependency detection prevents infinite waiting
- [x] **AC-US2-06**: `/specweave:jobs` shows dependency status for each job

---

## Implementation

**Increment**: [0090-living-docs-builder](../../../../../increments/0090-living-docs-builder/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-001](../../../../../increments/0090-living-docs-builder/tasks.md#T-001): Extend Background Job Types for Living Docs Builder
- [x] [T-002](../../../../../increments/0090-living-docs-builder/tasks.md#T-002): Create Job Launcher for Living Docs Builder