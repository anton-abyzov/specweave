---
id: US-004
feature: FS-148
title: Multi-Increment Orchestration
status: planned
priority: P1
created: 2025-12-29
project: specweave
external:
  github:
    issue: 954
    url: https://github.com/anton-abyzov/specweave/issues/954
---

# US-004: Multi-Increment Orchestration

## User Story

**As a** developer, I want autopilot to work across multiple increments sequentially, so that I can plan an entire project and let Claude execute it over time.

## Background

Users may want to generate specs for multiple features upfront, then let autopilot execute them one by one respecting dependencies.

## Acceptance Criteria

- [ ] **AC-US4-01**: Autopilot session state tracks `incrementQueue: string[]` (ordered list of increment IDs)
- [ ] **AC-US4-02**: After completing increment N, automatically transitions to increment N+1
- [ ] **AC-US4-03**: Respects WIP limits from config (default: 1 active increment)
- [ ] **AC-US4-04**: Validates dependencies before starting each increment
- [ ] **AC-US4-05**: Option `--increments <id1,id2,id3>` specifies explicit queue
- [ ] **AC-US4-06**: Option `--all-backlog` processes all backlog items in priority order
- [ ] **AC-US4-07**: Generates per-increment completion reports
- [ ] **AC-US4-08**: Saves overall session summary with cost, duration, and outcomes
