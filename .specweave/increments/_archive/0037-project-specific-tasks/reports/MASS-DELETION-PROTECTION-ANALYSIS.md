# Mass Deletion Protection Analysis

**Date**: 2025-11-17
**Issue**: `.specweave/` folders being deleted despite pre-commit protection
**Status**: ROOT CAUSES IDENTIFIED

---

## Executive Summary

Pre-commit hook protection (added in increment 0039) **only prevents git commits** with mass deletions. It does **NOT** protect against:

1. ✅ **Direct file system operations** (like `fs.rmSync()`, `fs.removeSync()`)
2. ✅ **CLI commands** (`specweave init` with fresh start)
3. ✅ **Test scripts** that create/delete inside real `.specweave/`

**The deletion is happening BEFORE commit**, so git hooks never trigger!

---

## Root Causes Found

### 1. **`specweave init` Command** (PRIMARY CULPRIT)

**File**: `src/cli/commands/init.ts:399` and `init.ts:497`

```typescript
// Line 399 - Current directory initialization
fs.removeSync(specweavePath);

// Line 497 - Subdirectory initialization
fs.removeSync(path.join(targetDir, '.specweave'));
```

**When it happens**:
- User runs `specweave init .` and selects "Fresh start"
- User runs `specweave init . --force` (even with confirmation)
- Deletes **entire** `.specweave/` directory via file system
- Pre-commit hook **never triggers** (no git operation yet)

**Protection in place**:
- ✅ Requires confirmation (even in `--force` mode)
- ✅ Creates automatic backup (`.specweave.backup-YYYY-MM-DD`)
- ✅ Big red warning messages
- ❌ **NOT protected by git hooks** (file system operation)

**Example flow**:
```bash
# User runs:
specweave init .

# User selects: "Fresh start"
# Confirms deletion
# → fs.removeSync() executes
# → .specweave/ DELETED
# → Backup created (.specweave.backup-2025-11-17)
# → User later commits → pre-commit hook sees deletion
# → But too late - files already gone!
```

---

### 2. **Test Scripts** (SECONDARY CULPRIT)

**File**: `scripts/test-github-sync.ts:44-49`

```typescript
const testIncrementPath = path.join(__dirname, '..', '.specweave', 'increments', '9999-github-sync-test');

if (fs.existsSync(testIncrementPath)) {
  console.log('   Cleaning up existing test increment...');
  fs.rmSync(testIncrementPath, { recursive: true, force: true });
}
```

**Problem**:
- Creates test increment INSIDE real `.specweave/increments/`
- Deletes it with `fs.rmSync()` (direct file system operation)
- If script interrupted/errors, test increment remains
- No protection from git hooks (file system operation)

**Other test cleanup operations** (found via grep):
- `tests/unit/status-line/status-line-manager.test.ts:33` - Uses temp dir ✅
- `tests/e2e/archive-command.spec.ts:101` - Uses TEST_ROOT ✅
- Multiple test files use proper isolated directories ✅

**Only `scripts/test-github-sync.ts` uses real `.specweave/`** ❌

---

### 3. **Pre-commit Hook Limitation**

**File**: `.git/hooks/pre-commit:11-34`

```bash
# Checks for mass deletions in git staging area
DELETED_COUNT=$(git status --short | grep "^ D .specweave/" | wc -l)

if [ "$DELETED_COUNT" -gt "$THRESHOLD" ]; then
  exit 1
fi
```

**What it protects**:
- ✅ Blocks git commits with >50 deleted `.specweave/` files
- ✅ Prevents accidental `git add .` after mass deletion
- ✅ Shows restore command (`git restore .specweave/`)

**What it DOESN'T protect**:
- ❌ Direct file system operations (`fs.removeSync()`, `rm -rf`)
- ❌ Operations that happen BEFORE commit
- ❌ CLI commands (`specweave init`)
- ❌ Test scripts

