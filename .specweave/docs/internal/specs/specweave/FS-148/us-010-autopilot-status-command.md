---
id: US-010
feature: FS-148
title: Autopilot Status Command
status: planned
priority: P1
created: 2025-12-29
project: specweave
external:
  github:
    issue: 960
    url: https://github.com/anton-abyzov/specweave/issues/960
---

# US-010: Autopilot Status Command

## User Story

**As a** developer, I want a `/sw:autopilot-status` command to check current autopilot session state, so that I can monitor progress.

## Acceptance Criteria

- [ ] **AC-US10-01**: Create `plugins/specweave/commands/autopilot-status.md` skill definition
- [ ] **AC-US10-02**: Display: current iteration, elapsed time, tasks completed, increments done
- [ ] **AC-US10-03**: Display: estimated remaining time, cost so far, active increment
- [ ] **AC-US10-04**: Display: circuit breaker states for all external services
- [ ] **AC-US10-05**: Display: last sync timestamps for living docs and external tools
- [ ] **AC-US10-06**: Works from any terminal (reads state from disk)
