---
id: US-004
feature: FS-078
title: "Add Repo Cloning Step for Multi-Repo Mode"
status: in_progress
priority: P0
created: 2025-11-28
---

# US-004: Add Repo Cloning Step for Multi-Repo Mode

**Feature**: [FS-078](./FEATURE.md)

**As a** developer with multiple repositories
**I want** to configure repo cloning during init
**So that** all my repos are managed together

---

## Acceptance Criteria

- [x] **AC-US4-01**: After "multiple repos" selection, show cloning options
- [x] **AC-US4-02**: Options: "Pattern match" (e.g., `sw-*`), "Explicit list", "Skip cloning"
- [x] **AC-US4-05**: Don't block init if cloning skipped - can clone later

---

## Implementation

**Increment**: [0078-ado-init-validation-critical-fixes](../../../../../../increments/_archive/0078-ado-init-validation-critical-fixes/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-008**: Add repo cloning prompt for ADO multi-repo
