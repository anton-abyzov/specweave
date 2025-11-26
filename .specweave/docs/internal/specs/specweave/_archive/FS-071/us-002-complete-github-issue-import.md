---
id: US-002
feature: FS-071
title: "Complete GitHub Issue Import"
status: completed
priority: P1
created: 2025-11-26
---

**Origin**: 🏠 **Internal**


# US-002: Complete GitHub Issue Import

**Feature**: [FS-071](./FEATURE.md)

**As a** user running `specweave init` with GitHub integration
**I want** ALL issues from configured repos to be imported
**So that** no work items are missed during brownfield onboarding

---

## Acceptance Criteria

- [x] **AC-US2-01**: Import includes both open AND closed issues (configurable)
- [x] **AC-US2-02**: Import fetches ALL pages (smart pagination with progress indicator)
- [x] **AC-US2-03**: Parent repo is included in umbrella mode import
- [ ] **AC-US2-04**: Rate limit handling with automatic retry/backoff
- [x] **AC-US2-05**: Summary shows total issues per repo and any skipped items
- [x] **AC-US2-06**: Dry-run mode shows what WOULD be imported without creating files

---

## Implementation

**Increment**: `0071-fix-feature-id-collision-github-import`

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] T-002: Analyze GitHub import flow for missing issues
- [x] T-006: Add prompt for including closed issues
- [x] T-007: Add progress indicator for pagination
- [x] T-008: Verify parent repo included in umbrella import
- [x] T-009: Add per-repo import summary
- [x] T-010: Implement dry-run mode for import
- [x] T-012: Add integration test for GitHub import completeness