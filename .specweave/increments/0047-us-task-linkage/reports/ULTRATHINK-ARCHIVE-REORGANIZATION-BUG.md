# ULTRATHINK: Archive Increment Reorganization Bug

**Date**: 2025-11-20
**Severity**: CRITICAL
**Impact**: Living docs structure desynchronized from source-of-truth (increments folder)
**Symptom**: Features exist in BOTH active and archive locations simultaneously

---

## Executive Summary

The `/specweave:archive` command successfully archives increments and their associated features, BUT the living docs sync hook RECREATES the archived folders immediately afterward, causing **feature folder duplication** across active and archive locations.

**Critical Violation**: Source-of-truth (increments folder) says "archived", but living docs structure (specs folders) says "active" → **DESYNC**.

---

## The Problem: Step-by-Step Breakdown

### 1. Initial State (Before Archiving)

```
.specweave/
├── increments/
│   └── 0039-ultra-smart-next-command/         ← Active increment
│       └── spec.md (references FS-039)
└── docs/internal/specs/
    ├── _features/
    │   └── FS-039/                             ← Active feature
    │       └── FEATURE.md
    └── specweave/
        └── FS-039/                             ← Active project folder
            ├── README.md
            └── us-001-*.md
```

### 2. Archiving Flow (CORRECT)

**Command**: `/specweave:archive 0039`

**Execution** (`increment-archiver.ts:252-288`):

```typescript
// Step 1: Archive increment
await fs.move(
  '.specweave/increments/0039-ultra-smart-next-command',
  '.specweave/increments/_archive/0039-ultra-smart-next-command'
);

// Step 2: Reorganize features (increment-archiver.ts:319-363)
const featureArchiver = new FeatureArchiver(this.rootDir);
await featureArchiver.archiveFeatures({
  forceArchiveWhenAllIncrementsArchived: true  // Override active projects check
});
```

**FeatureArchiver Logic** (`feature-archiver.ts:126-197`):

```typescript
// Find all features linked to archived increments
const linkedIncrements = await this.getLinkedIncrements('FS-039');  // Returns: ['0039-ultra-smart-next-command']

// Check if ALL linked increments are archived (EXACT MATCH - fixed in 0047)
const allIncrementsArchived = linkedIncrements.every(inc =>
  archivedIncrements.some(archived => archived === inc)  // ✅ Exact match (===), not .includes()
);

// If all archived, move feature folders
if (allIncrementsArchived) {
  // Move _features/FS-039/ → _features/_archive/FS-039/
  await fs.move(
    '.specweave/docs/internal/specs/_features/FS-039',
    '.specweave/docs/internal/specs/_features/_archive/FS-039'
  );

  // Move specs/specweave/FS-039/ → specs/specweave/_archive/FS-039/
  await this.archiveProjectSpecificFolders('FS-039');
}
```

**Result After Step 2** ✅ CORRECT:

```
.specweave/
├── increments/
│   └── _archive/
│       └── 0039-ultra-smart-next-command/     ← Archived increment
└── docs/internal/specs/
    ├── _features/
    │   └── _archive/
    │       └── FS-039/                         ← Archived feature
    └── specweave/
        └── _archive/
            └── FS-039/                         ← Archived project folder
```

### 3. The Bug: Living Docs Sync Hook Fires ❌

**Trigger**: ANY file write after archiving (e.g., writing completion report)

**Hook**: `plugins/specweave/hooks/sync-living-docs.js`

**Hook Registration** (`plugin.json`):
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",  ← Fires on ANY write/edit!
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/sync-living-docs.js"
          }
        ]
      }
    ]
  }
}
```

**Hook Execution** (`sync-living-docs.js:20-60`):

```javascript
// Extract increment ID from written file path
const incrementMatch = toolUse.input.file_path.match(
  /increments\/(\\d{4}-[^/]+)/
);

