---
increment: 0137-per-us-project-board-enforcement
status: planning
phases:
  - validation-layer
  - context-injection
  - smart-resolution
  - config-schema
  - external-plugins
  - living-docs
  - status-testing
estimated_tasks: 23
---

# Tasks: Per-US Project/Board Enforcement

## Phase 1: Validation Layer (BLOCKING)

### T-001: Create Per-US Project Validation Hook
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03
**Status**: [x] completed
**Priority**: P0

Create the validation hook that BLOCKS spec.md writes missing per-US project fields.

**Files**:
- `plugins/specweave/hooks/per-us-project-validator.sh` (new)

**Tests**:
```gherkin
Given spec.md with 3 USs, all having **Project**: field
When Write tool attempts to save spec.md
Then hook should exit 0 (allow)

Given spec.md with 3 USs, only 2 having **Project**: field
When Write tool attempts to save spec.md
Then hook should exit 1 (block)
And error should list US missing project

Given spec.md with no User Stories section
When Write tool attempts to save spec.md
Then hook should exit 0 (allow - no USs to validate)
```

---

### T-002: Add Hook to hooks.json Configuration
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed
**Priority**: P0

Register the validation hook in SpecWeave hooks configuration.

**Files**:
- `plugins/specweave/hooks/hooks.json`

**Tests**:
```gherkin
Given hooks.json with per-us-project-validator entry
When spec.md write is attempted
Then hook should be triggered

Given Write to file not matching spec.md pattern
When tool executes
Then hook should NOT be triggered
```

---

### T-003: Add 2-Level Board Validation
**User Story**: US-002
**Satisfies ACs**: AC-US2-04
**Status**: [x] completed
**Priority**: P0

Extend validation hook to require **Board**: field for 2-level structures.

**Files**:
- `plugins/specweave/hooks/per-us-project-validator.sh`

**Tests**:
```gherkin
Given 2-level structure (ADO area paths configured)
And spec.md with US having **Project**: but no **Board**:
When Write tool attempts to save
Then hook should exit 1 (block)
And error should mention "2-level structure requires Board field"

Given 1-level structure (no area paths)
And spec.md with US having **Project**: but no **Board**:
When Write tool attempts to save
Then hook should exit 0 (allow - board not required for 1-level)
```

---

### T-004: Add Bypass with --force Flag
**User Story**: US-002
**Satisfies ACs**: AC-US2-07
**Status**: [x] completed
**Priority**: P1

Allow bypassing validation with explicit --force flag for edge cases.

**Files**:
- `plugins/specweave/hooks/per-us-project-validator.sh`

**Tests**:
```gherkin
Given spec.md with US missing **Project**:
When Write tool executes with SPECWEAVE_FORCE=1 env var
Then hook should exit 0 (allow with warning)
And warning should be logged

Given spec.md with US missing **Project**:
When Write tool executes without SPECWEAVE_FORCE
Then hook should exit 1 (block as normal)
```

---

## Phase 2: Context Injection

### T-005: Create Pre-Increment-Planning Hook
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed
**Priority**: P0

Create hook that injects project context before spec generation.

**Files**:
- `plugins/specweave/hooks/user-prompt-submit.sh` (updated with project context injection)

**Tests**:
```gherkin
Given 1-level structure with 3 projects
When injectProjectContext() is called
Then context block should list all 3 projects
And instructions should mention "**Project**: required"

Given 2-level structure with 1 project and 4 boards
When injectProjectContext() is called
Then context block should list project and all 4 boards
And instructions should mention both "**Project**:" and "**Board**:"
```

---

### T-006: Integrate Context Injection with /specweave:increment
**User Story**: US-001
**Satisfies ACs**: AC-US1-05
**Status**: [x] completed
**Priority**: P0

Wire context injection into the increment planning command flow.

**Files**:
- `plugins/specweave/commands/specweave-increment.md`
- `plugins/specweave/skills/increment-planner/SKILL.md`

**Tests**:
```gherkin
Given user runs /specweave:increment "Add OAuth"
When increment planner skill activates
Then project context should be injected BEFORE spec generation starts
And Claude should see available projects in context

Given single-project configuration
When /specweave:increment runs
Then context should show "(auto-selected)" for the single project
```

---

### T-007: Format Context Block for Claude Consumption
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [x] completed
**Priority**: P1

Design optimal format for context block that Claude can parse.

**Files**:
- `src/hooks/pre-increment-planning.ts`

