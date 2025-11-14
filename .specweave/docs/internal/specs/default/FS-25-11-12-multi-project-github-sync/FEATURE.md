---
id: FS-25-11-12-multi-project-github-sync
title: Multi-Project GitHub Sync
type: epic
status: complete
created: 2025-11-14
last_updated: 2025-11-14
external_tools:
  github:
    type: issue
    id: 412
    url: https://github.com/anton-abyzov/specweave/issues/412
---

# FS-25-11-12-multi-project-github-sync: Multi-Project GitHub Sync

Multi-project GitHub sync enhancements to support syncing specs across multiple GitHub repositories and organizational structures.

**Business Value**:
- **Enterprise Scale**: Support organizations with multiple teams, repos, and organizational structures
- **Zero Configuration**: Automatic project detection from spec file paths
- **Cross-Team Collaboration**: One spec can sync to multiple repos when it affects multiple teams
- **100% Backward Compatible**: Existing single-project setups continue to work without changes

---

## Implementation History

| Increment | Tasks | Status | Completion Date |
|-----------|-------|--------|----------------|
| [0027-multi-project-github-sync](../../../../increments/0027-multi-project-github-sync/tasks.md) | 10 tasks (all complete) | ✅ Complete | 2025-11-11 |

**Overall Progress**: 10/10 tasks complete (100%)

---

## Implementation Tasks

### Core Features

- [x] **T-001**: Implement Project Detection from Spec Path
- [x] **T-002**: Implement GitHub Config Lookup per Project
- [x] **T-003**: Implement Sync Strategy Selection (4 strategies)
- [x] **T-004**: Implement Cross-Team Spec Detection
- [x] **T-005**: Implement Cross-Team Sync to Multiple Repos
- [x] **T-006**: Implement User Story Filtering by Project
- [x] **T-007**: Update Type System for Multi-Project Support
- [x] **T-008**: Create Comprehensive E2E Test Suite (7 scenarios)
- [x] **T-009**: Verify Backward Compatibility
- [x] **T-010**: Update Documentation

**Tasks Progress**: 10/10 (100%)

**View Details**: [tasks.md](../../../../increments/0027-multi-project-github-sync/tasks.md)

---

## Key Features Delivered

### 1. Automatic Project Detection
Extracts project ID from spec file path (`.specweave/docs/internal/specs/{project-id}/`) with zero configuration required.

### 2. Intelligent Routing
Each project routes to its correct GitHub repository based on profile configuration.

### 3. Four Sync Strategies
- **Project-per-spec**: One GitHub Project per spec (default)
- **Team-board**: One GitHub Project per team (aggregate multiple specs)
- **Centralized**: Parent repo tracks all projects
- **Distributed**: Each team syncs to their own repo

### 4. Cross-Team Support
Specs affecting multiple teams (e.g., authentication) automatically sync to multiple repos with filtered user stories.

### 5. Comprehensive Testing
600+ line E2E test suite covering 7 scenarios including backward compatibility.

---

## External Tool Integration

**GitHub Issue**: [#361 - [FS-25-11-12]](https://github.com/anton-abyzov/specweave/issues/361)
