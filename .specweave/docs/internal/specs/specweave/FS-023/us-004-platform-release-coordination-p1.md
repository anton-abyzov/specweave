---
id: US-004
feature: FS-023
title: Platform Release Coordination (P1)
status: complete
created: 2025-11-15
completed: 2025-11-15
external:
  github:
    issue: 557
    url: https://github.com/anton-abyzov/specweave/issues/557
---

# US-004: Platform Release Coordination (P1)

**Feature**: [FS-023](../../_features/FS-023/FEATURE.md)

**As a** release engineer
**I want** to coordinate releases across multiple repos
**So that** all services release together as a platform version

---

## Acceptance Criteria

- [ ] **AC-030**: Command `/specweave-release:platform-release create v3.0.0` (P1, testable)
- [ ] **AC-031**: Creates release branches in all repos: `release/v3.0.0` (P1, testable)
- [ ] **AC-032**: Tags RCs in all repos: `v*-rc.1` (per-repo versions) (P1, testable)
- [ ] **AC-033**: Validates cross-repo compatibility before tagging (P1, testable)
- [ ] **AC-034**: Updates version matrix in living docs (P1, testable)

---

## Implementation

**Increment**: [0023-release-management-enhancements](undefined)

**Tasks**:

---

## Related User Stories

- [US-001: Claude Code Plugin Registration (P0 - Critical)](us-001-claude-code-plugin-registration-p0-critical.md)
- [US-002: DORA Metrics Persistent Tracking (P1)](us-002-dora-metrics-persistent-tracking-p1.md)
- [US-003: DORA Living Docs Dashboard (P1)](us-003-dora-living-docs-dashboard-p1.md)
- [US-005: GitFlow Release Branch Automation (P2)](us-005-gitflow-release-branch-automation-p2.md)
- [US-006: Multi-Repo Git Tag Synchronization (P1)](us-006-multi-repo-git-tag-synchronization-p1.md)
- [US-007: Post-Task-Completion Hooks Integration (P1)](us-007-post-task-completion-hooks-integration-p1.md)

---

**Status**: ✅ Complete
**Completed**: 2025-11-15
