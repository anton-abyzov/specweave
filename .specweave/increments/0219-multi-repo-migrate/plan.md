# Implementation Plan: Multi-Repo Migration Tool

## Overview

Add a `specweave migrate-to-umbrella` CLI command that converts single-repo projects to umbrella/multi-repo structure, plus make `specweave docs` umbrella-aware. Two-phase approach: dry-run by default, execute with `--execute` flag.

## Architecture

### Components

- **UmbrellaMigrator** (`src/core/migration/umbrella-migrator.ts`): Core migration logic — detect, plan, execute, rollback
- **Migration Types** (`src/core/migration/types.ts`): MigrationCandidate, MigrationPlan, MigrationResult
- **CLI Command** (`src/cli/commands/migrate-to-umbrella.ts`): Interactive command handler with prompts and dry-run display

### Key Design Decisions

**CLI command, not skill**: One-time filesystem operation requiring direct console interaction. Not an AI-assisted workflow.

**Two-phase execution**: Default = dry-run (show plan). `--execute` = perform migration with backup. Mirrors `SingleProjectMigrator` pattern.

**Sibling umbrella — original project stays untouched**:
1. Creates sibling directory (default: `../{project-name}-umb/` or user-specified)
2. Moves `.specweave/`, `CLAUDE.md`, `AGENTS.md`, `docs-site/` to umbrella
3. Original project folder is referenced by relative path in config (e.g., `../specweave`)
4. Updates `config.json` with umbrella settings and first childRepo entry

**gh CLI integration for new repos**:
- After migration, prompt user to create additional repos
- If `gh` CLI available: `gh repo create {org}/{name}` then clone into `repositories/{org}/{name}/`
- If not available: fall back to local directory creation with setup instructions

**Uncommitted changes guard**: Refuse if `git status --porcelain` returns non-empty. Uses `isWorkingDirectoryClean()` from `src/utils/git-utils.js`.

## Files to Create

| File | Purpose |
|------|---------|
| `src/core/migration/types.ts` | Migration type definitions |
| `src/core/migration/umbrella-migrator.ts` | Core migration logic |
| `src/cli/commands/migrate-to-umbrella.ts` | CLI command handler |
| `tests/unit/core/migration/umbrella-migrator.test.ts` | Unit tests |

## Files to Modify

| File | Change |
|------|--------|
| `bin/specweave.js` | Register `migrate-to-umbrella` command |
| `src/cli/commands/docs.ts` | Umbrella root detection in preview/status |
| `src/utils/docs-preview/project-detector.ts` | Umbrella metadata + child repo categories |
| `src/utils/docs-preview/docusaurus-setup.ts` | Include child repo docs in content |

## Reuse Existing Code

- `src/core/config/single-project-migrator.ts` — Backup/log/migrate pattern
- `src/core/living-docs/umbrella-detector.ts` — `persistUmbrellaConfig()`, `detectUmbrellaRepos()`
- `src/core/config/types.ts` — UmbrellaConfig, ChildRepoConfig interfaces
- `src/utils/git-utils.js` — `isWorkingDirectoryClean()`

## Implementation Phases

### Phase 1: Foundation (T-001 to T-003)
- Types, detection logic, dry-run plan generation

### Phase 2: Core Migration (T-004 to T-009)
- Backup, execution, guards, rollback, CLI command, command registration

### Phase 3: Extensions (T-010 to T-012)
- Add-repo functionality, docs umbrella awareness

### Phase 4: Testing (T-013)
- Unit tests with 80%+ coverage

## Technical Challenges

### Challenge 1: Sibling folder creation requires parent directory write access
**Solution**: Verify write access to parent directory before proceeding. Clear error if running from a location where sibling creation is blocked (e.g., root filesystem).

### Challenge 2: Config path rewriting for relative references
**Solution**: Original project is referenced as `../specweave` (relative from umbrella). All paths in config.json are updated to account for the new `.specweave/` location.

### Challenge 3: gh CLI availability varies
**Solution**: Detect `gh` with `which gh`, check auth with `gh auth status`. Graceful fallback to local-only mode with clear instructions.

## Testing Strategy

- Unit tests for each migration function (detect, plan, execute, rollback)
- Edge case tests: already-umbrella, missing config, uncommitted changes
- Vitest + vi.mock() for filesystem operations
- Target: 80%+ coverage on migration module
