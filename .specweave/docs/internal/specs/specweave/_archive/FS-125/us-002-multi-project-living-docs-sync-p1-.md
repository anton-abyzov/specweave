---
id: US-002
feature: FS-125
title: "Multi-Project Living Docs Sync (P1)"
status: completed
priority: P1
created: 2025-12-08
project: specweave
related_projects: [frontend-app]
---

# US-002: Multi-Project Living Docs Sync (P1)

**Feature**: [FS-125](./FEATURE.md)

**As a** user with cross-cutting increments
**I want** living docs to organize USs by their declared project
**So that** each project's docs folder contains only relevant USs

---

## Acceptance Criteria

- [x] **AC-US2-01**: `syncIncrement()` groups USs by their `project` field
- [x] **AC-US2-02**: Each project gets its own FS-XXX folder with relevant USs
- [x] **AC-US2-03**: Cross-project USs create symlinks/references (not duplicates)
- [x] **AC-US2-04**: FEATURE.md includes "Related Projects" section listing all involved
- [x] **AC-US2-05**: US files include `related_to:` frontmatter linking other projects

---

## Implementation

**Increment**: [0125-cross-project-user-story-targeting](../../../../increments/0125-cross-project-user-story-targeting/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-005**: Create CrossProjectSync Class
- [x] **T-006**: Update syncIncrement() for Multi-Project
- [x] **T-007**: Generate Cross-Reference FEATURE.md
- [x] **T-008**: Add related_to Frontmatter to US Files
- [x] **T-025**: Integration Test: Cross-Project Workflow
