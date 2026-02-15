---
increment: 0212-fix-stale-specweave-folder-creation
title: "Fix stale .specweave/ folder creation in wrong locations"
type: bug
priority: P1
status: completed
created: 2026-02-15
structure: user-stories
test_mode: test-after
coverage_target: 80
---

# Feature: Fix stale .specweave/ folder creation in wrong locations

## Overview

Prevent .specweave/ folders from being created in parent/sibling dirs. Root cause: user-prompt-submit.sh scope guard runs before project root detection. Also fixes findProjectRoot() to require config.json, guards mkdir calls, adds orphan cleanup to update.

<!--
====================================================================
  TEMPLATE FILE - MUST BE COMPLETED VIA PM/ARCHITECT SKILLS
====================================================================

This is a TEMPLATE created by increment-planner.
DO NOT manually fill in the placeholders below.

To complete this specification, run:
  Tell Claude: "Complete the spec for increment 0212-fix-stale-specweave-folder-creation"

This will activate the PM skill which will:
- Define proper user stories with acceptance criteria
- Conduct market research and competitive analysis
- Create user personas
- Define success metrics

====================================================================
-->

## Root Cause Analysis

### Primary: Hook ordering bug in `user-prompt-submit.sh`

The SCOPE GUARD section (line 214) used `${SW_PROJECT_ROOT:-.}` before `SW_PROJECT_ROOT` was set (line 296). The `:-.` fallback resolved to `.` (CWD), causing `mkdir -p` to create `.specweave/state/` at whatever directory the user was in.

### Secondary: `findProjectRoot()` utility too permissive

The utility in `src/utils/find-project-root.ts` only checked for `.specweave/` directory, not `config.json`. Stale folders were treated as valid project roots.

### Tertiary: `$HOME/.specweave/` paths in hooks

Lines 1008-1013 and 1569-1570 created logging/cache at `$HOME/.specweave/` instead of project root.

## User Stories

### US-001: Prevent stale .specweave/ folder creation (P1)
**Project**: specweave

**As a** developer using SpecWeave across multiple projects
**I want** `.specweave/` folders to only exist where `specweave init` was run
**So that** my filesystem isn't polluted with orphan folders

**Acceptance Criteria**:
- [x] **AC-US1-01**: Hook project root detection runs BEFORE any code that creates directories
- [x] **AC-US1-02**: Project root detection checks for `config.json` (not just `.specweave/` dir)
- [x] **AC-US1-03**: All `mkdir` calls in hooks are guarded by valid `SW_PROJECT_ROOT`
- [x] **AC-US1-04**: No `${SW_PROJECT_ROOT:-.}` fallbacks remain
- [x] **AC-US1-05**: `$HOME/.specweave/` paths replaced with project-root-relative paths

---

### US-002: Clean up existing stale folders (P2)
**Project**: specweave

**As a** developer who already has stale `.specweave/` folders
**I want** `specweave update` to detect and remove them
**So that** I don't have to manually clean up

**Acceptance Criteria**:
- [x] **AC-US2-01**: `specweave update` scans parent directories for stale `.specweave/` (no config.json)
- [x] **AC-US2-02**: `specweave update` scans `$HOME/.specweave/` if only runtime dirs
- [x] **AC-US2-03**: `--check` flag shows what would be removed without deleting
- [x] **AC-US2-04**: Valid `.specweave/` folders (with config.json) are never deleted

---

### US-003: Consistent project root detection (P2)
**Project**: specweave

**As a** SpecWeave developer
**I want** all project root detection to require `config.json`
**So that** stale folders are never mistaken for valid projects

**Acceptance Criteria**:
- [x] **AC-US3-01**: `src/utils/find-project-root.ts` checks for `config.json`
- [x] **AC-US3-02**: `update.ts` `isSpecWeaveProject` check uses `config.json`
- [x] **AC-US3-03**: Tests cover stale folder scenarios including stale parent + valid child

## Out of Scope

- Deduplicating `findProjectRoot()` between `utils/` and `hooks/platform.ts` (tech debt, separate increment)
- Fixing `process.cwd()` usage in 11+ non-hook files (low risk, they only read paths)
- Adding unit tests for `findStaleSpecweaveFolders()` in update.ts
