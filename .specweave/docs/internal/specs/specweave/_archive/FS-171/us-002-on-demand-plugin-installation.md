---
id: US-002
feature: FS-171
title: On-Demand Plugin Installation
status: completed
priority: high
created: 2026-01-18
project: specweave
external:
  github:
    issue: 1021
    url: https://github.com/anton-abyzov/specweave/issues/1021
---

# US-002: On-Demand Plugin Installation

**Feature**: [FS-171](./FEATURE.md)

**As a** developer,
**I want** full SpecWeave plugins to install automatically when detected,
**So that** I get full functionality without manual steps.

---

## Acceptance Criteria

- [x] **AC-US2-01**: Skills copy from cache to `~/.claude/skills/` on detection
- [x] **AC-US2-02**: Hot-reload activates skills within same session (no restart)
- [x] **AC-US2-03**: Already-installed skills are not re-copied (idempotent)
- [x] **AC-US2-04**: Installation completes in <2 seconds
- [x] **AC-US2-05**: User sees brief "Loading SpecWeave..." message during install

---

## Implementation

**Increment**: [0171-lazy-plugin-loading](../../../../increments/0171-lazy-plugin-loading/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-003**: Create Plugin Installation Script
- [x] **T-005**: Test Hot-Reload Activation
- [x] **T-009**: Implement Background Loading Option
- [x] **T-035**: Write Integration Tests for Hot-Reload
- [x] **T-046**: Add Performance Load Test
