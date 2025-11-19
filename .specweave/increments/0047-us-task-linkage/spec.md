---
increment: 0047-us-task-linkage
title: "US-Task Linkage Architecture"
type: feature
priority: P0
status: planned
created: 2025-11-19
epic: FS-047
test_mode: test-after
coverage_target: 90
---

# Feature: US-Task Linkage Architecture

## Overview

Implement explicit traceability between User Stories, Acceptance Criteria, and Tasks to enable automatic living docs sync and AC validation. This feature addresses a critical gap in SpecWeave's traceability infrastructure where tasks in `tasks.md` have no explicit connection to their parent User Stories, causing broken living docs sync and preventing automatic AC coverage validation.

**Business Impact**: Core framework integrity - enables automatic documentation sync, bidirectional traceability (US ↔ Task ↔ AC), and comprehensive quality validation across ALL increments (past, present, future).

**Complete Requirements**: See [FS-047](../../docs/internal/specs/_features/FS-047/FEATURE.md) (living docs)

---

## User Stories

### US-001: Explicit US-Task Linkage in tasks.md

**As a** developer implementing an increment
**I want** tasks to explicitly declare which User Story they belong to
**So that** I can trace implementation back to requirements without manual inference

**Acceptance Criteria**:
- [x] **AC-US1-01**: Every task in tasks.md has **User Story** field linking to parent US (format: `**User Story**: US-001`)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (parser validates field presence)
  - **Completed by**: T-001 (parser implementation)

- [x] **AC-US1-02**: Tasks grouped by User Story in tasks.md (section headers: `## User Story: US-001 - Title`)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (structure validation)
  - **Completed by**: increment 0047 tasks.md (uses hierarchical format)

- [x] **AC-US1-03**: Task parser extracts `userStory` field and validates format (US-XXX)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (unit tests)
  - **Completed by**: T-001 (parser with validation)

- [x] **AC-US1-04**: Invalid US references detected and reported (non-existent US-XXX)
  - **Priority**: P1 (Important)
  - **Testable**: Yes (validation tests)
  - **Completed by**: T-002 (validateTaskLinkage function)

### US-002: AC-Task Mapping

**As a** PM validating increment quality
**I want** tasks to declare which Acceptance Criteria they satisfy
**So that** I can verify all ACs are covered by at least one task

**Acceptance Criteria**:
- [x] **AC-US2-01**: Every task has **Satisfies ACs** field listing AC-IDs (format: `**Satisfies ACs**: AC-US1-01, AC-US1-02`)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (parser validates field)
  - **Completed by**: T-005 (satisfiesACs parser)

- [x] **AC-US2-02**: Parser validates AC-IDs exist in spec.md
  - **Priority**: P1 (Important)
  - **Testable**: Yes (cross-reference validation)
  - **Completed by**: T-006 (spec-parser with getAllACIds, validateACBelongsToUS)

- [x] **AC-US2-03**: Multiple tasks can satisfy the same AC (shared coverage)
  - **Priority**: P1 (Important)
  - **Testable**: Yes (coverage aggregation tests)
  - **Completed by**: T-013 (AC coverage validator handles multiple tasks per AC)

- [x] **AC-US2-04**: System detects orphan tasks (no satisfiesACs field)
  - **Priority**: P1 (Important)
  - **Testable**: Yes (validation reports orphans)
  - **Completed by**: T-007, T-013 (orphan detection in validator)

### US-003: Automatic Living Docs Sync

**As a** developer completing tasks
**I want** living docs User Story files to automatically update task lists
**So that** I don't manually sync tasks.md and living docs

**Acceptance Criteria**:
- [x] **AC-US3-01**: When task marked completed, `post-task-completion.sh` hook updates living docs US file task section
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (hook integration test)
  - **Completed by**: T-008, T-010 (sync hook integration)

- [x] **AC-US3-02**: Living docs US file shows actual task list with links to tasks.md (not "No tasks defined")
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (sync validation)
  - **Completed by**: T-008 (sync-us-tasks.js module)

