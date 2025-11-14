# Developer Quick Start: Increment Number Gap Prevention

**TLDR**: Create centralized `IncrementNumberManager` utility that scans ALL directories (main + _abandoned + _paused), preventing duplicate increment IDs.

---

## What You're Building

**New File**: `src/core/increment-utils.ts` (~150 lines)

**Updated Files**:
1. `plugins/specweave/skills/increment-planner/scripts/feature-utils.js` (add import + delegation)
2. `src/integrations/jira/jira-mapper.ts` (add import + delegation)
3. `src/integrations/jira/jira-incremental-mapper.ts` (add import + delegation)

**New Tests**: `tests/unit/increment-utils.test.ts` (~1000 lines, 40 tests)

---

## The Bug (Before)

**Problem**: Three functions only scan main directory, ignore `_abandoned/` and `_paused/`

```javascript
// plugins/specweave/skills/increment-planner/scripts/feature-utils.js
function getNextFeatureNumber(featuresDir) {
  const entries = fs.readdirSync(featuresDir); // ❌ Only scans main!

  entries.forEach(entry => {
    const match = entry.match(/^(\d{3,4})-/);
    // Find highest...
  });
}
```

**Result**:
```
.specweave/increments/
├── 0001-feature/         ← Found (highest: 0001)
└── _abandoned/
    └── 0005-failed/      ← IGNORED! (bug)

getNextFeatureNumber() returns: 0002
Create: 0002-new-feature/

Problem: 0002, 0003, 0004 created, then collision when we hit 0005!
```

---

## The Fix (After)

**Solution**: Centralized utility that scans ALL directories

```typescript
// src/core/increment-utils.ts (NEW FILE)
export class IncrementNumberManager {
  static getNextIncrementNumber(projectRoot: string): string {
    const incrementsDir = path.join(projectRoot, '.specweave', 'increments');

    // ✅ Scan ALL directories (main + subdirectories)
    const highest = this.scanAllIncrementDirectories(incrementsDir);

    return String(highest + 1).padStart(4, '0');
  }

  private static scanAllIncrementDirectories(incrementsDir: string): number {
    let highest = 0;

    // ✅ Comprehensive scan
    const dirsToScan = [
      incrementsDir,                         // main (active)
      path.join(incrementsDir, '_abandoned'), // cancelled
      path.join(incrementsDir, '_paused')     // on-hold
    ];

    dirsToScan.forEach(dir => {
      if (!fs.existsSync(dir)) return; // Graceful handling

      const entries = fs.readdirSync(dir);
      entries.forEach(entry => {
        const match = entry.match(/^(\d{3,4})-/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > highest) highest = num;
        }
      });
    });

    return highest;
  }
}
```

**Result**:
```
.specweave/increments/
├── 0001-feature/         ← Scanned
└── _abandoned/
    └── 0005-failed/      ← Scanned (highest: 0005)

IncrementNumberManager.getNextIncrementNumber() returns: 0006
No collision!
```

---

## Step-by-Step Implementation

### Step 1: Create Core Utility (30 minutes)

**File**: `src/core/increment-utils.ts`

**Boilerplate**:
```typescript
import * as fs from 'fs';
import * as path from 'path';

export class IncrementNumberManager {
  private static cache: Map<string, number> = new Map();
  private static CACHE_TTL = 5000; // 5 seconds

  /**
   * Get next available increment number
   * @param projectRoot - Project root directory
   * @param useCache - Use cached value (default: true)
   * @returns Next increment number (4-digit format)
   */
  static getNextIncrementNumber(
    projectRoot: string = process.cwd(),
    useCache: boolean = true
  ): string {
    // TODO: Implement (see plan.md for full code)
  }

  /**
   * Check if increment number exists anywhere
   * @param incrementNumber - Number to check
   * @param projectRoot - Project root directory
   * @returns True if exists
   */
  static incrementNumberExists(
    incrementNumber: string | number,
    projectRoot: string = process.cwd()
  ): boolean {
    // TODO: Implement
  }

  /**
   * Clear cache (for testing or manual refresh)
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Scan all directories for increment numbers
   * @param incrementsDir - Base increments directory
   * @returns Highest increment number found
   */
  private static scanAllIncrementDirectories(incrementsDir: string): number {
    // TODO: Implement
  }
}
```

**Full implementation**: See `plan.md` Phase 1 for complete code.

### Step 2: Update feature-utils.js (10 minutes)

**File**: `plugins/specweave/skills/increment-planner/scripts/feature-utils.js`

