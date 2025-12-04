---
id: US-002
feature: FS-074
title: "GitHub Import Completeness"
status: completed
priority: P0
created: 2025-11-26
---

# US-002: GitHub Import Completeness

**Feature**: [FS-074](./FEATURE.md)

**As a** user running `specweave init` with GitHub integration
**I want** ALL issues from configured repos to be imported
**So that** no work items are missed during brownfield onboarding

---

## Acceptance Criteria

- [x] **AC-US2-01**: Debug logging shows exactly how many issues API returned
- [x] **AC-US2-02**: Summary shows total per repo, including skipped items with reasons
- [x] **AC-US2-03**: Time range filter behavior clearly documented in prompt
- [x] **AC-US2-04**: If 0 issues imported, show warning with troubleshooting steps

---

## Implementation

**Increment**: [0074-fix-internal-feature-collision-and-import](../../../../../../increments/_archive/0074-fix-internal-feature-collision-and-import/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-002**: Reproduce and document the 1-issue-per-repo bug
- [x] **T-007**: Add verbose import logging
- [x] **T-008**: Improve import troubleshooting
- [x] **T-011**: Fix cross-repo duplicate detection collision
- [x] **T-010**: Add import logging tests
