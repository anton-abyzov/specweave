---
id: US-004
feature: FS-097
title: "Umbrella Config Persistence"
status: not_started
priority: critical
created: 2024-12-03
---

**Origin**: 🏠 **Internal**


# US-004: Umbrella Config Persistence

**Feature**: [FS-097](./FEATURE.md)

**As a** user who completed clone-repos job
**I want** the umbrella structure to be persisted to config.json
**So that** subsequent runs don't need to re-discover the repo structure

---

## Acceptance Criteria

- [ ] **AC-US4-01**: Clone job writes `umbrella.childRepos` to config.json
- [ ] **AC-US4-02**: Config includes repo path, name, team mapping
- [ ] **AC-US4-03**: Living docs can read umbrella config without clone job

---

## Implementation

**Increment**: [0097-umbrella-module-detection](../../../../../increments/0097-umbrella-module-detection/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] [T-002](../../../../../increments/0097-umbrella-module-detection/tasks.md#T-002): Add Umbrella Config Types
- [ ] [T-005](../../../../../increments/0097-umbrella-module-detection/tasks.md#T-005): Clone Worker Umbrella Config Persistence