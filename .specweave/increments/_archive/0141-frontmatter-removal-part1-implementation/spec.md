# 0141: Frontmatter Project Removal - Part 1: Core Implementation

**Status**: Completed
**Priority**: P1
**Type**: Refactor
**Created**: 2025-12-10
**Parent Increment**: 0140-remove-frontmatter-project-field

---

## Overview

**Part 1 of 2**: Complete the core implementation of frontmatter project field removal by finishing the remaining code changes, template updates, and validation hook modifications. This increment builds on the completed ProjectResolutionService (T-001 to T-010) and finalizes all code-level changes.

**Scope**: Phases 3-5 (T-011 to T-024)
- Phase 3: Remove all remaining frontmatter references from codebase
- Phase 4: Update all templates to remove project: field
- Phase 5: Update validation hooks to make frontmatter optional

**Progress from 0140**:
- ✅ Phase 1: ProjectResolutionService (T-001 to T-006) - COMPLETED
- ✅ Phase 2: Living Docs Sync Integration (T-007 to T-010) - COMPLETED
- 🔄 Phase 3-5: This increment (T-011 to T-024)

**Out of Scope** (Part 2 - Increment 0142):
- Migration script and production migration
- Comprehensive documentation updates
- Full test suite validation
- Rollout and monitoring

---

## User Stories

### US-001: Complete Living Docs Sync Migration
**Priority**: P1
**Project**: specweave

**As a** developer maintaining living docs sync
**I want** all living docs sync tests passing with new resolution service
**So that** the migration is complete and verified

**Acceptance Criteria**:
- [x] **AC-US1-01**: All living docs sync tests updated to use ProjectResolutionService
- [x] **AC-US1-02**: No test references to `frontmatter.project` remain
- [x] **AC-US1-03**: Mock objects include resolution service
- [x] **AC-US1-04**: All existing tests pass without regressions

---

### US-002: Remove All Frontmatter References from Core Code
**Priority**: P1
**Project**: specweave

**As a** developer maintaining the codebase
**I want** zero references to `frontmatter.project` in `src/` directory
**So that** there's no confusion about the source of truth

**Acceptance Criteria**:
- [x] **AC-US2-01**: `project-detector.ts` removes frontmatter scoring logic (lines 199-206)
- [x] **AC-US2-02**: `hierarchy-mapper.ts` removes `detectProjectsFromFrontmatter()` method
- [x] **AC-US2-03**: `spec-identifier-detector.ts` uses ProjectResolutionService instead of frontmatter
- [x] **AC-US2-04**: GitHub sync (`user-story-issue-builder.ts`) removes frontmatter project labels
- [x] **AC-US2-05**: JIRA and ADO sync use ProjectResolutionService
- [x] **AC-US2-06**: `grep -r "frontmatter\.project" src/` returns zero matches
- [x] **AC-US2-07**: All related tests updated and passing

---

### US-003: Update All Templates
**Priority**: P1
**Project**: specweave

**As a** user creating new increments
**I want** templates without redundant `project:` frontmatter
**So that** new specs follow best practices from the start

**Acceptance Criteria**:
- [x] **AC-US3-01**: `spec-single-project.md` template removes `project:` line
- [x] **AC-US3-02**: `spec-multi-project.md` template removes `project:` and `board:` lines
- [x] **AC-US3-03**: All 12 templates in `increment-planner/templates/` updated
- [x] **AC-US3-04**: Template generation code doesn't add `project:` field
- [x] **AC-US3-05**: Example specs in skill docs updated to match
- [x] **AC-US3-06**: Template documentation explains new structure

---

### US-004: Update Validation Hooks
**Priority**: P1
**Project**: specweave

**As a** user editing spec.md files
**I want** validation hooks to allow optional frontmatter project field
**So that** I'm not blocked when following new best practices

**Acceptance Criteria**:
- [x] **AC-US4-01**: `spec-project-validator.sh` allows missing `project:` in single-project mode
- [x] **AC-US4-02**: `spec-project-validator.sh` allows missing `project:` in multi-project mode
- [x] **AC-US4-03**: Hook still validates per-US `**Project**:` fields are present
- [x] **AC-US4-04**: Error messages guide users to per-US fields
- [x] **AC-US4-05**: `per-us-project-validator.sh` executes before `spec-project-validator.sh`
- [x] **AC-US4-06**: All hook validation tests pass with optional frontmatter

---

## Technical Constraints

1. **Backward Compatibility**: Code must handle both old (with frontmatter) and new (without) specs
2. **Zero Breaking Changes**: All existing workflows must continue to function
3. **Complete Test Coverage**: All modified code must have passing tests
4. **Documentation Inline**: Update code comments and inline docs

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Frontmatter References in src/ | 0 | `grep -r "frontmatter.project" src/` |
| Tests Passing | 100% | All living docs, external sync tests pass |
| Templates Updated | 12/12 | All templates lack frontmatter project: |
| Hook Tests Passing | 100% | Validation hook tests all green |

---

## Dependencies

**Completed Prerequisites** (from 0140):
- ✅ ProjectResolutionService fully implemented and tested
- ✅ LivingDocsSync integrated with resolution service
- ✅ Core resolution logic working

**Blocks**:
- 0142-frontmatter-removal-part2-migration (migration and rollout)

---

## Implementation Notes

**Completion Strategy**:
1. Start with Phase 3 (remove frontmatter references)
2. Move to Phase 4 (update templates) - less risky
3. Finish with Phase 5 (validation hooks) - requires careful testing

**Testing Approach**:
- Update tests as code changes
- Run relevant test suites after each phase
- Verify no regressions with full `npm test` at end

**Risk Mitigation**:
- Each phase is independent - can pause between phases
- All changes are additive (making frontmatter optional, not removing support)
- Rollback is simple (revert commits)
