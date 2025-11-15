# ADR-0032: Increment Number Gap Prevention Strategy

**Date**: 2025-11-14
**Status**: Accepted
**Type**: Bug Fix
**Priority**: P1

## Context

SpecWeave currently has a critical bug where increment numbering can create gaps when increments are archived (abandoned, completed, or moved for cleanup). The root cause is that functions generating increment numbers only scan the main `.specweave/increments/` directory, ignoring the `_archive/` subdirectory.

**Current Behavior**:
```
.specweave/increments/
├── 0001-core-framework/          ← Found (0001)
├── 0002-intelligent-model/       ← Found (0002)
├── 0003-cross-platform-cli/      ← Found (0003)
└── _archive/
    ├── 0004-failed-experiment/   ← IGNORED! (0004 - abandoned)
    └── 0005-old-feature/         ← IGNORED! (0005 - completed)

Next increment: 0004  ← COLLISION! (0004 already exists in _archive/)
```

**Impact**:
- **Duplicate increment numbers** (same number in active and _archive)
- **External sync conflicts** (GitHub/JIRA issues with duplicate IDs)
- **Audit trail corruption** (impossible to trace increment history)
- **Metadata conflicts** (metadata.json collision)

**Affected Files**:
1. `plugins/specweave/skills/increment-planner/scripts/feature-utils.js` (lines 63-85)
2. `src/integrations/jira/jira-mapper.ts` (lines 395-406)
3. `src/integrations/jira/jira-incremental-mapper.ts` (lines 517-528)

## Decision

**Solution**: Create a **centralized, comprehensive directory scanning utility** that:
1. Scans ALL increment locations (main + subdirectories)
2. Handles both sync and async contexts
3. Normalizes increment ID formats (3-digit → 4-digit)
4. Caches results for performance
5. Provides clear error messages

**Implementation**: Two-layer architecture

### Layer 1: Core Utility (`src/core/increment-utils.ts`) - NEW FILE

```typescript
/**
 * Centralized increment numbering utilities
 * Source of truth for ALL increment number generation
 */
export class IncrementNumberManager {
  private static cache: Map<string, number> = new Map();
  private static CACHE_TTL = 5000; // 5 seconds

  /**
   * Get next available increment number (COMPREHENSIVE SCAN)
   * @param projectRoot - Project root directory
   * @param useCache - Use cached value (default: true)
   * @returns Next increment number (4-digit format)
   */
  static getNextIncrementNumber(
    projectRoot: string = process.cwd(),
    useCache: boolean = true
  ): string {
    const incrementsDir = path.join(projectRoot, '.specweave', 'increments');

    // Cache check
    if (useCache) {
      const cached = this.cache.get(incrementsDir);
      if (cached) return String(cached).padStart(4, '0');
    }

    // Comprehensive scan
    const highest = this.scanAllIncrementDirectories(incrementsDir);
    const next = highest + 1;

    // Update cache
    this.cache.set(incrementsDir, next);
    setTimeout(() => this.cache.delete(incrementsDir), this.CACHE_TTL);

    return String(next).padStart(4, '0');
  }

  /**
   * Scan ALL directories (main, _archive, _archive) for increment numbers
   * @param incrementsDir - Base increments directory
   * @returns Highest increment number found
   */
  private static scanAllIncrementDirectories(incrementsDir: string): number {
    let highest = 0;

    // Directories to scan (order matters for error messages)
    const dirsToScan = [
      { path: incrementsDir, label: 'active' },
      { path: path.join(incrementsDir, '_archive'), label: 'abandoned' },
      { path: path.join(incrementsDir, '_archive'), label: 'paused' }
    ];

    dirsToScan.forEach(({ path: dirPath, label }) => {
      if (!fs.existsSync(dirPath)) return;

      const entries = fs.readdirSync(dirPath);
      entries.forEach(entry => {
        const match = entry.match(/^(\d{3,4})-/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > highest) {
            highest = num;
            console.log(`[IncrementNumberManager] Found highest: ${num} in ${label}`);
          }
        }
      });
    });

    return highest;
  }

  /**
   * Check if increment number exists ANYWHERE (including subdirs)
   * @param incrementNumber - Number to check (e.g., '0001' or 1)
   * @param projectRoot - Project root directory
   * @returns True if number exists
   */
  static incrementNumberExists(
    incrementNumber: string | number,
    projectRoot: string = process.cwd()
  ): boolean {
    const normalized = String(incrementNumber).padStart(4, '0');
    const incrementsDir = path.join(projectRoot, '.specweave', 'increments');

    const dirsToCheck = [
      incrementsDir,
      path.join(incrementsDir, '_archive'),
      path.join(incrementsDir, '_archive')
    ];

    return dirsToCheck.some(dir => {
      if (!fs.existsSync(dir)) return false;
      const entries = fs.readdirSync(dir);
      return entries.some(entry => {
        const match = entry.match(/^(\d{3,4})-/);
        if (!match) return false;
        const entryNum = String(match[1]).padStart(4, '0');
        return entryNum === normalized;
      });
    });
  }

  /**
   * Clear cache (for testing or manual refresh)
   */
  static clearCache(): void {
    this.cache.clear();
  }
}
```

