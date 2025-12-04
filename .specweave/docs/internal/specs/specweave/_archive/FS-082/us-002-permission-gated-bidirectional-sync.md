---
id: US-002
feature: FS-082
title: "Permission-Gated Bidirectional Sync"
status: completed
priority: P0
created: 2025-12-01
---

# US-002: Permission-Gated Bidirectional Sync

**Feature**: [FS-082](./FEATURE.md)

**As a** project admin,
**I want** fine-grained control over what syncs where,
**So that** I can prevent unauthorized changes to external tools.

---

## Acceptance Criteria

- [x] **AC-US2-01**: Runtime permission check before every sync operation
- [x] **AC-US2-02**: Permission levels: read-only, status-update, full-upsert
- [x] **AC-US2-03**: Per-platform permission configuration (GitHub/JIRA/ADO)
- [x] **AC-US2-04**: Permission denial logged with reason
- [x] **AC-US2-05**: External items (FS-XXE) respect original tool's permissions

---

## Implementation

**Increment**: [0082-unified-sync-orchestration](../../../../../../increments/_archive/0082-unified-sync-orchestration/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-005**: Implement Permission Enforcer
