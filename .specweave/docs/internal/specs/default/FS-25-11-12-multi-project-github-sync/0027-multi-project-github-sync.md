---
id: 0027-multi-project-github-sync
epic: FS-25-11-12
type: feature
status: complete
external:
  github:
    issue: 412
    url: https://github.com/anton-abyzov/specweave/issues/412
  jira:
    story: null
    url: null
  ado:
    user_story: null
    url: null
---

# Multi-Project GitHub Sync

## Overview

Multi-project GitHub sync enhancements to support syncing specs across multiple GitHub repositories and organizational structures.

## Status

✅ COMPLETE - All functionality implemented and tested

This increment enables enterprise-scale organizations to manage specs across multiple teams, repositories, and organizational structures.

## Key Features Delivered

- ✅ Automatic project detection from spec file paths
- ✅ Intelligent routing to correct GitHub repos
- ✅ 4 sync strategies (project-per-spec, team-board, centralized, distributed)
- ✅ Cross-team spec support (one spec → multiple repos)
- ✅ 100% backward compatible with single-project setups
- ✅ Comprehensive E2E test coverage (7 scenarios)

## Business Value

- **Enterprise Scale**: Support organizations with multiple teams, repos, and organizational structures
- **Zero Configuration**: Automatic project detection from spec file paths
- **Cross-Team Collaboration**: One spec can sync to multiple repos when it affects multiple teams
- **100% Backward Compatible**: Existing single-project setups continue to work without changes

## Implementation Details

**Tasks**: 10 tasks (all complete)
**Test Coverage**: 600+ line E2E test suite covering 7 scenarios
**Completion Date**: 2025-11-11

**View Full Details**: [Increment 0027](../../../../increments/0027-multi-project-github-sync/)