if (incrementMatch) {
  const incrementId = incrementMatch[1];  // e.g., "0039-ultra-smart-next-command"

  // CRITICAL BUG: NO CHECK if increment is archived!
  const sync = new LivingDocsSync(projectRoot);
  await sync.syncIncrement(incrementId);  ← Recreates archived folders!
}
```

**LivingDocsSync.syncIncrement()** (`living-docs-sync.ts:84-201`):

```typescript
async syncIncrement(incrementId: string, options: SyncOptions = {}): Promise<SyncResult> {
  // NO archive status check! ❌

  // Step 1: Get/assign feature ID
  const featureId = await this.getFeatureIdForIncrement(incrementId);  // Returns: "FS-039"

  // Step 2: Create living docs structure (ALWAYS recreates, even if archived!)
  const featurePath = path.join(basePath, '_features', featureId);  // ❌ Creates in active location!
  await fs.ensureDir(featurePath);
  await fs.writeFile(path.join(featurePath, 'FEATURE.md'), ...);

  const projectPath = path.join(basePath, 'specweave', featureId);  // ❌ Creates in active location!
  await fs.ensureDir(projectPath);
  await fs.writeFile(path.join(projectPath, 'README.md'), ...);

  // ... creates user story files
}
```

**Result After Hook** ❌ WRONG:

```
.specweave/
├── increments/
│   └── _archive/
│       └── 0039-ultra-smart-next-command/     ← Archived (source of truth)
└── docs/internal/specs/
    ├── _features/
    │   ├── FS-039/                             ← RECREATED! ❌
    │   │   └── FEATURE.md
    │   └── _archive/
    │       └── FS-039/                         ← Also exists here! ✅
    └── specweave/
        ├── FS-039/                             ← RECREATED! ❌
        │   └── README.md
        └── _archive/
            └── FS-039/                         ← Also exists here! ✅
```

**DESYNC DETECTED**: Same feature in BOTH active and archive locations!

---

## Root Cause Analysis

### 1. Missing Archive Status Check

**File**: `src/core/living-docs/living-docs-sync.ts:84-201`

**Current Code**:
```typescript
async syncIncrement(incrementId: string, options: SyncOptions = {}): Promise<SyncResult> {
  // NO check if increment is archived! ❌

  // Proceeds to recreate folders regardless of archive status
  const featurePath = path.join(basePath, '_features', featureId);
  await fs.ensureDir(featurePath);  // Creates in active location!
}
```

**Missing Logic**:
```typescript
async syncIncrement(incrementId: string, options: SyncOptions = {}): Promise<SyncResult> {
  // ✅ MUST CHECK if increment is archived FIRST
  const isArchived = await this.isIncrementArchived(incrementId);
  if (isArchived) {
    this.logger.log(`⏭️  Skipping sync for archived increment ${incrementId}`);
    return { success: true, ... };  // Skip sync, don't recreate
  }

  // ... rest of sync logic
}
```

### 2. Hook Timing Issue

**Problem**: Hook fires AFTER archiving completes, undoing the archive operation.

**Timeline**:
1. User runs `/specweave:archive 0039`
2. Increment archived ✅
3. Features archived ✅
4. Command writes completion report → triggers Write tool
5. Write tool → triggers `sync-living-docs.js` hook
6. Hook syncs increment → recreates archived folders ❌

**Hook Should Know**: If increment is in `_archive/`, DON'T sync.

### 3. No Protection in Hook

**File**: `plugins/specweave/hooks/sync-living-docs.js:20-60`

**Current Code**:
```javascript
const incrementMatch = toolUse.input.file_path.match(
  /increments\/(\\d{4}-[^/]+)/  ← Matches BOTH active and archived paths!
);

if (incrementMatch) {
  const incrementId = incrementMatch[1];
  await sync.syncIncrement(incrementId);  // No archive check!
}
```

**Fixed Code**:
```javascript
const incrementMatch = toolUse.input.file_path.match(
  /increments\/(?!_archive\/)(\d{4}-[^/]+)/  ← Negative lookahead: ignore _archive/
);

