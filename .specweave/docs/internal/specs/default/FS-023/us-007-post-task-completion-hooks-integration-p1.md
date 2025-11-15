---
id: US-007
epic: FS-023
title: "Post-Task-Completion Hooks Integration (P1)"
status: complete
created: 2025-11-15
completed: 2025-11-15
---

# US-007: Post-Task-Completion Hooks Integration (P1)

**Feature**: [FS-023](../../_features/FS-023/FEATURE.md)

**As a** developer
**I want** DORA metrics tracked automatically after task completion
**So that** I don't have to manually run metrics

---

## Acceptance Criteria

- [ ] **AC-060**: Hook fires after `/specweave:done` completes (P1, testable)
- [ ] **AC-061**: Calculates DORA metrics for completed increment (P1, testable)
- [ ] **AC-062**: Appends to metrics history (JSONL) (P1, testable)
- [ ] **AC-063**: Updates living docs dashboard (P1, testable)
- [ ] **AC-064**: Detects degradation and alerts (P1, testable)

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
- [US-006: Multi-Repo Git Tag Synchronization (P1)](us-006-multi-repo-git-tag-synchronization-p1.md)

---

**Status**: ✅ Complete
**Completed**: 2025-11-15
