---
id: US-005
feature: FS-118E
title: Auto-Close GitHub Issue on Increment Completion
status: completed
priority: P1
created: 2025-12-07
project: specweave
external:
  github:
    issue: 888
    url: https://github.com/anton-abyzov/specweave/issues/888
---

# US-005: Auto-Close GitHub Issue on Increment Completion

**Feature**: [FS-118E](./FEATURE.md)

**As a** SpecWeave user with an external-origin increment (E-suffix),
**I want** the GitHub issue to be automatically closed when I run `/specweave:done`,
**So that** my GitHub issues stay in sync with my increment status.

---

## Acceptance Criteria

- [x] **AC-US5-01**: `/specweave:done` MUST detect `external_ref` in metadata.json
- [x] **AC-US5-02**: Parse `external_ref` format: `github#owner/repo#issue_number`
- [x] **AC-US5-03**: Close GitHub issue via `gh issue close <number>` when increment completes
- [x] **AC-US5-04**: Add completion comment with summary (gates passed, duration, deliverables)
- [x] **AC-US5-05**: Handle missing `gh` CLI gracefully (warn, don't fail)
- [x] **AC-US5-06**: Respect `canUpdateStatus` permission before closing
- [x] **AC-US5-07**: Log issue closure in sync output

---

## Implementation

**Increment**: [0118E-external-tool-sync-on-increment-start](../../../../increments/0118E-external-tool-sync-on-increment-start/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-005**: Auto-close GitHub issue on increment completion
