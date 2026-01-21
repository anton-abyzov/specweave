---
id: US-004
feature: FS-150
title: "E2E Coverage Manifest"
status: in_progress
priority: P0
created: 2025-12-30
project: specweave
---

# US-004: E2E Coverage Manifest

**Feature**: [FS-150](./FEATURE.md)

**As a** developer with a UI project
**I want** auto mode to track which routes/buttons/viewports are tested
**So that** I know my E2E coverage is comprehensive

---

## Acceptance Criteria

- [x] **AC-US4-01**: Auto-generates manifest from routes (Next.js, React Router, etc.)
- [x] **AC-US4-02**: Tracks which routes have E2E tests
- [ ] **AC-US4-03**: Tracks critical buttons/actions tested
- [ ] **AC-US4-04**: Tracks viewports tested (mobile 375px, tablet 768px, desktop 1280px)
- [ ] **AC-US4-05**: Stop hook blocks if coverage manifest incomplete
- [ ] **AC-US4-06**: Reports coverage gaps in completion message

---

## Implementation

**Increment**: [0150-auto-mode-world-class-testing](../../../../increments/0150-auto-mode-world-class-testing/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-012**: Create E2E coverage manifest generator
- [x] **T-013**: Track route coverage during test runs
- [x] **T-014**: Add manifest check to stop hook
