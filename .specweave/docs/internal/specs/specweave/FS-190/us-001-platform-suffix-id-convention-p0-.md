---
id: US-001
feature: FS-190
title: "Platform Suffix ID Convention (P0)"
status: completed
priority: P0
created: "2026-02-06T00:00:00.000Z"
tldr: "**As a** SpecWeave developer
**I want** external items identified by platform-specific suffixes (G/J/A) instead of generic E
**So that** I can see at a glance where an item originated and eliminate cross-namespace collision complexity."
project: specweave
---

# US-001: Platform Suffix ID Convention (P0)

**Feature**: [FS-190](./FEATURE.md)

**As a** SpecWeave developer
**I want** external items identified by platform-specific suffixes (G/J/A) instead of generic E
**So that** I can see at a glance where an item originated and eliminate cross-namespace collision complexity

---

## Acceptance Criteria

- [x] **AC-US1-01**: Given an item imported from GitHub, when assigned an ID, then it uses the `G` suffix (e.g., `FS-042G`, `US-004G`, `T-010G`)
- [x] **AC-US1-02**: Given an item imported from JIRA, when assigned an ID, then it uses the `J` suffix (e.g., `FS-042J`)
- [x] **AC-US1-03**: Given an item imported from ADO, when assigned an ID, then it uses the `A` suffix (e.g., `FS-042A`)
- [x] **AC-US1-04**: Given `FS-042` (internal) and `FS-042G` (external), when both exist, then they coexist without collision because namespaces are independent
- [x] **AC-US1-05**: Given the `isExternalId()` function, when called with `FS-042G`, `FS-042J`, or `FS-042A`, then it returns `true` and identifies the platform via `getPlatformFromSuffix()`

---

## Implementation

**Increment**: [0190-sync-architecture-redesign](../../../../increments/0190-sync-architecture-redesign/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
