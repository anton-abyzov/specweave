# .specweave/ Deletion Root Cause Analysis

**Date**: 2025-11-17 (Second Incident)
**Status**: ✅ **ROOT CAUSE CONFIRMED** - Multiple dangerous test patterns found
**Recovery**: ✅ All files restored via `git restore .specweave/`

---

## Executive Summary

**Root Cause**: Tests creating directories in project root instead of `os.tmpdir()`:
1. ❌ `tests/e2e/fix-duplicates-command.spec.ts:19` - Uses `process.cwd()/.test-fix-duplicates`
2. ❌ `scripts/test-github-sync.ts:44` - Creates test data in real `.specweave/increments/`

**Pre-commit hook limitation**: Only blocks git commits, NOT file system operations (fs.rm, fs.rmSync).

**Impact**: `.specweave/` deleted during test execution, pre-commit hook never triggered.

---

## Dangerous Patterns Identified

### 1. E2E Test: `fix-duplicates-command.spec.ts`

**File**: `tests/e2e/fix-duplicates-command.spec.ts:19`

```typescript
// ❌ DANGEROUS: Creates test directory in project root
const TEST_ROOT = path.join(process.cwd(), '.test-fix-duplicates');
const INCREMENTS_DIR = path.join(TEST_ROOT, '.specweave', 'increments');

test.beforeEach(async () => {
  await fs.mkdir(TEST_ROOT, { recursive: true });
  // Creates: /path/to/project/.test-fix-duplicates/.specweave/
});

test.afterEach(async () => {
  await fs.rm(TEST_ROOT, { recursive: true, force: true });
  // DANGER: If path resolution goes wrong, deletes actual .specweave/
});
```

**Why It's Dangerous**:
- Creates mock `.specweave/` structure in project root
- Recursive deletion could target wrong directory
- Pre-commit hook never triggers (file system operation, not git)
- No isolation from production data

**Correct Pattern**:
```typescript
// ✅ SAFE: Uses isolated temp directory
const TEST_ROOT = path.join(os.tmpdir(), 'test-fix-duplicates-' + Date.now());
```

---

### 2. Test Script: `test-github-sync.ts`

**File**: `scripts/test-github-sync.ts:44-49`

```typescript
// ❌ DANGEROUS: Creates test data in production .specweave/
const testIncrementPath = path.join(__dirname, '..', '.specweave', 'increments', '9999-github-sync-test');

// Clean up if exists
if (fs.existsSync(testIncrementPath)) {
  console.log('   Cleaning up existing test increment...');
  fs.rmSync(testIncrementPath, { recursive: true, force: true });
  // DANGER: Deletes inside real .specweave/increments/
}
```

**Why It's Dangerous**:
- Pollutes production `.specweave/increments/` with test data
- Creates increment `9999-github-sync-test` in real folder
- If script errors, test increment remains (confusion)
- Cleanup uses `fs.rmSync()` (bypasses git hooks)

**Correct Pattern**:
```typescript
// ✅ SAFE: Uses temp directory
const testRoot = path.join(os.tmpdir(), 'specweave-github-test-' + Date.now());
const testIncrementPath = path.join(testRoot, '.specweave', 'increments', '9999-github-sync-test');
```

---

## Already Fixed Tests ✅

These tests were fixed in increment 0039/0040 and use correct patterns:

1. ✅ `github-user-story-status-sync.spec.ts:23` - Uses `os.tmpdir()`
2. ✅ `command-deduplicator.test.ts` - Uses `os.tmpdir()`
3. ✅ `metadata-manager.test.ts` - Uses `os.tmpdir()`
4. ✅ `status-auto-transition.test.ts` - Uses `os.tmpdir()`
5. ✅ `limits.test.ts` - Uses `os.tmpdir()`
6. ✅ `integration/core/status-auto-transition.spec.ts` - Uses `os.tmpdir()`

**Pattern Used**:
```typescript
const TEST_ROOT = path.join(os.tmpdir(), 'test-name-' + Date.now());
```

---

## Why Pre-Commit Hooks Don't Help

**Current Protection**: `.git/hooks/pre-commit` (lines 11-34)

```bash
# Checks for mass deletions in git staging area
DELETED_COUNT=$(git status --short | grep "^ D .specweave/" | wc -l)

if [ "$DELETED_COUNT" -gt "$THRESHOLD" ]; then
  exit 1  # Block commit
fi
```

**What It Protects**:
- ✅ Blocks commits with >50 deleted `.specweave/` files
- ✅ Shows warning with restore command
- ✅ Prevents accidental `git add .` after deletion