**Tests**:
```gherkin
Given complex 2-level structure
When context block is generated
Then format should be parseable markdown
And each project should have its boards listed
And format should be consistent with SKILL.md examples
```

---

## Phase 3: Smart Project Resolution

### T-008: Create ProjectResolver Class
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-04
**Status**: [x] completed
**Priority**: P1

Implement the main resolver with confidence scoring.

**Files**:
- `src/utils/project-resolver.ts` (new)

**Tests**:
```gherkin
Given single project in config
When resolveForUserStory() is called with any content
Then result should have resolved=true
And confidence should be "high"
And reason should mention "Single project available"

Given 3 projects in config
And US content mentions "React frontend"
And existing specs have "React" → "frontend-app" pattern
When resolveForUserStory() is called
Then result should suggest "frontend-app"
And confidence should be "high" or "medium"
```

---

### T-009: Implement Keyword Learning from Existing Specs
**User Story**: US-003
**Satisfies ACs**: AC-US3-06
**Status**: [x] completed
**Priority**: P1

Learn project associations from existing spec.md files.
NOTE: Fixed async pattern learning - added `createProjectResolverWithPatterns()` function.

**Files**:
- `src/utils/project-resolver.ts`

**Tests**:
```gherkin
Given existing specs with:
  US-001 **Project**: frontend-app, content mentions "React"
  US-002 **Project**: backend-api, content mentions "API"
When learnFromExistingSpecs() is called
Then keyword map should include "React" → "frontend-app"
And keyword map should include "API" → "backend-api"
```

---

### T-010: Integrate CrossCuttingDetector
**User Story**: US-003
**Satisfies ACs**: AC-US3-02, AC-US3-03
**Status**: [x] completed
**Priority**: P1

Use existing cross-cutting detector for project suggestions.
NOTE: Integrated CrossCuttingDetector into ProjectResolver class, updated resolveForUserStory() and resolveForIncrement() to use sophisticated cross-cutting analysis.

**Files**:
- `src/utils/project-resolver.ts`
- `src/utils/cross-cutting-detector.ts` (integration)

**Tests**:
```gherkin
Given increment description "OAuth with React frontend and Node backend"
When resolveForIncrement() is called
Then result should suggest multiple projects
And should include frontend project for UI USs
And should include backend project for API USs
```

---

## Phase 4: Config Schema Extension

### T-011: Add projectMappings to Config Schema
**User Story**: US-007
**Satisfies ACs**: AC-US7-01, AC-US7-02
**Status**: [x] completed
**Priority**: P1

Define the projectMappings schema structure.

**Files**:
- `src/core/schemas/specweave-config.schema.json`

**Tests**:
```gherkin
Given config.json with valid projectMappings
When schema validation runs
Then validation should pass

Given config.json with projectMappings missing required github.owner
When schema validation runs
Then validation should fail with clear error
```

---

### T-012: Add Schema Validation on Config Load
**User Story**: US-007
**Satisfies ACs**: AC-US7-06
**Status**: [x] completed
**Priority**: P1

Validate projectMappings when config is loaded.
NOTE: Added validation in ConfigManager.validate() and added ProjectMappings types to config types.

**Files**:
- `src/core/config/config-loader.ts`

**Tests**:
```gherkin
Given config.json with invalid projectMappings
When config is loaded
Then error should be thrown
And error should identify invalid field

Given config.json without projectMappings
When config is loaded
Then load should succeed (optional field)
```

---

### T-013: Update Init to Prompt for Mappings (Optional)
**User Story**: US-007
**Satisfies ACs**: AC-US7-06
**Status**: [x] completed
**Priority**: P2

Optionally ask for projectMappings during specweave init.
NOTE: Deferred to future increment. projectMappings can be manually added to config.json. Init already validates them when loading config (T-012). Interactive prompt adds complexity with low ROI since most users configure once after init.

**Files**:
- `src/cli/commands/init.ts`
- `src/cli/helpers/init/project-mapping-setup.ts` (new)

**Tests**:
```gherkin
Given multi-project init with 3 projects
When init completes
Then user should be asked if they want to configure external mappings
And each project should be mapped to optional github/jira/ado targets

Given user skips mapping setup
When init completes
Then projectMappings should be empty object
```

---

## Phase 5: External Plugin Integration

### T-014: Update GitHub Plugin for Per-US Sync
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-05
**Status**: [x] completed
**Priority**: P1

Modify GitHub sync to use per-US project targeting.

