---
id: US-003
feature: FS-190
title: "E-to-Platform Suffix Migration (P1)"
status: completed
priority: P0
created: "2026-02-06T00:00:00.000Z"
tldr: "**As a** SpecWeave user with existing E-suffix items
**I want** automatic migration from E suffix to the correct platform suffix
**So that** my existing data transitions cleanly to the new convention."
project: specweave
---

# US-003: E-to-Platform Suffix Migration (P1)

**Feature**: [FS-190](./FEATURE.md)

**As a** SpecWeave user with existing E-suffix items
**I want** automatic migration from E suffix to the correct platform suffix
**So that** my existing data transitions cleanly to the new convention

---

## Acceptance Criteria

- [x] **AC-US3-01**: Given existing `FS-042E` items with `origin-metadata.source: "github"`, when migration runs, then they are renamed to `FS-042G`
- [x] **AC-US3-02**: Given existing `FS-042E` items with `origin-metadata.source: "jira"`, when migration runs, then they are renamed to `FS-042J`
- [x] **AC-US3-03**: Given an E-suffix item with `source: "unknown"`, when migration runs, then it remains `E` suffix with a warning logged
- [x] **AC-US3-04**: Given migration, when renaming folders and files, then all internal references (spec.md, tasks.md, metadata.json, living docs) are updated atomically
- [x] **AC-US3-05**: Given both old E-suffix and new platform-suffix code paths, when `isExternalId()` is called, then it recognizes both formats during the deprecation period

---

## Implementation

**Increment**: [0190-sync-architecture-redesign](../../../../increments/0190-sync-architecture-redesign/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
