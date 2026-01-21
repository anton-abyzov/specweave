---
id: US-007
feature: FS-160
title: "cache-refresh CLI Command"
status: not_started
priority: P0
created: 2026-01-07
project: specweave-dev
---

# US-007: cache-refresh CLI Command

**Feature**: [FS-160](./FEATURE.md)

---

## Acceptance Criteria

- [ ] **AC-US7-01**: Command: `specweave cache-refresh` smart refresh all stale
- [ ] **AC-US7-02**: Command: `specweave cache-refresh sw` refresh specific plugin
- [ ] **AC-US7-03**: Flag: `--force` performs hard refresh (delete cache)
- [ ] **AC-US7-04**: Flag: `--all` refreshes all plugins (even healthy ones)
- [ ] **AC-US7-05**: Workflow: backup memories → invalidate → refresh-marketplace → restore memories → verify
- [ ] **AC-US7-06**: Show success message with verification: "✅ Cache refreshed and verified"

---

## Implementation

**Increment**: [0160-plugin-cache-health-monitoring](../../../../increments/0160-plugin-cache-health-monitoring/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