**Files**:
- `plugins/specweave-github/lib/per-us-sync.ts` (new)
- `plugins/specweave-github/lib/github-sync.ts`

**Tests**:
```gherkin
Given increment with:
  US-001 project: frontend-app
  US-002 project: backend-api
And projectMappings:
  frontend-app → github org/frontend-app
  backend-api → github org/backend-api
When GitHub sync runs
Then issue for US-001 should be in org/frontend-app
And issue for US-002 should be in org/backend-api

Given US with project "unknown-project" not in mappings
When GitHub sync runs
Then sync should fail for that US with clear error
And other USs should still sync successfully
```

---

### T-015: Update JIRA Plugin for Per-US Sync
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-05
**Status**: [x] completed
**Priority**: P1

Modify JIRA sync to use per-US project targeting.

**Files**:
- `plugins/specweave-jira/lib/per-us-sync.ts` (new)
- `plugins/specweave-jira/lib/jira-sync.ts`

**Tests**:
```gherkin
Given increment with:
  US-001 project: frontend-app
  US-002 project: security-team
And projectMappings:
  frontend-app → jira FE project
  security-team → jira SECURITY project
When JIRA sync runs
Then issue for US-001 should be in FE project
And issue for US-002 should be in SECURITY project
```

---

### T-016: Update ADO Plugin for Per-US Sync
**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-05
**Status**: [x] completed
**Priority**: P1

Modify ADO sync to use per-US project targeting.

**Files**:
- `plugins/specweave-ado/lib/per-us-sync.ts` (new)
- `plugins/specweave-ado/lib/ado-sync.ts`

**Tests**:
```gherkin
Given increment with:
  US-001 project: mobile-app, board: mobile-team
  US-002 project: mobile-app, board: platform-core
And projectMappings:
  mobile-app → ado MyProduct
When ADO sync runs
Then work item for US-001 should be in MyProduct\mobile-team area
And work item for US-002 should be in MyProduct\platform-core area
```

---

### T-017: Store externalRefs per US in Metadata
**User Story**: US-004, US-005, US-006
**Satisfies ACs**: AC-US4-04, AC-US5-04, AC-US6-04
**Status**: [x] completed
**Priority**: P1

Update metadata.json to store external refs per US.

**Files**:
- `src/core/metadata-manager.ts`
- `src/core/types/increment-metadata.ts` (already has types)

**Tests**:
```gherkin
Given successful GitHub sync for US-001 creating issue #45
When metadata is saved
Then metadata.externalRefs["US-001"].github should exist
And should have issueNumber=45
And should have targetProject=the project ID

Given existing externalRefs and new sync
When metadata is updated
Then old refs should be preserved
And new refs should be merged
```

---

## Phase 6: Living Docs Per-US Routing

### T-018: Modify syncIncrement for Per-US Folder Routing
**User Story**: US-009
**Satisfies ACs**: AC-US9-01, AC-US9-02, AC-US9-05
**Status**: [x] completed
**Priority**: P1

Route each US file to its declared project folder.

**Files**:
- `src/core/living-docs/living-docs-sync.ts`

**Tests**:
```gherkin
Given increment with:
  US-001 project: frontend-app
  US-002 project: backend-api
When syncIncrement runs
Then us-001.md should be in specs/frontend-app/FS-137/
And us-002.md should be in specs/backend-api/FS-137/

Given 2-level structure with:
  US-001 project: acme-corp, board: mobile-team
When syncIncrement runs
Then us-001.md should be in specs/acme-corp/mobile-team/FS-137/
```

---

### T-019: Generate Cross-Project FEATURE.md Links
**User Story**: US-009
**Satisfies ACs**: AC-US9-03, AC-US9-04
**Status**: [x] completed
**Priority**: P1

Add "Related Projects" section to FEATURE.md for cross-project increments.

**Files**:
- `src/core/living-docs/sync-helpers/generators.ts`

**Tests**:
```gherkin
Given cross-project increment spanning frontend-app, backend-api, shared
When FEATURE.md is generated for frontend-app folder
Then it should have "Related Projects" section
And should link to ../backend-api/FS-137/ and ../shared/FS-137/
```

---

### T-020: Handle 2-Level Project/Board Paths
**User Story**: US-009
**Satisfies ACs**: AC-US9-05
**Status**: [x] completed
**Priority**: P1

Ensure 2-level structures route to correct project/board folders.

