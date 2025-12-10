# generators

**Path**: `src/generators`

## Purpose

Parsing and validation utilities for SpecWeave specification files (spec.md) and task files (tasks.md), extracting structured data like user stories, acceptance criteria, and task metadata.

## Overview

The generators module contains 2 files with approximately 739 lines of code.

## Dependencies

No dependencies detected.

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
- **Total Exports**: 16

## Main Exports

- `UserStory` (interface)
- `SpecMetadata` (interface)
- `parseSpecMd` (function)
- `getAllUSIds` (function)
- `getAllACIds` (function)
- `getACsForUS` (function)
- `validateACBelongsToUS` (function)
- `Task` (interface)
- `TaskStatus` (type)
- `TasksByUserStory` (interface)
- ...and 6 more exports

## Documentation Status

**Has README**: No
**Has Tests**: No

---
*Analysis generated on 2025-12-10*