**Timeline issue**:
```
1. File system operation deletes .specweave/
   ↓
2. User notices (or doesn't)
   ↓
3. User tries to commit
   ↓
4. Pre-commit hook triggers ← TOO LATE!
   ↓
5. Hook blocks commit
   ↓
6. But files already deleted
```

---

## Why "Somehow Restored"?

**Possible explanations**:

1. **Automatic backup restoration** (init.ts:363-375):
   - `specweave init` creates `.specweave.backup-YYYY-MM-DD`
   - User might have manually restored: `mv .specweave.backup-* .specweave`

2. **Git restore** (pre-commit hook message):
   - Pre-commit hook suggests: `git restore .specweave/`
   - User runs it → files restored from last commit

3. **Multiple init runs**:
   - User runs `specweave init .` → deletes `.specweave/`
   - User runs `specweave init .` again → creates fresh `.specweave/`
   - Looks like "restoration" but actually recreation

4. **Test script cleanup**:
   - Test creates `9999-github-sync-test` in `.specweave/increments/`
   - Test finishes → deletes only that increment
   - Other increments untouched → looks partially restored

---

## Operations That DON'T Delete Files

Checked and **SAFE**:

1. ✅ **Archive operations** (`increment-archiver.ts:274`):
   ```typescript
   await fs.move(sourcePath, targetPath, { overwrite: false });
   ```
   - Just **moves** increments to `_archive/`
   - No deletion of `.specweave/`

2. ✅ **Abandon operations** (`status-commands.ts:242`):
   ```typescript
   MetadataManager.updateStatus(incrementId, IncrementStatus.ABANDONED, abandonReason);
   ```
   - Only updates **metadata status**
   - No file deletion

3. ✅ **Restore operations** (`increment-archiver.ts:406`):
   ```typescript
   await fs.move(sourcePath, targetPath);
   ```
   - Moves increments FROM `_archive/` back
   - No deletion

---

## Comprehensive Protection Strategy

### Immediate Fixes (High Priority)

#### 1. **Add File System Protection to init.ts**

**Problem**: `fs.removeSync()` bypasses git hooks

**Solution**: Add safeguard layer BEFORE deletion

```typescript
// src/cli/commands/init.ts

import { isProductionSpecweaveDirectory } from '../utils/safeguards.js';

// Before line 399:
if (isProductionSpecweaveDirectory(specweavePath)) {
  // CRITICAL: Ask for TRIPLE confirmation for production deletions
  console.log(chalk.red.bold('\n⛔ DANGER ZONE: PRODUCTION DATA DELETION'));
  console.log(chalk.red('   You are about to delete a production .specweave/ folder'));
  console.log(chalk.red('   This folder contains:'));

  // Count increments
  const incrementCount = fs.readdirSync(path.join(specweavePath, 'increments'))
    .filter(f => /^\d{4}-/.test(f)).length;

  console.log(chalk.red(`     • ${incrementCount} increments`));
  console.log(chalk.red('     • All documentation'));
  console.log(chalk.red('     • All history'));

  // TRIPLE confirmation
  const { confirm1 } = await inquirer.prompt([{
    type: 'input',
    name: 'confirm1',
    message: 'Type "DELETE" in all caps to proceed:',
  }]);

  if (confirm1 !== 'DELETE') {
    console.log(chalk.green('\n✅ Deletion cancelled. No data lost.'));
    process.exit(0);
  }

  // Verify backup exists
  if (!fs.existsSync(backupPath)) {
    console.log(chalk.red('\n❌ ERROR: Cannot create backup'));
    console.log(chalk.red('   Aborting to protect your data'));
    process.exit(1);
  }
}

// Then proceed with fs.removeSync()
```

**New file needed**: `src/cli/utils/safeguards.ts`

```typescript
export function isProductionSpecweaveDirectory(specweavePath: string): boolean {
  // Check if this looks like a real .specweave/ with increments
  const incrementsPath = path.join(specweavePath, 'increments');

  if (!fs.existsSync(incrementsPath)) {
    return false; // Empty or incomplete .specweave/
  }

  // Count real increments (0001-*, 0002-*, etc.)
  const increments = fs.readdirSync(incrementsPath)
    .filter(f => /^\d{4}-/.test(f));

  // If >2 increments, consider it production
  return increments.length > 2;
}
```

