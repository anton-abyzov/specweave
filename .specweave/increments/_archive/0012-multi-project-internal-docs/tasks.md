# Tasks for Increment 0012: Multi-Project Internal Docs & Brownfield Import

---
increment: 0012-multi-project-internal-docs
total_tasks: 15
test_mode: TDD
coverage_target: 85%
---

**Status**: Planning
**Created**: 2025-11-05
**Estimated**: ~30 hours

---

## Phase 1: Core Infrastructure

### T-001: Create ProjectManager Class
**User Story**: [US-001: Multi-Project Organization (P0)](../../docs/internal/specs/default/multi-project-internal-docs/us-001-multi-project-organization-p0.md)


**AC**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US5-01, AC-US5-04

**Test Plan** (BDD format):
- **Given** single project mode → **When** getActiveProject() → **Then** return default project
- **Given** multi-project enabled → **When** getActiveProject() → **Then** return active project from config
- **Given** active project "alpha" → **When** getSpecsPath() → **Then** return `projects/alpha/specs/`
- **Given** active project "beta" → **When** getModulesPath() → **Then** return `projects/beta/modules/`

**Test Cases**:
- Unit (`tests/unit/core/project-manager.test.ts`): getActiveProject, getSpecsPath, getModulesPath, getTeamPath, getLegacyPath, switchProject, createProjectStructure → 95% coverage
- Integration (`tests/integration/multi-project/project-manager.test.ts`): end-to-end project switching, path resolution with config → 90% coverage
- **Overall: 92% coverage**

**Implementation**:
- Create `src/core/project-manager.ts` (ProjectManager class)
- Implement getActiveProject(), getSpecsPath(), getModulesPath(), getTeamPath(), getLegacyPath()
- Implement switchProject(projectId)
- Implement createProjectStructure(projectId)
- Add caching for project context
- Handle both single and multi-project modes

**Estimated**: 3 hours

---

### T-002: Update Config Schema for Multi-Project
**User Story**: [US-001: Multi-Project Organization (P0)](../../docs/internal/specs/default/multi-project-internal-docs/us-001-multi-project-organization-p0.md)


**AC**: AC-US1-04, AC-US5-02, AC-US5-03

**Test Plan** (BDD format):
- **Given** new config → **When** validate with schema → **Then** accept multiProject section
- **Given** invalid project ID (uppercase) → **When** validate → **Then** reject with error
- **Given** missing required fields → **When** validate → **Then** reject with error

**Test Cases**:
- Unit (`tests/unit/core/config-manager.test.ts`): schema validation, default values, required fields, pattern matching → 90% coverage
- **Overall: 90% coverage**

**Implementation**:
- Update `src/core/schemas/specweave-config.schema.json`
- Add `multiProject` section (enabled, activeProject, projects array)
- Add `brownfield` section (importHistory array)
- Add JSON schema validation for project IDs (kebab-case pattern)
- Add JSON schema for contacts, syncProfiles linking

**Estimated**: 2 hours

---

### T-003: Implement Auto-Migration Script
**User Story**: [US-005: Unified Architecture (P0)](../../docs/internal/specs/default/multi-project-internal-docs/us-005-unified-architecture-p0.md)


**AC**: AC-US5-01, AC-US5-05

**Test Plan** (BDD format):
- **Given** existing specs/ folder → **When** auto-migrate → **Then** copy to projects/default/specs/
- **Given** existing specs/ folder → **When** auto-migrate → **Then** rename old folder to specs.old/
- **Given** no existing specs → **When** auto-migrate → **Then** create empty projects/default/ structure
- **Given** already migrated → **When** auto-migrate → **Then** skip (idempotent)

**Test Cases**:
- Unit (`tests/unit/cli/migrate-to-multiproject.test.ts`): migration logic, backup creation, folder renaming, idempotency → 95% coverage
- Integration (`tests/integration/multi-project/auto-migration.test.ts`): end-to-end migration with real folders, config updates → 90% coverage
- E2E (`tests/e2e/multi-project-migration.spec.ts`): full migration workflow → 100% critical path
- **Overall: 93% coverage**

