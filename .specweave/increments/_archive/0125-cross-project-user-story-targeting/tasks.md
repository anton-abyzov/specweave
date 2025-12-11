---
increment: 0125-cross-project-user-story-targeting
status: planning
phases:
  - data-model
  - living-docs-sync
  - external-sync
  - planner
  - status-dashboard
  - testing
estimated_tasks: 24
---

# Tasks: Cross-Project User Story Targeting

## Phase 1: Data Model Changes

### T-001: Extend UserStoryData Type with Project/Board Fields
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed
**Priority**: P1

Add `project`, `board`, and `externalProvider` fields to UserStoryData interface.

**Files**:
- `src/core/living-docs/types.ts`

**Tests**:
```gherkin
Given a UserStoryData object
When project field is set to "frontend-app"
Then the type should accept the value without errors

Given a UserStoryData with no project field
When serialized and deserialized
Then project should be undefined (optional field)
```

---

### T-002: Update spec.md Parser to Extract Per-US Project
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed
**Priority**: P1

Modify `extractUserStories()` in sync-helpers to parse `**Project**:` and `**Board**:` fields.

**Files**:
- `src/core/living-docs/sync-helpers/index.ts`
- `src/core/living-docs/sync-helpers/spec-parser.ts` (new)

**Tests**:
```gherkin
Given a spec.md with US section containing "**Project**: frontend-app"
When extractUserStories() is called
Then US-001.project should equal "frontend-app"

Given a spec.md with US section without **Project** field
When extractUserStories() is called with defaultProject "my-app"
Then US-001.project should equal "my-app"
```

---

### T-003: Add Project Mappings to Config Schema
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02
**Status**: [x] completed
**Priority**: P1

Create JSON schema for `projectMappings` configuration section.

**Files**:
- `src/core/schemas/project-mapping.schema.json` (new)
- `src/core/schemas/specweave-config.schema.json` (update)

**Tests**:
```gherkin
Given a config with valid projectMappings
When validated against schema
Then validation should pass

Given a config with projectMappings missing required github.repo
When validated against schema
Then validation should fail with clear error
```

---

### T-004: Validate US Project Against Config
**User Story**: US-001
**Satisfies ACs**: AC-US1-04, AC-US1-05
**Status**: [x] completed
**Priority**: P1

Add validation that US project exists in config (either projectMappings or multiProject.projects).

**Files**:
- `src/core/living-docs/validators/project-validator.ts` (new)

**Tests**:
```gherkin
Given US with project "frontend-app" and config has projectMappings.frontend-app
When validateUSProject() is called
Then validation should pass

Given US with project "unknown-project" not in config
When validateUSProject() is called
Then validation should warn "Project 'unknown-project' not found in config"
```

---

## Phase 2: Living Docs Multi-Project Sync

### T-005: Create CrossProjectSync Class
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed
**Priority**: P1

Implement grouping logic and multi-project sync orchestration.

**Files**:
- `src/core/living-docs/cross-project-sync.ts` (new)

**Tests**:
```gherkin
Given 3 USs: US-001 (frontend), US-002 (backend), US-003 (frontend)
When groupByProject() is called
Then result should have 2 groups: frontend=[US-001, US-003], backend=[US-002]

Given defaultProject "my-app" and US without explicit project
When groupByProject() is called
Then US should be in "my-app" group
```

---

### T-006: Update syncIncrement() for Multi-Project
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02
**Status**: [x] completed
**Priority**: P1

Modify syncIncrement to detect cross-project and delegate to CrossProjectSync.

**Files**:
- `src/core/living-docs/living-docs-sync.ts`

**Tests**:
```gherkin
Given increment with USs targeting 2 different projects
When syncIncrement() is called
Then both project folders should be created
And each folder should contain only its relevant USs

Given increment with all USs targeting same project
When syncIncrement() is called
Then existing single-project behavior should execute
```

