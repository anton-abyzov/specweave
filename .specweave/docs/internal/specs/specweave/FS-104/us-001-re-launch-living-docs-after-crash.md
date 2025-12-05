---
id: US-001
feature: FS-104
title: "Re-launch Living Docs After Crash"
status: completed
priority: P1
created: 2025-12-04
---

# US-001: Re-launch Living Docs After Crash

**Feature**: [FS-104](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US1-01**: `/specweave:living-docs` command exists and is documented
- [x] **AC-US1-02**: Command launches living-docs-builder job in background
- [x] **AC-US1-03**: Command shows job ID and monitoring instructions

---

## Implementation

**Increment**: [0104-living-docs-command](../../../../increments/0104-living-docs-command/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create command markdown documentation
- [x] **T-002**: Implement CLI handler
- [x] **T-003**: Register command in bin/specweave.js