**Implementation**:
- Create `src/cli/commands/migrate-to-multiproject.ts`
- Implement autoMigrateSingleToMulti() function
- Backup config to `.specweave/config.backup.json`
- Check if old `specs/` exists, migrate if present
- Create `projects/default/` structure
- Update config.json (multiProject section)
- Handle errors gracefully

**Estimated**: 3 hours

**Dependencies**: T-001, T-002

---

## Phase 2: Brownfield Analyzer

### T-004: Implement File Classification Algorithm
**User Story**: [US-004: Brownfield Import (P0)](../../docs/internal/specs/default/multi-project-internal-docs/us-004-brownfield-import-p0.md)


**AC**: AC-US4-02, AC-US4-05

**Test Plan** (BDD format):
- **Given** file with "user story" keywords → **When** classify → **Then** type="spec", confidence>0.7
- **Given** file with "module" keywords → **When** classify → **Then** type="module", confidence>0.7
- **Given** file with "onboarding" keywords → **When** classify → **Then** type="team", confidence>0.7
- **Given** file with no matches → **When** classify → **Then** type="legacy", confidence=0

**Test Cases**:
- Unit (`tests/unit/brownfield/analyzer.test.ts`): scoreKeywords, classifyFile, findMarkdownFiles, analyze → 95% coverage
- Integration (`tests/integration/brownfield/analyzer.test.ts`): analyze real Notion export (test fixtures) → 85% coverage
- **Overall: 90% coverage**

**Implementation**:
- Create `src/core/brownfield/analyzer.ts`
- Implement BrownfieldAnalyzer class
- Define keyword sets (SPEC_KEYWORDS, MODULE_KEYWORDS, TEAM_KEYWORDS)
- Implement scoreKeywords() (0-1 confidence)
- Implement classifyFile() (parse frontmatter, analyze content)
- Implement findMarkdownFiles() (recursive search)
- Implement analyze() (classify all files)

**Estimated**: 3 hours

---

### T-005: Implement Brownfield Import Logic
**User Story**: [US-004: Brownfield Import (P0)](../../docs/internal/specs/default/multi-project-internal-docs/us-004-brownfield-import-p0.md)


**AC**: AC-US4-01, AC-US4-03, AC-US4-04, AC-US4-06, AC-US4-07

**Test Plan** (BDD format):
- **Given** analyzed files → **When** import → **Then** copy specs to projects/{id}/specs/
- **Given** analyzed files → **When** import → **Then** copy modules to projects/{id}/modules/
- **Given** analyzed files → **When** import → **Then** copy legacy to projects/{id}/legacy/{source}/
- **Given** import complete → **When** check config → **Then** brownfield.importHistory updated

**Test Cases**:
- Unit (`tests/unit/brownfield/importer.test.ts`): importFiles, createMigrationReport, updateConfig, import → 95% coverage
- Integration (`tests/integration/brownfield/importer.test.ts`): end-to-end import with real files, verify destinations → 90% coverage
- **Overall: 92% coverage**

**Implementation**:
- Create `src/core/brownfield/importer.ts`
- Implement BrownfieldImporter class
- Implement import() (orchestrates entire import)
- Implement importFiles() (copy files to destination)
- Implement createMigrationReport() (legacy/README.md)
- Implement updateConfig() (update brownfield.importHistory)

**Estimated**: 3 hours

**Dependencies**: T-001, T-004

---

## Phase 3: CLI Commands

### T-006: Create `/specweave:init-multiproject` Command
**User Story**: [US-005: Unified Architecture (P0)](../../docs/internal/specs/default/multi-project-internal-docs/us-005-unified-architecture-p0.md)


**AC**: AC-US5-02, AC-US5-03, AC-US5-05

