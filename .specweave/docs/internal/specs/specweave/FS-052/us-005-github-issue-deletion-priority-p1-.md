---
id: US-005
feature: FS-052
title: "GitHub Issue Deletion (Priority: P1)"
status: planned
priority: P1
created: 2025-11-23
---

**Origin**: 🏠 **Internal**


# US-005: GitHub Issue Deletion (Priority: P1)

**Feature**: [FS-052](../../_features/FS-052/FEATURE.md)

**As a** maintainer syncing with GitHub
**I want** feature deletion to also delete related GitHub issues
**So that** GitHub issues don't become orphaned

---

## Acceptance Criteria

- [ ] **AC-US5-01**: Command finds all GitHub issues linked to feature's user stories
- [ ] **AC-US5-02**: Command shows list of issues to be deleted (with titles)
- [ ] **AC-US5-03**: Command requires separate confirmation for GitHub deletion
- [ ] **AC-US5-04**: GitHub deletion can be skipped with `--no-github` flag
- [ ] **AC-US5-05**: GitHub deletion handles API errors gracefully (e.g., rate limits)
- [ ] **AC-US5-06**: Command logs GitHub API responses (issue IDs deleted)

---

## Implementation

**Increment**: [0052-safe-feature-deletion](../../../../increments/0052-safe-feature-deletion/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] [T-024](../../../../increments/0052-safe-feature-deletion/tasks.md#T-024): Implement GitHub Issue Search by Feature ID
- [ ] [T-025](../../../../increments/0052-safe-feature-deletion/tasks.md#T-025): Implement GitHub Issue Closure (Not Deletion)
- [ ] [T-026](../../../../increments/0052-safe-feature-deletion/tasks.md#T-026): Implement GitHub Confirmation Prompt (Separate)
- [ ] [T-027](../../../../increments/0052-safe-feature-deletion/tasks.md#T-027): Implement --no-github Flag
- [ ] [T-028](../../../../increments/0052-safe-feature-deletion/tasks.md#T-028): Implement GitHub API Error Handling (Non-Critical)
- [ ] [T-029](../../../../increments/0052-safe-feature-deletion/tasks.md#T-029): Implement GitHub Rate Limit Retry Logic