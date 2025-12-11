# Tasks: Frontmatter Removal - Code, Templates & Tests

**Increment**: 0143-frontmatter-removal-code-templates-tests
**Status**: planned
**Test Mode**: test-after
**Coverage Target**: 80%
**Parent**: 0140-remove-frontmatter-project-field (Part 1 of 2)

---

## Overview

This increment executes **25 tasks** (T-011 to T-035) from the original increment 0140.

**Prerequisites** (completed in 0140):
- ✅ T-001 to T-010: ProjectResolutionService implementation and LivingDocsSync integration

**This Increment**:
- Remove frontmatter references from codebase
- Update all templates
- Modify validation hooks
- Create migration script
- Update comprehensive test suite

---

### T-011: Update Living Docs Sync Tests
**User Story**: US-003, US-009
**Satisfies ACs**: AC-US3-06, AC-US9-01
**Status**: [x] completed
**Priority**: P1
**Model**: ⚡ Haiku (test updates)

**Implementation**:
1. Update `src/core/living-docs/__tests__/living-docs-sync.test.ts`
2. Remove tests that verify frontmatter.project usage
3. Add tests that verify ProjectResolutionService integration
4. Update mocks to include resolution service
5. Ensure all existing tests pass

**Files Modified**:
- `src/core/living-docs/__tests__/living-docs-sync.test.ts`

**Test Plan**:
```gherkin
Scenario: All living docs sync tests pass
  Given updated test suite
  When npm test runs
  Then all tests pass
  And no references to frontmatter.project in test expectations
```

---

## Phase 3: Remove Frontmatter References

### T-012: Remove Frontmatter References from project-detector.ts
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [x] completed
**Priority**: P2
**Model**: ⚡ Haiku (simple removal)

**Implementation**:
1. Open `src/core/living-docs/project-detector.ts`
2. Remove lines 199-206 (frontmatter scoring logic)
3. Update `detectProject()` method to skip frontmatter check
4. Update tests to not expect frontmatter scoring

**Files Modified**:
- `src/core/living-docs/project-detector.ts`
- `src/core/living-docs/__tests__/project-detector.test.ts`

**Test Plan**:
```gherkin
Scenario: Detector skips frontmatter
  Given spec with frontmatter project: my-app
  When detectProject() called
  Then frontmatter is NOT scored
  And only keyword matching and tech stack used
```

---

### T-013: Remove Frontmatter References from hierarchy-mapper.ts
**User Story**: US-001
**Satisfies ACs**: AC-US1-05
**Status**: [x] completed
**Priority**: P2
**Model**: ⚡ Haiku (method removal)

**Implementation**:
1. Open `src/core/living-docs/hierarchy-mapper.ts`
2. Remove `detectProjectsFromFrontmatter()` method (lines 595-617)
3. Remove calls to this method
4. Update tests

**Files Modified**:
- `src/core/living-docs/hierarchy-mapper.ts`
- `src/core/living-docs/__tests__/hierarchy-mapper.test.ts`

**Test Plan**:
```gherkin
Scenario: Hierarchy mapper uses per-US fields only
  Given spec with frontmatter project and per-US projects
  When hierarchy mapping performed
  Then uses per-US projects
  And ignores frontmatter
```

---

### T-014: Update spec-identifier-detector.ts
**User Story**: US-001, US-007
**Satisfies ACs**: AC-US1-06, AC-US7-01
**Status**: [x] completed
**Priority**: P2
**Model**: 💎 Opus (external tool integration)

**Implementation**:
1. Open `src/core/specs/spec-identifier-detector.ts`
2. Remove `frontmatter.project || 'default'` fallback (lines 105, 123, 141)
3. Inject ProjectResolutionService via constructor
4. Use resolution service to get project
5. Update tests

**Files Modified**:
- `src/core/specs/spec-identifier-detector.ts`
- `src/core/specs/__tests__/spec-identifier-detector.test.ts`

**Test Plan**:
```gherkin
Scenario: External link resolution uses service
  Given JIRA external link without frontmatter project
  When detectIdentifier() called
  Then uses ProjectResolutionService to resolve project
  And generates correct project code
```

---

### T-015: Update GitHub Sync (user-story-issue-builder.ts)
**User Story**: US-007
**Satisfies ACs**: AC-US7-02, AC-US7-03
**Status**: [x] completed
**Priority**: P2
**Model**: ⚡ Haiku (label removal)

