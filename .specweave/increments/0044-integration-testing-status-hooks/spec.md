---
increment: 0044-integration-testing-status-hooks
title: 'Integration Testing - Status Line and Hooks'
priority: P2
status: planning
type: test
created: 2025-11-19T00:00:00.000Z
test_mode: TDD
coverage_target: 95
parent_increment: 0043-spec-md-desync-fix
origin: deferred_from_0043
---

# Integration Testing - Status Line and Hooks

## Overview

**Parent Increment**: 0043-spec-md-desync-fix

**Purpose**: Validate that the spec.md desync fix (completed in 0043) works correctly in production scenarios with status line hooks, living docs sync, and full increment lifecycle workflows.

**Scope**: Integration and E2E testing only. Core implementation already complete in increment 0043.

---

## Background

Increment 0043 successfully fixed the core spec.md/metadata.json desync bug:
- ✅ `SpecFrontmatterUpdater` class implemented
- ✅ `MetadataManager` integration complete
- ✅ Validation and repair tools working
- ✅ Unit tests passing (95%+ coverage)
- ✅ Zero desyncs in current codebase

**What's Missing**: Comprehensive integration testing to verify the fix works in production scenarios:
- Status line hook reading updated spec.md
- `/specweave:done` command end-to-end workflow
- Living docs sync hooks reading correct status
- Full increment lifecycle with all hooks

---

## User Stories (Deferred from 0043)

### US-001: Status Line Shows Correct Active Increment (Priority: P1)

**As a** developer working on SpecWeave
**I want** the status line to always show the CURRENT active increment
**So that** I know which increment I'm working on without manually checking folders

**Acceptance Criteria**:
- [ ] **AC-US1-01**: When closing increment via `/specweave:done`, status line updates to next active increment
  - **Tests**: Integration test - close increment → verify status line updates
  - **Tasks**: T-013, T-014 (deferred from 0043)
  - **Priority**: P1

- [ ] **AC-US1-02**: Status line never shows completed increments as active
  - **Tests**: Integration test - scan completed increments → verify excluded from status line
  - **Tasks**: T-014, T-020 (deferred from 0043)
  - **Priority**: P1

- [ ] **AC-US1-03**: Status line hook reads spec.md and finds correct status (not stale "active")
  - **Tests**: Integration test - execute hook → verify reads spec.md correctly
  - **Tasks**: T-013 (deferred from 0043)
  - **Priority**: P1

---

### US-003: Hooks Read Correct Increment Status (Priority: P1)

**As a** developer using GitHub/JIRA/ADO sync
**I want** hooks to read the latest increment status from spec.md
**So that** external tools stay in sync with SpecWeave state

**Acceptance Criteria**:
- [ ] **AC-US3-01**: Status line hook (`update-status-line.sh`) reads spec.md and finds correct status
  - **Tests**: Integration test - call hook after status change → verify reads updated spec.md
  - **Tasks**: T-013 (deferred from 0043)
  - **Priority**: P1

- [ ] **AC-US3-02**: Living docs sync hooks read spec.md frontmatter and get correct status
  - **Tests**: Integration test - mock sync hook → verify reads spec.md not metadata.json
  - **Tasks**: T-020 (deferred from 0043)
  - **Priority**: P2

- [ ] **AC-US3-03**: GitHub sync reads completed status from spec.md and closes GitHub issue
  - **Tests**: E2E test - close increment → verify GitHub issue closed
  - **Tasks**: T-020, T-023 (deferred from 0043)
  - **Priority**: P2

---

## Tasks (Deferred from 0043)

### Integration Tests

- [ ] **T-013**: Test Status Line Hook Reads Updated spec.md
  - Integration test: Close increment → run hook → verify reads "completed"
  - Priority: P1, Estimate: 3 hours

- [ ] **T-014**: Test /specweave:done Updates spec.md
  - Integration test: Execute /done → verify spec.md and status line updated
  - Priority: P1, Estimate: 3 hours

- [ ] **T-020**: Write E2E Test (Full Increment Lifecycle)
  - E2E test: Create → work → close → verify status line updates
  - Priority: P1, Estimate: 4 hours

### Testing & Validation

- [ ] **T-021**: Write E2E Test (Repair Script Workflow)
  - E2E test: Create desync → validate → repair → re-validate
  - Priority: P2, Estimate: 3 hours

- [ ] **T-022**: Run Performance Benchmarks (< 10ms target)
  - Performance test: Measure updateStatus() latency
  - Priority: P2, Estimate: 2 hours

- [ ] **T-023**: Manual Testing Checklist Execution
  - Manual validation: All status transitions, hooks, status line accuracy
  - Priority: P1, Estimate: 2 hours

---

## Success Criteria

**All 6 ACs must pass** (3 from US-001, 3 from US-003)

**Test Coverage**:
- Integration tests: 100% (all critical paths)
- E2E tests: 100% (full workflow coverage)
- Manual testing: All checklist items passing

**Performance**:
- Status update latency: < 10ms average
- No regressions from increment 0043

---

## Dependencies

**Completed in 0043**:
- ✅ SpecFrontmatterUpdater class
- ✅ MetadataManager integration
- ✅ Validation and repair scripts

**Required for 0044**:
- Increment 0043 merged to develop
- All unit tests passing from 0043
- Hooks infrastructure functional

---

## Related Documentation

**Parent Increment**: `.specweave/increments/0043-spec-md-desync-fix/`
- `spec.md` - Original specification with all 5 user stories
- `reports/SCOPE-REDUCTION-FINAL-2025-11-19.md` - Descope rationale
- `reports/PM-VALIDATION-REPORT-2025-11-19.md` - PM approval of reduced scope

**Architecture**:
- `.specweave/docs/internal/architecture/hld-system.md` - Source of truth principle
- ADR-0043 (when created) - Spec frontmatter sync strategy

---

**Status**: Planning (stub created from 0043 descope)
**Next Steps**: Review and approve scope → Create plan.md → Create tasks.md → Execute tests
**Estimated Effort**: 2-3 days (17 hours total)

---

**Created**: 2025-11-19 (deferred from increment 0043)
**Deferred Reason**: Integration testing separable from core bug fix (0043). Core fix validated via unit tests; integration tests validate production scenarios.