// OR check if increment is in archive BEFORE syncing
if (incrementMatch) {
  const incrementId = incrementMatch[1];
  const archivePath = path.join(projectRoot, '.specweave/increments/_archive', incrementId);

  if (fs.existsSync(archivePath)) {
    console.log(`⏭️  Skipping sync for archived increment ${incrementId}`);
    return;  // Don't sync archived increments
  }

  await sync.syncIncrement(incrementId);
}
```

---

## Evidence: Current State

### Duplicates Detected

**Active Features** (should be empty or minimal):
```bash
$ ls .specweave/docs/internal/specs/_features/
# Nothing (all features are archived - expected!)

$ ls .specweave/docs/internal/specs/specweave/
FS-023  FS-028  FS-031  FS-033  FS-035  FS-037
FS-038  FS-039  FS-044  FS-045  FS-046  _archive

# ❌ WRONG: These features should be in _archive/ only!
```

**Archived Features**:
```bash
$ ls .specweave/docs/internal/specs/_features/_archive/
FS-022  FS-023  FS-028  FS-031  FS-033  FS-035  FS-037
FS-038  FS-039  FS-040  FS-041  FS-042  FS-043  FS-044
FS-045  FS-046  FS-047

$ ls .specweave/docs/internal/specs/specweave/_archive/
FS-028  FS-031  FS-033  FS-035  FS-038  FS-039  FS-042
FS-043  FS-044  FS-045
```

**Overlap** (features in BOTH locations):
- FS-023, FS-028, FS-031, FS-033, FS-035, FS-037, FS-038, FS-039, FS-044, FS-045, FS-046

**Conclusion**: 11 features have duplicates (active + archive) → **CRITICAL DESYNC**.

---

## The Fix: Three-Layer Protection

### Layer 1: LivingDocsSync Archive Check (CRITICAL)

**File**: `src/core/living-docs/living-docs-sync.ts`

**Add Method**:
```typescript
/**
 * Check if increment is archived
 * CRITICAL: Prevents recreating archived feature folders
 */
private async isIncrementArchived(incrementId: string): Promise<boolean> {
  const archivePath = path.join(
    this.projectRoot,
    '.specweave/increments/_archive',
    incrementId
  );
  return await fs.pathExists(archivePath);
}
```

**Update syncIncrement()**:
```typescript
async syncIncrement(incrementId: string, options: SyncOptions = {}): Promise<SyncResult> {
  // CRITICAL: Skip sync for archived increments
  const isArchived = await this.isIncrementArchived(incrementId);
  if (isArchived) {
    this.logger.log(`⏭️  Skipping sync for archived increment ${incrementId}`);
    return {
      success: true,
      featureId: '',
      incrementId,
      filesCreated: [],
      filesUpdated: [],
      errors: ['Increment is archived - sync skipped']
    };
  }

  // ... rest of sync logic (only runs for active increments)
}
```

### Layer 2: Hook Regex Protection (DEFENSE IN DEPTH)

**File**: `plugins/specweave/hooks/sync-living-docs.js`

**Update Regex**:
```javascript
// OLD (matches both active and archived):
const incrementMatch = toolUse.input.file_path.match(
  /increments\/(\\d{4}-[^/]+)/
);

// NEW (ignores _archive/ paths):
const incrementMatch = toolUse.input.file_path.match(
  /increments\/(?!_archive\/)(\d{4}-[^/]+)/  // Negative lookahead
);
```

**Explanation**:
- `(?!_archive\/)` - Negative lookahead: Don't match if followed by `_archive/`
- Matches: `increments/0039-name/` ✅
- Doesn't match: `increments/_archive/0039-name/` ✅

### Layer 3: Cleanup Duplicates (RECOVERY)

**File**: `src/core/living-docs/feature-archiver.ts`

**Add Method**:
```typescript
/**
 * Clean up feature folder duplicates
 * Removes active folders that are ALSO in archive
 */
