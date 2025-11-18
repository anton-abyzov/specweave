# ULTRATHINK: Prevent Duplicate Living Docs Files

**Date**: 2025-11-18
**Problem**: Duplicate user story files created with inconsistent naming
**User Request**: "it MUST not be possible!!! ultrathink to automate, cleanup what's wrong!"

---

## Problem Analysis

### Current State

**Found duplicates**:
1. ❌ `us-001-status-line-shows-correct-active-increment.md.updated.tmp` (temp file not cleaned)
2. ✅ `us-001-status-line-shows-correct-active-increment-priority-p1-critical-.md` (correct)

**Root Causes**:
1. **Inconsistent file naming** - Living docs sync sometimes creates files with priority suffix, sometimes without
2. **Temporary files not cleaned** - `.updated.tmp` files left behind after updates
3. **No duplicate detection** - Sync doesn't check if files already exist with different names
4. **No cleanup automation** - Manual cleanup required

---

## Solution: Multi-Layer Protection

### Layer 1: Standardize File Naming (MANDATORY)

**Problem**: User story file naming is INCONSISTENT

**Current code** (`src/core/living-docs/living-docs-sync.ts` createUserStoryFiles):
```typescript
// Inconsistent! Sometimes includes priority, sometimes doesn't
const fileName = `${storyId.toLowerCase()}-${storySlug}.md`;
// OR
const fileName = `${storyId.toLowerCase()}-${storySlug}-priority-${priority}.md`;
```

**Solution**: ALWAYS use the SAME naming pattern

**Recommendation**: Use the SIMPLER pattern (WITHOUT priority suffix) because:
- ✅ Shorter URLs in GitHub
- ✅ Easier to reference
- ✅ Priority is in frontmatter anyway
- ✅ No breaking changes needed

**Proposed fix**:
```typescript
/**
 * Generate standardized user story filename
 *
 * RULE: ALWAYS use format: {us-id}-{slug}.md (NO priority suffix)
 *
 * Examples:
 *   US-001: "Status Line..." → us-001-status-line-shows-correct-active-increment.md
 *   US-005: "Living Docs..." → us-005-living-docs-sync-triggers-external-tool-updates.md
 */
private generateUserStoryFileName(storyId: string, title: string): string {
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  return `${storyId.toLowerCase()}-${slug}.md`;
}
```

**Change required**: Update `createUserStoryFiles()` to ALWAYS use this naming pattern

---

### Layer 2: Detect & Remove Duplicates Automatically

**Add duplicate detection to `syncIncrement()`**:

```typescript
async syncIncrement(incrementId: string, options: SyncOptions): Promise<SyncResult> {
  // ... existing code ...

  // STEP 0: Clean up duplicates BEFORE syncing
  await this.cleanupDuplicateFiles(featureId, projectPath);

  // ... rest of sync ...
}

/**
 * Clean up duplicate user story files
 *
 * Strategy:
 * 1. List all user story files in feature folder
 * 2. Group by user story ID (US-001, US-002, etc.)
 * 3. If multiple files found for same US:
 *    - Keep the file WITH most recent modification time
 *    - Delete older files
 *    - Log warning
 */
private async cleanupDuplicateFiles(
  featureId: string,
  projectPath: string
): Promise<void> {
  const files = await fs.readdir(projectPath);

  // Group files by user story ID
  const filesByStory = new Map<string, string[]>();

  for (const file of files) {
    // Match pattern: us-001-*, us-002-*, etc.
    const match = file.match(/^(us-\d+)-/);
    if (match) {
      const storyId = match[1].toUpperCase(); // US-001
      if (!filesByStory.has(storyId)) {
        filesByStory.set(storyId, []);
      }
      filesByStory.get(storyId)!.push(file);
    }
  }

  // Check for duplicates
  for (const [storyId, storyFiles] of filesByStory.entries()) {
    if (storyFiles.length > 1) {
      console.warn(`⚠️  Found ${storyFiles.length} files for ${storyId}:`);
      storyFiles.forEach(f => console.warn(`   - ${f}`));

      // Find the most recent file
      const fileTimes = await Promise.all(
        storyFiles.map(async (f) => ({
          file: f,
          mtime: (await fs.stat(path.join(projectPath, f))).mtime.getTime()
        }))
      );

      fileTimes.sort((a, b) => b.mtime - a.mtime); // Newest first
      const keepFile = fileTimes[0].file;
      const deleteFiles = fileTimes.slice(1).map(f => f.file);

      console.warn(`   → Keeping: ${keepFile} (most recent)`);

      // Delete older files
      for (const file of deleteFiles) {
        const filePath = path.join(projectPath, file);
        await fs.remove(filePath);
        console.warn(`   ✅ Deleted: ${file}`);
      }
    }
  }
}
```

