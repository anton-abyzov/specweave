---
id: US-005
feature: FS-053
title: "GitHub Issue Deletion (Priority: P1)"
status: completed
priority: P1
created: 2025-11-23T00:00:00.000Z
---

# US-005: GitHub Issue Deletion (Priority: P1)

**Feature**: [FS-053](./FEATURE.md)

**As a** maintainer syncing with GitHub
**I want** feature deletion to also delete related GitHub issues
**So that** GitHub issues don't become orphaned

---

## Acceptance Criteria

- [x] **AC-US5-01**: Command finds all GitHub issues linked to feature's user stories
- [x] **AC-US5-02**: Command shows list of issues to be deleted (with titles)
- [x] **AC-US5-03**: Command requires separate confirmation for GitHub deletion
- [x] **AC-US5-04**: GitHub deletion can be skipped with `--no-github` flag
- [x] **AC-US5-05**: GitHub deletion handles API errors gracefully (e.g., rate limits)
- [x] **AC-US5-06**: Command logs GitHub API responses (issue IDs deleted)
- [x] **AC-US5-01**: Command finds all GitHub issues linked to feature's user stories
- [x] **AC-US5-02**: Command shows list of issues to be deleted (with titles)
- [x] **AC-US5-03**: Command requires separate confirmation for GitHub deletion
- [x] **AC-US5-04**: GitHub deletion can be skipped with `--no-github` flag
- [x] **AC-US5-05**: GitHub deletion handles API errors gracefully (e.g., rate limits)
- [x] **AC-US5-06**: Command logs GitHub API responses (issue IDs deleted)

---

## Implementation

**Increment**: [0053-safe-feature-deletion](../../../../../../increments/_archive/0053-safe-feature-deletion/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-024**: Implement GitHub Issue Search by Feature ID
- [x] **T-025**: Implement GitHub Issue Closure (Not Deletion)
- [x] **T-026**: Implement GitHub Confirmation Prompt (Separate)
- [x] **T-027**: Implement --no-github Flag
- [x] **T-028**: Implement GitHub API Error Handling (Non-Critical)
- [x] **T-029**: Implement GitHub Rate Limit Retry Logic
