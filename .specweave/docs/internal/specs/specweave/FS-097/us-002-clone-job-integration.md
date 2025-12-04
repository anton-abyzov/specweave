---
id: US-002
feature: FS-097
title: "Clone Job Integration"
status: not_started
priority: critical
created: 2024-12-03
---

**Origin**: 🏠 **Internal**


# US-002: Clone Job Integration

**Feature**: [FS-097](./FEATURE.md)

**As a** user who ran clone-repos job
**I want** living docs builder to use the clone job's repo list
**So that** I don't need to wait for re-scanning of already-known repos

---

## Acceptance Criteria

- [ ] **AC-US2-01**: Living docs worker reads repos from clone job config when available
- [ ] **AC-US2-02**: Repo metadata (path, name, team) is preserved from clone job
- [ ] **AC-US2-03**: Fallback to .git scanning when no clone job exists

---

## Implementation

**Increment**: [0097-umbrella-module-detection](../../../../../increments/0097-umbrella-module-detection/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] [T-006](../../../../../increments/0097-umbrella-module-detection/tasks.md#T-006): Living Docs Worker Clone Job Integration