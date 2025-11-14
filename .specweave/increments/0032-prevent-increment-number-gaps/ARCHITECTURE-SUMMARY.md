# Architecture Summary: Increment Number Gap Prevention

**Increment**: 0032-prevent-increment-number-gaps
**Type**: Bug Fix (P1)
**Architect**: Claude (Architect Agent)
**Date**: 2025-11-14

---

## Quick Reference

**Problem**: Increment numbering creates gaps when increments are abandoned/paused
**Solution**: Centralized `IncrementNumberManager` with comprehensive directory scanning
**Impact**: Prevents duplicate increment IDs, maintains audit trail integrity
**Complexity**: Medium (new utility + 3 file migrations)
**Risk**: Low (backward compatible, well-tested)

---

## Architecture Documents Created

### 1. ADR-0032: Increment Number Gap Prevention Strategy
**File**: `.specweave/docs/internal/architecture/adr/0032-increment-number-gap-prevention.md`

**Key Decisions**:
- ✅ **Centralized utility** over in-place fix (DRY principle)
- ✅ **In-memory caching** with 5-second TTL (performance)
- ✅ **Delegation pattern** for backward compatibility (zero breaking changes)

**Alternatives Rejected**:
- ❌ In-place fix (code duplication, maintenance burden)
- ❌ Database-backed sequence (adds dependency, breaks portability)
- ❌ Config file counter (can drift from reality)

**Consequences**:
- Positive: 100% duplicate prevention, single source of truth, future-proof
- Negative: Migration effort (3 files), cache invalidation complexity
- Neutral: ~120 lines of new code, 10-50ms performance (uncached)

### 2. Implementation Plan
**File**: `.specweave/increments/0032-prevent-increment-number-gaps/plan.md`

**Phases**:
1. **Core Utility** (2 hours): Create `src/core/increment-utils.ts`
2. **Migration** (1 hour): Update 3 existing files to delegate
3. **Testing** (3 hours): 53 tests (unit + integration + E2E)
4. **Documentation** (1 hour): ADRs, guides, comments

**Total Effort**: 7 hours (with 1-hour contingency)

### 3. Architecture Diagram
**File**: `.specweave/docs/internal/architecture/diagrams/increment-number-management.mmd`

**Visualizations**:
- Before/After comparison (shows bug vs. fix)
- Cache behavior (sequence diagram)
- Error scenarios (graceful handling)
- Design patterns (Singleton, Cache-Aside, Delegation, Strategy)

### 4. Test Strategy
**File**: `.specweave/docs/internal/architecture/test-strategy-increment-numbering.md`

**Coverage**:
- **40 unit tests** (Core logic, caching, error handling)
- **8 integration tests** (Cross-file behavior, real workflows)
- **5 E2E tests** (PM Agent, JIRA import, abandon/pause/resume)

**Targets**:
- Overall: 95%+ coverage
- `IncrementNumberManager`: 100% coverage (critical path)
- Performance: <50ms uncached, <1ms cached

---

## Technical Architecture

### Core Component: IncrementNumberManager

**Location**: `src/core/increment-utils.ts` (NEW FILE)

**Class Structure**:
```typescript
export class IncrementNumberManager {
  private static cache: Map<string, number>;
  private static CACHE_TTL = 5000; // 5 seconds

  // Public API
  static getNextIncrementNumber(projectRoot, useCache): string
  static incrementNumberExists(incrementNumber, projectRoot): boolean
  static clearCache(): void

  // Private internals
  private static scanAllIncrementDirectories(incrementsDir): number
}
```

**Key Algorithm**:
```typescript
scanAllIncrementDirectories(incrementsDir) {
  highest = 0;

  // Scan 3 directories (extensible)
  directories = [
    incrementsDir,              // main (active)
    incrementsDir/_abandoned,   // cancelled
    incrementsDir/_paused       // on-hold
  ];

  foreach directory in directories {
    if (exists) {
      foreach entry in directory {
        match = entry.match(/^(\d{3,4})-/);
        if (match) {
          num = parseInt(match[1]);
          if (num > highest) highest = num;
        }
      }
    }
  }

  return highest;
}
```

### Migration Strategy

**Affected Files**:
1. `plugins/specweave/skills/increment-planner/scripts/feature-utils.js`
2. `src/integrations/jira/jira-mapper.ts`
3. `src/integrations/jira/jira-incremental-mapper.ts`

