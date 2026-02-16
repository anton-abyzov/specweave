# Tasks: Multi-Repo Migration Tool

## Task Notation

- `[T###]`: Task ID
- `[P]`: Parallelizable
- `[ ]`: Not started
- `[x]`: Completed

## Phase 1: Foundation

### T-001: Create migration types
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**File**: `src/core/migration/types.ts`
**Test**: Given types.ts exists -> When imported -> Then MigrationCandidate, MigrationPlan, MigrationStep, MigrationResult, MigrationOptions types compile correctly

**Implementation Details**:
- Define `MigrationCandidate` (projectRoot, configPath, orgName, repoName, hasClaudemd, hasAgentsmd, hasDocsSite)
- Define `MigrationPlan` with ordered `MigrationStep[]` (type: 'create-dir' | 'move' | 'update-config')
- Define `MigrationResult` (success, steps completed, backup path, errors)
- Define `MigrationOptions` (umbrellaName, umbrellaPath, orgName, execute, dryRun)

---

### T-002: Implement single-repo detection
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-08 | **Status**: [x] completed
**File**: `src/core/migration/umbrella-migrator.ts`
**Test**: Given a project with `.specweave/config.json` and no `umbrella.enabled` -> When `detectSingleRepoProject()` runs -> Then returns valid MigrationCandidate with project metadata

**Implementation Details**:
- Read `.specweave/config.json`, check `umbrella.enabled` is falsy
- Extract org name from config (`repository.organization` or sync profiles)
- Extract repo name from config or directory name
- Check for `CLAUDE.md` and `AGENTS.md` existence
- Return `MigrationCandidate` or null if already umbrella

---

### T-003: Implement dry-run plan generation
**User Story**: US-001 | **Satisfies ACs**: AC-US1-02 | **Status**: [x] completed
**File**: `src/core/migration/umbrella-migrator.ts`
**Test**: Given a valid MigrationCandidate -> When `generateMigrationPlan()` runs -> Then returns ordered steps listing all directory, file, and config operations

**Implementation Details**:
- Generate steps: create sibling umbrella dir, move `.specweave/`, move `CLAUDE.md`, move `AGENTS.md`, move `docs-site/`, update config.json with childRepo reference to original project
- Each step has: type, source, destination, description
- Display function shows colored plan output

## Phase 2: Core Migration

### T-004: Implement backup creation
**User Story**: US-001, US-003 | **Satisfies ACs**: AC-US1-11, AC-US3-03 | **Status**: [x] completed
**File**: `src/core/migration/umbrella-migrator.ts`
**Test**: Given a project with `.specweave/` -> When backup runs -> Then `.specweave/backups/pre-migration-{timestamp}/` contains a complete copy and migration.log is created

**Implementation Details**:
- Follow `SingleProjectMigrator` pattern for backup + logging
- Create timestamped backup directory
- Copy entire `.specweave/` to backup
- Initialize migration.log with timestamp and operation metadata

---

### T-005: Implement migration execution
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03, AC-US1-04, AC-US1-05, AC-US1-06, AC-US1-07, AC-US1-08, AC-US1-09 | **Status**: [x] completed
**File**: `src/core/migration/umbrella-migrator.ts`
**Test**: Given a migration plan with `--execute` -> When `executeMigration()` runs -> Then sibling umbrella exists, original project untouched, `.specweave/` + `CLAUDE.md` + `docs-site/` moved to umbrella, config.json has `umbrella.enabled = true` with childRepo pointing to `../specweave`

**Implementation Details**:
- Execute each MigrationStep in order
- Create sibling umbrella directory (e.g., `../{project}-umb/`)
- Move `.specweave/` to umbrella root
- Move `CLAUDE.md` and `AGENTS.md` to umbrella root
- Move `docs-site/` to umbrella root (if exists)
- Update `config.json`: set `umbrella.enabled = true`, add `childRepos[]` entry with relative path to original project (e.g., `../specweave`)
- Suggest umbrella name (default: `{project}-umb`), let user override
- Log each step to migration.log
- Verify integrity after each step

---

### T-006: Implement uncommitted changes guard
**User Story**: US-001 | **Satisfies ACs**: AC-US1-10 | **Status**: [x] completed
**File**: `src/core/migration/umbrella-migrator.ts`
**Test**: Given a project with uncommitted changes -> When migration is attempted -> Then it fails with "Uncommitted changes detected" error