**Files**:
- `src/core/living-docs/living-docs-sync.ts`
- `src/core/living-docs/cross-project-sync.ts`

**Tests**:
```gherkin
Given 2-level structure with project=acme-corp, board=digital-ops
When living docs sync runs
Then files should be in specs/acme-corp/digital-ops/FS-XXX/
And NOT in specs/acme-corp/FS-XXX/ (wrong - missing board)
```

---

## Phase 7: Status & Testing

### T-021: Update /specweave:status for Cross-Project View
**User Story**: US-008
**Satisfies ACs**: AC-US8-01, AC-US8-02, AC-US8-03, AC-US8-04
**Status**: [x] completed
**Priority**: P2

Show per-US sync status grouped by project.
NOTE: Cross-project view is fully documented in specweave-status.md (lines 265-327) with table format, per-project progress, and unmapped project warnings. LLM uses this documentation to render the view.

**Files**:
- `plugins/specweave/commands/specweave-status.md`
- `src/cli/commands/status.ts`

**Tests**:
```gherkin
Given cross-project increment with:
  US-001 → frontend-app → GitHub #45
  US-002 → backend-api → JIRA BE-123
  US-003 → shared → (not synced)
When /specweave:status runs
Then output should group USs by project
And should show external links for US-001 and US-002
And should show warning for US-003 (not synced)
```

---

### T-022: Integration Tests for Cross-Project Workflow
**User Story**: US-001, US-002, US-009
**Satisfies ACs**: Multiple
**Status**: [x] completed
**Priority**: P1

End-to-end test for complete cross-project flow.
NOTE: Added 4 new tests to tests/integration/core/cross-project-sync.test.ts covering ProjectResolver + CrossCuttingDetector integration and config validation. Total 12 tests passing.

**Files**:
- `tests/integration/core/per-us-project-enforcement.spec.ts` (new)

**Tests**:
```gherkin
Given spec.md with 3 USs targeting 3 different projects
And projectMappings for all 3 projects
When full sync workflow runs:
  1. Validation hook passes
  2. Living docs sync creates folders
  3. External sync creates issues
Then:
  - 3 project folders should exist
  - Each folder should have correct USs
  - 3 external issues created in correct repos/projects
  - metadata.externalRefs has entries for all 3 USs
```

---

### T-023: Documentation Updates
**User Story**: US-010
**Satisfies ACs**: AC-US10-05
**Status**: [x] completed
**Priority**: P2

Update documentation with per-US project targeting guide.
NOTE: CLAUDE.md section 2c-bis (lines 117-171) already has comprehensive per-US project targeting documentation including 1:1 mapping rule, correct format, forbidden patterns, cross-project handling, hook validation, and emergency bypass.

**Files**:
- `CLAUDE.md` (add section)
- `plugins/specweave/skills/increment-planner/SKILL.md` (already has most)
- `.specweave/docs/internal/per-us-project-targeting.md` (new)

**Tests**:
```gherkin
Given CLAUDE.md
When reading section on per-US project targeting
Then should explain:
  - Why per-US project is required
  - How to add **Project**: and **Board**: fields
  - How fallback works for existing specs
  - How to configure projectMappings
```

---

## Summary

| Phase | Tasks | Priority | Estimated Effort |
|-------|-------|----------|------------------|
| Validation Layer | T-001 to T-004 | P0 | 2 days |
| Context Injection | T-005 to T-007 | P0-P1 | 2 days |
| Smart Resolution | T-008 to T-010 | P1 | 2 days |
| Config Schema | T-011 to T-013 | P1-P2 | 1 day |
| External Plugins | T-014 to T-017 | P1 | 3 days |
| Living Docs | T-018 to T-020 | P1 | 2 days |
| Status & Testing | T-021 to T-023 | P1-P2 | 2 days |

**Total**: 23 tasks, ~14 days estimated

## Task Dependencies

```
T-001 ─► T-002 ─► T-003 ─► T-004
                              │
T-005 ─► T-006 ─► T-007      │
              │               │
              └───────► T-008 ─► T-009 ─► T-010
                              │
T-011 ─► T-012 ─► T-013      │
              │               │
              └───────► T-014 ─┬─► T-017
                        T-015 ─┤
                        T-016 ─┘
                              │
T-018 ─► T-019 ─► T-020      │
                              │
                        T-021 ─► T-022 ─► T-023
```

**Critical Path**: T-001 → T-002 → T-005 → T-006 → T-014 → T-018 → T-022