**Test Plan** (BDD format):
- **Given** single project setup → **When** run init-multiproject → **Then** auto-migrate to projects/default/
- **Given** user confirms multi-project → **When** enable → **Then** config.multiProject.enabled = true
- **Given** user creates additional projects → **When** confirm → **Then** create projects/alpha/, projects/beta/

**Test Cases**:
- Unit (`tests/unit/cli/init-multiproject.test.ts`): initMultiProject, createAdditionalProjects → 90% coverage
- Integration (`tests/integration/cli/init-multiproject.test.ts`): full workflow with prompts, config updates → 85% coverage
- E2E (`tests/e2e/init-multiproject.spec.ts`): CLI interactive flow → 100% critical path
- **Overall: 90% coverage**

**Implementation**:
- Create `plugins/specweave/commands/init-multiproject.md` (command definition)
- Create `src/cli/commands/init-multiproject.ts` (implementation)
- Implement initMultiProject() function
- Use inquirer for interactive prompts
- Call autoMigrateSingleToMulti()
- Optionally create additional projects

**Estimated**: 2 hours

**Dependencies**: T-001, T-003

---

### T-007: Create `/specweave:import-docs` Command
**User Story**: [US-004: Brownfield Import (P0)](../../docs/internal/specs/default/multi-project-internal-docs/us-004-brownfield-import-p0.md)


**AC**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04

**Test Plan** (BDD format):
- **Given** Notion export folder → **When** import-docs --source=notion → **Then** analyze and import files
- **Given** import complete → **When** check destinations → **Then** files in correct folders (specs/, modules/, legacy/)
- **Given** import complete → **When** check config → **Then** importHistory has new entry

**Test Cases**:
- Unit (`tests/unit/cli/import-docs.test.ts`): command parsing, option validation → 85% coverage
- Integration (`tests/integration/cli/import-docs.test.ts`): full import workflow → 90% coverage
- E2E (`tests/e2e/import-docs.spec.ts`): CLI with real Notion export test fixture → 100% critical path
- **Overall: 90% coverage**

**Implementation**:
- Create `plugins/specweave/commands/import-docs.md` (command definition)
- Create `src/cli/commands/import-docs.ts` (implementation)
- Implement importDocs() function
- Parse command-line options (--source, --project, --preserve-structure)
- Call BrownfieldImporter.import()
- Display progress and results

**Estimated**: 2 hours

**Dependencies**: T-004, T-005

---

### T-008: Create `/specweave:switch-project` Command
**User Story**: [US-001: Multi-Project Organization (P0)](../../docs/internal/specs/default/multi-project-internal-docs/us-001-multi-project-organization-p0.md)


**AC**: AC-US1-02, AC-US5-03

**Test Plan** (BDD format):
- **Given** multi-project enabled → **When** switch-project alpha → **Then** config.activeProject = "alpha"
- **Given** multi-project disabled → **When** switch-project → **Then** error (multi-project not enabled)
- **Given** invalid project ID → **When** switch-project → **Then** error (project not found)

**Test Cases**:
- Unit (`tests/unit/cli/switch-project.test.ts`): switchProject, validation → 90% coverage
- Integration (`tests/integration/cli/switch-project.test.ts`): switch project, verify cache cleared → 85% coverage
- E2E (`tests/e2e/switch-project.spec.ts`): CLI workflow → 100% critical path
- **Overall: 90% coverage**

**Implementation**:
- Create `plugins/specweave/commands/switch-project.md` (command definition)
- Create `src/cli/commands/switch-project.ts` (implementation)
- Implement switchProject() function
- Call ProjectManager.switchProject()
- Display confirmation message

**Estimated**: 2 hours

**Dependencies**: T-001

---

## Phase 4: Integration with Increment Planner

### T-009: Update increment-planner Skill for Multi-Project
**User Story**: [US-001: Multi-Project Organization (P0)](../../docs/internal/specs/default/multi-project-internal-docs/us-001-multi-project-organization-p0.md)


**AC**: AC-US1-02, AC-US5-03, AC-US5-04