---

### T-007: Generate Cross-Reference FEATURE.md
**User Story**: US-002
**Satisfies ACs**: AC-US2-04, AC-US2-05
**Status**: [x] completed
**Priority**: P2

Add "Related Projects" section to FEATURE.md with links to other project folders.

**Files**:
- `src/core/living-docs/sync-helpers/feature-generator.ts`

**Tests**:
```gherkin
Given cross-project increment with projects [frontend, backend, security]
When FEATURE.md is generated for frontend folder
Then it should contain "Related Projects" section
And it should link to ../backend/FS-125/ and ../security/FS-125/
```

---

### T-008: Add related_to Frontmatter to US Files
**User Story**: US-002
**Satisfies ACs**: AC-US2-05
**Status**: [x] completed
**Priority**: P2

Include frontmatter in us-*.md files linking to other projects.

**Files**:
- `src/core/living-docs/sync-helpers/user-story-generator.ts`

**Tests**:
```gherkin
Given US-001 in frontend project, related to backend project
When us-001.md is generated
Then frontmatter should include "related_projects: [backend]"
```

---

## Phase 3: External Tool Multi-Target Sync

### T-009: Update metadata.json external_refs Schema
**User Story**: US-003
**Satisfies ACs**: AC-US3-06
**Status**: [x] completed
**Priority**: P1

Change from single external_ref to per-US external_refs map.

**Files**:
- `src/core/types/increment-metadata.ts`
- `src/core/metadata-manager.ts`

**Tests**:
```gherkin
Given metadata with old external_ref format
When loaded by MetadataManager
Then should migrate to external_refs.US-001 format (backward compat)

Given new metadata with external_refs per US
When saved and reloaded
Then per-US refs should be preserved
```

---

### T-010: Create ExternalSyncOrchestrator
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02
**Status**: [x] completed
**Priority**: P1

Orchestrate external sync across multiple providers per US.

**Files**:
- `src/core/living-docs/external-sync-orchestrator.ts` (new)

**Tests**:
```gherkin
Given 2 USs: US-001 (github), US-002 (jira)
When syncUserStories() is called
Then GitHub sync should be called for US-001
And JIRA sync should be called for US-002
```

---

### T-011: Update GitHub Sync for Per-Repo Targeting
**User Story**: US-003
**Satisfies ACs**: AC-US3-03
**Status**: [ ] pending
**Priority**: P1

Modify GitHub sync to accept owner/repo per call.

**Files**:
- `src/external-tools/github/github-sync.ts`
- `src/external-tools/github/github-feature-sync.ts`

**Tests**:
```gherkin
Given US targeting projectMapping.frontend-app with github.repo="fe-app"
When GitHub sync is called
Then issue should be created in "myorg/fe-app" repo
```

---

### T-012: Update JIRA Sync for Per-Project Targeting
**User Story**: US-003
**Satisfies ACs**: AC-US3-04
**Status**: [ ] pending
**Priority**: P1

Modify JIRA sync to accept project/board per call.

**Files**:
- `src/external-tools/jira/jira-sync.ts`
- `src/external-tools/jira/jira-feature-sync.ts`

**Tests**:
```gherkin
Given US targeting projectMapping.security with jira.project="SECURITY"
When JIRA sync is called
Then issue should be created in "SECURITY" JIRA project
```

---

### T-013: Update ADO Sync for Per-Area-Path Targeting
**User Story**: US-003
**Satisfies ACs**: AC-US3-05
**Status**: [ ] pending
**Priority**: P1

Modify ADO sync to accept project/areaPath per call.

**Files**:
- `src/external-tools/ado/ado-sync.ts`
- `src/external-tools/ado/ado-feature-sync.ts`

**Tests**:
```gherkin
Given US targeting projectMapping.infra with ado.areaPath="infrastructure/security"
When ADO sync is called
Then work item should be created in "infrastructure/security" area path
```

