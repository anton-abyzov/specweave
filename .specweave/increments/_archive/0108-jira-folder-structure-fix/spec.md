---
increment: 0142-jira-folder-structure-fix
title: "JIRA 1-Level Folder Structure Fix"
status: completed
type: feature
created: 2025-12-13
total_acceptance_criteria: 6
---

# JIRA 1-Level Folder Structure Fix

## Overview

**Problem**: JIRA board-based folder structure causes orphans and architectural complexity.

**Root Cause**: JIRA boards are VIEWS/FILTERS over project data, NOT organizational units. An Epic can appear on multiple boards simultaneously.

**Solution**: Remove board-based folders entirely. Use 1-level structure: `JIRA Project → SpecWeave Project (1:1)`

## User Stories

### US-001: Simplify JIRA Folder Structure
**Project**: specweave
**As a** SpecWeave contributor
**I want** JIRA imports to use project-based folders (not board-based)
**So that** parent-child relationships work correctly and orphans are eliminated

**Acceptance Criteria**:
- [x] **AC-US1-01**: Init flow removes board selection prompt
- [x] **AC-US1-02**: Sync config stores no board mappings
- [x] **AC-US1-03**: Import coordinator creates one importer per project (not per board)
- [x] **AC-US1-04**: JiraImporter constructor simplified (no board parameters)
- [x] **AC-US1-05**: Board API pagination logic removed
- [x] **AC-US1-06**: Generated items contain no board metadata

## Architecture

**New Folder Structure**:
```
.specweave/docs/internal/specs/
├── AAC/                    ← JIRA project "AAC"
│   ├── FS-001/
│   │   └── us-xxx.md
│   └── FS-002/
├── DMC/                    ← JIRA project "DMC"
│   └── FS-010/
└── ID/                     ← JIRA project "ID"
    └── FS-020/
```

**NO board level!** All issues from a JIRA project go into one SpecWeave project folder.

## Files Modified

- [src/cli/helpers/issue-tracker/jira.ts](src/cli/helpers/issue-tracker/jira.ts) - Removed board selection
- [src/cli/helpers/issue-tracker/sync-config-writer.ts](src/cli/helpers/issue-tracker/sync-config-writer.ts) - No boards in config
- [src/importers/import-coordinator.ts](src/importers/import-coordinator.ts) - One importer per project
- [src/importers/jira-importer.ts](src/importers/jira-importer.ts) - Simplified constructor, removed Board API

## Benefits

✅ Parent-child relationships work (all items from same project in one folder)
✅ No more `_orphans/` folder (cross-board parents found correctly)
✅ Simpler architecture (no complex board detection logic)
✅ Faster imports (JQL search more efficient than Board API)
✅ Cleaner code (removed 200+ lines of deprecated board logic)

## Version

- **Fixed in**: v0.35.3
- **Replaces**: v0.35.2 (per-board architecture)
- **Breaking change**: NO (backwards compatible, boards just ignored)