**Test Plan** (BDD format):
- **Given** active project "alpha" → **When** create increment → **Then** spec in projects/alpha/specs/
- **Given** active project "beta" → **When** create increment → **Then** spec in projects/beta/specs/
- **Given** single project mode → **When** create increment → **Then** spec in projects/default/specs/

**Test Cases**:
- Unit (`tests/unit/skills/increment-planner.test.ts`): path resolution with ProjectManager → 85% coverage
- Integration (`tests/integration/skills/increment-planner-multiproject.test.ts`): end-to-end increment creation with multi-project → 90% coverage
- **Overall: 87% coverage**

**Implementation**:
- Update `plugins/specweave/skills/increment-planner/SKILL.md`
- Add ProjectManager integration
- Use ProjectManager.getSpecsPath() for spec creation
- Update STEP 1: Create spec.md in project-specific path
- Link increment to active project in metadata

**Estimated**: 2 hours

**Dependencies**: T-001

---

### T-010: Create Project-Specific README Templates
**User Story**: [US-001: Multi-Project Organization (P0)](../../docs/internal/specs/default/multi-project-internal-docs/us-001-multi-project-organization-p0.md)


**AC**: AC-US1-03, AC-US2-04, AC-US3-03, AC-US3-04

**Test Plan** (BDD format):
- **Given** create project structure → **When** check folders → **Then** README.md exists in each
- **Given** project README → **When** read content → **Then** contains project overview, tech stack, team
- **Given** modules README → **When** read content → **Then** contains module index

**Test Cases**:
- Unit (`tests/unit/core/readme-generator.test.ts`): README template generation → 85% coverage
- Integration (`tests/integration/multi-project/readme-creation.test.ts`): verify READMEs created correctly → 85% coverage
- **Overall: 85% coverage**

**Implementation**:
- Create README templates in `src/templates/`
  - `project-README.md.template`
  - `modules-README.md.template`
  - `team-README.md.template`
  - `legacy-README.md.template`
- Implement README generation in ProjectManager.createProjectStructure()

**Estimated**: 1 hour

**Dependencies**: T-001

---

## Phase 5: Testing & Documentation

### T-011: Write Unit Tests

**AC**: All acceptance criteria

**Test Plan** (BDD format):
- **Given** all core classes → **When** run unit tests → **Then** 90%+ coverage

**Test Cases**:
- Unit tests for ProjectManager, BrownfieldAnalyzer, BrownfieldImporter, all CLI commands
- See individual task test cases above

**Implementation**:
- Write unit tests as specified in tasks T-001 through T-010
- Use Jest + ts-jest
- Mock file system operations
- Test edge cases

**Estimated**: 3 hours

**Dependencies**: T-001 through T-010

---

### T-012: Write Integration Tests

**AC**: All acceptance criteria

**Test Plan** (BDD format):
- **Given** all components → **When** run integration tests → **Then** 85%+ coverage
- **Given** real Notion export → **When** import → **Then** files classified correctly

**Test Cases**:
- Integration tests for multi-project setup, brownfield import, project switching
- See individual task test cases above

**Implementation**:
- Write integration tests as specified in tasks T-001 through T-010
- Use test fixtures (sample Notion export, Confluence export)
- Test end-to-end workflows
- Verify config updates, folder structure

**Estimated**: 2 hours

**Dependencies**: T-001 through T-010

---

### T-013: Write E2E Tests (Playwright)

**AC**: All user stories

**Test Plan** (BDD format):
- **Given** SpecWeave CLI → **When** run E2E tests → **Then** 100% critical paths covered

**Test Cases**:
- E2E tests for `/specweave:init-multiproject`, `/specweave:import-docs`, `/specweave:switch-project`
- See individual task test cases above

**Implementation**:
- Write E2E tests with Playwright
- Test CLI interactive flows
- Verify folder structure created
- Verify config updates

**Estimated**: 1 hour

**Dependencies**: T-006, T-007, T-008

