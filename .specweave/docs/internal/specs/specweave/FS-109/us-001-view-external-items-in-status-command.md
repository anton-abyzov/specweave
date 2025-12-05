---
id: US-001
feature: FS-109
title: "View External Items in Status Command"
status: not_started
priority: P1
created: 2025-12-05
---

**Origin**: 🏠 **Internal**


# US-001: View External Items in Status Command

**Feature**: [FS-109](./FEATURE.md)

---

## Acceptance Criteria

- [ ] **AC-US1-01**: Status command shows external items section after increment list
- [ ] **AC-US1-02**: Display format: `📋 External (open): GH:4 JI:0 ADO:0`
- [ ] **AC-US1-03**: Per-project breakdown shown when multiple projects configured
- [ ] **AC-US1-04**: Stale items (>7 days) indicated with warning: `GH:4 (2⚠️ stale)`
- [ ] **AC-US1-05**: Section hidden when no external tools configured

---

## Implementation

**Increment**: [0109-external-items-dashboard](../../../../increments/0109-external-items-dashboard/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] [T-001](../../../../increments/0109-external-items-dashboard/tasks.md#T-001): Create ExternalItemsCounter Service
- [ ] [T-002](../../../../increments/0109-external-items-dashboard/tasks.md#T-002): Implement Provider Adapters
- [ ] [T-003](../../../../increments/0109-external-items-dashboard/tasks.md#T-003): Add External Items to Status Command