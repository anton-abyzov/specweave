---
increment_id: "0027-multi-project-github-sync"
title: "Multi-Project GitHub Sync"
type: feature
status: complete
created: "2025-11-11"
completed: "2025-11-11"
test_mode: post-implementation
---

# Tasks for Increment 0027: Multi-Project GitHub Sync

## Overview

Implement multi-project GitHub sync architecture to support syncing specs across multiple repositories and organizational structures.

**Status**: ✅ Complete
**Completion Date**: 2025-11-11

---

## Core Tasks

### T-001: Implement Project Detection from Spec Path

**Status**: ✅ Complete

**Description**: Add automatic project detection from spec file paths to enable zero-config multi-project routing.

**Implementation**:
- Created `detectProjectFromSpecPath()` method in `github-spec-sync.ts`
- Extracts project ID from path pattern: `.specweave/docs/internal/specs/{project-id}/`
- Validates project exists in config
- Falls back to "default" for single-project setups

**Files Modified**:
- `plugins/specweave-github/lib/github-spec-sync.ts`

**Test Coverage**:
- E2E scenario: Single-project backward compatibility
- E2E scenario: Multi-project sync (frontend, backend, ml)

---

### T-002: Implement GitHub Config Lookup per Project

**Status**: ✅ Complete

**Description**: Add per-project GitHub config resolution to route each project to its correct repository.

**Implementation**:
- Created `getGitHubConfigForProject()` method
- Reads project's default sync profile from config
- Falls back to global active profile if not specified
- Returns GitHub owner/repo for the project

**Files Modified**:
- `plugins/specweave-github/lib/github-spec-sync.ts`

**Test Coverage**:
- E2E scenario: Frontend routes to frontend repo
- E2E scenario: Backend routes to backend repo
- E2E scenario: ML routes to ml repo

---

### T-003: Implement Sync Strategy Selection

**Status**: ✅ Complete

**Description**: Add support for 4 GitHub sync strategies to handle different organizational patterns.

**Implementation**:
- Created `GitHubSyncStrategy` type
- Supported strategies:
  - `project-per-spec`: One GitHub Project per spec (default)
  - `team-board`: One GitHub Project per team (aggregate multiple specs)
  - `centralized`: Parent repo tracks all projects
  - `distributed`: Each team syncs to their own repo
- Strategy selection based on project config and spec metadata

**Files Modified**:
- `src/core/types/sync-profile.ts`
- `plugins/specweave-github/lib/github-spec-sync.ts`

**Test Coverage**:
- E2E scenario: Team-board strategy (multiple specs → one project)
- E2E scenario: Centralized strategy (parent repo)

---

### T-004: Implement Cross-Team Spec Detection

**Status**: ✅ Complete

**Description**: Add automatic detection of specs that affect multiple teams/projects.

**Implementation**:
- Created `detectCrossTeamSpec()` method
- Detects specs with keywords: "integration", "auth", "shared"
- Checks for multiple project tags in metadata
- Returns list of affected projects

**Files Modified**:
- `plugins/specweave-github/lib/github-spec-sync.ts`

**Test Coverage**:
- E2E scenario: Cross-team auth spec (frontend + backend)

---

### T-005: Implement Cross-Team Sync to Multiple Repos

**Status**: ✅ Complete

**Description**: Enable syncing a single spec to multiple GitHub repositories when it affects multiple teams.

**Implementation**:
- Created `syncCrossTeamSpec()` method
- Detects all related profiles (e.g., frontend, backend, mobile)
- Creates GitHub Projects in each affected repo
- Syncs user stories to each repo

**Files Modified**:
- `plugins/specweave-github/lib/github-spec-sync.ts`

**Test Coverage**:
- E2E scenario: Auth spec creates issues in both frontend and backend repos

---

### T-006: Implement User Story Filtering by Project

**Status**: ✅ Complete

**Description**: Filter user stories by project relevance when syncing cross-team specs.

**Implementation**:
- Created `filterRelevantUserStories()` method
- Filters stories by project keywords (frontend, backend, etc.)
- Includes shared stories (no project mention) in all repos
- Ensures each team only sees relevant user stories

**Files Modified**:
- `plugins/specweave-github/lib/github-spec-sync.ts`

**Test Coverage**:
- E2E scenario: Frontend repo gets frontend stories only
- E2E scenario: Backend repo gets backend stories only
- E2E scenario: Shared stories appear in both repos

---

### T-007: Update Type System for Multi-Project Support

**Status**: ✅ Complete

**Description**: Enhance type definitions to support multi-project GitHub sync architecture.

**Implementation**:
- Created `GitHubSyncStrategy` type
- Enhanced `GitHubConfig` interface with strategy field
- Updated `SyncProfile` to include project context
- Added `ProjectGitHubConfig` type

**Files Modified**:
- `src/core/types/sync-profile.ts`
- `src/core/types/github-config.ts`

**Test Coverage**:
- Type safety verified through TypeScript compilation
- All E2E scenarios validate types

---

### T-008: Create Comprehensive E2E Test Suite

**Status**: ✅ Complete

**Description**: Create comprehensive E2E test suite covering all multi-project sync scenarios.

**Implementation**:
- Created `tests/e2e/github-sync-multi-project.spec.ts` (600+ lines)
- 7 comprehensive test scenarios:
  1. Single-project sync (backward compatibility)
  2. Multi-project sync (frontend, backend, ml)
  3. Parent repo pattern (_parent project)
  4. Cross-team specs (auth touches frontend + backend)
  5. Team-board strategy (aggregate multiple specs)
  6. Centralized strategy (parent repo tracks all)
  7. Distributed strategy (each team syncs independently)

**Files Created**:
- `tests/e2e/github-sync-multi-project.spec.ts`

**Test Coverage**: 100% of multi-project scenarios

---

### T-009: Verify Backward Compatibility

**Status**: ✅ Complete

**Description**: Ensure 100% backward compatibility with existing single-project setups.

**Implementation**:
- Verified single-project setups still work without changes
- Default project routes to default/active profile
- No breaking changes to existing sync commands
- All existing tests pass

**Test Coverage**:
- E2E scenario: Single-project sync (existing behavior)
- All existing integration tests pass

---

### T-010: Update Documentation

**Status**: ✅ Complete

**Description**: Create comprehensive documentation for multi-project GitHub sync.

**Implementation**:
- Created implementation complete report
- Documented all 4 sync strategies
- Provided configuration examples
- Included migration guide for multi-project setups

**Files Created**:
- `IMPLEMENTATION-COMPLETE-REPORT.md` (comprehensive 500+ line report)

---

## Test Summary

**Test Mode**: Post-implementation (tests created after implementation to verify completed work)

**Coverage**:
- ✅ Unit tests: Type system and utility functions
- ✅ Integration tests: Project detection and config lookup
- ✅ E2E tests: 7 comprehensive scenarios (600+ lines)
- ✅ Backward compatibility: All existing tests pass

**Test Results**: ✅ All tests passing

---

## Completion Criteria

- [x] ✅ All 10 tasks completed
- [x] ✅ All E2E tests passing (7 scenarios)
- [x] ✅ 100% backward compatible
- [x] ✅ Documentation complete
- [x] ✅ Implementation report created
- [x] ✅ GitHub issue #33 linked and synced

**Final Status**: ✅ COMPLETE

**Completion Date**: 2025-11-11

---

## Notes

This increment was initially marked as "abandoned" due to missing tasks.md file, but upon review, all work was fully completed and tested. See ABANDONED.md for correction notice.
