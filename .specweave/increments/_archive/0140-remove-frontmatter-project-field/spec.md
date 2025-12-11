# 0140: Remove Frontmatter Project Field

**Status**: Completed
**Priority**: P1
**Type**: Refactor
**Created**: 2025-12-10

---

## Overview

Remove the redundant `project:` field from spec.md YAML frontmatter and implement a robust, centralized project resolution system. This major architectural refactoring eliminates a critical source of duplication and confusion while maintaining full backward compatibility through intelligent fallback mechanisms.

**Problem**: The frontmatter `project:` field creates confusion and maintenance burden:
- In single-project mode: ignored but still required by validation
- Duplicates per-US `**Project**:` field information
- Creates false dependency in multi-project cross-project increments
- Requires 70+ files to maintain consistency
- Validation hooks enforce it but resolution logic ignores it

**Solution**: Centralized project resolution with smart fallbacks:
1. Primary: Extract from per-US `**Project**:` fields (already implemented)
2. Fallback 1: Use `config.project.name` (single-project mode)
3. Fallback 2: Use intelligent project detection from increment content
4. Store resolved projects in runtime state (not frontmatter)

**Impact**:
- Eliminates redundancy across 70+ files
- Clearer semantics (per-US is source of truth)
- Simpler templates and validation
- Better cross-project increment support
- Full backward compatibility during migration

---

## User Stories

### US-001: Remove Frontmatter Project Field from All Code Paths
**Priority**: P1
**Project**: specweave

**As a** developer maintaining SpecWeave
**I want** the frontmatter `project:` field removed from all code paths
**So that** there's a single source of truth (per-US fields) and no confusion

**Acceptance Criteria**:
- [x] **AC-US1-01**: `living-docs-sync.ts:182` no longer references `parsed.frontmatter.project`
- [x] **AC-US1-02**: `living-docs-sync.ts:1188` no longer uses `frontmatter.project` as fallback
- [x] **AC-US1-03**: `resolveProjectPath()` never reads frontmatter, always uses config/detection
- [x] **AC-US1-04**: `project-detector.ts:199-206` removes frontmatter scoring logic
- [x] **AC-US1-05**: `hierarchy-mapper.ts:603-611` removes frontmatter project detection
- [x] **AC-US1-06**: All 17 files that access `frontmatter.project` updated
- [x] **AC-US1-07**: Zero references to `frontmatter.project` remain in `src/` directory

---

### US-002: Implement Centralized Project Resolution Service
**Priority**: P1
**Project**: specweave

**As a** developer working with project assignments
**I want** a single, authoritative project resolution service
**So that** all code paths use consistent, correct project information

**Acceptance Criteria**:
- [x] **AC-US2-01**: New `ProjectResolutionService` class created in `src/core/project/project-resolution.ts`
- [x] **AC-US2-02**: Service has `resolveProjectForIncrement(incrementId): Promise<string>` method
- [x] **AC-US2-03**: Resolution priority: per-US fields → config → intelligent detection
- [x] **AC-US2-04**: Service caches resolved projects per increment (runtime state)
- [x] **AC-US2-05**: Service validates resolved project exists in config
- [x] **AC-US2-06**: Service handles single-project and multi-project modes correctly
- [x] **AC-US2-07**: Service logs resolution path and confidence for debugging

---

### US-003: Update Living Docs Sync to Use Resolution Service
**Priority**: P1
**Project**: specweave

**As a** user syncing increments to living docs
**I want** living docs to use centralized project resolution
**So that** projects are assigned consistently without frontmatter

**Acceptance Criteria**:
- [x] **AC-US3-01**: `LivingDocsSync` constructor accepts `ProjectResolutionService` instance
- [x] **AC-US3-02**: `parseIncrementSpec()` no longer extracts `frontmatter.project`
- [x] **AC-US3-03**: `resolveProjectPath()` calls `projectResolution.resolveProjectForIncrement()`
- [x] **AC-US3-04**: Cross-project sync uses per-US projects exclusively
- [x] **AC-US3-05**: `extractUserStories()` defaultProject param uses resolved project (not frontmatter)
- [x] **AC-US3-06**: All living docs sync tests pass with new resolution

---

### US-004: Remove Frontmatter Project from Templates
**Priority**: P1
**Project**: specweave

**As a** user creating new increments
**I want** spec templates without the `project:` field
**So that** I don't create unnecessary frontmatter

**Acceptance Criteria**:
- [x] **AC-US4-01**: `spec-single-project.md` template removes `project:` line
- [x] **AC-US4-02**: `spec-multi-project.md` template removes `project:` and `board:` lines
- [x] **AC-US4-03**: All 12 templates in `increment-planner/templates/` updated
- [x] **AC-US4-04**: Skill documentation updated to reflect removal
- [x] **AC-US4-05**: Template generation code doesn't add `project:` field
- [x] **AC-US4-06**: Example specs in docs updated to match new format

---

### US-005: Update Validation Hooks for Optional Frontmatter
**Priority**: P1
**Project**: specweave

**As a** user editing spec.md files
**I want** validation hooks to allow missing frontmatter `project:` field
**So that** I'm not blocked when following new best practices

**Acceptance Criteria**:
- [x] **AC-US5-01**: `spec-project-validator.sh` allows missing `project:` field in single-project mode
- [x] **AC-US5-02**: `spec-project-validator.sh` allows missing `project:` field in multi-project mode
- [x] **AC-US5-03**: Hook validates per-US `**Project**:` fields are present and valid
- [x] **AC-US5-04**: Hook provides helpful error messages pointing to per-US fields
- [x] **AC-US5-05**: `per-us-project-validator.sh` becomes primary validation (not secondary)
- [x] **AC-US5-06**: All validation tests pass with optional frontmatter

