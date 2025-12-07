---
id: US-003
feature: FS-109
title: "View External Items in Dedicated Command"
status: not_started
priority: P1
created: 2025-12-05
---

**Origin**: 🏠 **Internal**


# US-003: View External Items in Dedicated Command

**Feature**: [FS-109](./FEATURE.md)

---

## Acceptance Criteria

- [ ] **AC-US3-01**: Command shows items grouped by provider (GitHub, JIRA, ADO)
- [ ] **AC-US3-02**: Each item displays: number, title, age, labels, URL
- [ ] **AC-US3-03**: Items sorted by age (oldest first)
- [ ] **AC-US3-04**: Stale items (>7 days) highlighted with warning
- [ ] **AC-US3-05**: Summary line at bottom: `Total: 4 open (2 stale)`
- [ ] **AC-US3-06**: Option `--refresh` forces cache refresh

---

## Implementation

**Increment**: [0109-external-items-dashboard](../../../../increments/0109-external-items-dashboard/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] [T-004](../../../../increments/0109-external-items-dashboard/tasks.md#T-004): Create /specweave:external Command