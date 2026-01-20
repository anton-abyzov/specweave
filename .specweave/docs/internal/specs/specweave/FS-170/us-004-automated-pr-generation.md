---
id: US-004
feature: FS-170
title: "Automated PR Generation"
status: completed
priority: P0
created: 2026-01-20
project: specweave-dev
---

# US-004: Automated PR Generation

**Feature**: [FS-170](./FEATURE.md)

**As a** developer,
**I want** automatic PR creation for completed workstreams,
**So that** changes are ready for review.

---

## Acceptance Criteria

- [x] **AC-US4-01**: `--pr` flag enables PR generation
- [x] **AC-US4-02**: PR title: `[{increment}] {domain}: {summary}`
- [x] **AC-US4-03**: PR body includes task completion checklist
- [x] **AC-US4-04**: PR labeled by domain (frontend, backend, database)
- [x] **AC-US4-05**: `--draft-pr` creates draft PRs
- [x] **AC-US4-06**: Works with GitHub, GitLab, Azure DevOps
- [x] **AC-US4-07**: Test coverage for PR generator ≥90%

---

## Implementation

**Increment**: [0170-parallel-auto-mode](../../../../increments/0170-parallel-auto-mode/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-015**: Create PR Generator
- [x] **T-016**: Create PR Generator Tests (90%+ coverage)
- [x] **T-019**: Extend Auto Command Options
- [x] **T-025**: Create Integration Tests
- [x] **T-026**: Update Auto Command Documentation