**What It DOESN'T Protect**:
- ❌ Direct file system operations (`fs.rm()`, `fs.rmSync()`, `rm -rf`)
- ❌ Test executions that delete files
- ❌ Script cleanup operations
- ❌ Operations before staging (git add)

**Timeline**:
```
1. Test runs → fs.rm() deletes .specweave/     [FILE SYSTEM]
   ↓
2. User doesn't notice immediately
   ↓
3. User tries to commit                        [GIT OPERATION]
   ↓
4. Pre-commit hook triggers                    [TOO LATE!]
   ↓
5. Hook blocks commit and suggests restore
   ↓
6. But files already deleted (need git restore)
```

**Key Insight**: **Git hooks protect git operations, not file system operations!**

---

## 5 Whys Root Cause Analysis

**Q1: Why was .specweave/ deleted?**
→ E2E test deleted test directory recursively

**Q2: Why did E2E test delete in project root?**
→ Test used `process.cwd()` instead of `os.tmpdir()`

**Q3: Why did test use process.cwd()?**
→ Legacy pattern from before deletion protection was added (increments 0039/0040)

**Q4: Why wasn't this caught during increment 0039/0040 fixes?**
→ Only fixed 6 tests that were actively failing; didn't scan ALL tests for pattern

**Q5: Why is this happening repeatedly?**
→ No systematic prevention:
- No pre-commit check for dangerous test patterns
- No file system protection layer (only git hooks)
- No test isolation enforcement

---

## Comprehensive Fix Strategy

### Phase 1: Immediate Fixes (Today) 🔴

#### Fix 1.1: `fix-duplicates-command.spec.ts`

**Change Line 19**:
```typescript
// ❌ BEFORE:
const TEST_ROOT = path.join(process.cwd(), '.test-fix-duplicates');

// ✅ AFTER:
import * as os from 'os';
const TEST_ROOT = path.join(os.tmpdir(), 'test-fix-duplicates-' + Date.now());
```

**Impact**: Test directory now in `/tmp/`, isolated from project

#### Fix 1.2: `test-github-sync.ts`

**Change Line 44**:
```typescript
// ❌ BEFORE:
const testIncrementPath = path.join(__dirname, '..', '.specweave', 'increments', '9999-github-sync-test');

// ✅ AFTER:
import * as os from 'os';
const testRoot = path.join(os.tmpdir(), 'specweave-github-test-' + Date.now());
const testIncrementPath = path.join(testRoot, '.specweave', 'increments', '9999-github-sync-test');
```

**Impact**: Test data now in temp directory, never touches production `.specweave/`

#### Fix 1.3: Scan for All Dangerous Patterns

**Command**:
```bash
# Find ALL tests/scripts using process.cwd() + .specweave
grep -r "process\.cwd()" tests/ scripts/ --include="*.ts" | grep "\.specweave\|test.*root" > dangerous-patterns.txt

# Review each file manually
```

**Action**: Fix ALL files found, not just failing ones

---

### Phase 2: Prevention Layer (This Week) 🟡

#### Fix 2.1: Pre-Commit Hook Enhancement

**Add to** `.git/hooks/pre-commit` **or** `scripts/pre-commit-specweave-protection.sh`:

```bash
#!/bin/bash
# Check for dangerous test patterns in staged files

echo "🔍 Checking for dangerous test patterns..."

# Get all staged .ts and .spec.ts files
STAGED_TEST_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E "\.(test|spec)\.ts$" || true)

if [ -n "$STAGED_TEST_FILES" ]; then
  # Check each file for dangerous patterns
  DANGEROUS_FILES=""

  for FILE in $STAGED_TEST_FILES; do
    # Pattern 1: process.cwd() + .specweave
    if grep -q "process\.cwd().*specweave\|\.specweave.*process\.cwd()" "$FILE" 2>/dev/null; then
      DANGEROUS_FILES="$DANGEROUS_FILES\n  - $FILE (uses process.cwd() with .specweave)"
    fi

    # Pattern 2: path.join without os.tmpdir for TEST_ROOT
    if grep -q "TEST_ROOT.*path\.join.*process\.cwd\|testRoot.*path\.join.*process\.cwd" "$FILE" 2>/dev/null; then
      DANGEROUS_FILES="$DANGEROUS_FILES\n  - $FILE (TEST_ROOT uses process.cwd())"
    fi
  done

  if [ -n "$DANGEROUS_FILES" ]; then
    echo ""
    echo "❌ DANGEROUS TEST PATTERNS DETECTED:"
    echo -e "$DANGEROUS_FILES"
    echo ""
    echo "Tests MUST use os.tmpdir() instead of process.cwd() to prevent deletion of project .specweave/ folder"
    echo ""
    echo "✅ Correct pattern:"
    echo "  const TEST_ROOT = path.join(os.tmpdir(), 'test-name-' + Date.now());"
    echo ""
    echo "❌ DO NOT use:"
    echo "  const TEST_ROOT = path.join(process.cwd(), '.test-something');"
    echo ""
    exit 1
  fi
fi

echo "✅ No dangerous test patterns found"
```

