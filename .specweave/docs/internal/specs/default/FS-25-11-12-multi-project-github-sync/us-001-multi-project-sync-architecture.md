---
id: US-001
epic: FS-25-11-12
title: Multi-Project Sync Architecture
status: complete
priority: P1
created: 2025-11-11
completed: 2025-11-11
---

# US-001: Multi-Project Sync Architecture

**Epic**: [FS-25-11-12: Multi-Project GitHub Sync](./FEATURE.md)

**User Story**: As a DevOps engineer managing multiple teams, I want to sync specs across multiple GitHub repositories automatically so that each team's specs go to their designated repository without manual routing.

---

## Acceptance Criteria

### AC-US1-01: Automatic Project Detection (P1)
- **Given** a spec file path contains a project identifier
- **When** syncing to GitHub
- **Then** the system automatically detects which project the spec belongs to
- **And** routes it to the correct GitHub repository

### AC-US1-02: Per-Project GitHub Configuration (P1)
- **Given** multiple projects exist in the configuration
- **When** syncing a spec
- **Then** the system looks up the correct GitHub owner/repo for that project
- **And** uses the project's sync profile

### AC-US1-03: Multiple Sync Strategies (P1)
- **Given** different organizational structures exist
- **When** configuring multi-project sync
- **Then** the system supports 4 strategies:
  - **project-per-spec**: One GitHub Project per spec (default)
  - **team-board**: One GitHub Project per team (aggregate specs)
  - **centralized**: Parent repo tracks all projects
  - **distributed**: Each team syncs to their own repo

### AC-US1-04: Cross-Team Spec Support (P1)
- **Given** a spec affects multiple teams (e.g., authentication, shared services)
- **When** syncing to GitHub
- **Then** the spec is synced to all relevant team repositories
- **And** maintains consistency across all copies

### AC-US1-05: Backward Compatibility (P1)
- **Given** an existing single-project setup
- **When** upgrading to multi-project support
- **Then** the system continues to work without configuration changes
- **And** treats the setup as a single "default" project

---

## Implementation

**Increment**: [0027-multi-project-github-sync](../../../../increments/0027-multi-project-github-sync/)

**Tasks**:
- [T-001: Implement Project Detection from Spec Path](../../../../increments/0027-multi-project-github-sync/tasks.md#t-001-implement-project-detection-from-spec-path)
- [T-002: Implement GitHub Config Lookup per Project](../../../../increments/0027-multi-project-github-sync/tasks.md#t-002-implement-github-config-lookup-per-project)
- [T-003: Implement Sync Strategy Selection](../../../../increments/0027-multi-project-github-sync/tasks.md#t-003-implement-sync-strategy-selection)
- [T-004: Implement Cross-Team Spec Detection](../../../../increments/0027-multi-project-github-sync/tasks.md#t-004-implement-cross-team-spec-detection)
- [T-005: Implement Cross-Team Sync to Multiple Repos](../../../../increments/0027-multi-project-github-sync/tasks.md#t-005-implement-cross-team-sync-to-multiple-repos)
- [T-006: Implement User Story Filtering by Project](../../../../increments/0027-multi-project-github-sync/tasks.md#t-006-implement-user-story-filtering-by-project)
- [T-007: Update Type System for Multi-Project Support](../../../../increments/0027-multi-project-github-sync/tasks.md#t-007-update-type-system-for-multi-project-support)
- [T-008: Create Comprehensive E2E Test Suite](../../../../increments/0027-multi-project-github-sync/tasks.md#t-008-create-comprehensive-e2e-test-suite)
- [T-009: Verify Backward Compatibility](../../../../increments/0027-multi-project-github-sync/tasks.md#t-009-verify-backward-compatibility)
- [T-010: Update Documentation](../../../../increments/0027-multi-project-github-sync/tasks.md#t-010-update-documentation)

**Status**: ✅ All tasks complete (10/10)

**Completion Date**: 2025-11-11

---

## Business Rationale

**Why This Matters**:
- **Enterprise Scale**: Organizations with multiple teams can now manage specs across separate repositories
- **Zero Configuration**: Automatic routing eliminates manual repository selection
- **Team Autonomy**: Each team controls their own GitHub repository while maintaining consistency
- **Cross-Team Collaboration**: Shared services (auth, logging, monitoring) sync to all affected teams
- **Migration Path**: Existing single-project setups continue to work without changes

**Key Benefits**:
1. **Reduced Manual Work**: No more manually selecting which repo to sync to
2. **Consistency**: Same spec format works across all projects
3. **Scalability**: Supports unlimited projects and repositories
4. **Flexibility**: 4 sync strategies accommodate different organizational structures
5. **Reliability**: Comprehensive E2E tests ensure quality

---

## Technical Details

**Implementation Highlights**:
- Project detection from file paths (`.specweave/docs/internal/specs/{project-id}/`)
- Per-project GitHub config resolution
- Strategy-based routing (project-per-spec, team-board, centralized, distributed)
- Cross-team spec detection (keywords: integration, auth, shared)
- 100% backward compatible with single-project setups

**Test Coverage**:
- 7 comprehensive E2E scenarios
- Single-project backward compatibility verified
- Multi-project sync verified (frontend, backend, ml projects)
- Team-board and centralized strategies tested

---

## Related Stories

- **Depends On**: None (foundational feature)
- **Blocks**: Future multi-repo coordination features
- **Related**: External tool sync, GitHub issue tracking
