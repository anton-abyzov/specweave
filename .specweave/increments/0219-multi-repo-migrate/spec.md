---
increment: 0219-multi-repo-migrate
title: "Multi-Repo Migration Tool"
type: feature
priority: P1
status: in-progress
created: 2026-02-15
structure: user-stories
test_mode: test-after
coverage_target: 80
---

# Feature: Multi-Repo Migration Tool

## Overview

SpecWeave supports multi-repo from day zero via `specweave init`, but there's no migration path for projects that started as single-repo and grew into multiple repos. This increment adds a `specweave migrate-to-umbrella` CLI command that creates a sibling umbrella workspace, moves SpecWeave-managed files (`.specweave/`, `CLAUDE.md`, `docs-site/`) to it, and optionally creates new repos via `gh` CLI. The original project folder stays completely untouched.

## Architecture

```
parent/
├── specweave/              <- UNTOUCHED (git repo, source code intact)
│   └── (no .specweave/, no CLAUDE.md, no docs-site/)
└── specweave-umb/          <- NEW sibling umbrella workspace
    ├── .specweave/          <- moved from specweave/
    ├── CLAUDE.md            <- moved from specweave/
    ├── AGENTS.md            <- moved from specweave/ (if exists)
    ├── docs-site/           <- moved from specweave/
    └── repositories/
        └── {org}/
            └── new-repo/    <- created via gh CLI
```

The umbrella `config.json` references the original project by relative path:
```json
{
  "umbrella": {
    "enabled": true,
    "childRepos": [
      { "id": "specweave", "path": "../specweave", "prefix": "SW" }
    ]
  }
}
```

## User Stories

### US-001: Single-to-Umbrella Migration Command (P0)
**Project**: specweave
**Board**: modules

**As a** developer with an existing single-repo SpecWeave project
**I want to** run a CLI command that creates a sibling umbrella workspace and moves SpecWeave-managed files to it
**So that** I can organize multiple repositories without disrupting my existing project

**Acceptance Criteria**:
- [x] **AC-US1-01**: `specweave migrate-to-umbrella` detects the current project as a single-repo SpecWeave project (has `.specweave/config.json`, no `umbrella.enabled`)
- [x] **AC-US1-02**: Running without `--execute` shows a dry-run plan listing all operations (create directories, move files, update config) without modifying anything
- [x] **AC-US1-03**: Running with `--execute` creates the umbrella as a sibling folder next to the current project
- [x] **AC-US1-04**: The current project folder stays completely untouched — no rename, no git remote changes, folder name preserved
- [x] **AC-US1-05**: `.specweave/` directory is moved to the umbrella root with all contents preserved
- [x] **AC-US1-06**: `CLAUDE.md` and `AGENTS.md` are moved to the umbrella root (if they exist)
- [x] **AC-US1-07**: `docs-site/` is moved to the umbrella root (if it exists)
- [x] **AC-US1-08**: `config.json` at umbrella level has `umbrella.enabled = true` and the original project registered as first `childRepos[]` entry with relative path (e.g., `../specweave`)
- [x] **AC-US1-09**: The command suggests an umbrella folder name (e.g., `{project}-umb`) and lets user override
- [x] **AC-US1-10**: Migration refuses to proceed if the working directory has uncommitted changes
- [x] **AC-US1-11**: A backup of the original `.specweave/` is created before any changes

---

### US-002: Create Additional Repos via gh CLI (P1)
**Project**: specweave
**Board**: modules

**As a** developer setting up a multi-repo workspace
**I want** the migration tool to help me create additional repositories
**So that** I can start a microservices architecture from the umbrella

**Acceptance Criteria**:
- [x] **AC-US2-01**: After migration, the command prompts the user to define additional repositories (name, description, visibility)
- [x] **AC-US2-02**: If `gh` CLI is available and authenticated, repos are created on GitHub via `gh repo create`
- [x] **AC-US2-03**: If `gh` CLI is not available or not authenticated, provides clear setup instructions and falls back to creating local directories only
- [x] **AC-US2-04**: New repos are cloned/created into the umbrella's `repositories/{org}/{repo-name}/`
- [x] **AC-US2-05**: Each new repo is registered in `umbrella.childRepos[]` with prompted prefix and auto-detected metadata

---

### US-003: Migration Rollback (P1)
**Project**: specweave
**Board**: modules

**As a** developer who ran the migration
**I want to** roll back to the original single-repo structure if something goes wrong
**So that** I don't lose my project state

**Acceptance Criteria**:
- [x] **AC-US3-01**: `specweave migrate-to-umbrella --rollback` restores the original single-repo structure from the backup
- [x] **AC-US3-02**: Rollback verifies the backup exists and is valid before proceeding
- [x] **AC-US3-03**: A migration log is maintained at `.specweave/logs/migration.log` recording all operations with timestamps

---

### US-004: Umbrella-Aware Docs (P0)
**Project**: specweave
**Board**: modules

**As a** developer with an umbrella project
**I want** `specweave docs` to serve documentation from both the umbrella root and child repos
**So that** I get a unified documentation experience across all repositories

**Acceptance Criteria**:
- [ ] **AC-US4-01**: `specweave docs preview` works correctly from an umbrella root, serving `.specweave/docs/internal/` at the umbrella level
- [ ] **AC-US4-02**: Documentation sidebar aggregates child repo docs when child repos have their own `.specweave/docs/`
- [ ] **AC-US4-03**: `specweave docs status` shows umbrella docs summary including child repo doc counts
- [ ] **AC-US4-04**: SpecWeave's own `docs-site/` remains untouched (product website concern, not framework concern)

---

### US-005: Test Coverage (P1)
**Project**: specweave
**Board**: modules

**As a** developer
**I want** unit tests for the migration logic
**So that** the migration is reliable and edge cases are handled

**Acceptance Criteria**:
- [x] **AC-US5-01**: Unit tests cover: single-repo detection, dry-run plan generation, config.json path updates, backup creation, rollback
- [x] **AC-US5-02**: Unit tests cover edge cases: uncommitted changes, missing config.json, already-umbrella project, invalid org/repo extraction
- [x] **AC-US5-03**: Tests use the existing Vitest + vi.mock() pattern
- [x] **AC-US5-04**: Coverage for the new migration module reaches 80%+

## Out of Scope

- Monorepo (single-repo with multiple packages) support — this is umbrella/multi-repo only
- Automated CI/CD pipeline updates after migration
- Migration of external tool configurations (JIRA, ADO) — handled by existing sync commands
- Renaming or moving the original project folder

## Dependencies

- 0220-docs-site-cleanup (prerequisite — decouple docs scripts from package.json)
- ADR-0195: `repositories/{org}/{repo}` folder structure convention
- Existing `UmbrellaConfig` / `ChildRepoConfig` types in `src/core/config/types.ts`
- `persistUmbrellaConfig()` from `src/core/living-docs/umbrella-detector.ts`
- `SingleProjectMigrator` pattern from `src/core/config/single-project-migrator.ts`
- `gh` CLI (optional, for GitHub repo creation)
