---
id: US-002
feature: FS-104
title: "Resume Orphaned Jobs"
status: completed
priority: P1
created: 2025-12-04
---

# US-002: Resume Orphaned Jobs

**Feature**: [FS-104](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US2-01**: `--resume <jobId>` resumes specific job from checkpoint
- [x] **AC-US2-02**: Command auto-detects orphaned jobs and offers to resume
- [x] **AC-US2-03**: Resume continues from last completed phase

---

## Implementation

**Increment**: [0104-living-docs-command](../../../../increments/0104-living-docs-command/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-004**: Implement orphan detection
- [x] **T-005**: Implement resume from checkpoint