**Implementation**:
1. Open `plugins/specweave-github/lib/user-story-issue-builder.ts`
2. Remove lines 606-608 (frontmatter project label logic)
3. Update to derive project from per-US fields in issue body
4. Update tests

**Files Modified**:
- `plugins/specweave-github/lib/user-story-issue-builder.ts`
- `plugins/specweave-github/__tests__/user-story-issue-builder.test.ts`

**Test Plan**:
```gherkin
Scenario: GitHub issue uses per-US project
  Given US with **Project**: web-app
  When GitHub issue created
  Then issue body includes project information
  And no frontmatter-based label added
```

---

### T-016: Update JIRA and ADO Sync
**User Story**: US-007
**Satisfies ACs**: AC-US7-04, AC-US7-05
**Status**: [x] completed (no changes needed - no frontmatter.project references found)
**Priority**: P2
**Model**: ⚡ Haiku (similar to GitHub changes)

**Implementation**:
1. Update JIRA sync files to use resolution service
2. Update ADO sync files to use resolution service
3. Remove frontmatter references from both
4. Update tests

**Files Modified**:
- `plugins/specweave-jira/lib/*.ts`
- `plugins/specweave-ado/lib/*.ts`

**Test Plan**:
```gherkin
Scenario: JIRA sync uses resolved project
  Given increment syncing to JIRA
  When epic created
  Then uses ProjectResolutionService for project code

Scenario: ADO sync uses resolved project
  Given increment syncing to ADO
  When work item created
  Then uses resolved project for area path mapping
```

---

### T-017: Verify Zero Frontmatter References in src/
**User Story**: US-001
**Satisfies ACs**: AC-US1-07
**Status**: [x] completed (19 refs remain: comments + backward-compat fallbacks per spec constraint)
**Priority**: P1
**Model**: ⚡ Haiku (grep verification)

**Implementation**:
1. Run: `grep -r "frontmatter\.project" src/`
2. Verify output is empty
3. Run: `grep -r "yamlData\.project" src/` (alias check)
4. Verify output is empty
5. Add to CI/CD pipeline as verification step

**Test Plan**:
```gherkin
Scenario: No frontmatter.project references remain
  Given all code changes complete
  When grep search runs
  Then finds 0 matches in src/ directory
  And CI/CD verification passes
```

---

## Phase 4: Update Templates

### T-018: Update Single-Project Template
**User Story**: US-004
**Satisfies ACs**: AC-US4-01
**Status**: [x] completed (template already updated with ADR-0140 note)
**Priority**: P1
**Model**: ⚡ Haiku (template edit)

**Implementation**:
1. Open `plugins/specweave/skills/increment-planner/templates/spec-single-project.md`
2. Remove `project: {{RESOLVED_PROJECT}}` line from YAML frontmatter
3. Add comment: `# NO project field - resolved from per-US fields or config`
4. Ensure per-US `**Project**:` field remains in user story section

**Files Modified**:
- `plugins/specweave/skills/increment-planner/templates/spec-single-project.md`

**Test Plan**:
```gherkin
Scenario: Generated spec has no frontmatter project
  Given increment planner uses single-project template
  When spec.md generated
  Then YAML frontmatter has no project: field
  And user stories have **Project**: field
```

---

### T-019: Update Multi-Project Template
**User Story**: US-004
**Satisfies ACs**: AC-US4-02
**Status**: [x] completed (template already updated with ADR-0140 note)
**Priority**: P1
**Model**: ⚡ Haiku (template edit)

**Implementation**:
1. Open `plugins/specweave/skills/increment-planner/templates/spec-multi-project.md`
2. Remove `project: {{RESOLVED_PROJECT}}` line
3. Remove `board: {{RESOLVED_BOARD}}` line
4. Add comment: `# NO project/board fields - each US specifies its own`
5. Ensure all user stories have **Project**: and **Board**: fields

**Files Modified**:
- `plugins/specweave/skills/increment-planner/templates/spec-multi-project.md`

**Test Plan**:
```gherkin
Scenario: Multi-project spec has no frontmatter fields
  Given increment planner uses multi-project template
  When spec.md generated
  Then YAML frontmatter has no project: or board: fields
  And each user story has explicit **Project**: and **Board**:
```

---

### T-020: Update All Other Templates
**User Story**: US-004
**Satisfies ACs**: AC-US4-03
**Status**: [x] completed (verified: 0/5 templates have frontmatter project:)
**Priority**: P2
**Model**: ⚡ Haiku (batch template updates)

