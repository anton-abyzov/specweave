---
increment: 0104-living-docs-command
---

# Tasks

## US-001: Re-launch Living Docs After Crash

### T-001: Create command markdown documentation
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed

Created `plugins/specweave/commands/specweave-living-docs.md` with comprehensive documentation.

### T-002: Implement CLI handler
**User Story**: US-001
**Satisfies ACs**: AC-US1-02, AC-US1-03
**Status**: [x] completed

Created `src/cli/commands/living-docs.ts` with:
- Launch living-docs-builder job in background
- Display job ID and monitoring instructions
- Support for all analysis depths

### T-003: Register command in bin/specweave.js
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed

Added command registration with all options to `bin/specweave.js`.

## US-002: Resume Orphaned Jobs

### T-004: Implement orphan detection
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02
**Status**: [x] completed

- `getOrphanedLivingDocsJobs()` finds orphaned living-docs jobs
- `promptResumeOrphanedJob()` offers interactive resume
- Auto-detects on startup

### T-005: Implement resume from checkpoint
**User Story**: US-002
**Satisfies ACs**: AC-US2-03
**Status**: [x] completed

- `handleResume()` loads checkpoint and continues
- Displays resume point (phase, module)
- Reuses existing worker infrastructure

## US-003: Configure Analysis Depth

### T-006: Implement depth/priority options
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03
**Status**: [x] completed

- `--depth` accepts: quick, standard, deep-native, deep-api
- `--priority` accepts comma-separated module names
- `--sources` accepts additional doc folders
- Interactive mode with prompts when no flags provided

## Summary

All tasks completed:
- `/specweave:living-docs` command implemented
- CLI `specweave living-docs` command registered
- Orphan detection and resume working
- Analysis depth configuration working
- Build passing