**When to run**: BEFORE every living docs sync (automatic cleanup)

---

### Layer 3: Clean Up Temporary Files Automatically

**Add temp file cleanup to `updateTasksSection()`**:

```typescript
private async updateTasksSection(
  userStoryFile: string,
  tasksMarkdown: string
): Promise<void> {
  const content = await fs.readFile(userStoryFile, 'utf-8');

  // ... existing update logic ...

  await fs.writeFile(userStoryFile, updatedContent, 'utf-8');

  // CLEANUP: Remove any .tmp files
  const tmpFile = `${userStoryFile}.updated.tmp`;
  if (await fs.pathExists(tmpFile)) {
    await fs.remove(tmpFile);
  }
}
```

**Alternative**: Add a cleanup step at the END of `syncIncrement()`:

```typescript
async syncIncrement(incrementId: string, options: SyncOptions): Promise<SyncResult> {
  try {
    // ... existing sync logic ...

    // FINAL STEP: Clean up any temporary files
    await this.cleanupTempFiles(projectPath);

    return result;
  } catch (error) {
    // ... error handling ...
  }
}

/**
 * Clean up temporary files left behind by sync operations
 */
private async cleanupTempFiles(projectPath: string): Promise<void> {
  const files = await fs.readdir(projectPath);

  for (const file of files) {
    if (file.endsWith('.tmp') || file.endsWith('.backup')) {
      const filePath = path.join(projectPath, file);
      await fs.remove(filePath);
      console.log(`   🧹 Cleaned up: ${file}`);
    }
  }
}
```

---

### Layer 4: Pre-Commit Hook to Block Duplicates

**Add git pre-commit hook** (`.git/hooks/pre-commit`):

```bash
#!/bin/bash

# Check for duplicate user story files in living docs

echo "🔍 Checking for duplicate user story files..."

LIVING_DOCS_DIR=".specweave/docs/internal/specs"

# Find all user story files
US_FILES=$(find "$LIVING_DOCS_DIR" -name "us-*.md" -type f)

# Group by user story ID
declare -A US_COUNTS

for file in $US_FILES; do
  # Extract US-001, US-002, etc.
  if [[ $file =~ (us-[0-9]{3}) ]]; then
    US_ID="${BASH_REMATCH[1]}"
    US_COUNTS[$US_ID]=$((${US_COUNTS[$US_ID]:-0} + 1))
  fi
done

# Check for duplicates
DUPLICATES_FOUND=0

for US_ID in "${!US_COUNTS[@]}"; do
  if [ "${US_COUNTS[$US_ID]}" -gt 1 ]; then
    echo "❌ Duplicate files found for $US_ID:"
    find "$LIVING_DOCS_DIR" -name "${US_ID}-*.md" -type f
    DUPLICATES_FOUND=1
  fi
done

if [ $DUPLICATES_FOUND -eq 1 ]; then
  echo ""
  echo "⛔ COMMIT BLOCKED: Duplicate user story files detected"
  echo ""
  echo "Fix duplicates before committing:"
  echo "  1. Review duplicate files"
  echo "  2. Keep the most recent version"
  echo "  3. Delete older duplicates"
  echo "  4. Re-add files: git add ."
  echo ""
  exit 1
fi

echo "✅ No duplicate user story files found"
```

**Install hook**:
```bash
chmod +x .git/hooks/pre-commit
```

---

### Layer 5: Living Docs Sync Validation

