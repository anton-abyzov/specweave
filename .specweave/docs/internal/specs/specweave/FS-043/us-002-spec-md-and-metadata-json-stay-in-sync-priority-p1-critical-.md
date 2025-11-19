---
id: US-002
feature: FS-043
title: "spec.md and metadata.json Stay in Sync (Priority: P1 - CRITICAL)"
status: completed
priority: P1
created: 2025-11-18T00:00:00.000Z
---

# US-002: spec.md and metadata.json Stay in Sync (Priority: P1 - CRITICAL)

**GitHub Project**: https://github.com/anton-abyzov/specweave/issues/623

**Feature**: [FS-043](../../_features/FS-043/FEATURE.md)

**As a** SpecWeave framework contributor
**I want** spec.md and metadata.json to always have the same status value
**So that** I can trust either file as the source of truth without data corruption

---

## Acceptance Criteria

- [x] **AC-US2-01**: `MetadataManager.updateStatus()` updates both metadata.json AND spec.md frontmatter
- [x] **AC-US2-02**: Sync validation detects desyncs and warns user
- [x] **AC-US2-03**: All status transitions (active→paused, active→completed, etc.) update spec.md
- [x] **AC-US2-04**: spec.md status field matches IncrementStatus enum values exactly

---

## Implementation

**Increment**: [0043-spec-md-desync-fix](../../../../increments/0043-spec-md-desync-fix/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create SpecFrontmatterUpdater Class Foundation
- [x] **T-002**: Implement updateStatus() with Atomic Write
- [x] **T-003**: Implement readStatus() Method
- [x] **T-004**: Implement validate() Method
- [x] **T-005**: Add spec.md Sync to MetadataManager.updateStatus()
- [x] **T-006**: Implement Rollback on spec.md Update Failure
- [x] **T-007**: Test All Status Transitions Update spec.md
- [x] **T-015**: Test /specweave:pause and /specweave:resume Update spec.md
- [x] **T-018**: Create ADR-0043 (Spec Frontmatter Sync Strategy)
- [x] **T-019**: Update CHANGELOG.md
- [x] **T-020**: Write E2E Test (Full Increment Lifecycle)
- [x] **T-022**: Run Performance Benchmarks (< 10ms target)
- [x] **T-023**: Manual Testing Checklist Execution
