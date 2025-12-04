---
id: US-002
feature: FS-079
title: "Fix Double Prefix Bug"
status: completed
priority: P0
created: 2025-11-29
---

# US-002: Fix Double Prefix Bug

**Feature**: [FS-079](./FEATURE.md)

**As a** developer
**I want** area paths stored and validated correctly
**So that** no duplicate prefixes appear

---

## Acceptance Criteria

- [x] **AC-US2-01**: Store area paths as LEAF names only in config.json (e.g., `Platform-Engineering`)
- [x] **AC-US2-02**: OR strip project prefix before validation if full paths are stored
- [x] **AC-US2-03**: Folder creation uses consistent naming with validation

---

## Implementation

**Increment**: [0079-ado-init-flow-v2](../../../../../../increments/_archive/0079-ado-init-flow-v2/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-002**: Fix Double Prefix Bug
