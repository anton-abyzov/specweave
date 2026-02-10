---
id: US-006
feature: FS-158
title: "Configuration & Overrides"
status: completed
priority: P0
created: 2026-01-07
project: specweave-dev
---

# US-006: Configuration & Overrides

**Feature**: [FS-158](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US6-01**: Add `auto.completionConditions` section to `.specweave/config.json`
- [x] **AC-US6-02**: Support `enforceDefaults: true/false` (default: true after v1.1.0)
- [x] **AC-US6-03**: Support `overrideMode: "replace" | "add-only" | "merge"` (default: merge)
- [x] **AC-US6-04**: Support `projectType: "auto" | <explicit-type>` (default: auto)
- [x] **AC-US6-05**: Support `customConditions: []` for additional user-defined conditions
- [x] **AC-US6-06**: Increment-specific overrides in `metadata.json`
- [x] **AC-US6-07**: CLI flags have highest precedence (override config)
- [x] **AC-US6-08**: Config validation on load (reject invalid types/thresholds)
- [x] **AC-US6-09**: Merge logic preserves mandatory flag (user can't remove mandatory conditions)
- [x] **AC-US6-10**: Show effective conditions in `/sw:auto-status`

---

## Implementation

**Increment**: [0158-smart-completion-conditions](../../../../increments/0158-smart-completion-conditions/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
