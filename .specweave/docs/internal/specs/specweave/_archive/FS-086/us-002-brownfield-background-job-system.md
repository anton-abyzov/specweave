---
id: US-002
feature: FS-086
title: "Brownfield Background Job System"
status: completed
priority: P0
created: 2025-12-01
---

**Origin**: 🏠 **Internal**


# US-002: Brownfield Background Job System

**Feature**: [FS-086](./FEATURE.md)

**As a** developer with a large enterprise codebase,
**I want** the analysis to run as a background job,
**So that** I can continue working while it processes 1000+ repos.

---

## Acceptance Criteria

- [x] **AC-US2-01**: Create job type `brownfield-analysis` in background job system
- [x] **AC-US2-02**: Job shows progress: phase, items processed, ETA
- [x] **AC-US2-03**: Job can be paused/resumed without losing progress
- [x] **AC-US2-04**: Job survives session restart (persistent state)
- [x] **AC-US2-05**: `/specweave:jobs` shows brownfield analysis status
- [x] **AC-US2-06**: Job completion triggers notification with summary

---

## Implementation

**Increment**: [0086-brownfield-doc-analysis](../../../../../increments/0086-brownfield-doc-analysis/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-004](../../../../../increments/0086-brownfield-doc-analysis/tasks.md#T-004): Extend Background Job System for Brownfield
- [x] [T-005](../../../../../increments/0086-brownfield-doc-analysis/tasks.md#T-005): Implement Brownfield Analysis Worker
- [x] [T-008](../../../../../increments/0086-brownfield-doc-analysis/tasks.md#T-008): Jobs Command Integration and Notifications