#### 2. **Fix Test Script to Use Temp Directory**

**Problem**: `scripts/test-github-sync.ts` uses real `.specweave/increments/`

**Solution**: Use `os.tmpdir()` for test data

```typescript
// scripts/test-github-sync.ts

import * as os from 'os';

// BEFORE (LINE 44):
// const testIncrementPath = path.join(__dirname, '..', '.specweave', 'increments', '9999-github-sync-test');

// AFTER:
const testIncrementPath = path.join(os.tmpdir(), 'specweave-test', '9999-github-sync-test');
```

**Benefits**:
- ✅ Never touches real `.specweave/`
- ✅ OS automatically cleans up `/tmp/`
- ✅ Safe even if script crashes

#### 3. **Add Runtime Protection Layer**

**New file**: `src/core/filesystem/protected-delete.ts`

```typescript
/**
 * Protected deletion wrapper - prevents accidental .specweave/ deletion
 */
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';

export async function safeDelete(targetPath: string, options?: {
  reason?: string;
  force?: boolean;
}): Promise<void> {
  const absolutePath = path.resolve(targetPath);

  // Check if deleting .specweave/ or subdirectories
  if (absolutePath.includes('.specweave')) {
    console.log(chalk.yellow('\n⚠️  Attempting to delete .specweave/ directory'));
    console.log(chalk.gray(`   Path: ${absolutePath}`));
    console.log(chalk.gray(`   Reason: ${options?.reason || 'Not specified'}`));

    // Count files
    const fileCount = await countFiles(absolutePath);

    if (fileCount > 50 && !options?.force) {
      throw new Error(
        `Blocked: Attempting to delete ${fileCount} files in .specweave/\n` +
        `Use { force: true } to override this protection`
      );
    }
  }

  // Proceed with deletion
  await fs.remove(absolutePath);
}

async function countFiles(dir: string): Promise<number> {
  // Implementation...
}
```

**Then replace all `fs.removeSync()` calls** in init.ts with `safeDelete()`.

---

### Medium Priority

#### 4. **Add Pre-Deletion Snapshot**

Before any `.specweave/` deletion, create a git stash:

```typescript
// In init.ts, before fs.removeSync():

// Create git stash snapshot
try {
  execSync('git add .specweave/', { stdio: 'ignore' });
  execSync('git stash save "Pre-init snapshot (auto-saved)"', { stdio: 'ignore' });
  console.log(chalk.cyan('   📸 Created git stash snapshot'));
  console.log(chalk.gray('      To restore: git stash pop'));
} catch (e) {
  // Git not available or no changes
}
```

#### 5. **Add Deletion Audit Log**

Track all `.specweave/` deletions:

```typescript
// .specweave/state/deletion-audit.json

{
  "deletions": [
    {
      "timestamp": "2025-11-17T15:30:00Z",
      "command": "specweave init . --force",
      "user": "antonabyzov",
      "incrementCount": 15,
      "backupPath": ".specweave.backup-2025-11-17",
      "reason": "Fresh start requested"
    }
  ]
}
```

#### 6. **Add File Watcher Protection**

Use `chokidar` to watch `.specweave/` for mass deletions:

```typescript
// Run in background during development
const watcher = chokidar.watch('.specweave/', {
  ignored: /(^|[\/\\])\../,
  persistent: true
});

watcher.on('unlinkDir', (path) => {
  console.log(chalk.red(`⚠️  ALERT: Directory deleted: ${path}`));
  // Could send notification, create snapshot, etc.
});
```

---

### Low Priority (Nice to Have)

#### 7. **Add "Undo" Command**

```bash
specweave undo-init
# Finds latest .specweave.backup-* and restores it
```

