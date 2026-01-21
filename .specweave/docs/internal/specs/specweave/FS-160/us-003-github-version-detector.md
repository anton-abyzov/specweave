---
id: US-003
feature: FS-160
title: "GitHub Version Detector"
status: not_started
priority: P0
created: 2026-01-07
project: specweave-dev
---

# US-003: GitHub Version Detector

**Feature**: [FS-160](./FEATURE.md)

---

## Acceptance Criteria

- [ ] **AC-US3-01**: Fetch latest commit SHA for plugin path from GitHub API
- [ ] **AC-US3-02**: Compare cached commit SHA with GitHub HEAD
- [ ] **AC-US3-03**: Identify changed files between commits using GitHub compare API
- [ ] **AC-US3-04**: Return `StalenessResult` with: stale boolean, reason, cacheCommit, githubCommit, affectedFiles[], severity
- [ ] **AC-US3-05**: Implement 5-minute local cache for GitHub API responses (avoid rate limits)
- [ ] **AC-US3-06**: Handle rate limiting: check remaining quota, wait if needed
- [ ] **AC-US3-07**: Graceful offline fallback: use cached metadata if GitHub API unavailable

---

## Implementation

**Increment**: [0160-plugin-cache-health-monitoring](../../../../increments/0160-plugin-cache-health-monitoring/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