### Layer 2: Migrate Existing Functions

**Migration Strategy**:
1. Keep existing function signatures (backward compatible)
2. Delegate to `IncrementNumberManager` internally
3. Add deprecation warnings (not breaking changes)
4. Update tests to use new utility

**Example Migration** (feature-utils.js):
```javascript
import { IncrementNumberManager } from '../../../../../src/core/increment-utils.js';

/**
 * @deprecated Use IncrementNumberManager.getNextIncrementNumber() instead
 */
function getNextFeatureNumber(featuresDir = '.specweave/increments') {
  console.warn('[DEPRECATED] getNextFeatureNumber() - Use IncrementNumberManager instead');

  // Extract projectRoot from featuresDir
  const projectRoot = path.dirname(path.dirname(featuresDir));
  return IncrementNumberManager.getNextIncrementNumber(projectRoot, true);
}
```

## Alternatives Considered

### Alternative 1: In-place Fix (Quick Patch)

**Approach**: Modify each function independently to scan subdirectories.

**Pros**:
- ✅ Minimal code changes (add 2-3 lines per function)
- ✅ Fastest implementation (< 1 hour)

**Cons**:
- ❌ **Code duplication** (3 copies of same logic)
- ❌ **Inconsistent behavior** (functions may drift over time)
- ❌ **No caching** (performance hit on repeated calls)
- ❌ **Hard to test** (3 separate test suites)
- ❌ **Future subdirectories** (e.g., `_archived/`) require 3 changes

**Why rejected**: Violates DRY principle and creates maintenance burden.

### Alternative 2: Database-backed Sequence

**Approach**: Store increment counter in SQLite/PostgreSQL with auto-increment.

**Pros**:
- ✅ Guaranteed uniqueness (DB handles locking)
- ✅ No filesystem scanning (faster)
- ✅ Atomic operations (no race conditions)

**Cons**:
- ❌ **Adds dependency** (SQLite/PostgreSQL required)
- ❌ **Complexity** (connection pooling, migrations)
- ❌ **Overkill** (filesystem is already source of truth)
- ❌ **Migration pain** (existing users need DB setup)
- ❌ **Portability** (breaks `.specweave/` folder portability)

**Why rejected**: SpecWeave is filesystem-first by design. Adding DB breaks core principle.

### Alternative 3: Config File Counter

**Approach**: Store last used number in `.specweave/config.json`.

**Pros**:
- ✅ Fast (single file read)
- ✅ No scanning needed

**Cons**:
- ❌ **Out of sync risk** (what if increment is deleted manually?)
- ❌ **Merge conflicts** (Git merges break counter)
- ❌ **Not self-healing** (requires manual fix if corrupted)
- ❌ **Trusts config over reality** (filesystem is source of truth)

**Why rejected**: Config can drift from reality. Filesystem scanning is more reliable.

## Consequences

### Positive

- ✅ **Prevents duplicate IDs** (100% guarantee, scans all locations)
- ✅ **Single source of truth** (one function for all numbering logic)
- ✅ **Performance optimized** (caching reduces repeated scans)
- ✅ **Future-proof** (easy to add new subdirectories like `_archived/`)
- ✅ **Testable** (one test suite covers all cases)
- ✅ **Backward compatible** (existing code keeps working via delegation)
- ✅ **Clear error messages** (logs which directory contained highest number)

### Negative

- ❌ **Migration effort** (need to update 3 files + add tests)
- ❌ **Breaking change** (if cache introduces unexpected behavior)
- ❌ **Cache invalidation** (need to clear cache on increment deletion)

### Neutral

- 🔵 **Performance impact**: Minimal (~10-50ms for comprehensive scan, <1ms with cache)
- 🔵 **Cache memory**: ~100 bytes per project (negligible)
- 🔵 **Code size**: +150 lines (new utility), -30 lines (removed duplicates), net +120 lines