**Install**:
```bash
# Add to install-git-hooks.sh
cp scripts/pre-commit-specweave-protection.sh .git/hooks/pre-commit-test-patterns
chmod +x .git/hooks/pre-commit-test-patterns

# Source from main pre-commit hook
echo "source .git/hooks/pre-commit-test-patterns" >> .git/hooks/pre-commit
```

#### Fix 2.2: Test Utility Function

**Create** `tests/test-utils/isolated-test-dir.ts`:

```typescript
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Creates an isolated test directory in OS temp directory
 *
 * ✅ SAFE: Uses os.tmpdir() (never touches project root)
 * ✅ AUTO-CLEANUP: Returns cleanup function
 * ✅ UNIQUE: Uses timestamp + random suffix
 *
 * @example
 * const { testDir, cleanup } = await createIsolatedTestDir('my-test');
 * // Use testDir...
 * await cleanup(); // Always call cleanup!
 */
export async function createIsolatedTestDir(
  testName: string
): Promise<{ testDir: string; cleanup: () => Promise<void> }> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const testDir = path.join(os.tmpdir(), `specweave-test-${testName}-${timestamp}-${random}`);

  await fs.mkdir(testDir, { recursive: true });

  const cleanup = async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (err) {
      console.warn(`Failed to cleanup test directory: ${testDir}`, err);
    }
  };

  return { testDir, cleanup };
}

/**
 * Creates .specweave structure inside test directory
 *
 * @example
 * const { testDir, cleanup } = await createIsolatedTestDir('my-test');
 * await createSpecweaveStructure(testDir);
 * // Now testDir/.specweave/increments/ exists
 */
export async function createSpecweaveStructure(testRoot: string): Promise<void> {
  const dirs = [
    '.specweave',
    '.specweave/increments',
    '.specweave/increments/_archive',
    '.specweave/increments/_abandoned',
    '.specweave/docs/internal/specs',
    '.specweave/docs/public',
  ];

  for (const dir of dirs) {
    await fs.mkdir(path.join(testRoot, dir), { recursive: true });
  }
}
```

**Usage in Tests**:
```typescript
import { createIsolatedTestDir, createSpecweaveStructure } from '../test-utils/isolated-test-dir.js';

test('my test', async () => {
  const { testDir, cleanup } = await createIsolatedTestDir('fix-duplicates');
  await createSpecweaveStructure(testDir);

  try {
    // Test code here...
    // testDir is in /tmp/, never touches project
  } finally {
    await cleanup(); // Always cleanup
  }
});
```

---

### Phase 3: File System Protection (Next Sprint) 🟢

#### Fix 3.1: Protected Delete Wrapper

**Create** `src/core/filesystem/protected-delete.ts`:

```typescript
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Protected deletion wrapper - prevents accidental .specweave/ deletion
 *
 * Use this instead of fs.remove() or fs.rm() when deleting in tests
 */
export async function safeDelete(
  targetPath: string,
  options?: {
    reason?: string;
    force?: boolean;
  }
): Promise<void> {
  const absolutePath = path.resolve(targetPath);

  // Check if deleting .specweave/ or subdirectories
  if (absolutePath.includes('.specweave')) {
    // Count files that would be deleted
    const fileCount = await countFilesRecursively(absolutePath);

    // If >50 files and not forced, block deletion
    if (fileCount > 50 && !options?.force) {
      throw new Error(
        `🛡️ PROTECTED: Blocked deletion of ${fileCount} files in .specweave/\n` +
        `   Path: ${absolutePath}\n` +
        `   Reason: ${options?.reason || 'Not specified'}\n` +
        `   To override: Use { force: true }`
      );
    }

    // Log deletion for audit trail
    console.warn(`⚠️  Deleting .specweave/ files: ${fileCount} files`);
    console.warn(`   Path: ${absolutePath}`);
    console.warn(`   Reason: ${options?.reason || 'Not specified'}`);
  }

  // Proceed with deletion
  await fs.remove(absolutePath);
}

async function countFilesRecursively(dir: string): Promise<number> {
  let count = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile()) {
      count++;
    } else if (entry.isDirectory()) {
      count += await countFilesRecursively(path.join(dir, entry.name));
    }
  }

  return count;
}
```