async cleanupDuplicates(): Promise<void> {
  const archivedFeatures = await glob(path.join(this.featuresDir, '_archive', 'FS-*'));

  for (const archivedPath of archivedFeatures) {
    const featureId = path.basename(archivedPath);
    const activePath = path.join(this.featuresDir, featureId);

    // If active folder exists AND archive folder exists → remove active (it's a duplicate)
    if (await fs.pathExists(activePath) && await fs.pathExists(archivedPath)) {
      console.log(`🧹 Cleaning duplicate: ${featureId} (keeping archive, removing active)`);
      await fs.remove(activePath);

      // Also clean project-specific duplicates
      const projectActive = path.join(this.specsDir, 'specweave', featureId);
      const projectArchive = path.join(this.specsDir, 'specweave', '_archive', featureId);

      if (await fs.pathExists(projectActive) && await fs.pathExists(projectArchive)) {
        await fs.remove(projectActive);
        console.log(`   ✅ Removed project duplicate: specweave/${featureId}`);
      }
    }
  }
}
```

**Run Cleanup**:
```bash
node -e "
const { FeatureArchiver } = require('./dist/src/core/living-docs/feature-archiver.js');
const archiver = new FeatureArchiver(process.cwd());
archiver.cleanupDuplicates().then(() => console.log('✅ Cleanup complete'));
"
```

---

## Verification Strategy

### 1. Before Fix - Verify Bug Exists

```bash
# Count duplicates
comm -12 \
  <(ls .specweave/docs/internal/specs/_features/ | sort) \
  <(ls .specweave/docs/internal/specs/_features/_archive/ | sort)

# Expected: List of duplicate features (FS-023, FS-028, ...)
```

### 2. Apply Fix

1. Update `LivingDocsSync.syncIncrement()` with archive check
2. Update hook regex to ignore `_archive/`
3. Run cleanup script

### 3. After Fix - Verify Resolution

```bash
# No duplicates
comm -12 \
  <(ls .specweave/docs/internal/specs/_features/ | sort) \
  <(ls .specweave/docs/internal/specs/_features/_archive/ | sort)

# Expected: Empty (no duplicates)

# Verify archive count matches archived increments
ARCHIVED_INCREMENTS=$(ls .specweave/increments/_archive/ | wc -l)
ARCHIVED_FEATURES=$(ls .specweave/docs/internal/specs/_features/_archive/ | wc -l)

echo "Archived Increments: $ARCHIVED_INCREMENTS"
echo "Archived Features: $ARCHIVED_FEATURES"
# Should be equal or close (some increments may share features)
```

### 4. Test Archiving Flow

```bash
# Archive a new increment (should NOT recreate folders)
/specweave:archive 0040

# Verify feature NOT in active location
! test -d .specweave/docs/internal/specs/_features/FS-040
! test -d .specweave/docs/internal/specs/specweave/FS-040

# Verify feature IS in archive location
test -d .specweave/docs/internal/specs/_features/_archive/FS-040
test -d .specweave/docs/internal/specs/specweave/_archive/FS-040

