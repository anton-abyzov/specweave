---
id: US-003
feature: FS-081
title: "Background Cloning During Init"
status: completed
priority: P1
created: 2025-12-02
---

# US-003: Background Cloning During Init

**Feature**: [FS-081](./FEATURE.md)

**As a** user
**I want** repository cloning to happen in background
**So that** init completes quickly and I can start working

---

## Acceptance Criteria

- [x] **AC-US3-01**: Init doesn't block waiting for clones
- [x] **AC-US3-02**: Background job is created for tracking
- [x] **AC-US3-03**: User sees "Cloning X repos in background..."
- [x] **AC-US3-04**: Clone progress can be checked via `/specweave:jobs`

---

## Implementation

**Increment**: [0081-ado-repo-cloning](../../../../../../increments/_archive/0081-ado-repo-cloning/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-003**: Wire ADO cloning into init flow