---

### US-006: Migrate Existing Increments (Backward Compatibility)
**Priority**: P2
**Project**: specweave

**As a** SpecWeave user with existing increments
**I want** my old specs to continue working
**So that** the upgrade doesn't break my workflow

**Acceptance Criteria**:
- [x] **AC-US6-01**: Migration script `migrate-project-frontmatter.ts` created
- [x] **AC-US6-02**: Script scans all increments and removes frontmatter `project:` field
- [x] **AC-US6-03**: Script validates per-US fields are present before removing frontmatter
- [x] **AC-US6-04**: Script backs up original spec.md before modification
- [x] **AC-US6-05**: Script logs all changes for review
- [x] **AC-US6-06**: Script is idempotent (can run multiple times safely)
- [x] **AC-US6-07**: Migration preserves all other frontmatter fields
- [x] **AC-US6-08**: Documentation explains migration process and backward compatibility

---

### US-007: Update External Tool Sync Systems
**Priority**: P1
**Project**: specweave

**As a** user syncing to GitHub/JIRA/ADO
**I want** external sync to use resolved projects
**So that** external items are tagged correctly without frontmatter

**Acceptance Criteria**:
- [x] **AC-US7-01**: `spec-identifier-detector.ts` uses `ProjectResolutionService` instead of frontmatter
- [x] **AC-US7-02**: `user-story-issue-builder.ts` removes frontmatter project label logic
- [x] **AC-US7-03**: GitHub sync derives project from per-US fields
- [x] **AC-US7-04**: JIRA sync uses resolved project for project code
- [x] **AC-US7-05**: ADO sync uses resolved project for area path mapping
- [x] **AC-US7-06**: All external sync tests pass with new resolution

---

### US-008: Update Documentation and Best Practices
**Priority**: P2
**Project**: specweave

**As a** SpecWeave user reading documentation
**I want** updated docs that reflect the new architecture
**So that** I understand how to create and manage increments correctly

**Acceptance Criteria**:
- [x] **AC-US8-01**: CLAUDE.md section 2c completely rewritten to remove frontmatter references
- [x] **AC-US8-02**: `increment-planner/SKILL.md` updated with new best practices
- [x] **AC-US8-03**: `specweave-framework/SKILL.md` updated to explain resolution service
- [x] **AC-US8-04**: ADR created explaining architectural decision
- [x] **AC-US8-05**: Migration guide added to docs
- [x] **AC-US8-06**: FAQ added explaining per-US vs frontmatter

---

### US-009: Update Test Suite
**Priority**: P1
**Project**: specweave

**As a** developer running tests
**I want** all tests to pass with the new resolution system
**So that** I have confidence the refactoring is correct

**Acceptance Criteria**:
- [x] **AC-US9-01**: All 47 tests referencing `frontmatter.project` updated
- [x] **AC-US9-02**: New tests for `ProjectResolutionService` added
- [x] **AC-US9-03**: Integration tests verify end-to-end project resolution
- [x] **AC-US9-04**: Tests cover single-project mode resolution
- [x] **AC-US9-05**: Tests cover multi-project mode resolution
- [x] **AC-US9-06**: Tests cover cross-project increment handling
- [x] **AC-US9-07**: Tests verify fallback mechanisms work correctly
- [x] **AC-US9-08**: All existing tests pass (no regressions)

---

## Technical Constraints

1. **Backward Compatibility**: Existing specs with frontmatter `project:` field must continue to work during migration period
2. **Zero Breaking Changes**: All commands and workflows must function identically for users
3. **Graceful Fallbacks**: System must handle missing per-US fields gracefully
4. **Performance**: Resolution service must be fast (< 10ms per increment)
5. **Testing**: 100% test coverage for resolution service
6. **Documentation**: All changes must be documented with examples

---

## Out of Scope

1. **Board Field Removal**: Keeping `board:` field for 2-level structures (separate increment)
2. **Config Schema Changes**: Not changing `config.json` structure in this increment
3. **CLI Command Changes**: Not adding new CLI commands, only internal refactoring
4. **Living Docs Restructuring**: Not changing living docs folder structure

---

## Dependencies

**Required Before Implementation**:
- None - this is a standalone refactoring

**Blocks These Increments**:
- Future simplifications to multi-project architecture
- Enhanced cross-project increment support

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Files Modified | 70+ files | Count of files touched |
| Tests Passing | 100% | All existing + new tests pass |
| Frontmatter References | 0 in src/ | `grep -r "frontmatter.project" src/` returns empty |
| Migration Coverage | 100% | All increments migrated successfully |
| Performance | < 10ms | Project resolution time per increment |
| Documentation Updated | 100% | All docs reflect new architecture |

---

## Implementation Notes

**Key Architecture Decision**:
- Centralized resolution service acts as single source of truth
- Per-US `**Project**:` fields are primary data source
- Config provides fallback for single-project mode
- Intelligent detection provides ultimate fallback

**Migration Strategy**:
1. Implement resolution service with full backward compatibility
2. Update all code paths to use resolution service
3. Update validation to make frontmatter optional
4. Run migration script on existing increments
5. Update templates and documentation
6. Remove deprecated code paths after migration complete

**Risk Mitigation**:
- Extensive test coverage before touching production code
- Feature flag for gradual rollout if needed
- Rollback plan documented
- Migration script thoroughly tested on copy of data first
