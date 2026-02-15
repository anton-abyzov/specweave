---
id: US-004
feature: FS-193
title: "Multi-Repo Pull Sync with All-Repos-Must-Agree (P2)"
status: completed
priority: P1
created: "2026-02-07T00:00:00.000Z"
tldr: "**As a** developer working in a microservices architecture with distributed repos
**I want** to pull AC changes from multiple GitHub repos back to the spec with all-repos-must-agree semantics
**So that** the spec reflects verified completion across all teams."
project: specweave
---

# US-004: Multi-Repo Pull Sync with All-Repos-Must-Agree (P2)

**Feature**: [FS-193](./FEATURE.md)

**As a** developer working in a microservices architecture with distributed repos
**I want** to pull AC changes from multiple GitHub repos back to the spec with all-repos-must-agree semantics
**So that** the spec reflects verified completion across all teams

---

## Acceptance Criteria

- [x] **AC-US4-01**: Given a spec has user stories synced to multiple repos (distributed strategy with cross-team detection), when pull sync runs, then changes are fetched from all repos that have linked issues for each user story
- [x] **AC-US4-02**: Given a shared user story (US-003) exists in both frontend-app and backend-api repos, when frontend marks AC-US3-01 done but backend has not, then the AC remains unchecked in spec (all repos must agree)
- [x] **AC-US4-03**: Given all repos agree that an AC is complete, then the AC is marked complete in spec.md and a change record is created in the PullSyncResult
- [x] **AC-US4-04**: Given a repo-specific user story (US-001 in frontend-app only) has AC changes, then standard single-repo pull logic applies (no multi-repo consensus needed)
- [x] **AC-US4-05**: Given a pull sync encounters errors from one repo (e.g., 404, auth failure), then changes from other repos are still processed and the error is recorded non-blocking

---

## Implementation

**Increment**: [0193-github-sync-ac-comment-wiring](../../../../increments/0193-github-sync-ac-comment-wiring/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
