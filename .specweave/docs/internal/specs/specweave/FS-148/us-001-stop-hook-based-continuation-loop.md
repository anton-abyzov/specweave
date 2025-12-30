---
id: US-001
feature: FS-148
title: Stop Hook-Based Continuation Loop
status: planned
priority: P1
created: 2025-12-29
project: specweave
external:
  github:
    issue: 951
    url: https://github.com/anton-abyzov/specweave/issues/951
---

# US-001: Stop Hook-Based Continuation Loop

## User Story

**As a** developer using SpecWeave, I want the autopilot command to use Claude Code's Stop Hook to create a feedback loop that prevents session exit until work is complete, so that Claude can work autonomously for extended periods without manual intervention.

## Background

Claude Code's Stop Hook fires when Claude tries to exit. By returning `{"decision": "block", "reason": "..."}`, we can re-feed the original prompt and continue execution.

## Acceptance Criteria

- [ ] **AC-US1-01**: Create `plugins/specweave/hooks/stop-autopilot.sh` that implements the Stop Hook logic
- [ ] **AC-US1-02**: Stop hook checks `.specweave/state/autopilot-session.json` for active session state
- [ ] **AC-US1-03**: When autopilot active, hook blocks exit and re-feeds original prompt with iteration context
- [ ] **AC-US1-04**: Hook tracks `stop_hook_active` flag to detect continuation loops (prevent infinite nesting)
- [ ] **AC-US1-05**: Hook reads transcript from `transcript_path` to analyze completion status
- [ ] **AC-US1-06**: Completion promise detection: when output contains `<autopilot-complete>DONE</autopilot-complete>`, allow exit
- [ ] **AC-US1-07**: Max iterations safety: configurable limit (default: 100) prevents runaway execution
- [ ] **AC-US1-08**: Session state persisted to disk for recovery after crashes