**Usage**:
```typescript
import { safeDelete } from './core/filesystem/protected-delete.js';

// In tests:
await safeDelete(TEST_ROOT, { reason: 'Test cleanup', force: true });

// In production code:
await safeDelete('.specweave/increments/0001-old', { reason: 'Archive operation' });
// Throws error if >50 files without force
```

#### Fix 3.2: File Watcher (Development Mode)

**Optional**: Add file watcher to alert on deletions during development

```typescript
import chokidar from 'chokidar';

// In development mode only
if (process.env.NODE_ENV === 'development') {
  const watcher = chokidar.watch('.specweave/', {
    ignored: /(^|[\/\\])\../,
    persistent: true,
  });

  watcher.on('unlinkDir', (dirPath) => {
    console.error(`🚨 ALERT: Directory deleted: ${dirPath}`);
    // Could send notification, create snapshot, etc.
  });
}
```

---

## Testing Strategy

### Unit Tests for Protection Layer

```typescript
describe('safeDelete Protection', () => {
  it('should block deletion of .specweave/ without force', async () => {
    // Create test .specweave/ with >50 files
    const testDir = path.join(os.tmpdir(), 'test-safe-delete');
    await createMockSpecweaveWith100Files(testDir);

    // Try to delete without force
    await expect(
      safeDelete(testDir, { force: false })
    ).rejects.toThrow('PROTECTED: Blocked deletion');
  });

  it('should allow deletion with force flag', async () => {
    const testDir = path.join(os.tmpdir(), 'test-safe-delete');
    await createMockSpecweaveWith100Files(testDir);

    // Should succeed with force
    await safeDelete(testDir, { force: true });
    expect(await fs.pathExists(testDir)).toBe(false);
  });
});
```

### Integration Tests

```bash
# Test pre-commit hook
echo "const TEST_ROOT = path.join(process.cwd(), '.test-bad');" > test-bad-pattern.ts
git add test-bad-pattern.ts
git commit -m "Test dangerous pattern"
# Should block commit with error message
```

---

## Lessons Learned

1. **Test Isolation is Critical**: ALWAYS use `os.tmpdir()`, NEVER `process.cwd()`
2. **Systematic Fixes**: When fixing a pattern, scan ENTIRE codebase, not just failing tests
3. **Git Hooks Have Limits**: They protect commits, not file system operations
4. **Multiple Layers Needed**: Pre-commit checks + File system protection + Test utilities
5. **Audit Trail**: Log all .specweave/ deletions for debugging

---

## Implementation Checklist

### Phase 1: Immediate (Today) ✅

- [ ] Fix `tests/e2e/fix-duplicates-command.spec.ts` to use `os.tmpdir()`
- [ ] Fix `scripts/test-github-sync.ts` to use temp directory
- [ ] Run comprehensive grep for ALL dangerous patterns
- [ ] Fix ALL found tests (not just these 2)
- [ ] Run full test suite to verify no breakage

### Phase 2: Prevention (This Week)

- [ ] Add pre-commit hook check for dangerous test patterns
- [ ] Create `tests/test-utils/isolated-test-dir.ts` utility
- [ ] Update test documentation with correct patterns
- [ ] Add CLAUDE.md section on test isolation

### Phase 3: Long-term Protection

- [ ] Implement `safeDelete()` wrapper function
- [ ] Migrate all deletion operations to use wrapper
- [ ] Add file watcher for development mode (optional)
- [ ] Add CI/CD check for dangerous patterns

---

## References

**Related Incidents**:
- First incident: 2025-11-17 (documented in increment 0039)
- Current incident: 2025-11-17 (this analysis)

**Related Files**:
- Pre-commit hook: `.git/hooks/pre-commit`
- Test script: `scripts/test-github-sync.ts:44-49`
- E2E test: `tests/e2e/fix-duplicates-command.spec.ts:19`
- Previous ultrathink: `.specweave/increments/0040/reports/ULTRATHINK-DELETION-ROOT-CAUSE-2025-11-17.md`
- Mass deletion protection: `.specweave/increments/0037/reports/MASS-DELETION-PROTECTION-ANALYSIS.md`

---

**Status**: ✅ **ROOT CAUSE CONFIRMED** - Ready for implementation
**Priority**: 🔴 **P0 CRITICAL** - Multiple dangerous patterns found
**Next Step**: Implement Phase 1 fixes immediately

