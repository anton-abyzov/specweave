---
id: US-005
feature: FS-193
title: "Test Coverage for Critical AC-to-GitHub Path (P1)"
status: completed
priority: P1
created: "2026-02-07T00:00:00.000Z"
tldr: "**As a** contributor to the SpecWeave sync system
**I want** comprehensive tests covering the AC-completion-to-GitHub-update chain
**So that** the critical sync path is verified and regressions are caught."
project: specweave
---

# US-005: Test Coverage for Critical AC-to-GitHub Path (P1)

**Feature**: [FS-193](./FEATURE.md)

**As a** contributor to the SpecWeave sync system
**I want** comprehensive tests covering the AC-completion-to-GitHub-update chain
**So that** the critical sync path is verified and regressions are caught

---

## Acceptance Criteria

- [x] **AC-US5-01**: Tests exist for: AC completion in tasks.md triggers background GitHub comment posting via progress-comment-builder integration
- [x] **AC-US5-02**: Tests exist for: AC completion triggers targeted issue body checkbox update (not full batch)
- [x] **AC-US5-03**: Tests exist for: all-ACs-done triggers issue auto-close with completion comment
- [x] **AC-US5-04**: Tests exist for: multi-repo pull sync with all-repos-must-agree semantics and conflict detection
- [x] **AC-US5-05**: Tests exist for: circuit breaker prevents comment storms when GitHub is down
- [x] **AC-US5-06**: Tests exist for: non-blocking failure mode (GitHub down, task still completes, user sees warning)

---

## Implementation

**Increment**: [0193-github-sync-ac-comment-wiring](../../../../increments/0193-github-sync-ac-comment-wiring/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