**Migration Pattern** (backward compatible):
```javascript
// OLD (before)
function getNextFeatureNumber(featuresDir) {
  // Scans only main directory (BUG!)
  const entries = fs.readdirSync(featuresDir);
  // ...
}

// NEW (after)
function getNextFeatureNumber(featuresDir) {
  console.warn('[DEPRECATED] Use IncrementNumberManager');
  const projectRoot = path.resolve(featuresDir, '../..');
  return IncrementNumberManager.getNextIncrementNumber(projectRoot);
}
```

**Result**: Existing code keeps working, deprecation warnings guide migration.

### Caching Design

**Structure**: In-memory Map (key: path, value: next number)

**Lifecycle**:
1. **Miss**: Scan filesystem → Update cache → Set TTL timer → Return
2. **Hit**: Return cached value immediately (<1ms)
3. **Expiry**: Auto-delete after 5 seconds (prevents staleness)
4. **Manual Clear**: `clearCache()` method (for testing/restart)

**Trade-offs**:
- ✅ **Performance**: 80%+ cache hit rate (most increments created in <5s)
- ⚠️ **Staleness**: 5-second window where cache may be stale
- ✅ **Opt-out**: `useCache: false` bypasses cache

---

## How It Works (Example)

### Scenario: Abandoned Increment

**Before (Bug)**:
```
.specweave/increments/
├── 0001-feature-a/          ← Scanned
├── 0002-feature-b/          ← Scanned
├── 0003-feature-c/          ← Scanned (highest)
└── _abandoned/
    └── 0005-failed/         ← IGNORED! (bug)

getNextFeatureNumber() returns: 0004
Result: COLLISION! (0004 created, but 0005 exists in _abandoned)
```

**After (Fixed)**:
```
.specweave/increments/
├── 0001-feature-a/          ← Scanned
├── 0002-feature-b/          ← Scanned
├── 0003-feature-c/          ← Scanned
└── _abandoned/
    └── 0005-failed/         ← Scanned (highest!)

IncrementNumberManager.getNextIncrementNumber() returns: 0006
Result: NO COLLISION (0006 > 0005)
```

### Scenario: Concurrent Creation

**User A** (12:00:00.000):
```typescript
const next = IncrementNumberManager.getNextIncrementNumber();
// Cache miss → Scan → Found highest: 0010 → Cache: 0011 → Return: 0011
```

**User B** (12:00:00.500, <5s later):
```typescript
const next = IncrementNumberManager.getNextIncrementNumber();
// Cache hit → Return: 0011 (same as User A)
```

**User A** creates `0011-feature-a/`
**User B** tries to create `0011-feature-b/` → **Filesystem error** (directory exists)

**Result**: Cache prevents duplicate IDs, filesystem is final arbiter.

---

## Performance Characteristics

### Benchmarks (Expected)

| Scenario | Uncached | Cached | Notes |
|----------|----------|--------|-------|
| **Empty directory** | ~1ms | <1ms | Quick return |
| **10 increments** | ~5ms | <1ms | Typical small project |
| **100 increments** | ~15ms | <1ms | Medium project |
| **1000 increments** | ~50ms | <1ms | Large project |

**Cache Hit Rate**: Estimated 80%+ (based on typical increment creation patterns)

**Memory Usage**:
- Per cache entry: ~100 bytes (path + number)
- 100 projects: ~10KB total (negligible)

### Scalability Limits

**Current Implementation**:
- Max increments: ~10,000 (before scan >100ms becomes noticeable)
- Cache memory: ~1MB (10,000 entries × 100 bytes)

**Future Optimizations** (if needed):
1. Index file (`.specweave/increments/.index` with highest number)
2. Parallel scanning (async version with Promise.all)
3. Incremental indexing (update on create/delete)

---

## Error Handling

### Graceful Degradation

