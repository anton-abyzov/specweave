# config

**Path**: `src/config`

## Purpose

Manages SpecWeave configuration including reading/writing config.json, handling import configurations for external tools (GitHub, JIRA, ADO), and defining type schemas for configuration data structures.

## Overview

The config module contains 3 files with approximately 441 lines of code.

## Dependencies

This module imports from:
- `.`
- `..`

## Dependents

No dependencies detected.

## Integration Points

No external integration points detected.

## Patterns Used

No specific patterns detected.

## Analysis Summary

- **Files Analyzed**: 3
- **Source Files**: 1
- **Test Files**: 0
- **Total Exports**: 15

## Main Exports

- `ConfigManager` (class)
- `ImportConfig` (interface)
- `ProjectConfig` (interface)
- `DEFAULT_IMPORT_CONFIG` (const)
- `loadImportConfig` (function)
- `loadFromEnvironment` (function)
- `validateImportConfig` (function)
- `saveImportConfig` (function)
- `getExampleImportConfig` (function)
- `ResearchConfigSchema` (const)
- ...and 5 more exports

## Documentation Status

**Has README**: No
**Has Tests**: No

---
*Analysis generated on 2025-12-10*