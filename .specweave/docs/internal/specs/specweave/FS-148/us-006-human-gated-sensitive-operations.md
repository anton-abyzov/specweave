---
id: US-006
feature: FS-148
title: Human-Gated Sensitive Operations
status: planned
priority: P1
created: 2025-12-29
project: specweave
external:
  github:
    issue: 956
    url: https://github.com/anton-abyzov/specweave/issues/956
---

# US-006: Human-Gated Sensitive Operations

## User Story

**As a** developer, I want autopilot to pause and ask for explicit approval before performing sensitive operations, so that I maintain control over critical actions.

## Background

Some operations (deployments, API key usage, database migrations, etc.) should NEVER be automated without human approval.

## Acceptance Criteria

- [ ] **AC-US6-01**: Define sensitive operation patterns in `.specweave/config.json` under `autopilot.humanGated`
- [ ] **AC-US6-02**: Default gates: `deploy`, `migrate`, `publish`, `push --force`, `rm -rf`, API key requests
- [ ] **AC-US6-03**: When gate triggered, autopilot pauses and outputs clear approval request
- [ ] **AC-US6-04**: User must explicitly type "yes" or approve via UI to continue
- [ ] **AC-US6-05**: Timeout for human response: configurable (default: 30 minutes), then pause session
- [ ] **AC-US6-06**: All gated operations logged with timestamps and approval status
- [ ] **AC-US6-07**: Option `--skip-gates <gate1,gate2>` to pre-approve specific operations
- [ ] **AC-US6-08**: Never auto-approve: `push --force`, `rm -rf /`, production deployments
