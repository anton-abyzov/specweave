---
id: US-002
feature: null
title: "Complete GitHub Issue Import"
status: not_started
priority: P1
created: 2025-11-26
---

# US-002: Complete GitHub Issue Import

**Feature**: [null](./FEATURE.md)

**As a** user running `specweave init` with GitHub integration
**I want** ALL issues from configured repos to be imported
**So that** no work items are missed during brownfield onboarding

---

## Acceptance Criteria

- [ ] **AC-US2-01**: Import includes both open AND closed issues (configurable)
- [ ] **AC-US2-02**: Import fetches ALL pages (smart pagination with progress indicator)
- [ ] **AC-US2-03**: Parent repo is included in umbrella mode import
- [ ] **AC-US2-04**: Rate limit handling with automatic retry/backoff
- [ ] **AC-US2-05**: Summary shows total issues per repo and any skipped items
- [ ] **AC-US2-06**: Dry-run mode shows what WOULD be imported without creating files

---

## Implementation

**Increment**: [0071-fix-feature-id-collision-github-import](../../../../increments/0071-fix-feature-id-collision-github-import/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
