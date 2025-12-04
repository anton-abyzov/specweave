---
id: US-002
feature: FS-058
title: "Auto GitHub Sync on Status Change (P0)"
status: completed
priority: P0
created: 2025-11-24T00:00:00.000Z
---

# US-002: Auto GitHub Sync on Status Change (P0)

**Feature**: [FS-058](./FEATURE.md)

**As a** : Developer
**I want** : GitHub issues to update automatically when increment status changes
**So that** : Stakeholders see real-time progress without manual sync

---

## Acceptance Criteria

- [x] **AC-US2-01**: Status change `planning → active` triggers living docs sync
- [x] **AC-US2-02**: Status change `active → completed` triggers living docs + GitHub sync
- [x] **AC-US2-03**: Sync runs asynchronously (non-blocking)
- [x] **AC-US2-04**: Errors in sync don't crash `updateStatus()`
- [x] **AC-US2-05**: Circuit breaker prevents repeated sync failures
- [x] **AC-US2-06**: Sync only triggers on meaningful transitions (not backlog → paused)

---

## Implementation

**Increment**: [0058-fix-status-sync-and-auto-github-update](../../../../../../increments/_archive/0058-fix-status-sync-and-auto-github-update/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-004**: Create StatusChangeSyncTrigger class
- [x] **T-006**: Integrate trigger into MetadataManager.updateStatus()
- [x] **T-010**: Integration tests for auto-sync
- [x] **T-011**: E2E test: Create → Activate → Complete → GitHub
