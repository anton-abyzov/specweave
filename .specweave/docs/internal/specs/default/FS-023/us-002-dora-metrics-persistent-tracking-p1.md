---
id: US-002
epic: FS-023
title: "DORA Metrics Persistent Tracking (P1)"
status: complete
created: 2025-11-15
completed: 2025-11-15
---

# US-002: DORA Metrics Persistent Tracking (P1)

**Feature**: [FS-023](../../_features/FS-023/FEATURE.md)

**As a** engineering leader
**I want** DORA metrics tracked persistently over time
**So that** I can see trends and measure improvement

---

## Acceptance Criteria

- [ ] **AC-010**: Metrics stored in JSON: `.specweave/metrics/dora-history.jsonl` (P1, testable)
- [ ] **AC-011**: Append-only log format (one metric snapshot per line) (P1, testable)
- [ ] **AC-012**: Track all 4 metrics: deployment frequency, lead time, CFR, MTTR (P1, testable)
- [ ] **AC-013**: Calculate trends: 7-day, 30-day, 90-day rolling averages (P1, testable)
- [ ] **AC-014**: Detect degradation: Alert if metrics worsen >20% (P1, testable)

---

## Implementation

**Increment**: [0023-release-management-enhancements](undefined)

**Tasks**:

---

## Related User Stories

- [US-001: Claude Code Plugin Registration (P0 - Critical)](us-001-claude-code-plugin-registration-p0-critical.md)
- [US-003: DORA Living Docs Dashboard (P1)](us-003-dora-living-docs-dashboard-p1.md)
- [US-004: Platform Release Coordination (P1)](us-004-platform-release-coordination-p1.md)
- [US-005: GitFlow Release Branch Automation (P2)](us-005-gitflow-release-branch-automation-p2.md)
- [US-006: Multi-Repo Git Tag Synchronization (P1)](us-006-multi-repo-git-tag-synchronization-p1.md)
- [US-007: Post-Task-Completion Hooks Integration (P1)](us-007-post-task-completion-hooks-integration-p1.md)

---

**Status**: ✅ Complete
**Completed**: 2025-11-15
