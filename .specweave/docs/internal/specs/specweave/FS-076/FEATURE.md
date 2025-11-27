# FS-077: Crash Prevention Refactor

**Status**: Active
**Increment**: 0072-crash-prevention-refactor
**Priority**: High
**Type**: Refactor

## Summary

Refactor large files to prevent Claude Code crashes due to context limits.

## Goals

- Extract helper functions from large files
- Keep files under 1500 lines
- Reduce context load during editing
