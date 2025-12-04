---
id: US-009
feature: FS-090
title: "Comprehensive Logging"
status: completed
priority: P1
created: 2025-12-02
---

**Origin**: 🏠 **Internal**


# US-009: Comprehensive Logging

**Feature**: [FS-090](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US9-01**: Structured JSON logs for machine parsing (`progress.json`)
- [ ] **AC-US9-02**: Human-readable log with timestamps and phase markers (`worker.log`)
- [ ] **AC-US9-03**: Milestone markers for phase transitions (═══ PHASE X ═══)
- [ ] **AC-US9-04**: Per-module mini-reports in `checkpoints/` directory
- [ ] **AC-US9-05**: `/specweave:jobs --logs <id>` shows log output
- [ ] **AC-US9-06**: `/specweave:jobs --follow <id>` shows real-time progress

---

## Implementation

**Increment**: [0090-living-docs-builder](../../../../../increments/0090-living-docs-builder/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-008](../../../../../increments/0090-living-docs-builder/tasks.md#T-008): Create Worker and Init Integration