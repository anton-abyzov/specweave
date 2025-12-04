---
id: US-003
feature: FS-065
title: "Job Management"
status: completed
priority: P1
created: 2024-11-26
---

# US-003: Job Management

**Feature**: [FS-065](./FEATURE.md)

**As a** user
**I want** to monitor and manage background jobs
**So that** I have visibility into long-running operations

---

## Acceptance Criteria

- [x] **AC-US3-01**: `/specweave:jobs` shows all active jobs
- [x] **AC-US3-02**: `--id <id>` shows job details
- [x] **AC-US3-03**: `--resume <id>` resumes paused job
- [x] **AC-US3-04**: Jobs auto-cleanup (keep last 10)

---

## Implementation

**Increment**: [0065-background-jobs](../../../../../../increments/_archive/0065-background-jobs/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create background job types
- [x] **T-002**: Create job manager service
- [x] **T-003**: Create /specweave:jobs slash command
- [x] **T-004**: Write internal documentation
- [x] **T-005**: Write public documentation
- [x] **T-009**: Test integration end-to-end
