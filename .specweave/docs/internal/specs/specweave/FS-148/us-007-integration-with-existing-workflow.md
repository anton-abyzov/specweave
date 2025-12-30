---
id: US-007
feature: FS-148
title: Integration with Existing Workflow Commands
status: planned
priority: P1
created: 2025-12-29
project: specweave
external:
  github:
    issue: 957
    url: https://github.com/anton-abyzov/specweave/issues/957
---

# US-007: Integration with Existing Workflow Commands

## User Story

**As a** developer, I want autopilot to seamlessly integrate with existing `/sw:do`, `/sw:done`, `/sw:next` commands, so that it feels like a natural extension of SpecWeave.

## Acceptance Criteria

- [ ] **AC-US7-01**: Autopilot internally invokes `/sw:do` to execute tasks within increments
- [ ] **AC-US7-02**: Autopilot invokes `/sw:validate` before attempting closure
- [ ] **AC-US7-03**: Autopilot invokes `/sw:done` with PM validation when increment is complete
- [ ] **AC-US7-04**: Modify `/sw:next` to detect autopilot session and suggest continuation
- [ ] **AC-US7-05**: Add `--autopilot` flag to `/sw:next` to enter autopilot mode directly
- [ ] **AC-US7-06**: Autopilot respects all existing PM validation gates (tasks, tests, docs)
- [ ] **AC-US7-07**: Autopilot updates tasks.md and spec.md checkboxes via existing Edit operations
