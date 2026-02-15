---
id: US-011
feature: FS-190
title: "Config Consistency and Self-Healing (P0)"
status: completed
priority: P0
created: "2026-02-06T00:00:00.000Z"
tldr: "**As a** SpecWeave user
**I want** sync config to be internally consistent and self-healing
**So that** contradictory settings (like `sync."
project: specweave
---

# US-011: Config Consistency and Self-Healing (P0)

**Feature**: [FS-190](./FEATURE.md)

**As a** SpecWeave user
**I want** sync config to be internally consistent and self-healing
**So that** contradictory settings (like `sync.enabled: false` with `canUpdateExternalItems: true`) are detected and fixed

---

## Acceptance Criteria

- [x] **AC-US11-01**: Given `sync.enabled: false` with `canUpdateExternalItems: true`, when config is loaded, then a warning is emitted and the effective behavior is `disabled` (enabled=false wins)
- [x] **AC-US11-02**: Given config validation, when contradictory settings are detected, then the validator lists all contradictions with suggested fixes
- [x] **AC-US11-03**: Given the `sync-metadata.json` showing `lastSyncResult: "failed"`, when SpecWeave starts, then it logs the failure and suggests `/sw:sync-setup` to reconfigure
- [x] **AC-US11-04**: Given the SpecWeave project itself, when sync is configured, then all three platforms show successful sync results (green sync-metadata.json)

---

## Implementation

**Increment**: [0190-sync-architecture-redesign](../../../../increments/0190-sync-architecture-redesign/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
