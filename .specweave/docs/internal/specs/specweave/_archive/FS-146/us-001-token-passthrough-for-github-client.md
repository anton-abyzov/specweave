---
id: US-001
feature: FS-146
title: Token Passthrough for GitHub Client
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 940
    url: https://github.com/anton-abyzov/specweave/issues/940
---

# US-001: Token Passthrough for GitHub Client

**Feature**: [FS-146](./FEATURE.md)

**As a** SpecWeave user with `GITHUB_TOKEN` in `.env`,
**I want** all GitHub CLI operations to use my token automatically,
**So that** sync operations work correctly regardless of `gh auth` status.

---

## Acceptance Criteria

- [x] **AC-US1-01**: `GitHubClientV2` passes `GH_TOKEN` env var to all `execFileNoThrow('gh', ...)` calls
- [x] **AC-US1-02**: Token is read from constructor config, not re-read from `.env` each time
- [x] **AC-US1-03**: Existing `process.env` is preserved (spread operator)
- [x] **AC-US1-04**: Works on Windows, macOS, and Linux

---

## Implementation

**Increment**: [0146-github-cli-token-passthrough-fix](../../../../increments/0146-github-cli-token-passthrough-fix/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Add getGhEnv helper to GitHubClientV2
- [x] **T-007**: Rebuild and run tests
- [x] **T-008**: Manual verification
