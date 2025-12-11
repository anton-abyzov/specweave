---
id: US-006
feature: FS-128
title: SessionStart Hook Integration
status: completed
priority: P1
created: 2025-12-09
project: specweave
external:
  github:
    issue: 815
    url: https://github.com/anton-abyzov/specweave/issues/815
---

# US-006: SessionStart Hook Integration

**Feature**: [FS-128](./FEATURE.md)

**As a** SpecWeave framework
**I want** session registration to happen automatically via Claude Code hooks
**So that** all sessions are tracked without manual setup

---

## Acceptance Criteria

- [x] **AC-US6-01**: SessionStart hook creates session registry entry with current PID
- [x] **AC-US6-02**: Hook starts heartbeat background process (runs every 5s)
- [x] **AC-US6-03**: SessionEnd hook removes session from registry
- [x] **AC-US6-04**: SessionEnd hook kills all registered child processes
- [x] **AC-US6-05**: Hook failure doesn't block Claude Code session startup
- [x] **AC-US6-06**: Hooks work in non-interactive mode (CI/CD environments)

---

## Implementation

**Increment**: [0128-process-lifecycle-zombie-prevention](../../../../increments/0128-process-lifecycle-zombie-prevention/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-010**: Create SessionStart Hook with Registry Integration
- [x] **T-011**: Create SessionEnd Hook with Cleanup
- [x] **T-012**: Handle Non-Interactive Mode (CI/CD)
