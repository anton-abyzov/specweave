---
increment: 0060-migrate-inquirer-to-modular-api
type: bug
status: completed
priority: critical
---

# Migrate Inquirer to Modular API

## Problem Statement

The v0.26.14 "fix" for inquirer prompts broke all interactive selection prompts. The fix incorrectly changed `type: 'list'` to `type: 'select'` in the **legacy** `inquirer.prompt()` API, where `'select'` is not a valid type.

**Root Cause**: In inquirer v13:
- Legacy API (`inquirer.prompt()`) uses `type: 'list'`
- Modular API (`@inquirer/prompts`) uses `select()` function

The "fix" mixed these two patterns, causing prompts to fall back to text input.

## Solution

Migrate all 46 occurrences across 18 files from legacy `inquirer.prompt()` to the modern `@inquirer/prompts` modular API.

## User Stories

### US-001: Fix Interactive Prompts
**As a** SpecWeave user
**I want** interactive selection prompts to work correctly
**So that** I can initialize projects and configure settings properly

#### Acceptance Criteria
- [x] **AC-US1-01**: All selection prompts display as arrow-key selectable lists
- [x] **AC-US1-02**: All text input prompts work correctly
- [x] **AC-US1-03**: All confirm (yes/no) prompts work correctly
- [x] **AC-US1-04**: No regression in any interactive flow

### US-002: Clean Migration
**As a** developer
**I want** consistent use of the modular inquirer API
**So that** the codebase is maintainable and type-safe

#### Acceptance Criteria
- [x] **AC-US2-01**: All files use `@inquirer/prompts` imports
- [x] **AC-US2-02**: Legacy `inquirer` import removed from all files
- [x] **AC-US2-03**: TypeScript types work correctly with new API
- [x] **AC-US2-04**: All 18 affected files migrated (actually 20+ including plugins)

## Affected Files (18 files, 46 occurrences)

| File | Count |
|------|-------|
| src/core/repo-structure/repo-structure-manager.ts | 10 |
| src/cli/commands/init.ts | 8 |
| src/utils/external-resource-validator.ts | 4 |
| src/cli/helpers/github-repo-selector.ts | 3 |
| src/cli/helpers/issue-tracker/github.ts | 3 |
| src/cli/helpers/ado-area-path-mapper.ts | 3 |
| src/cli/commands/import-docs.ts | 2 |
| src/cli/commands/install.ts | 2 |
| src/core/repo-structure/repo-bulk-discovery.ts | 2 |
| src/cli/helpers/issue-tracker/github-multi-repo.ts | 1 |
| src/cli/helpers/issue-tracker/jira.ts | 1 |
| src/cli/helpers/issue-tracker/index.ts | 1 |
| src/cli/helpers/smart-filter.ts | 1 |
| src/cli/helpers/github/profile-manager.ts | 1 |
| src/cli/helpers/import-strategy-prompter.ts | 1 |
| src/core/sync/bidirectional-engine.ts | 1 |
| src/init/InitFlow.ts | 1 |
| src/integrations/ado/area-path-mapper.ts | 1 |

## Out of Scope
- Plugin documentation (informational only)
- Test file changes (mocked)
