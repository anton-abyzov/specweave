---
id: US-010
feature: FS-137
title: "Backward Compatibility - Default Project Fallback (P2)"
status: completed
priority: P0
created: 2025-12-09
project: specweave
related_projects: []
---

# US-010: Backward Compatibility - Default Project Fallback (P2)

**Feature**: [FS-137](./FEATURE.md)

**As a** user with existing specs without per-US project fields
**I want** the system to fall back to increment-level `project:` field
**So that** existing increments continue to work

---

## Acceptance Criteria

- [x] **AC-US10-01**: If US has no `**Project**:`, use spec.md frontmatter `project:`
- [x] **AC-US10-02**: If no frontmatter project, use first project from config
- [x] **AC-US10-03**: Fallback logged as warning (not error)
- [x] **AC-US10-04**: Validation hook has `--legacy` mode for existing specs
- [x] **AC-US10-05**: Migration guide documents how to add per-US fields

---

## Implementation

**Increment**: [0137-per-us-project-board-enforcement](../../../../increments/0137-per-us-project-board-enforcement/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-023**: Documentation Updates
