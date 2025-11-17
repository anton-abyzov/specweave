---
increment: 0040-vitest-living-docs-mock-fixes
title: "Complete Vitest Migration - Fix Living Docs Mock Issues"
priority: P1
status: in-progress
created: 2025-11-17
started: 2025-11-17
type: bug
---

# Bug Fix: Complete Vitest Migration - Living Docs Mock Issues

## Progress Summary

**Tests Fixed**: 14/30 (47% improvement!)

### Completed
- ✅ cross-linker.test.ts: 9 → 5 failures (link generation working!)
- ✅ project-detector.test.ts: 8 → 4 failures (constructor tests fixed!)
- ✅ three-layer-sync.test.ts: Duplicate import removed

### Remaining
- ⏳ cross-linker: 5 failures (Document Updates section)
- ⏳ project-detector: 4 failures (fallback logic)
- ⏳ content-distributor: 3 failures
- ⏳ three-layer-sync: 4 failures

## Changes Made

1. **project-detector.test.ts**:
   - Added `vi.mock('child_process')`
   - Mock `execSync` to prevent real git calls
   - Ensures fallback to 'default' project ID

2. **cross-linker.test.ts**:
   - Changed `existsSync` mock to return `true`
   - Fixed mock content to match actual test filenames
   - Link generation tests now passing!

3. **three-layer-sync.test.ts**:
   - Removed duplicate import typo (`.js.js`)