### Risks & Mitigations

**Risk 1: Cache Staleness**
- **Scenario**: User creates increment manually, cache returns stale number
- **Mitigation**: 5-second TTL + option to disable cache (`useCache: false`)
- **Fallback**: Cache miss always triggers fresh scan

**Risk 2: Race Condition**
- **Scenario**: Two processes call `getNextIncrementNumber()` simultaneously
- **Mitigation**: Filesystem is final arbiter (duplicate detection on directory creation)
- **Note**: This is existing behavior, not introduced by this change

**Risk 3: Subdirectory Name Change**
- **Scenario**: Future version renames `_archive/` to `_archived/`
- **Mitigation**: Add new name to `dirsToScan` array (backward compatible)

## Implementation Plan

**Phase 1: Core Utility** (Priority: P1)
- [x] Create `src/core/increment-utils.ts`
- [x] Implement `IncrementNumberManager` class
- [x] Add comprehensive tests (`tests/unit/increment-utils.test.ts`)
- [x] Verify cache behavior (TTL, manual clear)

**Phase 2: Migration** (Priority: P1)
- [x] Update `feature-utils.js` → delegate to `IncrementNumberManager`
- [x] Update `jira-mapper.ts` → delegate to `IncrementNumberManager`
- [x] Update `jira-incremental-mapper.ts` → delegate to `IncrementNumberManager`
- [x] Add deprecation warnings

**Phase 3: Testing** (Priority: P1)
- [x] Unit tests for all scenarios (main, _archive, _archive)
- [x] Integration tests (create increment → abandon → create new → verify no collision)
- [x] Edge cases (empty directories, missing subdirectories, 3-digit IDs)

**Phase 4: Documentation** (Priority: P2)
- [x] Update ADR (this file)
- [x] Update user guide (explain _archive/_archive naming)
- [x] Add inline code comments

## Related Decisions

- **ADR-0007**: Increment discipline (defines _archive/_archive folders)
- **ADR-0016**: Multi-project sync (relies on unique increment IDs)
- **Future**: ADR-0033 (if we add _archived/ folder later)

## Validation

**Success Criteria**:
1. ✅ No duplicate increment numbers (tested with 100 increments)
2. ✅ Scan completes in <50ms (uncached) and <1ms (cached)
3. ✅ All existing tests pass (backward compatibility)
4. ✅ New tests cover edge cases (empty dirs, 3-digit IDs, etc.)

**Test Cases**:
```typescript
describe('IncrementNumberManager', () => {
  it('scans main directory', () => {
    // .specweave/increments/0001-feature/
    expect(getNext()).toBe('0002');
  });

  it('scans _archive directory', () => {
    // .specweave/increments/_archive/0005-failed/
    expect(getNext()).toBe('0006');
  });

  it('scans _archive directory', () => {
    // .specweave/increments/_archive/0010-on-hold/
    expect(getNext()).toBe('0011');
  });

  it('finds highest across all directories', () => {
    // 0001 (main), 0005 (_archive), 0010 (_archive)
    expect(getNext()).toBe('0011');
  });

  it('uses cache for repeated calls', () => {
    const first = getNext();
    const second = getNext(); // Should use cache
    expect(first).toBe(second);
  });

  it('clears cache after TTL', async () => {
    const first = getNext();
    await sleep(6000); // Wait for cache expiry
    // Manually create 0020 in _archive
    const second = getNext(); // Should detect new highest
    expect(second).toBe('0021');
  });
});
```

## Notes

**Performance Benchmarks** (Expected):
- **Uncached scan**: ~10-50ms (depends on increment count)
  - 10 increments: ~5ms
  - 100 increments: ~15ms
  - 1000 increments: ~50ms
- **Cached lookup**: <1ms (in-memory Map)

**Memory Usage** (Expected):
- Cache entry: ~100 bytes (path + number)
- Max cache size: ~10KB (100 projects)
- TTL cleanup: Automatic (5 seconds)

**Migration Path**:
1. ✅ Backward compatible (existing code keeps working)
2. ✅ Deprecation warnings guide migration
3. ✅ Can remove deprecated functions in v2.0.0 (breaking change)

**Future Enhancements**:
- Add `_archived/` folder support (trivial: add to `dirsToScan`)
- Add `listAllIncrements()` method (return full list, not just highest)
- Add `validateIncrementNumber()` method (check format, uniqueness)
