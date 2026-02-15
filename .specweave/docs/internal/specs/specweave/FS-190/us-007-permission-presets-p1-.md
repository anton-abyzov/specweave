---
id: US-007
feature: FS-190
title: "Permission Presets (P1)"
status: completed
priority: P0
created: "2026-02-06T00:00:00.000Z"
tldr: "**As a** SpecWeave user configuring sync
**I want** to choose from named permission presets instead of configuring 8+ booleans
**So that** I can set up sync correctly without understanding every flag."
project: specweave
---

# US-007: Permission Presets (P1)

**Feature**: [FS-190](./FEATURE.md)

**As a** SpecWeave user configuring sync
**I want** to choose from named permission presets instead of configuring 8+ booleans
**So that** I can set up sync correctly without understanding every flag

---

## Acceptance Criteria

- [x] **AC-US7-01**: Given the config schema, when setting `sync.preset: "read-only"`, then only pull/read operations are enabled (all write flags false)
- [x] **AC-US7-02**: Given the preset `push-only`, when applied, then SpecWeave can create/update external items but does not pull changes back
- [x] **AC-US7-03**: Given the preset `bidirectional`, when applied, then both push and pull are enabled with status sync
- [x] **AC-US7-04**: Given the preset `full-control`, when applied, then all operations including delete are enabled
- [x] **AC-US7-05**: Given a preset is active, when the user overrides a specific flag (e.g., `sync.overrides.canDelete: false`), then the override takes precedence over the preset value

---

## Implementation

**Increment**: [0190-sync-architecture-redesign](../../../../increments/0190-sync-architecture-redesign/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
