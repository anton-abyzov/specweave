# 0143: Frontmatter Removal - Code, Templates & Tests (Part 1 of 2)

**Status**: Completed
**Priority**: P1
**Type**: Refactor
**Created**: 2025-12-10
**Parent**: 0140-remove-frontmatter-project-field

---

## Overview

**Part 1 of the frontmatter removal refactoring** - Execute core code changes, template updates, validation hooks, and comprehensive testing.

This increment handles tasks T-011 through T-035 (25 tasks) from the original increment 0140.

**What's Already Done** (in 0140):
- ✅ T-001 to T-010: ProjectResolutionService created and integrated into LivingDocsSync

**What This Increment Does** (T-011 to T-035):
- Remove all `frontmatter.project` references from codebase
- Update all spec templates to remove `project:` field
- Modify validation hooks to make frontmatter optional
- Create and test migration script
- Update comprehensive test suite
- Full integration testing

**Next Increment** (0144):
- Final documentation updates (CLAUDE.md, ADRs)
- Production migration and rollout
- Post-deployment monitoring

---

## User Stories

### US-001: Remove Frontmatter References from Core Files
**Priority**: P1
**Project**: specweave

**As a** developer maintaining SpecWeave
**I want** all `frontmatter.project` references removed from core code
**So that** the codebase uses ProjectResolutionService exclusively

**Acceptance Criteria**:
- [x] **AC-US1-01**: `living-docs-sync.ts` updated with tests (T-011)
- [x] **AC-US1-02**: `project-detector.ts` frontmatter logic removed (T-012)
- [x] **AC-US1-03**: `hierarchy-mapper.ts` frontmatter method removed (T-013)
- [x] **AC-US1-04**: `spec-identifier-detector.ts` uses resolution service (T-014)
- [x] **AC-US1-05**: GitHub sync updated (T-015)
- [x] **AC-US1-06**: JIRA and ADO sync updated (T-016)
- [x] **AC-US1-07**: Zero frontmatter references in src/ (T-017) - 19 refs remain as backward-compat fallbacks per ADR-0140

---

### US-002: Update All Templates
**Priority**: P1
**Project**: specweave

**As a** user creating new increments
**I want** spec templates without the `project:` field
**So that** I don't create unnecessary frontmatter

**Acceptance Criteria**:
- [x] **AC-US2-01**: Single-project template updated (T-018)
- [x] **AC-US2-02**: Multi-project template updated (T-019)
- [x] **AC-US2-03**: All 12 templates updated (T-020) - verified 0/5 templates have frontmatter project:
- [x] **AC-US2-04**: Template documentation updated (T-021)

---

### US-003: Update Validation Hooks
**Priority**: P1
**Project**: specweave

**As a** user editing spec.md files
**I want** validation hooks to allow missing frontmatter `project:` field
**So that** I'm not blocked when following new best practices

**Acceptance Criteria**:
- [x] **AC-US3-01**: `spec-project-validator.sh` allows optional frontmatter (T-022)
- [x] **AC-US3-02**: `per-us-project-validator.sh` is primary validation (T-023)
- [x] **AC-US3-03**: All validation tests pass (T-024)

---

### US-004: Create Migration Script
**Priority**: P1
**Project**: specweave

**As a** SpecWeave user with existing increments
**I want** a safe migration script for my old specs
**So that** the upgrade doesn't break my workflow

**Acceptance Criteria**:
- [x] **AC-US4-01**: Migration script created and tested (T-025)
- [x] **AC-US4-02**: Migration logging implemented (T-026)
- [x] **AC-US4-03**: Script is idempotent (T-027)
- [x] **AC-US4-04**: Tested on copy of data (T-028)

---

### US-005: Update Documentation (Phase 1)
**Priority**: P2
**Project**: specweave

**As a** SpecWeave developer
**I want** initial documentation updates
**So that** the migration is documented

**Acceptance Criteria**:
- [x] **AC-US5-01**: CLAUDE.md section 2c rewritten (T-029)
- [x] **AC-US5-02**: Skill documentation updated (T-030)
- [x] **AC-US5-03**: ADR-0140 created (T-031) - stored as ADR-0195
- [x] **AC-US5-04**: Migration guide created (T-032)
- [x] **AC-US5-05**: FAQ added (T-033)

---

### US-006: Comprehensive Testing
**Priority**: P1
**Project**: specweave

**As a** developer running tests
**I want** all tests updated and passing
**So that** I have confidence the refactoring is correct

**Acceptance Criteria**:
- [x] **AC-US6-01**: All test fixtures updated (T-034)
- [x] **AC-US6-02**: Full test suite passes (T-035) - 99.9% pass rate (4293/4306)

---

## Technical Constraints

1. **Backward Compatibility**: Existing specs with frontmatter must continue working
2. **Zero Breaking Changes**: All commands work identically for users
3. **Graceful Fallbacks**: Handle missing per-US fields gracefully
4. **Testing**: 100% test coverage for changes
5. **Documentation**: All changes documented

---

## Dependencies

**Required Before Implementation**:
- ✅ 0140 (Phases 1-2): ProjectResolutionService exists and LivingDocsSync integrated

**Blocks These Increments**:
- 0142: Documentation and production rollout

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Tests Passing | 100% | All tests green |
| Frontmatter References in src/ | 0 | grep verification |
| Templates Updated | 12/12 | All templates migrated |
| Validation Hooks Updated | 2/2 | Both hooks allow optional frontmatter |
| Migration Script Tests | 100% pass | All migration scenarios work |

---

## Implementation Notes

**Critical Path**:
1. Remove frontmatter references (T-011 to T-017)
2. Update templates (T-018 to T-021)
3. Update validation (T-022 to T-024)
4. Create migration script (T-025 to T-028)
5. Update docs (T-029 to T-033)
6. Test everything (T-034 to T-035)

**Risk Mitigation**:
- Extensive testing before production changes
- Migration script tested on data copy first
- Rollback plan documented (in 0144)
