---
id: US-002
feature: FS-190
title: "Increment Folder Platform Suffix (P0)"
status: completed
priority: P0
created: "2026-02-06T00:00:00.000Z"
tldr: "**As a** SpecWeave user
**I want** increment folders to carry the platform suffix (e."
project: specweave
---

# US-002: Increment Folder Platform Suffix (P0)

**Feature**: [FS-190](./FEATURE.md)

**As a** SpecWeave user
**I want** increment folders to carry the platform suffix (e.g., `0042G-auth-flow`)
**So that** the origin is visible in the filesystem and VSCode explorer with proper sorting

---

## Acceptance Criteria

- [x] **AC-US2-01**: Given an external increment from GitHub, when created, then the folder is named `####G-name` (e.g., `0042G-auth-flow`)
- [x] **AC-US2-02**: Given an external increment from JIRA, when created, then the folder is named `####J-name`
- [x] **AC-US2-03**: Given an external increment from ADO, when created, then the folder is named `####A-name`
- [x] **AC-US2-04**: Given `deriveFeatureId()`, when called on `0042G-auth-flow`, then it returns `FS-042G`
- [x] **AC-US2-05**: Given folders `0042-internal` and `0042G-from-github`, when listed in VSCode, then they sort adjacently by numeric prefix

---

## Implementation

**Increment**: [0190-sync-architecture-redesign](../../../../increments/0190-sync-architecture-redesign/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