---

### T-014: Write User Documentation
**User Story**: [US-001: Multi-Project Organization (P0)](../../docs/internal/specs/default/multi-project-internal-docs/us-001-multi-project-organization-p0.md)


**AC**: AC-US1-03, AC-US2-04, AC-US3-03, AC-US4-04

**Test Plan** (Validation):
- **Given** user docs → **When** manual review → **Then** clear instructions for multi-project setup
- **Given** brownfield guide → **When** manual review → **Then** step-by-step import process documented

**Test Cases**:
- Manual review (validation: docs are clear, complete, accurate)
- Link checker (validation: all internal links work)
- Build check (validation: Docusaurus builds successfully)

**Implementation**:
- Create `docs-site/docs/guides/multi-project-setup.md`
- Create `docs-site/docs/guides/brownfield-import.md`
- Create `docs-site/docs/guides/team-playbooks.md`
- Include examples, screenshots, troubleshooting
- Update Docusaurus sidebars

**Estimated**: 2 hours

**Dependencies**: T-001 through T-010

---

### T-015: Write Internal Documentation (ADR)
**User Story**: [US-006: Cross-Cutting Documentation (P1)](../../docs/internal/specs/default/multi-project-internal-docs/us-006-cross-cutting-documentation-p1.md)


**AC**: AC-US6-04, AC-US6-05

**Test Plan** (Validation):
- **Given** ADR → **When** manual review → **Then** architectural decisions clearly documented
- **Given** CLAUDE.md → **When** manual review → **Then** multi-project section complete

**Test Cases**:
- Manual review (validation: ADR follows template, clear rationale)
- Manual review (validation: CLAUDE.md updated with new structure)

**Implementation**:
- Create `.specweave/docs/internal/architecture/adr/0017-multi-project-internal-structure.md`
- Update `CLAUDE.md` (Multi-Project section, Directory Structure)
- Update `README.md` (Enterprise features)
- Document project-specific vs shared docs conventions

**Estimated**: 2 hours

**Dependencies**: T-001 through T-010

---

## Task Summary

| Phase | Tasks | Estimated Time | Coverage Target |
|-------|-------|----------------|-----------------|
| Phase 1: Core Infrastructure | T-001 to T-003 | 8 hours | 92% |
| Phase 2: Brownfield Analyzer | T-004 to T-005 | 6 hours | 91% |
| Phase 3: CLI Commands | T-006 to T-008 | 6 hours | 90% |
| Phase 4: Integration | T-009 to T-010 | 3 hours | 86% |
| Phase 5: Testing & Docs | T-011 to T-015 | 10 hours | 90% (overall) |
| **Total** | **15 tasks** | **~33 hours** | **90%** |

---

## Dependencies Graph

```
T-001 (ProjectManager)
  ├─→ T-003 (Auto-migration)
  │    └─→ T-006 (/init-multiproject)
  ├─→ T-005 (Import logic)
  │    └─→ T-007 (/import-docs)
  ├─→ T-008 (/switch-project)
  └─→ T-009 (increment-planner update)

T-002 (Config schema)
  └─→ T-003 (Auto-migration)

T-004 (File classification)
  └─→ T-005 (Import logic)
       └─→ T-007 (/import-docs)

T-001 through T-010
  ├─→ T-011 (Unit tests)
  ├─→ T-012 (Integration tests)
  ├─→ T-013 (E2E tests)
  ├─→ T-014 (User docs)
  └─→ T-015 (Internal docs)
```

---

## Notes

- **All tasks marked with AC references** link to user stories in spec.md
- **TDD mode enabled** - write tests first, then implementation
- **Coverage targets per task** - minimum 85%, target 90%+
- **Phase dependencies** - complete Phase 1 before starting Phase 2
- **Integration tests use real fixtures** - create sample Notion/Confluence exports

---

**Status**: Ready for Implementation
**Next Step**: Begin Phase 1 (T-001: Create ProjectManager Class)