---

### T-014: Implement Rate Limiting per Provider
**User Story**: US-003
**Satisfies ACs**: AC-US3-07
**Status**: [ ] pending
**Priority**: P2

Ensure rate limits apply per provider, not per US.

**Files**:
- `src/core/living-docs/external-sync-orchestrator.ts`
- `src/external-tools/rate-limiter.ts`

**Tests**:
```gherkin
Given 10 USs all targeting GitHub (same provider)
When batch sync is called
Then requests should be throttled according to GitHub rate limits
And total requests should be batched appropriately
```

---

## Phase 4: Increment Planner Updates

### T-015: Create Cross-Cutting Detector Utility
**User Story**: US-007
**Satisfies ACs**: AC-US7-01
**Status**: [x] completed
**Priority**: P1

Implement keyword-based detection for cross-cutting features.

**Files**:
- `src/utils/cross-cutting-detector.ts` (new)

**Tests**:
```gherkin
Given description "OAuth with React frontend and Node backend"
When detectCrossCutting() is called
Then isCrossCutting should be true
And suggestedProjects should include ["frontend", "backend"]

Given description "Add button to homepage"
When detectCrossCutting() is called
Then isCrossCutting should be false
```

---

### T-016: Update increment-planner SKILL.md for Per-US Selection
**User Story**: US-007
**Satisfies ACs**: AC-US7-02, AC-US7-03, AC-US7-04
**Status**: [x] completed
**Priority**: P1

Add cross-cutting detection step and per-US project prompt.

**Files**:
- `plugins/specweave/skills/increment-planner/SKILL.md`

**Tests**:
```gherkin
Given cross-cutting feature detected
When planner runs
Then user should be prompted to select project per US
And generated spec.md should include **Project**: per US section
```

---

### T-017: Generate spec.md with Per-US Project Fields
**User Story**: US-007
**Satisfies ACs**: AC-US7-04, AC-US7-05
**Status**: [x] completed
**Priority**: P1

Update spec generation to include **Project**: in each US section.

**Files**:
- `plugins/specweave/skills/spec-generator/SKILL.md`
- `src/core/spec-generator.ts` (if exists)

**Tests**:
```gherkin
Given user assigned US-001→frontend, US-002→backend
When spec.md is generated
Then US-001 section should contain "**Project**: frontend"
And US-002 section should contain "**Project**: backend"
```

---

## Phase 5: Status Dashboard Updates

### T-018: Update /specweave:status for Cross-Project View
**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03
**Status**: [x] completed
**Priority**: P2

Show USs grouped by project with external status.

**Files**:
- `plugins/specweave/commands/specweave-status.md`
- `src/cli/commands/status.ts`

**Tests**:
```gherkin
Given cross-project increment with 5 USs across 3 projects
When /specweave:status is run
Then output should show table with projects, providers, and US status

Given US with no project mapping
When /specweave:status is run
Then output should show warning icon and "Not mapped" status
```

---

### T-019: Add External Issue Links to Status
**User Story**: US-006
**Satisfies ACs**: AC-US6-04
**Status**: [x] completed
**Priority**: P2

Display clickable links to external issues per US.

**Files**:
- `src/cli/commands/status.ts`

**Tests**:
```gherkin
Given US-001 with github issue #45 in "myorg/fe-app"
When status is displayed
Then US-001 row should include link "https://github.com/myorg/fe-app/issues/45"
```

---

## Phase 6: Remove activeProject

### T-020: Remove activeProject from Config Schema
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-04
**Status**: [x] completed
**Priority**: P1

Remove `multiProject.activeProject` from schema and init.

**Files**:
- `src/core/schemas/specweave-config.schema.json`
- `src/cli/commands/init.ts`
- `src/cli/helpers/init/` (any references)

**Tests**:
```gherkin
Given specweave init runs
When multiProject setup completes
Then config.json should NOT contain activeProject field

Given config schema validation
When config has activeProject field
Then validation should fail (unknown property)
```

