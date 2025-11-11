# DEPRECATED: Archive Increment Copies

**Status**: DEPRECATED
**Date Deprecated**: 2025-11-11
**Reason**: Living docs sync now works automatically

## What This Folder Was

This folder contained auto-synced copies of increment specs using the 4-digit format:
- `spec-0001-core-framework.md`
- `spec-0002-core-enhancements.md`
- etc.

## Why It's Deprecated

The living docs auto-sync was broken for a while, so this folder contains stale copies from before the sync broke.

Now that the sync is fixed (as of 2025-11-11), new increment specs are being auto-synced to the parent directory:
- `.specweave/docs/internal/specs/spec-0020-github-multi-repo.md` (auto-synced)
- `.specweave/docs/internal/specs/spec-0026-multi-repo-unit-tests.md` (auto-synced)
- etc.

## Current Architecture

SpecWeave now uses TWO types of specs:

1. **Feature-Level Specs** (3-digit, manually created):
   - `spec-001-core-framework-architecture.md` - Covers increments 0001, 0002, 0004, 0005
   - `spec-002-intelligent-capabilities.md` - Covers increments 0003, 0007, 0009
   - `spec-003-developer-experience.md` - Covers increment 0008
   - etc.

2. **Increment-Level Specs** (4-digit, auto-synced):
   - `spec-0020-github-multi-repo.md` - Auto-copied from `.specweave/increments/0020-github-multi-repo/spec.md`
   - `spec-0026-multi-repo-unit-tests.md` - Auto-copied from `.specweave/increments/0026-multi-repo-unit-tests/spec.md`
   - etc.

Both types coexist and serve different purposes.

## Can This Folder Be Deleted?

Yes, but it's kept for historical reference. The files here are obsolete and replaced by:
- Feature-level specs (3-digit) in parent directory
- New auto-synced increment specs (4-digit) in parent directory

## Action Required

None. This folder can be ignored or deleted at any time.
