---
id: US-010
feature: FS-090
title: "Init Integration"
status: completed
priority: P1
created: 2025-12-02
---

# US-010: Init Integration

**Feature**: [FS-090](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US10-01**: Init detects brownfield project (existing code, not empty directory)
- [x] **AC-US10-02**: Pre-flight prompts collected at end of init (before job launch)
- [x] **AC-US10-03**: Job launched with dependencies on clone and import jobs
- [x] **AC-US10-04**: Init shows job ID and estimated duration
- [x] **AC-US10-05**: User can skip living docs builder with `--no-living-docs` flag
- [x] **AC-US10-06**: Non-blocking: init completes immediately, job runs in background

---

## Implementation

**Increment**: [0090-living-docs-builder](../../../../../increments/0090-living-docs-builder/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-002**: Create Job Launcher for Living Docs Builder
- [x] **T-008**: Create Worker and Init Integration