- [x] **AC-US3-03**: Task completion updates AC checkboxes in living docs based on satisfiesACs field
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (AC checkbox sync test)
  - **Completed by**: T-009 (updateACCheckboxes function)

- [x] **AC-US3-04**: `sync-living-docs.js` hook uses userStory field for grouping tasks by US
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (hook unit test)
  - **Completed by**: T-008 (parseTasksWithUSLinks integration)

- [ ] **AC-US3-05**: Bidirectional sync: tasks.md ↔ living docs US files
  - **Priority**: P1 (Important)
  - **Testable**: Yes (E2E sync test)

### US-004: AC Coverage Validation

**As a** PM approving increment closure
**I want** `/specweave:validate` to detect uncovered Acceptance Criteria
**So that** I know all requirements are implemented before closing increment

**Acceptance Criteria**:
- [x] **AC-US4-01**: `/specweave:validate <increment-id>` reports all ACs with zero tasks assigned
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (validation command test)
  - **Completed by**: T-013 (AC coverage validator)

- [x] **AC-US4-02**: Validation shows which tasks cover each AC (traceability matrix)
  - **Priority**: P1 (Important)
  - **Testable**: Yes (report format validation)
  - **Completed by**: T-013 (AC coverage validator with acToTasksMap)

- [x] **AC-US4-03**: `/specweave:done` blocks closure if uncovered ACs found (unless --force flag)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (closure validation test)
  - **Completed by**: T-015 (Gate 0 AC coverage validation)

- [x] **AC-US4-04**: Validation detects orphan tasks (tasks with no satisfiesACs field or invalid AC-IDs)
  - **Priority**: P1 (Important)
  - **Testable**: Yes (orphan detection test)
  - **Completed by**: T-013 (AC coverage validator with orphan detection)

### US-005: Progress Tracking by User Story

**As a** developer checking increment status
**I want** `/specweave:progress` to show per-US task completion
**So that** I know which User Stories are complete vs in-progress

**Acceptance Criteria**:
- [ ] **AC-US5-01**: `/specweave:progress` displays task completion grouped by User Story
  - **Priority**: P1 (Important)
  - **Testable**: Yes (progress command test)

- [ ] **AC-US5-02**: Progress output shows: `US-001: [8/11 tasks completed] 73%`
  - **Priority**: P1 (Important)
  - **Testable**: Yes (output format validation)

- [ ] **AC-US5-03**: Progress summary includes total tasks by US (metadata.json frontmatter: `by_user_story`)
  - **Priority**: P2 (Nice-to-have)
  - **Testable**: Yes (frontmatter generation test)

### US-006: Migration Tooling

**As a** contributor maintaining existing increments
**I want** migration script to auto-link tasks to User Stories
**So that** I don't manually update 40+ existing increments

**Acceptance Criteria**:
- [ ] **AC-US6-01**: Migration script analyzes spec.md and tasks.md to infer US linkage
  - **Priority**: P1 (Important)
  - **Testable**: Yes (migration script test)

- [ ] **AC-US6-02**: Script suggests linkage based on task descriptions and AC keywords
  - **Priority**: P1 (Important)
  - **Testable**: Yes (inference algorithm test)

- [ ] **AC-US6-03**: Script applies linkage with dry-run preview before actual update
  - **Priority**: P1 (Important)
  - **Testable**: Yes (dry-run mode test)

- [ ] **AC-US6-04**: Migration supports batch processing (all increments in one run)
  - **Priority**: P2 (Nice-to-have)
  - **Testable**: Yes (batch migration test)

---

## Functional Requirements

### FR-001: Task Format Specification
- Tasks MUST have **User Story** field linking to parent US
- Tasks MUST have **Satisfies ACs** field listing covered AC-IDs
- Parser MUST validate both fields are present and correctly formatted
- Priority: P0 (Critical)

### FR-002: Parser Extensions
- `task-parser.ts` MUST extract `userStory` and `satisfiesACs` fields
- Parser MUST validate US-XXX format for userStory
- Parser MUST validate AC-USXX-YY format for satisfiesACs
- Priority: P0 (Critical)

