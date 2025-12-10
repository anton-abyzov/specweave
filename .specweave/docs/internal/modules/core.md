# core

**Path**: `src/core`

## Purpose

Core module providing background job management for long-running operations (repo cloning, issue imports, brownfield analysis, living docs building) and CI/CD monitoring configuration loading.

## Overview

The core module contains 269 files with approximately 517 lines of code.

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
- **Source Files**: 2
- **Test Files**: 0
- **Total Exports**: 19

## Main Exports

- `JobType` (type)
- `JobStatus` (type)
- `JOB_SUCCESS_THRESHOLD` (const)
- `JobProgress` (interface)
- `BackgroundJob` (interface)
- `CloneJobConfig` (interface)
- `ImportJobConfig` (interface)
- `SyncJobConfig` (interface)
- `BrownfieldPhase` (type)
- `AnalysisDepth` (type)
- ...and 9 more exports

## Documentation Status

**Has README**: No
**Has Tests**: No

---
*Analysis generated on 2025-12-10*