**Implementation Details**:
- Use `isWorkingDirectoryClean()` from `src/utils/git-utils.js`
- Check before backup creation (earliest possible point)
- Clear error message with suggestion to commit or stash

---

### T-007: Implement rollback
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02 | **Status**: [x] completed
**File**: `src/core/migration/umbrella-migrator.ts`
**Test**: Given a completed migration with backup -> When `--rollback` runs -> Then original structure is restored exactly

**Implementation Details**:
- Find latest backup in `.specweave/backups/pre-migration-*/`
- Validate backup contains required files (config.json at minimum)
- Restore `.specweave/` from backup to original location
- Remove umbrella-level files if they were created
- Log rollback operation

---

### T-008: Create CLI command handler
**User Story**: US-001 | **Satisfies ACs**: AC-US1-02, AC-US1-03 | **Status**: [x] completed
**File**: `src/cli/commands/migrate-to-umbrella.ts`
**Test**: Given the CLI is invoked -> When no `--execute` flag -> Then dry-run output displayed; When `--execute` -> Then migration proceeds with prompts

**Implementation Details**:
- Commander.js command definition with options: `--execute`, `--umbrella-path <path>`, `--org <name>`, `--rollback`, `--add-repo <url>`, `--yes` (skip confirmations)
- Interactive prompts for umbrella location and org name (if not provided via flags)
- Color-coded dry-run display (green=create, yellow=copy, blue=update)
- Confirmation prompt before execution

---

### T-009: Register command in bin/specweave.js
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**File**: `bin/specweave.js`
**Test**: Given `specweave --help` -> When displayed -> Then `migrate-to-umbrella` appears in command list

**Implementation Details**:
- Add command registration following existing pattern (around line 930)
- Import and wire the command handler

## Phase 3: Extensions

### T-010: Implement create-repos via gh CLI
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05 | **Status**: [x] completed
**File**: `src/core/migration/umbrella-migrator.ts`
**Test**: Given an umbrella project -> When user defines new repos -> Then repos are created on GitHub (if `gh` available) and cloned into umbrella

**Implementation Details**:
- After migration, prompt user: "Do you want to create additional repositories?"
- Collect repo details: name, description, visibility (public/private)
- Check `gh` CLI: `which gh` + `gh auth status`
- If `gh` available: `gh repo create {org}/{name} --clone` into `repositories/{org}/{name}/`
- If `gh` not available: create local directory, show `gh` setup instructions
- Register each new repo in `umbrella.childRepos[]` using `persistUmbrellaConfig()`
- Prompt for prefix per repo

---

### T-011: Update docs command for umbrella awareness
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03 | **Status**: [ ] pending
**File**: `src/cli/commands/docs.ts`
**Test**: Given an umbrella project with child repos -> When `specweave docs preview` runs -> Then serves umbrella-level docs with child repo content in sidebar

**Implementation Details**:
- In `docsPreviewCommand`, check if config has `umbrella.enabled`
- If umbrella, scan child repos for `.specweave/docs/` directories
- Pass child repo docs paths to Docusaurus setup
- In `docsStatusCommand`, show child repo doc counts

---

### T-012: Update project-detector for umbrella mode
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02 | **Status**: [ ] pending
**File**: `src/utils/docs-preview/project-detector.ts`
**Test**: Given an umbrella project -> When `detectProjectMetadata()` runs -> Then metadata includes umbrella name and categories from child repos

**Implementation Details**:
- Check `umbrella.enabled` in config
- If umbrella, include each child repo as an additional category
- Set umbrella project name as the main project name

## Phase 4: Testing

### T-013: Write unit tests
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04 | **Status**: [ ] pending
**File**: `tests/unit/core/migration/umbrella-migrator.test.ts`
**Test**: Given test suite -> When `npm test` runs -> Then all migration tests pass with 80%+ coverage

**Implementation Details**:
- Test `detectSingleRepoProject()`: valid project, already-umbrella, missing config
- Test `generateMigrationPlan()`: correct step ordering, all paths included
- Test `executeMigration()`: directory creation, file copying, config updates
- Test uncommitted changes guard
- Test `rollbackMigration()`: backup validation, restoration
- Test URL parsing for `--add-repo`
- Use `vi.hoisted()` + `vi.mock()` for filesystem mocking
