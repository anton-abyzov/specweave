---
id: US-003
feature: FS-063
title: "Large Import Progress Tracking"
status: completed
priority: P1
created: 2025-11-25T11:40:00Z
---

# US-003: Large Import Progress Tracking

**Feature**: [FS-063](./FEATURE.md)

**As a** user importing from large projects (1000+ items),
**I want** real-time progress tracking with ETA,
**So that** I know how long the import will take and can track progress.

---

## Acceptance Criteria

- [x] **AC-US3-01**: Progress shows current/total count with percentage
- [x] **AC-US3-02**: Progress shows estimated time remaining
- [x] **AC-US3-03**: Progress shows items per second rate
- [x] **AC-US3-04**: Each repository import shows its own progress when multi-repo

---

## Implementation

**Increment**: [0063-fix-external-import-multi-repo](../../../../../../increments/_archive/0063-fix-external-import-multi-repo/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-010**: Add totalEstimate to ImportResult
- [x] **T-011**: Enhance onProgress callback with percentage and ETA
- [x] **T-012**: Update spinner display for rich progress
- [x] **T-013**: Show per-repo progress in multi-repo imports
- [ ] **T-019**: Manual integration test with sw-thumbnail-ab