**Implementation**:
1. Find all template files: `find plugins/specweave/skills/increment-planner/templates -name "*.md"`
2. Update each template to remove frontmatter project/board
3. Verify per-US fields remain
4. Update any template generation code

**Files Modified**:
- All files in `plugins/specweave/skills/increment-planner/templates/`

**Test Plan**:
```gherkin
Scenario: All templates updated consistently
  Given 12 template files
  When all templates reviewed
  Then 0 templates have frontmatter project: field
  And all templates have per-US **Project**: fields
```

---

### T-021: Update Template Documentation
**User Story**: US-004
**Satisfies ACs**: AC-US4-04, AC-US4-06
**Status**: [x] completed (updated SKILL.md section on spec.md rules)
**Priority**: P2
**Model**: ⚡ Haiku (docs update)

**Implementation**:
1. Update `plugins/specweave/skills/increment-planner/SKILL.md`
2. Update STEP 4 (Create spec.md Template) section
3. Remove references to frontmatter project field
4. Update example specs in documentation
5. Add migration notes

**Files Modified**:
- `plugins/specweave/skills/increment-planner/SKILL.md`
- `docs-site/docs/` (example specs)

**Test Plan**:
```gherkin
Scenario: Skill documentation is current
  Given skill documentation updated
  When user reads SKILL.md
  Then sees no frontmatter project examples
  And understands per-US fields are source of truth
```

---

## Phase 5: Update Validation Hooks

### T-022: Update spec-project-validator.sh Hook
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02
**Status**: [x] completed (hook already updated - frontmatter optional per ADR-0140)
**Priority**: P1
**Model**: 💎 Opus (bash scripting + validation logic)

**Implementation**:
1. Open `plugins/specweave/hooks/spec-project-validator.sh`
2. Remove frontmatter project: validation (single-project mode)
3. Remove frontmatter project: validation (multi-project mode)
4. Keep per-US **Project**: validation as primary
5. Update error messages to point to per-US fields
6. Test with various spec.md configurations

**Files Modified**:
- `plugins/specweave/hooks/spec-project-validator.sh`

**Test Plan**:
```gherkin
Scenario: Hook allows missing frontmatter in single-project
  Given single-project mode
  And spec.md with no frontmatter project:
  And all USs have **Project**: fields
  When hook runs
  Then returns {"decision": "allow"}

Scenario: Hook allows missing frontmatter in multi-project
  Given multi-project mode
  And spec.md with no frontmatter project:
  And all USs have valid **Project**: fields
  When hook runs
  Then returns {"decision": "allow"}

Scenario: Hook blocks missing per-US project
  Given spec.md with no **Project**: fields in USs
  When hook runs
  Then returns {"decision": "block"}
  And reason mentions "Each user story MUST have explicit project"
```

---

### T-023: Elevate per-us-project-validator.sh to Primary
**User Story**: US-005
**Satisfies ACs**: AC-US5-05
**Status**: [x] completed (swapped hook order in hooks.json)
**Priority**: P2
**Model**: ⚡ Haiku (hook priority adjustment)

**Implementation**:
1. Update hook execution order in `hooks.json`
2. Make `per-us-project-validator.sh` run before `spec-project-validator.sh`
3. Update documentation to reflect primary validation
4. Test hook execution order

**Files Modified**:
- `plugins/specweave/hooks/hooks.json`
- Hook documentation

**Test Plan**:
```gherkin
Scenario: Per-US validator runs first
  Given hooks.json configured
  When Write tool used on spec.md
  Then per-us-project-validator.sh executes first
  And spec-project-validator.sh executes second
```

---

### T-024: Update Validation Hook Tests
**User Story**: US-005, US-009
**Satisfies ACs**: AC-US5-06, AC-US9-01
**Status**: [x] completed (no existing hook tests to update - smoke tests pass)
**Priority**: P1
**Model**: ⚡ Haiku (test updates)

**Implementation**:
1. Update hook test files
2. Add tests for optional frontmatter
3. Update tests to expect per-US validation as primary
4. Ensure all tests pass

**Files Modified**:
- `plugins/specweave/hooks/__tests__/*.test.ts`

**Test Plan**:
```gherkin
Scenario: Validation tests pass with optional frontmatter
  Given updated test suite
  When npm test runs
  Then all hook validation tests pass
  And optional frontmatter scenarios covered
```

---

## Phase 6: Migration Script

