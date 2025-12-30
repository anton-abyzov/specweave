---
id: US-003
feature: FS-148
title: Cancel Autopilot Command
status: planned
priority: P1
created: 2025-12-29
project: specweave
external:
  github:
    issue: 953
    url: https://github.com/anton-abyzov/specweave/issues/953
---

# US-003: Cancel Autopilot Command

## User Story

**As a** developer, I want a `/sw:cancel-autopilot` command to gracefully stop an active autopilot session, so that I can regain control when needed.

## Acceptance Criteria

- [ ] **AC-US3-01**: Create `plugins/specweave/commands/cancel-autopilot.md` skill definition
- [ ] **AC-US3-02**: Command removes `.specweave/state/autopilot-session.json`
- [ ] **AC-US3-03**: Reports iteration count and work completed when canceling
- [ ] **AC-US3-04**: Generates summary report in `.specweave/logs/autopilot-{session-id}.md`
- [ ] **AC-US3-05**: Sets clean state so next stop hook allows normal exit
