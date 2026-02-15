---
id: US-003
feature: FS-193
title: "Auto-Close Issue When All ACs Done (P2)"
status: completed
priority: P1
created: "2026-02-07T00:00:00.000Z"
tldr: "**As a** project manager viewing the GitHub project board
**I want** issues to auto-close when all their acceptance criteria are completed
**So that** the board reflects accurate per-user-story completion status."
project: specweave
---

# US-003: Auto-Close Issue When All ACs Done (P2)

**Feature**: [FS-193](./FEATURE.md)

**As a** project manager viewing the GitHub project board
**I want** issues to auto-close when all their acceptance criteria are completed
**So that** the board reflects accurate per-user-story completion status

---

## Acceptance Criteria

- [x] **AC-US3-01**: Given all ACs for a user story are marked complete in spec.md, when the background sync handler detects this, then the corresponding GitHub issue is closed via `gh issue close`
- [x] **AC-US3-02**: Given the issue is about to be closed, then a completion comment is posted first: "All acceptance criteria completed" with final progress summary
- [x] **AC-US3-03**: Given the GitHub issue is already closed (e.g., manually by someone), then no duplicate close or comment is created
- [x] **AC-US3-04**: Given Projects V2 is enabled, then the Status field is updated to "Done" when the issue closes via the existing `github-field-sync.ts`

---

## Implementation

**Increment**: [0193-github-sync-ac-comment-wiring](../../../../increments/0193-github-sync-ac-comment-wiring/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
