---
id: US-004
feature: FS-151
title: Plugin Activation Debugging
status: completed
priority: P0
created: 2025-12-31
project: specweave
external:
  github:
    issue: 989
    url: https://github.com/anton-abyzov/specweave/issues/989
---

# US-004: Plugin Activation Debugging

**Feature**: [FS-151](./FEATURE.md)

**As a** developer troubleshooting plugin issues
**I want** visibility into which plugins/skills are matching my prompts
**So that** I can understand why a skill isn't activating

---

## Acceptance Criteria

- [x] **AC-US4-01**: `/sw:plugin-status` shows loaded plugins and their activation status
- [x] **AC-US4-02**: `/sw:skill-match "prompt"` tests a prompt against skill triggers
- [x] **AC-US4-03**: Debug mode logs skill matching decisions
- [x] **AC-US4-04**: Activation failures are logged with reasons

---

## Implementation

**Increment**: [0151-plugin-lsp-activation-e2e-tests](../../../../increments/0151-plugin-lsp-activation-e2e-tests/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-017**: Create /sw:plugin-status command
- [x] **T-018**: Create /sw:skill-match command
- [x] **T-019**: Add activation debug logging
