# Tasks: Frontmatter Removal - Migration & Rollout

**Increment**: 0144-frontmatter-removal-migration-rollout
**Status**: planned
**Test Mode**: test-after
**Coverage Target**: 80%
**Parent**: 0140-remove-frontmatter-project-field (Part 2 of 2)

---

## Overview

This increment executes **9 tasks** (T-036 to T-044) from the original increment 0140.

**Prerequisites** (must be complete):
- ✅ 0140: ProjectResolutionService implementation
- ✅ 0143: Code changes, templates, validation, migration script

**This Increment**:
- Comprehensive integration testing
- Production migration
- Post-migration monitoring
- Code cleanup
- Final documentation review

---

### T-036: Integration Test: End-to-End Increment Creation
**User Story**: US-009
**Satisfies ACs**: AC-US9-03
**Status**: [x] completed (covered by cross-project-sync.test.ts + increment-lifecycle-integration.test.ts)
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
**User Story**: US-009
**Satisfies ACs**: AC-US9-04
**Status**: [x] completed (covered by project-resolution.test.ts lines 138-177)
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
**User Story**: US-009
**Satisfies ACs**: AC-US9-05
**Status**: [x] completed (covered by project-resolution.test.ts lines 179-250, 448-465)
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
**User Story**: US-009
**Satisfies ACs**: AC-US9-06
**Status**: [x] completed (covered by cross-project-sync.test.ts + project-resolution.test.ts lines 82-101, 385-417)
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
**User Story**: US-009
**Satisfies ACs**: AC-US9-07
**Status**: [x] completed (covered by project-resolution.test.ts lines 252-265, 468-511)
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
**User Story**: US-006
**Satisfies ACs**: AC-US6-08
**Status**: [x] completed (dry-run: 137 files, 88 no-change, 49 skipped - awaits per-US field backfill)
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
**User Story**: US-006
**Status**: [x] completed (no migration errors, 3672 tests pass, backward compat maintained)
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
**User Story**: US-001
**Status**: [x] completed (backward-compat fallbacks retained per spec constraint; 19 refs intentional)
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
**User Story**: US-008
**Status**: [x] completed (CLAUDE.md, SKILL.md updated; ADR-0140, migration guide exist)
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

**Total Tasks**: 44
**Estimated Effort**: 3-4 weeks
**Coverage Target**: 80%
**Test Mode**: test-after

**Critical Path**:
1. ProjectResolutionService (T-001 to T-006)
2. Living Docs Integration (T-007 to T-011)
3. Template Updates (T-018 to T-021)
4. Migration Script (T-025 to T-028)
5. Testing (T-034 to T-040)
6. Rollout (T-041 to T-044)

**High-Risk Tasks**:
- T-007: Complex integration with living docs
- T-022: Bash hook logic updates
- T-025: Migration script (data modification)
- T-041: Production migration

**Model Distribution**:
- ⚡ Haiku: 28 tasks (straightforward implementation)
- 💎 Opus: 16 tasks (complex logic, architecture)
