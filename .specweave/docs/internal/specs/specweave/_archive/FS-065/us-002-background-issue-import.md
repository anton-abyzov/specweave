---
id: US-002
feature: FS-065
title: "Background Issue Import"
status: completed
priority: P1
created: 2024-11-26
---

# US-002: Background Issue Import

**Feature**: [FS-065](./FEATURE.md)

**As a** user importing 10K+ issues
**I want** import to run in background
**So that** I can work while large imports complete

---

## Acceptance Criteria

- [x] **AC-US2-01**: Import starts after `/specweave:import-external`
- [x] **AC-US2-02**: Progress shows items/total with ETA
- [x] **AC-US2-03**: Rate limits auto-pause job
- [x] **AC-US2-04**: Resume with `/specweave:jobs --resume <id>`

---

## Implementation

**Increment**: [0065-background-jobs](../../../../../../increments/_archive/0065-background-jobs/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-007**: Integrate job manager with external import
- [x] **T-008**: Add rate limit detection and auto-pause
- [x] **T-009**: Test integration end-to-end
