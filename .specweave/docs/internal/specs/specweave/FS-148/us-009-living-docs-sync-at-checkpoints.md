---
id: US-009
feature: FS-148
title: Living Docs and External Tool Sync at Checkpoints
status: planned
priority: P1
created: 2025-12-29
project: specweave
external:
  github:
    issue: 959
    url: https://github.com/anton-abyzov/specweave/issues/959
---

# US-009: Living Docs and External Tool Sync at Checkpoints

## User Story

**As a** developer, I want auto to sync living docs and external tools at appropriate checkpoints, so that documentation stays current during autonomous execution.

## Acceptance Criteria

- [ ] **AC-US9-01**: Sync living docs after each task completion (deferred, not blocking)
- [ ] **AC-US9-02**: Sync to external tools (GitHub/JIRA/ADO) after each increment closure
- [ ] **AC-US9-03**: Batch sync operations to minimize API calls (max 1 sync per 5 minutes)
- [ ] **AC-US9-04**: If sync fails, log error but continue auto (non-blocking)
- [ ] **AC-US9-05**: Force sync before final auto completion
- [ ] **AC-US9-06**: Sync includes: AC checkbox updates, task completion status, increment status