#### 8. **Add Dry-Run Mode**

```bash
specweave init . --dry-run
# Shows what WOULD be deleted without actually deleting
```

#### 9. **Add Deletion Report**

Before deletion, show comprehensive report:

```
⚠️  DELETION REPORT:

  Increments:
    • 0001-setup (completed, 3 days old)
    • 0002-auth (active, in progress!) ← WARNING
    • 0003-api (paused, 10 days old)
    ... (12 more)

  Docs:
    • 15 internal architecture docs
    • 8 public guides
    • 3 ADRs

  Total size: 2.3 MB

  Backup will be created at: .specweave.backup-2025-11-17

  Continue? [y/N]
```

---

## Recommended Implementation Order

### Phase 1: Immediate (Today)

1. ✅ Fix `scripts/test-github-sync.ts` to use temp directory
2. ✅ Add `isProductionSpecweaveDirectory()` check to init.ts
3. ✅ Add triple confirmation for production deletions

### Phase 2: This Week

4. Add `safeDelete()` wrapper function
5. Replace all `fs.removeSync()` calls with `safeDelete()`
6. Add pre-deletion git stash snapshot

### Phase 3: Next Sprint

7. Add deletion audit log
8. Add file watcher protection (dev mode)
9. Add `specweave undo-init` command

---

## Testing Strategy

### Unit Tests

```typescript
describe('Protection Layer', () => {
  it('should block deletion of .specweave/ without force', async () => {
    await expect(
      safeDelete('.specweave/', { force: false })
    ).rejects.toThrow('Blocked: Attempting to delete');
  });

  it('should allow deletion with force flag', async () => {
    await safeDelete('.specweave/', { force: true });
    // Should succeed
  });

  it('should create backup before deletion', async () => {
    await deleteWithBackup('.specweave/');
    expect(fs.existsSync('.specweave.backup-*')).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('Init Command Protection', () => {
  it('should require triple confirmation for production .specweave/', async () => {
    // Create production-like .specweave/ with 5+ increments
    // Run specweave init . (select fresh start)
    // Verify triple confirmation required
  });

  it('should create backup before deletion', async () => {
    // Run specweave init . --force
    // Verify .specweave.backup-* exists
  });

  it('should block deletion if backup fails', async () => {
    // Mock fs.copySync to throw error
    // Run specweave init . --force
    // Verify deletion blocked
  });
});
```

### E2E Tests

```bash
# Manual test script
cd /tmp/test-specweave
specweave init my-project
cd my-project

# Create some increments
specweave increment "Feature 1"
specweave increment "Feature 2"
specweave increment "Feature 3"

# Try to delete (should require triple confirmation)
specweave init . --force
# Verify prompts:
# 1. Big red warning
# 2. Shows increment count
# 3. Requires "DELETE" in caps
# 4. Creates backup
# 5. Actually deletes

# Verify backup exists
ls -la .specweave.backup-*

# Restore from backup
mv .specweave.backup-* .specweave

# Verify increments restored
specweave status
```

---

## Conclusion

**Current state**:
- ❌ Pre-commit hook protection **insufficient** (only blocks commits, not file operations)
- ❌ Multiple deletion vectors exist (init command, test scripts)
- ✅ Backup mechanism exists but insufficient warning

**After fixes**:
- ✅ File system layer protection (triple confirmation)
- ✅ Test isolation (no real `.specweave/` usage)
- ✅ Audit trail and snapshots
- ✅ Easy restoration mechanism

**Key insight**: **Git hooks protect commits, not file operations**. Need protection at file system layer!

---

## References

- Pre-commit hook: `.git/hooks/pre-commit:11-34`
- Init command: `src/cli/commands/init.ts:399` and `init.ts:497`
- Test script: `scripts/test-github-sync.ts:44-49`
- Archive operations: `src/core/increment/increment-archiver.ts:274`
- Related issue: `.specweave/increments/0039/reports/ACCIDENTAL-DELETION-RECOVERY-2025-11-17.md`