**Add validation step AFTER file creation**:

```typescript
async syncIncrement(incrementId: string, options: SyncOptions): Promise<SyncResult> {
  // ... create files ...

  // VALIDATION: Check for duplicates after creation
  const duplicates = await this.validateNoDuplicates(projectPath);

  if (duplicates.length > 0) {
    throw new Error(
      `Living docs sync created duplicates:\n${duplicates.map(d => `  - ${d}`).join('\n')}`
    );
  }

  // ... continue sync ...
}

/**
 * Validate that no duplicate files exist
 *
 * Returns array of user story IDs that have duplicates
 */
private async validateNoDuplicates(projectPath: string): Promise<string[]> {
  const files = await fs.readdir(projectPath);
  const filesByStory = new Map<string, string[]>();

  for (const file of files) {
    const match = file.match(/^(us-\d+)-/);
    if (match) {
      const storyId = match[1].toUpperCase();
      if (!filesByStory.has(storyId)) {
        filesByStory.set(storyId, []);
      }
      filesByStory.get(storyId)!.push(file);
    }
  }

  const duplicates: string[] = [];
  for (const [storyId, storyFiles] of filesByStory.entries()) {
    if (storyFiles.length > 1) {
      duplicates.push(storyId);
    }
  }

  return duplicates;
}
```

---

## Implementation Plan

### Phase 1: Immediate Fix (Manual Cleanup)

✅ **DONE**: Deleted duplicate files and temp files

```bash
# Cleanup tmp files
rm .specweave/docs/internal/specs/specweave/FS-043/*.tmp

# Verify no duplicates
find .specweave/docs/internal/specs/ -name "us-*.md" | sort
```

### Phase 2: Standardize File Naming (Code Change)

**File**: `src/core/living-docs/living-docs-sync.ts`

**Changes**:
1. Add `generateUserStoryFileName()` method
2. Update `createUserStoryFiles()` to use standardized naming
3. Update `syncTasksToUserStories()` to use same naming pattern

**Test**: Create new increment → verify all user story files have consistent naming

### Phase 3: Automatic Cleanup (Code Change)

**File**: `src/core/living-docs/living-docs-sync.ts`

**Changes**:
1. Add `cleanupDuplicateFiles()` method
2. Add `cleanupTempFiles()` method
3. Call cleanup methods at start/end of `syncIncrement()`

**Test**: Create duplicates manually → run sync → verify cleanup happens

### Phase 4: Pre-Commit Hook (Repo Setup)

**File**: `scripts/install-git-hooks.sh`

**Changes**:
1. Add duplicate detection hook
2. Update install script to include new hook

**Test**: Create duplicates → try to commit → verify blocked

### Phase 5: Validation (Code Change)

**File**: `src/core/living-docs/living-docs-sync.ts`

**Changes**:
1. Add `validateNoDuplicates()` method
2. Call after file creation in `syncIncrement()`

**Test**: Trigger duplicate creation → verify error thrown

---

## Priority Recommendations

### MUST HAVE (Phase 2 + Phase 3)

**Why**: Prevents duplicates at the source + automatic cleanup

**Effort**: 2-3 hours
**Impact**: High - eliminates duplicate file problem permanently

**Implementation**:
1. Standardize file naming (Phase 2)
2. Add automatic cleanup (Phase 3)

### NICE TO HAVE (Phase 4 + Phase 5)

**Why**: Defense-in-depth protection

**Effort**: 1 hour
**Impact**: Medium - catches edge cases

**Implementation**:
1. Pre-commit hook (Phase 4)
2. Validation (Phase 5)

---

## Testing Strategy

### Unit Tests