### FR-003: Living Docs Sync Enhancement
- `sync-living-docs.js` MUST use userStory field for grouping
- Hook MUST update living docs US file task sections automatically
- Hook MUST update AC checkboxes based on satisfiesACs field
- Priority: P0 (Critical)

### FR-004: Validation Enhancement
- `/specweave:validate` MUST detect uncovered ACs
- `/specweave:validate` MUST detect orphan tasks
- `/specweave:done` MUST block closure if validation fails
- Priority: P0 (Critical)

### FR-005: Progress Tracking Enhancement
- `/specweave:progress` MUST display per-US task completion
- Progress MUST show percentage and task counts per US
- Priority: P1 (Important)

### FR-006: Backward Compatibility
- Parser MUST support both old format (no US linkage) and new format
- Old increments MUST not break when validated
- Migration MUST be optional (not mandatory)
- Priority: P1 (Important)

---

## Non-Functional Requirements

### NFR-001: Performance
- Parser overhead for new fields < 10ms per increment
- Living docs sync hook executes within 500ms (95th percentile)
- Validation scans all increments within 2 seconds
- Priority: P1 (Important)

### NFR-002: Data Integrity
- Atomic updates: tasks.md and living docs sync or both rollback on failure
- No partial sync states (either fully synced or rolled back)
- Priority: P0 (Critical)

### NFR-003: Usability
- Validation errors show clear error messages with suggested fixes
- Migration script provides interactive prompts for ambiguous cases
- Priority: P1 (Important)

### NFR-004: Test Coverage
- Parser: 95%+ coverage (critical path)
- Hooks: 85%+ coverage (integration)
- Validation: 90%+ coverage (quality gate)
- Priority: P0 (Critical)

---

## Success Criteria

### Metric 1: Living Docs Accuracy
- **Target**: 100% of living docs US files show actual task lists (not "No tasks defined")
- **Measurement**: Scan all living docs US files, verify task sections are populated
- **Validation**: Automated test suite

### Metric 2: AC Coverage Validation
- **Target**: `/specweave:validate` detects 100% of uncovered ACs
- **Measurement**: Create test increments with missing AC coverage, verify detection
- **Validation**: Automated test suite

### Metric 3: Sync Accuracy
- **Target**: 100% task completion updates propagate to living docs within 1 second
- **Measurement**: Hook execution time + sync verification
- **Validation**: Integration tests

### Metric 4: Migration Success
- **Target**: 90%+ of existing increments (0001-0046) successfully migrated
- **Measurement**: Migration script report + manual validation of 10% sample
- **Validation**: Manual review

### Metric 5: Developer Adoption
- **Target**: 100% of new increments (0048+) use US-Task linkage format
- **Measurement**: Validate new increments during PR review
- **Validation**: Pre-commit hooks + CI validation

---

## Dependencies

### Internal Dependencies
- **ADR-0043**: spec.md as Source of Truth (status sync pattern)
- **ADR-0047**: Three-File Structure Canonical Definition (task format rules)
- **ADR-0030**: Intelligent Living Docs Sync (sync architecture)
- **Increment 0043**: Spec-metadata sync infrastructure (reuse dual-write pattern)
- **Increment 0046**: Console elimination (migration pattern reference)

### External Dependencies
- None (internal framework enhancement)

---

## Constraints

### Technical Constraints
- Must maintain backward compatibility with old task format (40+ existing increments)
- Parser must handle both YAML frontmatter and Markdown body formats
- Hooks must remain performant (< 500ms execution time)

### Timeline Constraints
- Estimated effort: 5-8 days (proposal document estimate)
- Must complete before next major release (v0.23.0)

### Resource Constraints
- Single developer implementation (Anton)
- No external library dependencies (use existing parsers)

---

## Assumptions

1. **Increments 0001-0046 follow similar structure** (User Stories exist in spec.md)
2. **Migration can infer most linkage** from task descriptions and AC keywords
3. **Living docs structure is stable** (three-layer architecture from v0.18.0+)
4. **Gray-matter YAML parser is sufficient** for dual-write (proven in 0043)

---

## Out of Scope

