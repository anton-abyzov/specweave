---
id: US-001
feature: FS-193
title: "AC Completion Triggers GitHub Progress Comment (P1)"
status: completed
priority: P1
created: "2026-02-07T00:00:00.000Z"
tldr: "**As a** team lead tracking progress on GitHub
**I want** a progress comment automatically posted to the GitHub issue when acceptance criteria are completed
**So that** I see real-time progress without running manual sync commands."
project: specweave
---

# US-001: AC Completion Triggers GitHub Progress Comment (P1)

**Feature**: [FS-193](./FEATURE.md)

**As a** team lead tracking progress on GitHub
**I want** a progress comment automatically posted to the GitHub issue when acceptance criteria are completed
**So that** I see real-time progress without running manual sync commands

---

## Acceptance Criteria

- [x] **AC-US1-01**: Given a task is marked complete and its ACs are synced to spec.md by task-ac-sync-guard, when the hook chain continues, then a background handler (5s delay) posts an aggregated progress comment to the corresponding GitHub issue via `gh issue comment`
- [x] **AC-US1-02**: Given the progress comment is posted, then it uses the existing `progress-comment-builder.ts` format including completed AC names, overall progress percentage (e.g., "3/5 ACs - 60%"), and timestamp
- [x] **AC-US1-03**: Given the GitHub API call fails (network error, rate limit, auth expired), then the task completion still succeeds and the user sees a non-blocking warning via the existing HookResponseWarning pattern
- [x] **AC-US1-04**: Given GitHub is down and 3 consecutive comment posts fail, then the circuit breaker opens and skips further attempts until manually reset or next session
- [x] **AC-US1-05**: Given multiple ACs are completed in rapid succession (within 5s window), then only one aggregated comment is posted (not one per AC)

---

## Implementation

**Increment**: [0193-github-sync-ac-comment-wiring](../../../../increments/0193-github-sync-ac-comment-wiring/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
