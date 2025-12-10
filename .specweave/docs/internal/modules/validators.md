# validators

**Path**: `src/validators`

## Purpose

Provides validation utilities for SpecWeave increments: AC (Acceptance Criteria) coverage validation ensuring all ACs have implementing tasks, and format preservation validation ensuring external items maintain their original format during sync operations.

## Overview

The validators module contains 2 files with approximately 642 lines of code.

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

- **Files Analyzed**: 2
- **Source Files**: 2
- **Test Files**: 0
- **Total Exports**: 11

## Main Exports

- `ACCoverageReport` (interface)
- `USCoverageStats` (interface)
- `ValidationOptions` (interface)
- `validateACCoverage` (function)
- `isCoveragePassing` (function)
- `printCoverageReport` (function)
- `exportCoverageReportJSON` (function)
- `getRecommendedActions` (function)
- `SyncOperation` (interface)
- `ValidationResult` (interface)
- ...and 1 more exports

## Documentation Status

**Has README**: No
**Has Tests**: No

---
*Analysis generated on 2025-12-10*