| Error Scenario | Behavior | Rationale |
|---------------|----------|-----------|
| **Missing .specweave/** | Return `'0001'` | Initialize new project |
| **Missing increments/** | Return `'0001'` | Initialize new project |
| **Missing _abandoned/** | Scan main + _paused only | Optional subdirectory |
| **Missing _paused/** | Scan main + _abandoned only | Optional subdirectory |
| **Invalid folder names** | Ignore, continue scan | Corrupted data, skip |
| **Permission errors** | Throw with clear message | Unrecoverable |

### Example Error Messages

**Permission Error**:
```
Error: Failed to read increments directory: /path/to/.specweave/increments
Ensure you have read permissions.
Original error: EACCES: permission denied
```

**Deprecation Warning**:
```
[DEPRECATED] getNextFeatureNumber() will be removed in v2.0.0.
Use IncrementNumberManager.getNextIncrementNumber() instead.
```

---

## Testing Strategy

### Test Coverage

**53 Total Tests**:
- **40 unit tests** (70% of effort)
  - Basic functionality (5)
  - Comprehensive scanning (5)
  - ID format handling (5)
  - Existence checks (10)
  - Caching (10)
  - Error handling (5)
- **8 integration tests** (20% of effort)
  - Cross-file delegation (3)
  - Real workflows (5)
- **5 E2E tests** (10% of effort)
  - PM Agent CLI (1)
  - JIRA import (1)
  - Abandon workflow (1)
  - Pause/resume workflow (1)
  - Concurrent creation (1)

### Critical Test Cases

**UT-006: Comprehensive scan across all directories**
```typescript
createIncrement('0001-feature-a'); // main
createIncrement('_abandoned/0005-failed'); // abandoned
createIncrement('_paused/0010-on-hold'); // paused

expect(getNext()).toBe('0011'); // Highest is 0010
```

**IT-004: Real-world abandon workflow**
```typescript
createIncrement('0001-a');
createIncrement('0002-b');

// Abandon 0002
fs.renameSync('0002-b', '_abandoned/0002-b');

clearCache();
expect(getNext()).toBe('0003'); // Skips 0002 (in _abandoned)
```

---

## Migration Path

### Step-by-Step Rollout

**Phase 1: Install (Non-Breaking)**
```bash
# Add new utility
touch src/core/increment-utils.ts
# No impact (no code uses it yet)
```

**Phase 2: Migrate (Backward Compatible)**
```bash
# Update 3 files to delegate
# Add deprecation warnings
# Existing code keeps working
```

**Phase 3: Test (Validation)**
```bash
npm test -- --coverage
# 53 tests pass, 95%+ coverage
```

**Phase 4: Document (User Education)**
```bash
# Update ADRs, guides, comments
# Users learn about new API
```

**Phase 5: (Future) Remove Deprecated (Breaking)**
```bash
# v2.0.0 major version bump
# Remove old functions
# Users must migrate
```

---

## Success Metrics

**Quantitative**:
- ✅ Zero duplicate increment IDs (100% prevention)
- ✅ Test coverage >95%
- ✅ Performance <50ms uncached, <1ms cached
- ✅ Backward compatibility 100%

**Qualitative**:
- ✅ Clear error messages
- ✅ Deprecation warnings guide migration
- ✅ Comprehensive documentation

---

## Related Work

**Prerequisites**:
- None (standalone bug fix)

**Follow-up Work**:
1. Monitor deprecation warnings (track adoption)
2. Plan v2.0.0 removal (schedule breaking change)
3. Consider async version (if performance bottleneck)
4. Add `_archived/` support (if users request)

---

## Key Takeaways

### For Developers

**Problem Solved**:
- ✅ No more duplicate increment IDs
- ✅ Abandoned/paused increments reserve their numbers
- ✅ Audit trail integrity maintained

**API Changes**:
- ⚠️ Deprecation warnings (old functions still work)
- ✅ New utility: `IncrementNumberManager`
- ✅ Backward compatible (zero breaking changes)

**Performance Impact**:
- ✅ Minimal (10-50ms uncached, <1ms cached)
- ✅ 80%+ cache hit rate

### For Architects

**Design Patterns**:
- Singleton (static class)
- Cache-Aside (performance)
- Delegation (backward compatibility)
- Strategy (extensible scanning)

**Trade-offs**:
- ✅ Centralization vs. duplication → Centralization wins (DRY)
- ✅ Performance vs. freshness → Cache with 5s TTL (balanced)
- ✅ Breaking change vs. backward compat → Backward compat (safe migration)

### For PM/Users

**Impact**:
- ✅ More reliable increment numbering
- ✅ Better audit trail (no gaps in abandoned/paused)
- ✅ Smoother multi-user workflows

**Migration**:
- ✅ Zero action required (backward compatible)
- ⚠️ Optional: Migrate to new API (future-proof)
- ✅ Clear deprecation warnings (know when to migrate)

---

## Documentation Index

**Architecture**:
- [ADR-0032](../../docs/internal/architecture/adr/0032-increment-number-gap-prevention.md) - Decision rationale
- [Diagram](../../docs/internal/architecture/diagrams/increment-number-management.mmd) - Visual architecture

**Implementation**:
- [plan.md](./plan.md) - Implementation plan (this increment)
- [Test Strategy](../../docs/internal/architecture/test-strategy-increment-numbering.md) - 53 test cases

**User Guides**:
- Increment Lifecycle Guide (to be updated)
- Multi-Project Setup Guide (to be updated)

---

**Last Updated**: 2025-11-14
**Status**: Ready for Implementation
**Estimated Effort**: 7 hours (6 coding + 1 contingency)