**Add import** (line 9):
```javascript
import { IncrementNumberManager } from '../../../../../src/core/increment-utils.js';
```

**Replace `getNextFeatureNumber()`** (lines 63-85):
```javascript
function getNextFeatureNumber(featuresDir = '.specweave/increments') {
  console.warn('[DEPRECATED] getNextFeatureNumber() will be removed in v2.0.0. Use IncrementNumberManager.getNextIncrementNumber() instead.');

  // Extract projectRoot from featuresDir
  const projectRoot = path.resolve(featuresDir, '../..');

  return IncrementNumberManager.getNextIncrementNumber(projectRoot, true);
}
```

**Replace `incrementNumberExists()`** (lines 108-126):
```javascript
function incrementNumberExists(incrementNumber, featuresDir = '.specweave/increments') {
  console.warn('[DEPRECATED] incrementNumberExists() will be removed in v2.0.0. Use IncrementNumberManager.incrementNumberExists() instead.');

  const projectRoot = path.resolve(featuresDir, '../..');
  return IncrementNumberManager.incrementNumberExists(incrementNumber, projectRoot);
}
```

### Step 3: Update jira-mapper.ts (5 minutes)

**File**: `src/integrations/jira/jira-mapper.ts`

**Add import** (line 18):
```typescript
import { IncrementNumberManager } from '../../core/increment-utils';
```

**Replace `getNextIncrementId()`** (lines 395-406):
```typescript
private getNextIncrementId(): string {
  console.warn('[DEPRECATED] JiraMapper.getNextIncrementId() - Use IncrementNumberManager instead');
  return IncrementNumberManager.getNextIncrementNumber(this.projectRoot, true);
}
```

### Step 4: Update jira-incremental-mapper.ts (5 minutes)

**File**: `src/integrations/jira/jira-incremental-mapper.ts`

**Add import** (line 12):
```typescript
import { IncrementNumberManager } from '../../core/increment-utils.js';
```

**Replace `getNextIncrementId()`** (lines 517-528):
```typescript
private getNextIncrementId(): string {
  console.warn('[DEPRECATED] JiraIncrementalMapper.getNextIncrementId() - Use IncrementNumberManager instead');
  return IncrementNumberManager.getNextIncrementNumber(this.projectRoot, true);
}
```

### Step 5: Write Tests (2 hours)

**File**: `tests/unit/increment-utils.test.ts`

**Boilerplate**:
```typescript
import { IncrementNumberManager } from '../../src/core/increment-utils';
import * as fs from 'fs';
import * as path from 'path';

describe('IncrementNumberManager', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = '/tmp/test-project-' + Date.now();
    fs.mkdirSync(path.join(projectRoot, '.specweave', 'increments'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
    IncrementNumberManager.clearCache();
  });

  // Helper function
  function createIncrement(name: string) {
    const dir = path.join(projectRoot, '.specweave', 'increments', name);
    fs.mkdirSync(dir, { recursive: true });
  }

  describe('getNextIncrementNumber', () => {
    it('returns 0001 for empty directory', () => {
      const result = IncrementNumberManager.getNextIncrementNumber(projectRoot);
      expect(result).toBe('0001');
    });

    // Add 39 more tests (see test-strategy-increment-numbering.md)
  });
});
```

**Full test suite**: See `test-strategy-increment-numbering.md` for all 40 unit tests.

### Step 6: Build & Test (10 minutes)

```bash
# Build TypeScript
npm run build

# Run unit tests
npm test -- tests/unit/increment-utils.test.ts

# Run integration tests
npm test -- tests/integration/increment-numbering.test.ts

# Run all tests
npm test

# Check coverage
npm test -- --coverage
# Target: 95%+ coverage
```

---

## Key Implementation Details

### Algorithm: scanAllIncrementDirectories()

**Pseudocode**:
```
1. Initialize highest = 0
2. For each directory (main, _abandoned, _paused):
   a. If directory exists:
      i. Read all entries
      ii. For each entry:
          - Match pattern: /^(\d{3,4})-/
          - If match: num = parseInt(match[1])
          - If num > highest: highest = num
3. Return highest
```

