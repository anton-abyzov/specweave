# hooks

**Path**: `src/hooks`

## Purpose

Cross-platform hook execution framework providing platform detection, detached process spawning, file locking, and event-driven background processing for Windows, macOS, and Linux.

## Overview

The hooks module contains 5 files with approximately 771 lines of code.

## Dependencies

No dependencies detected.

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
- **Total Exports**: 16

## Main Exports

- `Platform` (type)
- `WslStatus` (interface)
- `getPlatform` (function)
- `isWindows` (function)
- `isPosix` (function)
- `checkWslStatus` (function)
- `findProjectRoot` (function)
- `spawnDetached` (function)
- `spawnNodeBackground` (function)
- `readJsonSafe` (function)
- ...and 6 more exports

## Documentation Status

**Has README**: No
**Has Tests**: No

---
*Analysis generated on 2025-12-10*