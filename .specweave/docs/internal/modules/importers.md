# importers

**Path**: `src/importers`

## Purpose

Provides functionality for importing external work items from Azure DevOps, JIRA, and GitHub into SpecWeave increments, with duplicate detection to prevent creating redundant entries.

## Overview

The importers module contains 9 files with approximately 941 lines of code.

## Dependencies

This module imports from:
- `..`

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
- **Total Exports**: 9

## Main Exports

- `ADOImporter` (class)
- `ExternalIdReference` (interface)
- `DuplicateDetectorOptions` (interface)
- `DuplicateDetector` (class)
- `checkExistingExternalId` (function)
- `ExternalItem` (interface)
- `ImportConfig` (interface)
- `Importer` (interface)
- `ImportResult` (interface)

## Documentation Status

**Has README**: No
**Has Tests**: No

---
*Analysis generated on 2025-12-10*