### Deferred to Future Increments
- **External tool sync enhancement** (GitHub issue task checkboxes) - Requires GitHub API research
- **Visual traceability matrix UI** (web-based dashboard) - Requires frontend implementation
- **Historical linkage inference** (analyzing git history) - Complex, low ROI
- **Multi-increment AC coverage** (same AC across multiple increments) - Edge case, defer

### Explicitly Not Included
- Jira/ADO sync enhancements (GitHub-first approach per ADR-0007)
- Task dependency graph visualization (out of scope)
- Automated AC generation from code (requires AI, separate feature)

---

## Test Strategy

### Unit Tests (95%+ coverage)
- `task-parser.ts`: Parse userStory and satisfiesACs fields
- `spec-frontmatter-updater.ts`: Validate AC-ID formats
- `coverage-analyzer.ts`: Detect uncovered ACs and orphan tasks
- Test fixtures: Valid/invalid task formats, edge cases

### Integration Tests (85%+ coverage)
- `sync-living-docs.js`: End-to-end task completion sync
- `post-task-completion.sh`: Hook execution with new fields
- `/specweave:validate` command: AC coverage validation
- `/specweave:done` command: Closure validation with linkage checks

### E2E Tests (90%+ coverage)
- Full increment lifecycle: Create → Execute → Validate → Close
- Migration workflow: Old increment → Migrate → Validate
- Bidirectional sync: tasks.md ↔ living docs ↔ GitHub issues

### Manual Testing
- Migrate increments 0043-0046 (proof of concept)
- Validate living docs accuracy after migration
- Test `/specweave:progress` output format
- Review generated traceability reports

---

## Migration Plan

### Phase 1: Parser & Generator (Days 1-2)
- Update `task-parser.ts` to extract new fields
- Update `tasks.md.mustache` template with new format
- Add validation for US and AC-ID formats
- Unit tests for parser extensions

### Phase 2: Living Docs Sync (Days 3-4)
- Update `sync-living-docs.js` to use userStory field
- Implement AC checkbox sync based on satisfiesACs
- Update `post-task-completion.sh` hook
- Integration tests for sync behavior

### Phase 3: Validation & Commands (Day 5)
- Extend `/specweave:validate` with AC coverage checks
- Update `/specweave:done` closure validation
- Enhance `/specweave:progress` with per-US grouping
- Command integration tests

### Phase 4: Migration Tooling (Days 6-7)
- Create `migrate-task-linkage.ts` script
- Implement inference algorithm (keyword matching)
- Add dry-run mode and interactive prompts
- Test migration on increments 0043-0046

### Phase 5: Documentation & Rollout (Day 8)
- Update CLAUDE.md with new task format
- Update CONTRIBUTING.md with examples
- Update PM Agent prompt with linkage requirements
- Run migration on all existing increments
- Create completion report

---

## Rollback Strategy

### If Migration Fails
1. Revert all tasks.md changes (git restore)
2. Rollback living docs updates (restore from backup)
3. Remove parser extensions (git revert)
4. Document failure reasons and defer to next increment

### If Performance Degrades
1. Add caching layer for US-Task mapping
2. Optimize parser (lazy evaluation)
3. Reduce sync frequency (debounce hook)
4. If still slow, revert and redesign

---

## Related Documentation

- **Proposal**: `.specweave/increments/0046-console-elimination/reports/US-TASK-LINKAGE-PROPOSAL.md`
- **ADR-0043**: Spec.md as Source of Truth
- **ADR-0047**: Three-File Structure Canonical Definition
- **Living Docs Spec**: `.specweave/docs/internal/specs/_features/FS-047/FEATURE.md` (created via `/specweave:sync-docs update`)

---

## Notes

This increment fixes a **critical traceability gap** that affects:
- Living docs accuracy (all existing increments show "No tasks defined")
- Quality validation (can't verify AC coverage before closure)
- Progress tracking (can't show per-US completion)
- External sync (GitHub issue task checkboxes lack AC context)

**Impact**: Affects 100% of future increments + enables migration of 40+ existing increments.

**Risk Level**: Medium (touches core parsers and hooks, but well-tested pattern from 0043)
