# sync

**Path**: `src/sync`

## Purpose

Orchestrates bidirectional synchronization between SpecWeave increments and external tools (GitHub, JIRA, ADO), managing issue creation, closure, and metadata tracking.

## Overview

The sync module contains 15 files with approximately 1,766 lines of code.

## Dependencies

This module imports from:
- `..`
- `.`

## Dependents

No dependencies detected.

## Integration Points

No external integration points detected.

## Patterns Used

No specific patterns detected.

## Analysis Summary

- **Files Analyzed**: 3
- **Source Files**: 3
- **Test Files**: 0
- **Total Exports**: 11

## Main Exports

- `SyncCoordinatorOptions` (interface)
- `SyncResult` (interface)
- `SyncCoordinator` (class)
- `PlatformSyncMetadata` (interface)
- `SyncMetadata` (interface)
- `SYNC_METADATA_FILE` (const)
- `loadSyncMetadata` (function)
- `updateSyncMetadata` (function)
- `getLastImportTimestamp` (function)
- `hasPlatformBeenImported` (function)
- ...and 1 more exports

## Documentation Status

**Has README**: No
**Has Tests**: No

---
*Analysis generated on 2025-12-10*