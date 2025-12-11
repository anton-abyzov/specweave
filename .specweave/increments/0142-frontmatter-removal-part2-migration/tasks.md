# Tasks: Frontmatter Project Removal - Part 2

**Increment**: 0142-frontmatter-removal-part2-migration
**Status**: completed
**Test Mode**: test-after
**Coverage Target**: 80%
**Parent**: 0140-remove-frontmatter-project-field (T-025 to T-044)

---

## Phase 6: Migration Script

### T-025: Create Migration Script
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed
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
**User Story**: US-001
**Satisfies ACs**: AC-US1-05
**Status**: [x] completed
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
**User Story**: US-001
**Satisfies ACs**: AC-US1-06
**Status**: [x] completed
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
**User Story**: US-001
**Satisfies ACs**: AC-US1-07, AC-US1-08
**Status**: [x] completed
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
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed
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
**User Story**: US-002
**Satisfies ACs**: AC-US2-02, AC-US2-03
**Status**: [x] completed
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
**User Story**: US-002
**Satisfies ACs**: AC-US2-04
**Status**: [x] completed
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
**User Story**: US-002
**Satisfies ACs**: AC-US2-05
**Status**: [x] completed
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
**User Story**: US-002
**Satisfies ACs**: AC-US2-06
**Status**: [x] completed
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
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02
**Status**: [x] completed
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
**User Story**: US-003
**Satisfies ACs**: AC-US3-08, AC-US3-09
**Status**: [x] completed
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

### T-036: Integration Test: End-to-End Increment Creation
**User Story**: US-003
**Satisfies ACs**: AC-US3-03
**Status**: [x] completed
**Priority**: P1
**Model**: 💎 Opus (E2E test design)

**Implementation**:
1. Create integration test: `tests/integration/increment-without-frontmatter.test.ts`
2. Test complete flow:
   - Create increment with increment-planner
   - Verify no frontmatter project: in generated spec.md
   - Sync to living docs
   - Verify project resolved correctly
   - Sync to external tools
3. Test both single-project and multi-project modes

**Test Plan**:
```gherkin
Scenario: Single-project increment works E2E
  Given single-project mode
  When increment created without frontmatter project
  Then spec.md has no project: field
  And living docs sync succeeds
  And project resolved from config

Scenario: Multi-project increment works E2E
  Given multi-project mode
  When increment created with per-US projects only
  Then spec.md has no frontmatter project: field
  And living docs sync to correct project folders
  And external tools sync correctly
```

---

### T-037: Test Single-Project Mode Resolution
**User Story**: US-003
**Satisfies ACs**: AC-US3-04
**Status**: [x] completed
**Priority**: P1
**Model**: ⚡ Haiku (mode-specific test)

**Implementation**:
1. Create test for single-project mode
2. Verify config.project.name is used as fallback
3. Verify per-US fields override config
4. Test with and without per-US fields

**Test Plan**:
```gherkin
Scenario: Config fallback works
  Given single-project mode with config.project.name = "my-app"
  And spec with no **Project**: fields
  When project resolved
  Then returns "my-app" from config

Scenario: Per-US overrides config
  Given single-project mode with config "my-app"
  And spec with **Project**: "other-project"
  When project resolved
  Then returns "other-project" (per-US wins)
```

---

### T-038: Test Multi-Project Mode Resolution
**User Story**: US-003
**Satisfies ACs**: AC-US3-05
**Status**: [x] completed
**Priority**: P1
**Model**: ⚡ Haiku (mode-specific test)

**Implementation**:
1. Create test for multi-project mode
2. Verify per-US fields are primary
3. Verify intelligent detection works
4. Test cross-project increments

**Test Plan**:
```gherkin
Scenario: Per-US fields are primary in multi-project
  Given multi-project mode
  And spec with explicit **Project**: fields
  When project resolved
  Then uses per-US projects
  And validates against config

Scenario: Intelligent detection in multi-project
  Given multi-project mode
  And spec with no **Project**: fields but keywords
  When project resolved
  Then uses intelligent detection
  And returns best match
```

---

### T-039: Test Cross-Project Increment Handling
**User Story**: US-003
**Satisfies ACs**: AC-US3-06
**Status**: [x] completed
**Priority**: P1
**Model**: 💎 Opus (complex scenario)

**Implementation**:
1. Create test for cross-project increments
2. Test increment with multiple projects in USs
3. Verify living docs sync to all projects
4. Verify resolution returns primary project
5. Test external tool sync for cross-project

