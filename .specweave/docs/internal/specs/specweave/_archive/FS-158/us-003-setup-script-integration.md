---
id: US-003
feature: FS-158
title: "Setup Script Integration"
status: completed
priority: P0
created: 2026-01-07
project: specweave-dev
---

# US-003: Setup Script Integration

**Feature**: [FS-158](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US3-01**: `setup-auto.sh` calls project detection on session creation
- [x] **AC-US3-02**: Detected project type logged to session file (`projectType` field)
- [x] **AC-US3-03**: Smart defaults merged into `completionConditions` array
- [x] **AC-US3-04**: CLI flags (`--e2e`, `--build`, etc.) override/augment smart defaults
- [x] **AC-US3-05**: `--no-smart-defaults` flag bypasses detection (with warning logged)
- [x] **AC-US3-06**: Session displays detected type and applied conditions in startup output
- [x] **AC-US3-07**: Invalid project type detection shows warning but continues (fallback: generic)
- [x] **AC-US3-08**: Detection performance <100ms (no noticeable delay)

---

## Implementation

**Increment**: [0158-smart-completion-conditions](../../../../increments/0158-smart-completion-conditions/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
