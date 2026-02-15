---
id: US-002
feature: FS-193
title: "AC Completion Updates Issue Body Checkboxes (P1)"
status: completed
priority: P1
created: "2026-02-07T00:00:00.000Z"
tldr: "**As a** developer viewing a GitHub issue
**I want** the AC checkboxes in the issue body to reflect the current spec state
**So that** the issue shows accurate completion status without manual sync."
project: specweave
---

# US-002: AC Completion Updates Issue Body Checkboxes (P1)

**Feature**: [FS-193](./FEATURE.md)

**As a** developer viewing a GitHub issue
**I want** the AC checkboxes in the issue body to reflect the current spec state
**So that** the issue shows accurate completion status without manual sync

---

## Acceptance Criteria

- [x] **AC-US2-01**: Given ACs are synced to spec.md via task-ac-sync-guard, when the background handler fires, then a targeted push-sync updates only the affected GitHub issue(s) body via `gh issue edit` with regenerated body from `generateIssueBody()`
- [x] **AC-US2-02**: Given a spec has 5 user stories but only US-001 ACs changed, then only the GitHub issue for US-001 is updated (not all 5)
- [x] **AC-US2-03**: Given the issue body update runs twice for the same AC state, then the result is identical (idempotent)
- [x] **AC-US2-04**: Given the push-sync runs in background mode, then the spec frontmatter `syncedAt` timestamp is updated for the affected user story

---

## Implementation

**Increment**: [0193-github-sync-ac-comment-wiring](../../../../increments/0193-github-sync-ac-comment-wiring/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
