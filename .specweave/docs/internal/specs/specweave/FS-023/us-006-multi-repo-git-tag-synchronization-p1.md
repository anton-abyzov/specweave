---
id: US-006
feature: FS-023
title: Multi-Repo Git Tag Synchronization (P1)
status: complete
created: 2025-11-15
completed: 2025-11-15
external:
  github:
    issue: 559
    url: https://github.com/anton-abyzov/specweave/issues/559
---

# US-006: Multi-Repo Git Tag Synchronization (P1)

**Feature**: [FS-023](../../_features/FS-023/FEATURE.md)

**As a** release engineer
**I want** git tags synchronized across multiple repos
**So that** platform versions are consistent

---

## Acceptance Criteria

- [ ] **AC-050**: Tags created atomically across all repos (P1, testable)
- [ ] **AC-051**: Rollback if any repo fails (P1, testable)
- [ ] **AC-052**: Manifest file tracks platform → service version mappings (P1, testable)
- [ ] **AC-053**: Validates all tags exist before declaring release complete (P1, testable)

---

## Implementation

**Increment**: [0023-release-management-enhancements](undefined)

**Tasks**:

---

## Related User Stories

- [US-001: Claude Code Plugin Registration (P0 - Critical)](us-001-claude-code-plugin-registration-p0-critical.md)
- [US-002: DORA Metrics Persistent Tracking (P1)](us-002-dora-metrics-persistent-tracking-p1.md)
- [US-003: DORA Living Docs Dashboard (P1)](us-003-dora-living-docs-dashboard-p1.md)
- [US-004: Platform Release Coordination (P1)](us-004-platform-release-coordination-p1.md)
- [US-005: GitFlow Release Branch Automation (P2)](us-005-gitflow-release-branch-automation-p2.md)
- [US-007: Post-Task-Completion Hooks Integration (P1)](us-007-post-task-completion-hooks-integration-p1.md)

---

**Status**: ✅ Complete
**Completed**: 2025-11-15
