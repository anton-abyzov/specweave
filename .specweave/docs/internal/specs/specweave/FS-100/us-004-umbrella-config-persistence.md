---
id: US-004
feature: FS-100
title: "Umbrella Config Persistence"
status: completed
priority: critical
created: 2024-12-03
---

**Origin**: 🏠 **Internal**


# US-004: Umbrella Config Persistence

**Feature**: [FS-100](./FEATURE.md)

**As a** user who completed clone-repos job
**I want** the umbrella structure to be persisted to config.json
**So that** subsequent runs don't need to re-discover the repo structure

---

## Acceptance Criteria

- [x] **AC-US4-01**: Clone job writes `umbrella.childRepos` to config.json
- [x] **AC-US4-02**: Config includes repo path, name, team mapping
- [x] **AC-US4-03**: Living docs can read umbrella config without clone job

---

## Implementation

**Increment**: [0097-umbrella-module-detection](../../../../increments/0097-umbrella-module-detection/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-002](../../../../increments/0097-umbrella-module-detection/tasks.md#T-002): Add Umbrella Config Types
- [x] [T-005](../../../../increments/0097-umbrella-module-detection/tasks.md#T-005): Clone Worker Umbrella Config Persistence