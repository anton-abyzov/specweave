# FS-0142: JIRA 1-Level Folder Structure Fix

**Status**: Completed
**Increment**: 0142-jira-folder-structure-fix

## Overview

Architectural improvement to JIRA import system, removing board-based complexity and eliminating orphan issues.

## Problem

JIRA board-based folder structure caused:
- Orphaned items when epics appeared on multiple boards
- Complex architecture with board detection logic
- Slower imports using Board API pagination
- 200+ lines of deprecated board code

## Solution

Remove board-based folders entirely. Use 1-level structure: JIRA Project → SpecWeave Project (1:1)

## Benefits

✅ Parent-child relationships work correctly
✅ No more `_orphans/` folder
✅ Simpler architecture (200+ lines removed)
✅ Faster imports using JQL search
✅ Cleaner metadata (no board references)

## User Stories

- [US-001](us-001-simplify-jira-folder-structure.md): Simplify JIRA Folder Structure

## Technical Details

### Architecture Change

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

### Files Modified

- src/cli/helpers/issue-tracker/jira.ts - Removed board selection
- src/cli/helpers/issue-tracker/sync-config-writer.ts - No boards in config
- src/importers/import-coordinator.ts - One importer per project
- src/importers/jira-importer.ts - Simplified constructor, removed Board API

## Version

- **Fixed in**: v0.35.3
- **Replaces**: v0.35.2 (per-board architecture)
- **Breaking change**: NO (backwards compatible, boards just ignored)
