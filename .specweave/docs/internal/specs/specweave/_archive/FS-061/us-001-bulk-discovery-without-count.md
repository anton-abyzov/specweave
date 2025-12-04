---
id: US-001
feature: FS-061
title: "Bulk Discovery Without Count"
status: completed
priority: P1
created: 2025-11-24
---

# US-001: Bulk Discovery Without Count

**Feature**: [FS-061](./FEATURE.md)

**As a** user setting up multi-repo architecture
**I want** to discover repositories by pattern without specifying a count
**So that** I can see what's available before deciding

---

## Acceptance Criteria

- [x] **AC-US1-01**: No "you specified X" message appears during bulk discovery
- [x] **AC-US1-02**: Discovery shows clear "Found N repositories matching pattern" message
- [x] **AC-US1-03**: User can immediately select parent from discovered repos
- [x] **AC-US1-04**: Remaining repos auto-become implementation repos (no count question)

---

## Implementation

**Increment**: [0061-fix-multi-repo-init-ux](../../../../../../increments/_archive/0061-fix-multi-repo-init-ux/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Add skipValidation parameter to discoverRepositories
- [x] **T-002**: Update bulk discovery caller to use skipValidation
- [x] **T-003**: Fix "Create on GitHub?" for discovered repos
- [x] **T-004**: Build and verify