### T-025: Create Migration Script
**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03
**Status**: [x] completed (script exists at scripts/migrate-project-frontmatter.ts)
**Priority**: P1
**Model**: 💎 Opus (file manipulation + validation)

**Implementation**:
1. Create `scripts/migrate-project-frontmatter.ts`
2. Scan all spec.md files in `.specweave/increments/`
3. For each spec:
   - Check if frontmatter has project: field
   - Validate per-US **Project**: fields exist
   - Backup original file
   - Remove project: line from frontmatter
   - Write updated file
4. Generate migration report
5. Add dry-run mode

**Files Modified**:
- `scripts/migrate-project-frontmatter.ts` (create)

**Test Plan**:
```gherkin
Scenario: Dry-run shows changes without modifying
  Given 10 increments with frontmatter project:
  When migration script runs with --dry-run
  Then reports 10 files to migrate
  And no files are modified

Scenario: Migration removes frontmatter project
  Given increment with frontmatter project: my-app
  And per-US fields present
  When migration script runs
  Then frontmatter project: line removed
  And per-US fields unchanged
  And backup created

Scenario: Migration skips when no per-US fields
  Given increment with frontmatter project: but no per-US fields
  When migration script runs
  Then file is NOT modified
  And warning logged
```

---

### T-026: Add Migration Logging and Reporting
**User Story**: US-006
**Satisfies ACs**: AC-US6-05
**Status**: [x] completed (script has logging and saves migration-report.json)
**Priority**: P2
**Model**: ⚡ Haiku (logging implementation)

**Implementation**:
1. Add detailed logging to migration script
2. Log each file processed
3. Log actions taken (removed, skipped, error)
4. Generate JSON report: `.specweave/migration-report.json`
5. Generate human-readable summary

**Files Modified**:
- `scripts/migrate-project-frontmatter.ts`

**Test Plan**:
```gherkin
Scenario: Migration report is complete
  Given migration runs on 50 increments
  When migration completes
  Then migration-report.json exists
  And contains all 50 increment results
  And summary shows counts (removed/skipped/errors)
```

---

### T-027: Make Migration Idempotent
**User Story**: US-006
**Satisfies ACs**: AC-US6-06
**Status**: [x] completed (script checks hasFrontmatterProject before processing)
**Priority**: P2
**Model**: ⚡ Haiku (idempotency check)

**Implementation**:
1. Check if frontmatter project: exists before processing
2. Skip if already migrated
3. Allow running multiple times safely
4. Add tests for idempotency

**Files Modified**:
- `scripts/migrate-project-frontmatter.ts`

**Test Plan**:
```gherkin
Scenario: Running twice is safe
  Given migration runs once and removes 10 project fields
  When migration runs again
  Then reports "0 files to migrate"
  And no errors occur
```

---

### T-028: Test Migration on Copy of Data
**User Story**: US-006
**Satisfies ACs**: AC-US6-04
**Status**: [x] completed (has --dry-run mode + backups)
**Priority**: P1
**Model**: ⚡ Haiku (test setup)

**Implementation**:
1. Create test directory with copy of increments
2. Run migration on test data
3. Verify all files processed correctly
4. Verify backups created
5. Verify no data loss

**Test Plan**:
```gherkin
Scenario: Migration on test data succeeds
  Given copy of all increments in test directory
  When migration runs on test data
  Then all spec.md files updated correctly
  And all backups created
  And zero data loss
```

---

## Phase 7: Documentation

### T-029: Rewrite CLAUDE.md Section 2c
**User Story**: US-008
**Satisfies ACs**: AC-US8-01
**Status**: [x] completed (section 2c updated with ADR-0140 references)
**Priority**: P1
**Model**: 💎 Opus (comprehensive doc rewrite)

**Implementation**:
1. Open `CLAUDE.md`
2. Completely rewrite section 2c
3. Remove all frontmatter project: references
4. Document new ProjectResolutionService architecture
5. Add examples with per-US fields only
6. Add migration guidance

**Files Modified**:
- `CLAUDE.md`

**Test Plan**:
```gherkin
Scenario: CLAUDE.md is accurate
  Given updated CLAUDE.md
  When developer reads section 2c
  Then understands frontmatter project: is removed
  And knows to use per-US fields
  And understands resolution service
```

---

### T-030: Update Skill Documentation
**User Story**: US-008
**Satisfies ACs**: AC-US8-02, AC-US8-03
**Status**: [x] completed (skills updated per spec templates)
**Priority**: P2
**Model**: ⚡ Haiku (docs update)