---

### T-021: Remove All activeProject Code References
**User Story**: US-005
**Satisfies ACs**: AC-US5-02, AC-US5-05
**Status**: [x] completed
**Priority**: P1

Delete all code that reads/writes activeProject.

**Files**:
- `src/core/living-docs/living-docs-sync.ts`
- `src/utils/project-detection.ts`
- Any file with `activeProject` reference
- Delete `plugins/specweave/commands/specweave-switch-project.md`

**Tests**:
```gherkin
Given grep for "activeProject" in src/
When search runs
Then 0 matches should be found

Given grep for "activeProject" in plugins/
When search runs
Then 0 matches should be found (except maybe docs explaining removal)
```

---

### T-022: Remove /specweave:switch-project Command
**User Story**: US-005
**Satisfies ACs**: AC-US5-03
**Status**: [x] completed
**Priority**: P1

Delete the switch-project command entirely.

**Files**:
- `plugins/specweave/commands/specweave-switch-project.md` (DELETE)
- `plugins/specweave/skills/` (any switch-project skill)

**Tests**:
```gherkin
Given user runs /specweave:switch-project
When command executes
Then error should be "Unknown command" (command no longer exists)
```

---

## Phase 7: Archive & Hooks

### T-023: Update Archive to Respect Per-US Projects
**User Story**: US-008
**Satisfies ACs**: AC-US8-01, AC-US8-02, AC-US8-03
**Status**: [x] completed
**Priority**: P2

Archive cross-project increments with project-specific folders.

**Files**:
- `src/core/archive-manager.ts`
- `src/cli/commands/archive.ts`

**Tests**:
```gherkin
Given cross-project increment with USs in frontend/ and backend/
When archive is executed
Then frontend/_archive/FS-125/ should contain US-001
And backend/_archive/FS-125/ should contain US-002
And cross-references should be removed
```

---

### T-024: Add US Project Context to Hooks
**User Story**: US-009
**Satisfies ACs**: AC-US9-01, AC-US9-02, AC-US9-03
**Status**: [x] completed
**Priority**: P2

Include `us.project` in hook context.

**Files**:
- `src/hooks/hook-context.ts`
- `plugins/specweave/hooks/post-task-completion.sh`

**Tests**:
```gherkin
Given post_task_completion hook for T-001 (US-001, project: frontend)
When hook executes
Then HOOK_CONTEXT should include "us_project=frontend"
And HOOK_CONTEXT should include "increment_cross_project=true"
```

---

## Phase 8: Testing & Documentation

### T-025: Integration Test: Cross-Project Workflow
**User Story**: US-002, US-003
**Satisfies ACs**: AC-US2-01, AC-US3-01
**Status**: [x] completed
**Priority**: P1

End-to-end test for cross-project sync.

**Files**:
- `tests/integration/core/cross-project-sync.spec.ts` (new)

**Tests**:
```gherkin
Given spec.md with 3 USs targeting 3 different projects
When full sync workflow runs
Then 3 project folders should exist with correct USs
And 3 external issues should be created in correct repos/projects
And metadata should have external_refs per US
```

---

## Summary

| Phase | Tasks | Priority | Estimated Effort |
|-------|-------|----------|------------------|
| Data Model | T-001 to T-004 | P1 | 2 days |
| Living Docs | T-005 to T-008 | P1-P2 | 3 days |
| External Sync | T-009 to T-014 | P1-P2 | 4 days |
| Planner | T-015 to T-017 | P1 | 2 days |
| Status | T-018 to T-019 | P2 | 1 day |
| Remove activeProject | T-020 to T-022 | P1 | 1 day |
| Archive/Hooks | T-023 to T-024 | P2 | 2 days |
| Testing | T-025 | P1 | 1 day |

**Total**: 25 tasks, ~16 days estimated
