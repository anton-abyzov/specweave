---
id: US-002
feature: FS-043
title: "spec.md and metadata.json Stay in Sync (Priority: P1 - CRITICAL)"
status: planning
priority: P1
created: 2025-11-18
---

# US-002: spec.md and metadata.json Stay in Sync (Priority: P1 - CRITICAL)

**Feature**: [FS-043](../../_features/FS-043/FEATURE.md)

**As a** SpecWeave framework contributor
**I want** spec.md and metadata.json to always have the same status value
**So that** I can trust either file as the source of truth without data corruption

---

## Acceptance Criteria

No acceptance criteria defined.

---

## Implementation

**Increment**: [0043-spec-md-desync-fix](../../../../increments/0043-spec-md-desync-fix/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-001**: Create SpecFrontmatterUpdater Class Foundation
- [ ] **T-002**: Implement updateStatus() with Atomic Write
- [ ] **T-003**: Implement readStatus() Method
- [ ] **T-004**: Implement validate() Method
- [ ] **T-005**: Add spec.md Sync to MetadataManager.updateStatus()
- [ ] **T-006**: Implement Rollback on spec.md Update Failure
- [ ] **T-007**: Test All Status Transitions Update spec.md
- [ ] **T-015**: Test /specweave:pause and /specweave:resume Update spec.md
- [ ] **T-018**: Create ADR-0043 (Spec Frontmatter Sync Strategy)
- [ ] **T-019**: Update CHANGELOG.md
- [ ] **T-020**: Write E2E Test (Full Increment Lifecycle)
- [ ] **T-022**: Run Performance Benchmarks (< 10ms target)
- [ ] **T-023**: Manual Testing Checklist Execution
