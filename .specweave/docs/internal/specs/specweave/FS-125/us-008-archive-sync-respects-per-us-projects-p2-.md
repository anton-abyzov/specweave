---
id: US-008
feature: FS-125
title: "Archive Sync Respects Per-US Projects (P2)"
status: completed
priority: P1
created: 2025-12-08
project: specweave
related_projects: [frontend-app]
---

# US-008: Archive Sync Respects Per-US Projects (P2)

**Feature**: [FS-125](./FEATURE.md)

**As a** user archiving completed increments
**I want** archive to preserve per-US project structure
**So that** archived docs remain organized by original project

---

## Acceptance Criteria

- [x] **AC-US8-01**: Archive creates project-specific archive folders
- [x] **AC-US8-02**: Each project's archive contains only its USs
- [x] **AC-US8-03**: Cross-references (symlinks) are removed during archive
- [x] **AC-US8-04**: Archive metadata includes original project mapping
- [x] **AC-US8-05**: Restore recreates cross-project structure

---

## Implementation

**Increment**: [0125-cross-project-user-story-targeting](../../../../increments/0125-cross-project-user-story-targeting/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-023**: Update Archive to Respect Per-US Projects