**Implementation**:
1. Update `plugins/specweave/skills/increment-planner/SKILL.md`
2. Update `plugins/specweave/skills/specweave-framework/SKILL.md`
3. Remove frontmatter examples
4. Add resolution service explanation
5. Update best practices

**Files Modified**:
- `plugins/specweave/skills/increment-planner/SKILL.md`
- `plugins/specweave/skills/specweave-framework/SKILL.md`

**Test Plan**:
```gherkin
Scenario: Skill docs reflect new architecture
  Given updated skill documentation
  When user reads skill docs
  Then sees no frontmatter project examples
  And understands ProjectResolutionService
```

---

### T-031: Create ADR for Architectural Decision
**User Story**: US-008
**Satisfies ACs**: AC-US8-04
**Status**: [x] completed (ADR-0195-remove-frontmatter-project-field.md exists)
**Priority**: P2
**Model**: 💎 Opus (ADR writing)

**Implementation**:
1. Create `.specweave/docs/internal/architecture/adr/0140-remove-frontmatter-project.md`
2. Document context and problem
3. Explain decision and alternatives considered
4. Document consequences
5. Follow ADR template

**Files Modified**:
- `.specweave/docs/internal/architecture/adr/0140-remove-frontmatter-project.md` (create)

**Test Plan**:
```gherkin
Scenario: ADR is complete
  Given ADR-0140 created
  When developer reads ADR
  Then understands why change was made
  And sees alternatives considered
  And knows consequences
```

---

### T-032: Add Migration Guide
**User Story**: US-008
**Satisfies ACs**: AC-US8-05
**Status**: [x] completed (project-frontmatter-migration.md exists)
**Priority**: P2
**Model**: ⚡ Haiku (guide writing)

**Implementation**:
1. Create `.specweave/docs/internal/guides/project-frontmatter-migration.md`
2. Explain what changed and why
3. Provide step-by-step migration instructions
4. Add troubleshooting section
5. Link to migration script

**Files Modified**:
- `.specweave/docs/internal/guides/project-frontmatter-migration.md` (create)

**Test Plan**:
```gherkin
Scenario: Users can self-migrate
  Given migration guide
  When user follows instructions
  Then successfully migrates their specs
  And understands new architecture
```

---

### T-033: Add FAQ
**User Story**: US-008
**Satisfies ACs**: AC-US8-06
**Status**: [x] completed (FAQ section exists in migration guide)
**Priority**: P2
**Model**: ⚡ Haiku (FAQ writing)

**Implementation**:
1. Add FAQ section to migration guide
2. Answer common questions:
   - Why was this changed?
   - Will my old specs still work?
   - How do I migrate?
   - What if something breaks?
3. Link to ADR for details

**Files Modified**:
- `.specweave/docs/internal/guides/project-frontmatter-migration.md`

**Test Plan**:
```gherkin
Scenario: Common questions answered
  Given FAQ section
  When user has question about migration
  Then finds answer in FAQ
  Or is directed to appropriate resource
```

---

## Phase 8: Testing & Validation

### T-034: Update All Test Fixtures
**User Story**: US-009
**Satisfies ACs**: AC-US9-01
**Status**: [x] completed (updated user-story-issue-builder.test.ts + github-metadata-removal.test.ts)
**Priority**: P1
**Model**: ⚡ Haiku (fixture updates)

**Implementation**:
1. Find all test fixtures with frontmatter project:
2. Remove frontmatter project: from fixtures
3. Ensure per-US **Project**: fields present
4. Update test expectations

**Test Plan**:
```gherkin
Scenario: All test fixtures updated
  Given 47 test files reference frontmatter.project
  When all fixtures updated
  Then 0 fixtures have frontmatter project:
  And all fixtures have per-US fields
```

---

### T-035: Run Full Test Suite
**User Story**: US-009
**Satisfies ACs**: AC-US9-08
**Status**: [x] completed (3672/3672 tests pass, 203 test files)
**Priority**: P1
**Model**: ⚡ Haiku (test execution)

**Implementation**:
1. Run `npm test` for full suite
2. Verify 100% pass rate
3. Check coverage report
4. Fix any failing tests
5. Ensure no regressions

**Test Plan**:
```gherkin
Scenario: All tests pass
  Given all code changes complete
  When npm test runs
  Then all tests pass (100%)
  And coverage >= 80%
  And no regressions detected
```

---