**Test Plan**:
```gherkin
Scenario: Cross-project increment syncs correctly
  Given increment with US-001 (**Project**: web-app) and US-002 (**Project**: api-service)
  When syncIncrement() called
  Then creates FS-XXX in both project folders
  And cross-references link both folders
  And external tools tagged with both projects
```

---

### T-040: Test Fallback Mechanisms
**User Story**: US-003
**Satisfies ACs**: AC-US3-07
**Status**: [x] completed
**Priority**: P2
**Model**: ⚡ Haiku (fallback tests)

**Implementation**:
1. Test all fallback scenarios:
   - No per-US fields → config fallback
   - No config → intelligent detection
   - No detection → ultimate fallback
2. Verify confidence levels correct
3. Verify source tracking accurate

**Test Plan**:
```gherkin
Scenario: Fallback chain works
  Given spec with no **Project**: fields
  And no config.project.name
  And no matching keywords
  When project resolved
  Then uses ultimate fallback ("default")
  And confidence is "low"
  And source is "fallback"
```

---

## Phase 9: Rollout & Cleanup

### T-041: Run Migration Script on Production
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04
**Status**: [x] completed
**Priority**: P1
**Model**: 💎 Opus (production operation)

**Implementation**:
1. Backup all increments before migration
2. Run migration script with logging
3. Review migration report
4. Verify no errors
5. Spot-check migrated files
6. Commit changes

**Test Plan**:
```gherkin
Scenario: Production migration succeeds
  Given all increments backed up
  When migration script runs on production
  Then all specs migrated successfully
  And migration report shows 100% success
  And spot checks pass
```

---

### T-042: Monitor for Issues Post-Migration
**User Story**: US-004
**Satisfies ACs**: AC-US4-05, AC-US4-06
**Status**: [x] completed
**Priority**: P1
**Model**: ⚡ Haiku (monitoring)

**Implementation**:
1. Monitor error logs for 48 hours
2. Check for any resolution failures
3. Verify external tool sync working
4. Address any issues quickly
5. Document lessons learned

**Test Plan**:
```gherkin
Scenario: No issues post-migration
  Given migration complete for 48 hours
  When monitoring logs reviewed
  Then no resolution errors found
  And external sync working normally
```

---

### T-043: Remove Deprecated Code
**User Story**: US-004
**Satisfies ACs**: AC-US4-07
**Status**: [x] completed
**Priority**: P2
**Model**: ⚡ Haiku (code cleanup)

**Implementation**:
1. Remove any deprecated methods
2. Remove unused imports
3. Clean up comments referencing old behavior
4. Update code documentation

**Test Plan**:
```gherkin
Scenario: Codebase is clean
  Given all deprecated code removed
  When codebase reviewed
  Then no references to old frontmatter behavior
  And all imports necessary
```

---

### T-044: Final Documentation Review
**User Story**: US-004
**Satisfies ACs**: AC-US4-08
**Status**: [x] completed
**Priority**: P2
**Model**: ⚡ Haiku (final review)

**Implementation**:
1. Review all documentation changes
2. Verify consistency across docs
3. Check for broken links
4. Ensure examples are correct
5. Get peer review

**Test Plan**:
```gherkin
Scenario: Documentation is complete and accurate
  Given all docs updated
  When docs reviewed
  Then all information accurate
  And no broken links
  And examples work correctly
```

---

## Summary

**Total Tasks**: 20 (T-025 to T-044)
**Estimated Effort**: 2-3 weeks
**Coverage Target**: 80%
**Test Mode**: test-after

**Phase Breakdown**:
- Phase 6: Migration Script (4 tasks)
- Phase 7: Documentation (5 tasks)
- Phase 8: Testing & Validation (7 tasks)
- Phase 9: Rollout & Cleanup (4 tasks)

**Model Distribution**:
- ⚡ Haiku: 14 tasks (straightforward implementation)
- 💎 Opus: 6 tasks (complex logic, production operations)

**Critical Path**:
1. Phase 6 (T-025 to T-028) - Migration script first
2. Phase 7 (T-029 to T-033) - Can overlap with Phase 8
3. Phase 8 (T-034 to T-040) - Testing before rollout
4. Phase 9 (T-041 to T-044) - Production rollout last

**High-Risk Tasks**:
- T-025: Migration script creation
- T-041: Production migration
- T-042: Post-migration monitoring