```typescript
describe('LivingDocsSync - Duplicate Prevention', () => {
  it('should generate consistent user story filenames', () => {
    const sync = new LivingDocsSync(projectRoot);

    const filename1 = sync.generateUserStoryFileName('US-001', 'Status Line Shows Correct Active Increment');
    const filename2 = sync.generateUserStoryFileName('US-001', 'Status Line Shows Correct Active Increment');

    expect(filename1).toBe(filename2);
    expect(filename1).toBe('us-001-status-line-shows-correct-active-increment.md');
  });

  it('should detect duplicate files', async () => {
    // Create test files with duplicates
    const projectPath = '/tmp/test-living-docs';
    await fs.ensureDir(projectPath);
    await fs.writeFile(path.join(projectPath, 'us-001-test.md'), 'content1');
    await fs.writeFile(path.join(projectPath, 'us-001-test-priority-p1.md'), 'content2');

    const sync = new LivingDocsSync(projectRoot);
    const duplicates = await sync.validateNoDuplicates(projectPath);

    expect(duplicates).toContain('US-001');
  });

  it('should cleanup duplicate files automatically', async () => {
    // Create test files with duplicates
    const projectPath = '/tmp/test-living-docs';
    await fs.ensureDir(projectPath);
    await fs.writeFile(path.join(projectPath, 'us-001-old.md'), 'old', { mode: 0o644 });
    await new Promise(resolve => setTimeout(resolve, 100)); // Ensure different mtime
    await fs.writeFile(path.join(projectPath, 'us-001-new.md'), 'new', { mode: 0o644 });

    const sync = new LivingDocsSync(projectRoot);
    await sync.cleanupDuplicateFiles('FS-001', projectPath);

    const files = await fs.readdir(projectPath);
    expect(files).toHaveLength(1);
    expect(files[0]).toBe('us-001-new.md'); // Kept newest
  });

  it('should cleanup temp files', async () => {
    const projectPath = '/tmp/test-living-docs';
    await fs.ensureDir(projectPath);
    await fs.writeFile(path.join(projectPath, 'us-001-test.md'), 'content');
    await fs.writeFile(path.join(projectPath, 'us-001-test.md.tmp'), 'temp');
    await fs.writeFile(path.join(projectPath, 'us-001-test.md.backup'), 'backup');

    const sync = new LivingDocsSync(projectRoot);
    await sync.cleanupTempFiles(projectPath);

    const files = await fs.readdir(projectPath);
    expect(files).toEqual(['us-001-test.md']); // Only main file kept
  });
});
```

### Integration Tests

```typescript
describe('LivingDocsSync - End-to-End Duplicate Prevention', () => {
  it('should not create duplicates when syncing multiple times', async () => {
    const sync = new LivingDocsSync(projectRoot);

    // Sync increment twice
    await sync.syncIncrement('0001-test', { dryRun: false });
    await sync.syncIncrement('0001-test', { dryRun: false });

    // Verify no duplicates created
    const projectPath = path.join(projectRoot, '.specweave/docs/internal/specs/specweave/FS-001');
    const files = await fs.readdir(projectPath);
    const usFiles = files.filter(f => f.startsWith('us-'));

    // Group by US ID
    const filesByStory = new Map<string, string[]>();
    for (const file of usFiles) {
      const match = file.match(/^(us-\d+)-/);
      if (match) {
        const storyId = match[1];
        if (!filesByStory.has(storyId)) {
          filesByStory.set(storyId, []);
        }
        filesByStory.get(storyId)!.push(file);
      }
    }

    // Assert no duplicates
    for (const [storyId, storyFiles] of filesByStory.entries()) {
      expect(storyFiles).toHaveLength(1); // Exactly 1 file per user story
    }
  });
});
```

---

## Success Criteria

✅ **No duplicate files possible**:
- Living docs sync creates consistent filenames
- Automatic cleanup removes duplicates if they exist
- Pre-commit hook blocks commits with duplicates

✅ **No manual cleanup needed**:
- Temp files cleaned automatically
- Duplicate detection runs automatically
- User never sees duplicate files

✅ **No breaking changes**:
- Existing increments continue to work
- GitHub links remain valid (or get updated automatically)

---

## Conclusion

**Root Cause**: Inconsistent file naming in living docs sync

**Solution**: Multi-layer protection (standardization + cleanup + validation)

**Effort**: 3-4 hours total (Phase 2 + Phase 3 + tests)

**Impact**: ✅ Eliminates duplicate file problem permanently

**Next Action**: Implement Phase 2 (standardize naming) + Phase 3 (automatic cleanup)
