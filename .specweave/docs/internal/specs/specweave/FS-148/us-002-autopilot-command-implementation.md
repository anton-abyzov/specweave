---
id: US-002
feature: FS-148
title: Autopilot Command Implementation
status: planned
priority: P1
created: 2025-12-29
project: specweave
external:
  github:
    issue: 952
    url: https://github.com/anton-abyzov/specweave/issues/952
---

# US-002: Autopilot Command Implementation

## User Story

**As a** developer, I want a `/sw:autopilot` command that initiates autonomous execution with clear configuration options, so that I can start long-running development sessions with appropriate safety limits.

## Acceptance Criteria

- [ ] **AC-US2-01**: Create `plugins/specweave/commands/autopilot.md` skill definition
- [ ] **AC-US2-02**: Command syntax: `/sw:autopilot "<task description>" [options]`
- [ ] **AC-US2-03**: Option `--max-iterations <n>` sets iteration limit (default: 100)
- [ ] **AC-US2-04**: Option `--max-hours <n>` sets time limit (default: 24 hours)
- [ ] **AC-US2-05**: Option `--completion-promise <text>` sets custom completion signal (default: "AUTOPILOT_COMPLETE")
- [ ] **AC-US2-06**: Option `--dry-run` shows what would happen without starting
- [ ] **AC-US2-07**: Creates `scripts/setup-autopilot.sh` to initialize session state
- [ ] **AC-US2-08**: Displays cost estimate before starting (based on task complexity)
