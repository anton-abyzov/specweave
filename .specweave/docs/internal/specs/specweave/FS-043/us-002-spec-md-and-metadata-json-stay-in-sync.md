---
id: US-002
feature: FS-043
title: spec.md and metadata.json Stay in Sync
status: planning
project: specweave
priority: P1
created: 2025-11-18
external:
  github:
    issue: 618
    url: https://github.com/anton-abyzov/specweave/issues/618
---

# US-002: spec.md and metadata.json Stay in Sync

**Epic**: FS-043
**Priority**: P1
**Status**: Planning
**Story Points**: 8

---

## User Story

**As a** SpecWeave framework contributor
**I want** spec.md and metadata.json to always have the same status value
**So that** I can trust either file as the source of truth without data corruption

---

## Acceptance Criteria

- [ ] **AC-US2-01**: `MetadataManager.updateStatus()` updates both metadata.json AND spec.md frontmatter
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (unit test: call updateStatus → verify both files updated)

- [ ] **AC-US2-02**: Sync validation detects desyncs and warns user
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P2
  - **Testable**: Yes (create desync manually → verify validation detects it)

- [ ] **AC-US2-03**: All status transitions (active→paused, active→completed, etc.) update spec.md
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (test each transition → verify spec.md updated)

- [ ] **AC-US2-04**: spec.md status field matches IncrementStatus enum values exactly
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (verify status in spec.md is valid enum value)

---

## Example Scenario

No specific example scenario provided in spec - see US-001 for related scenario.

---

## Implementation Notes

- Use `gray-matter` library to parse/update YAML frontmatter
- Atomic update: write spec.md AFTER metadata.json succeeds (rollback on failure)
- Preserve existing frontmatter fields (don't overwrite unrelated fields)
- Update ONLY the `status` field in frontmatter

---

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