**Edge Cases**:
- Missing directories → Skip gracefully (don't throw error)
- Invalid folder names → Ignore (e.g., `README.md`, `abc-invalid`)
- 3-digit IDs → Normalize to 4-digit (e.g., `001` → `0001`)
- Empty directories → Return 0 (next will be 0001)

### Caching Logic

**Flow**:
```
getNextIncrementNumber(projectRoot, useCache=true)
  ↓
  If useCache AND cache.has(incrementsDir):
    ↓
    Return cached value (<1ms)
  Else:
    ↓
    highest = scanAllIncrementDirectories(incrementsDir)
    ↓
    next = highest + 1
    ↓
    cache.set(incrementsDir, next)
    ↓
    setTimeout(() => cache.delete(incrementsDir), 5000) // TTL
    ↓
    Return next
```

**Performance**:
- Cache hit: <1ms (in-memory Map lookup)
- Cache miss: 10-50ms (filesystem scan)
- Cache hit rate: 80%+ (most increments created within 5s)

### Error Handling

**Missing .specweave directory**:
```typescript
if (!fs.existsSync(incrementsDir)) {
  console.log('[IncrementNumberManager] No .specweave/increments, starting at 0001');
  return '0001';
}
```

**Permission errors**:
```typescript
try {
  const entries = fs.readdirSync(dirPath);
} catch (error) {
  throw new Error(
    `Failed to read increments directory: ${dirPath}. ` +
    `Ensure you have read permissions. Error: ${error.message}`
  );
}
```

---

## Testing Checklist

**Unit Tests** (40 tests):
- [x] Empty directory → Returns `0001`
- [x] Single increment in main → Returns next
- [x] Multiple increments → Finds highest
- [x] Increments in _abandoned → Scans correctly
- [x] Increments in _paused → Scans correctly
- [x] Comprehensive scan (all dirs) → Finds true highest
- [x] 3-digit IDs → Normalizes to 4-digit
- [x] Mixed 3/4-digit IDs → Handles correctly
- [x] Cache hit → Returns cached value
- [x] Cache miss → Scans filesystem
- [x] Cache TTL → Expires after 5s
- [x] Manual cache clear → Works
- [x] `incrementNumberExists()` → Detects in all dirs
- [x] Error handling → Graceful fallbacks

**Integration Tests** (8 tests):
- [x] feature-utils.js delegation
- [x] jira-mapper.ts delegation
- [x] jira-incremental-mapper.ts delegation
- [x] Real workflow: abandon increment
- [x] Real workflow: pause increment
- [x] Duplicate detection
- [x] Migration from 3-digit to 4-digit
- [x] Full workflow: create → abandon → create

**E2E Tests** (5 tests):
- [x] PM Agent CLI creates increment
- [x] JIRA import creates increment
- [x] Abandon workflow
- [x] Pause/resume workflow
- [x] Concurrent creation

---

## Common Pitfalls

### Pitfall 1: Forgetting to Import

**Error**:
```
ReferenceError: IncrementNumberManager is not defined
```

**Fix**:
```typescript
import { IncrementNumberManager } from '../../core/increment-utils';
```

### Pitfall 2: Relative Path in Import

**Error**:
```
Error: Cannot find module '../core/increment-utils'
```

**Fix**: Use correct relative path based on file location:
- From `plugins/specweave/skills/...`: `../../../../../src/core/increment-utils.js`
- From `src/integrations/jira/...`: `../../core/increment-utils`

### Pitfall 3: Missing .js Extension (ES Modules)

**Error** (in feature-utils.js):
```
Error: Cannot find module
```

**Fix**: Add `.js` extension:
```javascript
import { IncrementNumberManager } from '../../../../../src/core/increment-utils.js';
```

### Pitfall 4: Cache Staleness in Tests

**Problem**: Tests fail intermittently due to stale cache

**Fix**: Clear cache in `afterEach()`:
```typescript
afterEach(() => {
  IncrementNumberManager.clearCache();
});
```

### Pitfall 5: Async/Sync Mismatch

**Problem**: Using `await` with synchronous function

**Fix**: `getNextIncrementNumber()` is synchronous (no `await` needed):
```typescript
const next = IncrementNumberManager.getNextIncrementNumber(projectRoot); // ✅
const next = await IncrementNumberManager.getNextIncrementNumber(projectRoot); // ❌
```

---

## Debugging Tips

### Tip 1: Enable Verbose Logging

**Add console.log in scanAllIncrementDirectories()**:
```typescript
dirsToScan.forEach(({ path: dirPath, label }) => {
  console.log(`[Scan] Checking ${label}: ${dirPath}`);
  if (!fs.existsSync(dirPath)) {
    console.log(`[Scan] ${label} does not exist, skipping`);
    return;
  }

  const entries = fs.readdirSync(dirPath);
  console.log(`[Scan] Found ${entries.length} entries in ${label}`);
  // ...
});
```

### Tip 2: Inspect Cache State

**Add method to dump cache**:
```typescript
static debugCache(): void {
  console.log('[Cache] Current state:');
  this.cache.forEach((value, key) => {
    console.log(`  ${key} → ${value}`);
  });
}
```

### Tip 3: Test with Real Filesystem

**Create temporary test project**:
```bash
mkdir /tmp/test-increment-gap
cd /tmp/test-increment-gap

mkdir -p .specweave/increments/0001-feature-a
mkdir -p .specweave/increments/_abandoned/0005-failed
mkdir -p .specweave/increments/_paused/0010-on-hold

node -e "
  const { IncrementNumberManager } = require('./dist/src/core/increment-utils.js');
  console.log('Next:', IncrementNumberManager.getNextIncrementNumber(process.cwd()));
"
# Expected: 0011
```

---

## Performance Optimization

### Optimization 1: Limit Subdirectory Depth

**Current**: Only scans immediate children (not recursive)

**Why**: `.specweave/increments/_abandoned/0001-feature/` is scanned, but `.specweave/increments/_abandoned/subfolder/0002-feature/` is NOT.

**Rationale**: Increments are always at top level (no nesting).

### Optimization 2: Early Exit on Cache Hit

**Implementation**:
```typescript
if (useCache) {
  const cached = this.cache.get(incrementsDir);
  if (cached) return String(cached).padStart(4, '0'); // Early return
}
// Expensive scan only happens if cache miss
```

### Optimization 3: Avoid Repeated Directory Checks

**Bad** (repeated `fs.existsSync`):
```typescript
if (fs.existsSync(main)) { /* scan main */ }
if (fs.existsSync(abandoned)) { /* scan abandoned */ }
if (fs.existsSync(paused)) { /* scan paused */ }
```

**Good** (single check per directory):
```typescript
dirsToScan.forEach(dir => {
  if (fs.existsSync(dir)) { /* scan */ } // Single check
});
```

---

## Validation Steps

**Before Commit**:
1. ✅ Run `npm run build` (no TypeScript errors)
2. ✅ Run `npm test` (all tests pass)
3. ✅ Run `npm test -- --coverage` (>95% coverage)
4. ✅ Manual test: Create increment, abandon, create new (no collision)
5. ✅ Check deprecation warnings appear in console

**Before PR**:
1. ✅ Update ADR (if architecture changed)
2. ✅ Update plan.md (if implementation deviated)
3. ✅ Update CHANGELOG.md (user-facing changes)
4. ✅ Run linter: `npm run lint`
5. ✅ Run E2E tests: `npm run test:e2e`

---

## Quick Reference

**Core Utility**:
```typescript
import { IncrementNumberManager } from '../../core/increment-utils';

const next = IncrementNumberManager.getNextIncrementNumber(projectRoot);
const exists = IncrementNumberManager.incrementNumberExists('0032', projectRoot);
IncrementNumberManager.clearCache();
```

**Migration Pattern**:
```javascript
// OLD
function getNextFeatureNumber(featuresDir) { /* ... */ }

// NEW
function getNextFeatureNumber(featuresDir) {
  console.warn('[DEPRECATED]');
  const projectRoot = path.resolve(featuresDir, '../..');
  return IncrementNumberManager.getNextIncrementNumber(projectRoot);
}
```

**Test Helper**:
```typescript
function createIncrement(name: string) {
  const dir = path.join(projectRoot, '.specweave', 'increments', name);
  fs.mkdirSync(dir, { recursive: true });
}
```

---

## Estimated Time

| Task | Duration |
|------|----------|
| Create `increment-utils.ts` | 30 min |
| Update `feature-utils.js` | 10 min |
| Update `jira-mapper.ts` | 5 min |
| Update `jira-incremental-mapper.ts` | 5 min |
| Write unit tests (40 tests) | 2 hours |
| Write integration tests (8 tests) | 30 min |
| Write E2E tests (5 tests) | 30 min |
| Documentation updates | 30 min |
| **Total** | **~5 hours** |

**Contingency**: +1 hour for debugging (total: 6 hours)

---

**Good luck! 🚀**

For full details, see:
- [plan.md](./plan.md) - Complete implementation plan
- [ADR-0032](../../docs/internal/architecture/adr/0032-increment-number-gap-prevention.md) - Architecture decisions
- [Test Strategy](../../docs/internal/architecture/test-strategy-increment-numbering.md) - All 53 test cases