echo "✅ Archiving flow verified"
```

---

## Implementation Priority

**Priority**: P0 (CRITICAL)

**Why Critical**:
1. **Source-of-truth violation**: Living docs structure doesn't match increments folder
2. **User confusion**: Features appear "active" when they're archived
3. **Broken links**: Links point to active location, but content is in archive
4. **Compound effect**: Every archive operation creates more duplicates

**Estimated Effort**: 2-3 hours

**Breakdown**:
- Add archive check to `LivingDocsSync`: 30 min
- Update hook regex: 15 min
- Write cleanup script: 45 min
- Testing: 1 hour

---

## Testing Strategy

### Unit Tests

**File**: `tests/unit/living-docs/living-docs-sync-archive-check.test.ts`

```typescript
describe('LivingDocsSync - Archive Check', () => {
  it('should skip sync for archived increments', async () => {
    const sync = new LivingDocsSync(testRoot);

    // Archive increment first
    await fs.move(
      path.join(testRoot, '.specweave/increments/0039-test'),
      path.join(testRoot, '.specweave/increments/_archive/0039-test')
    );

    // Attempt to sync
    const result = await sync.syncIncrement('0039-test');

    // Should skip
    expect(result.success).toBe(true);
    expect(result.errors).toContain('Increment is archived - sync skipped');
    expect(result.filesCreated).toHaveLength(0);

    // Verify folders NOT created
    expect(fs.existsSync('.specweave/docs/internal/specs/_features/FS-039')).toBe(false);
  });

  it('should sync active increments normally', async () => {
    const sync = new LivingDocsSync(testRoot);

    // Sync active increment
    const result = await sync.syncIncrement('0040-test');

    // Should succeed
    expect(result.success).toBe(true);
    expect(result.filesCreated.length).toBeGreaterThan(0);

    // Verify folders created in active location
    expect(fs.existsSync('.specweave/docs/internal/specs/_features/FS-040')).toBe(true);
  });
});
```

### Integration Tests

**File**: `tests/integration/living-docs/archive-reorganization-e2e.test.ts`

```typescript
describe('Archive Reorganization E2E', () => {
  it('should not recreate folders after archiving', async () => {
    // 1. Create increment
    await createTestIncrement('0050-test', 'FS-050');

    // 2. Sync to living docs (creates folders)
    const sync = new LivingDocsSync(testRoot);
    await sync.syncIncrement('0050-test');

    // Verify folders created
    expect(fs.existsSync('.specweave/docs/internal/specs/_features/FS-050')).toBe(true);

    // 3. Archive increment
    const archiver = new IncrementArchiver(testRoot);
    await archiver.archive({ increments: ['0050-test'] });

    // Verify folders archived
    expect(fs.existsSync('.specweave/docs/internal/specs/_features/_archive/FS-050')).toBe(true);
    expect(fs.existsSync('.specweave/docs/internal/specs/_features/FS-050')).toBe(false);

    // 4. Write file (triggers hook)
    await fs.writeFile(
      '.specweave/increments/_archive/0050-test/reports/test.md',
      'test content'
    );

    // Simulate hook execution
    await triggerLivingDocsHook('0050-test');

    // 5. Verify folders NOT recreated
    expect(fs.existsSync('.specweave/docs/internal/specs/_features/FS-050')).toBe(false);
    expect(fs.existsSync('.specweave/docs/internal/specs/_features/_archive/FS-050')).toBe(true);
  });
});
```

---

## Success Criteria

**Archiving Command**:
- ✅ Archives increment folder
- ✅ Archives feature folders (_features/ and project-specific)
- ✅ Does NOT recreate folders afterward
- ✅ No duplicates in active and archive locations

**Living Docs Sync**:
- ✅ Syncs active increments normally
- ✅ Skips archived increments
- ✅ Logs skip message for archived increments

**Cleanup Script**:
- ✅ Removes all active-archive duplicates
- ✅ Keeps archive version (source of truth)
- ✅ Cleans both _features/ and project-specific folders

---

## Related Incidents

**Incident 2025-11-20**: Increment 0039 archiving bug
- 11 features incorrectly duplicated
- Root cause: Missing archive check in living docs sync
- Fixed by: This proposal

**See Also**:
- `.specweave/increments/0047-us-task-linkage/reports/CRITICAL-ARCHIVING-BUGS-FIX.md` (string matching anti-pattern)
- `CLAUDE.md` Section 13: Archiving Logic Anti-Patterns

---

## Conclusion

**The archive reorganization bug is caused by missing archive status validation in living docs sync.**

**Three-layer fix**:
1. ✅ Archive check in `LivingDocsSync.syncIncrement()`
2. ✅ Hook regex protection (negative lookahead)
3. ✅ Cleanup script for existing duplicates

**Once fixed, the SpecWeave archiving flow will maintain perfect sync**:
- Archived increments → Archived features → Clean living docs structure
- Active increments → Active features → No duplicates
- Source of truth (increments folder) perfectly reflected in living docs (specs folders)
