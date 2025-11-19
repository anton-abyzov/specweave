---
title: Implementation Plan - Duplicate Increment Prevention
increment: "0033"
---

# Implementation Plan: Duplicate Increment Prevention System

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   User Commands                              │
│  /specweave:increment  /specweave:archive  /specweave:reopen │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   DuplicateDetector      │  │   ConflictResolver       │
│                          │  │                          │
│  • detectDuplicates()    │  │  • resolveConflict()     │
│  • detectByNumber()      │  │  • selectWinner()        │
│  • detectByLocation()    │  │  • calculateScore()      │
└──────────────┬───────────┘  └──────────────┬───────────┘
               │                              │
               ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│              ValidationLayer (added to existing)            │
│                                                               │
│  MetadataManager    IncrementArchiver    IncrementCreator   │
│  ├─ read()          ├─ archive()         ├─ create()        │
│  ├─ write()         └─ restore()         └─ reopen()        │
│  └─ updateStatus()                                           │
└─────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│                  Filesystem Layer                            │
│                                                               │
│  .specweave/increments/                                      │
│  ├─ 0001-*/                  (active)                        │
│  ├─ 0002-*/                  (completed, in active folder!)  │
│  ├─ _archive/                                                │
│  │   └─ 0010-*/             (manually archived)             │
│  └─ _abandoned/                                              │
│      └─ 0015-*/             (abandoned)                      │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. DuplicateDetector

**Location**: `src/core/increment/duplicate-detector.ts`

**Purpose**: Scan filesystem and detect duplicate increments

**Key Methods:**

```typescript
/**
 * Scan all increment folders and detect duplicates
 */
export async function detectAllDuplicates(
  rootDir: string
): Promise<DuplicateReport> {
  const incrementsDir = path.join(rootDir, '.specweave', 'increments');

  // Scan all locations
  const active = await scanDirectory(incrementsDir, false);
  const archived = await scanDirectory(path.join(incrementsDir, '_archive'), false);
  const abandoned = await scanDirectory(path.join(incrementsDir, '_abandoned'), false);

  // Group by increment number
  const byNumber = new Map<string, IncrementLocation[]>();
  [...active, ...archived, ...abandoned].forEach(inc => {
    const number = inc.name.split('-')[0];
    if (!byNumber.has(number)) {
      byNumber.set(number, []);
    }
    byNumber.get(number)!.push(inc);
  });

  // Find duplicates (increment number exists in >1 location or >1 name)
  const duplicates: Duplicate[] = [];
  byNumber.forEach((locations, number) => {
    if (locations.length > 1) {
      // Duplicate found!
      const winner = selectWinner(locations);
      duplicates.push({
        incrementNumber: number,
        locations,
        recommendedWinner: winner,
        losingVersions: locations.filter(l => l !== winner),
        resolutionReason: explainWinner(winner, locations)
      });
    }
  });

  return {
    duplicates,
    totalChecked: active.length + archived.length + abandoned.length,
    duplicateCount: duplicates.length
  };
}

/**
 * Select winning version based on priority rules
 */
function selectWinner(locations: IncrementLocation[]): IncrementLocation {
  // Priority 1: Active status > Completed > Paused > Backlog > Abandoned
  const statusPriority = {
    active: 5,
    completed: 4,
    paused: 3,
    backlog: 2,
    abandoned: 1
  };

  // Sort by priority
  const sorted = [...locations].sort((a, b) => {
    // 1. Status priority
    const statusDiff = (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0);
    if (statusDiff !== 0) return statusDiff;

    // 2. Most recent activity
    const aTime = new Date(a.lastActivity).getTime();
    const bTime = new Date(b.lastActivity).getTime();
    if (bTime !== aTime) return bTime - aTime;

    // 3. Most complete (more files)
    if (b.fileCount !== a.fileCount) return b.fileCount - a.fileCount;

    // 4. Location preference (active > _archive > _abandoned)
    const locationScore = (loc: IncrementLocation) => {
      if (loc.path.includes('_abandoned')) return 1;
      if (loc.path.includes('_archive')) return 2;
      return 3; // active
    };
    return locationScore(b) - locationScore(a);
  });

  return sorted[0];
}

/**
 * Explain why this version won
 */
function explainWinner(
  winner: IncrementLocation,
  all: IncrementLocation[]
): string {
  const reasons: string[] = [];

  // Check status
  const hasHigherStatus = all.some(loc =>
    loc !== winner && getStatusPriority(loc.status) < getStatusPriority(winner.status)
  );
  if (hasHigherStatus) {
    reasons.push(`Active status (${winner.status})`);
  }

  // Check recency
  const winnerTime = new Date(winner.lastActivity).getTime();
  const hasOlderActivity = all.some(loc =>
    loc !== winner && new Date(loc.lastActivity).getTime() < winnerTime
  );
  if (hasOlderActivity) {
    reasons.push(`Most recent activity (${winner.lastActivity})`);
  }

  // Check completeness
  const hasFewerFiles = all.some(loc => loc !== winner && loc.fileCount < winner.fileCount);
  if (hasFewerFiles) {
    reasons.push(`Most complete (${winner.fileCount} files)`);
  }

  return reasons.join(', ') || 'Default selection';
}
```

### 2. ConflictResolver

**Location**: `src/core/increment/conflict-resolver.ts`

**Purpose**: Merge content and resolve conflicts

**Key Methods:**

```typescript
/**
 * Resolve conflict by merging winner + losers
 */
export async function resolveConflict(
  duplicate: Duplicate,
  options: ResolveOptions
): Promise<ResolutionResult> {
  const { winner, losers } = {
    winner: duplicate.recommendedWinner,
    losers: duplicate.losingVersions
  };

  // Step 1: Merge valuable content from losers → winner
  const mergedFiles = await mergeContent(winner, losers, options);

  // Step 2: Create resolution report
  const reportPath = await createResolutionReport(duplicate, mergedFiles, options);

  // Step 3: Delete losing versions (if not dry-run)
  const deletedPaths: string[] = [];
  if (!options.dryRun) {
    for (const loser of losers) {
      if (options.force || await confirmDeletion(loser)) {
        await fs.remove(loser.path);
        deletedPaths.push(loser.path);
      }
    }
  }

  return {
    winner: winner.path,
    merged: mergedFiles,
    deleted: deletedPaths,
    reportPath,
    dryRun: options.dryRun
  };
}

/**
 * Merge content from losing versions into winner
 */
async function mergeContent(
  winner: IncrementLocation,
  losers: IncrementLocation[],
  options: ResolveOptions
): Promise<string[]> {
  const mergedFiles: string[] = [];

  for (const loser of losers) {
    // Merge reports/ folder (preserve all reports)
    const loserReportsDir = path.join(loser.path, 'reports');
    if (await fs.pathExists(loserReportsDir)) {
      const winnerReportsDir = path.join(winner.path, 'reports');
      await fs.ensureDir(winnerReportsDir);

      const reportFiles = await fs.readdir(loserReportsDir);
      for (const file of reportFiles) {
        const sourcePath = path.join(loserReportsDir, file);
        const targetPath = path.join(winnerReportsDir, file);

        // Rename if file exists (add timestamp)
        let finalPath = targetPath;
        if (await fs.pathExists(targetPath)) {
          const ext = path.extname(file);
          const base = path.basename(file, ext);
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          finalPath = path.join(winnerReportsDir, `${base}-MERGED-${timestamp}${ext}`);
        }

        if (!options.dryRun) {
          await fs.copy(sourcePath, finalPath);
        }
        mergedFiles.push(finalPath);
      }
    }

    // Merge metadata (union of GitHub/JIRA/ADO links)
    const loserMetadataPath = path.join(loser.path, 'metadata.json');
    if (await fs.pathExists(loserMetadataPath)) {
      const loserMetadata = await fs.readJson(loserMetadataPath);
      const winnerMetadataPath = path.join(winner.path, 'metadata.json');
      const winnerMetadata = await fs.readJson(winnerMetadataPath);

      // Merge external links (take non-null values)
      const merged = {
        ...winnerMetadata,
        github: winnerMetadata.github || loserMetadata.github,
        jira: winnerMetadata.jira || loserMetadata.jira,
        ado: winnerMetadata.ado || loserMetadata.ado
      };

      if (!options.dryRun) {
        await fs.writeJson(winnerMetadataPath, merged, { spaces: 2 });
      }
      mergedFiles.push(winnerMetadataPath);
    }
  }

  return mergedFiles;
}
```

### 3. Validation Layer

**Add validation to existing operations**

**File**: `src/core/increment/metadata-manager.ts`

```typescript
/**
 * MODIFIED: Add duplicate check before creating metadata
 */
static create(incrementId: string, type: IncrementType): IncrementMetadata {
  // NEW: Check for duplicates
  const duplicates = detectDuplicatesByNumber(
    incrementId.split('-')[0],
    process.cwd()
  );

  if (duplicates.length > 0) {
    throw new MetadataError(
      `Increment number ${incrementId.split('-')[0]} already exists:\n` +
      duplicates.map(d => `  - ${d.path} (status: ${d.status})`).join('\n'),
      incrementId
    );
  }

  // ... existing creation logic
}
```

**File**: `src/core/increment/increment-archiver.ts`

```typescript
/**
 * MODIFIED: Add duplicate check before archiving
 */
private async archiveIncrement(increment: string): Promise<void> {
  const sourcePath = path.join(this.incrementsDir, increment);
  const targetPath = path.join(this.archiveDir, increment);

  // NEW: Check if already exists in archive
  if (await fs.pathExists(targetPath)) {
    throw new Error(
      `Cannot archive ${increment}: already exists in archive folder.\n` +
      `Delete archive version first, or use --force to overwrite.`
    );
  }

  // ... existing archiving logic
}
```

## Implementation Phases

### Phase 1: Core Utilities (Day 1)

**Tasks:**
- T-001: Create `duplicate-detector.ts` with `detectAllDuplicates()`
- T-002: Create `conflict-resolver.ts` with `resolveConflict()`
- T-003: Add unit tests for duplicate detection (>90% coverage)
- T-004: Add unit tests for conflict resolution (>90% coverage)

**Deliverables:**
- Working duplicate detection utility
- Working conflict resolution utility
- 20+ unit tests passing

### Phase 2: Validation Layer (Day 2)

**Tasks:**
- T-005: Add duplicate check to `MetadataManager.create()`
- T-006: Add duplicate check to `IncrementArchiver.archive()`
- T-007: Add duplicate check to increment reopen logic
- T-008: Add integration tests for validation (>85% coverage)

**Deliverables:**
- All creation/archive/reopen operations validate for duplicates
- Clear error messages with resolution steps
- 10+ integration tests passing

### Phase 3: Manual Archive Command (Day 3)

**Tasks:**
- T-009: Create `/specweave:archive` command
- T-010: Implement `--keep-last N` option
- T-011: Implement `--older-than DAYS` option
- T-012: Implement `--dry-run` and `--force` flags
- T-013: Add E2E tests for archive command (>80% coverage)

**Deliverables:**
- Working `/specweave:archive` command
- Dry-run mode shows preview
- Safe mode requires confirmation
- 8+ E2E tests passing

### Phase 4: Fix Duplicates Command (Day 4)

**Tasks:**
- T-014: Create `/specweave:fix-duplicates` command
- T-015: Implement auto-detection and resolution
- T-016: Implement content merging
- T-017: Add comprehensive logging
- T-018: Add E2E tests for fix command (>80% coverage)

**Deliverables:**
- Working `/specweave:fix-duplicates` command
- Auto-resolution with user confirmation
- Content merge preserves reports
- 8+ E2E tests passing

### Phase 5: Documentation & Cleanup (Day 5)

**Tasks:**
- T-019: Update CLAUDE.md with new commands
- T-020: Update command reference docs
- T-021: Create migration guide for existing duplicates
- T-022: Final validation and testing
- T-023: Create completion report

**Deliverables:**
- Complete documentation
- Migration guide
- All tests passing
- Increment ready to close

## Testing Strategy

### Unit Tests

**File**: `tests/unit/increment/duplicate-detector.test.ts`

```typescript
describe('DuplicateDetector', () => {
  describe('detectAllDuplicates', () => {
    it('should detect increment in both active and archive', async () => {
      // Setup: create test increment in both locations
      const testDir = createTestDir();
      await createIncrement(testDir, 'active', '0001-test');
      await createIncrement(testDir, '_archive', '0001-test');

      // Execute
      const result = await detectAllDuplicates(testDir);

      // Assert
      expect(result.duplicateCount).toBe(1);
      expect(result.duplicates[0].incrementNumber).toBe('0001');
      expect(result.duplicates[0].locations).toHaveLength(2);
    });

    it('should detect same number with different names', async () => {
      // Setup
      const testDir = createTestDir();
      await createIncrement(testDir, 'active', '0002-name-one');
      await createIncrement(testDir, 'active', '0002-name-two');

      // Execute
      const result = await detectAllDuplicates(testDir);

      // Assert
      expect(result.duplicateCount).toBe(1);
      expect(result.duplicates[0].locations).toHaveLength(2);
    });
  });

  describe('selectWinner', () => {
    it('should prefer active status over completed', () => {
      const active = createLocation('0001-test', 'active', '2025-11-14');
      const completed = createLocation('0001-test', 'completed', '2025-11-15');

      const winner = selectWinner([active, completed]);

      expect(winner).toBe(active);
    });

    it('should prefer most recent activity when same status', () => {
      const old = createLocation('0001-test', 'completed', '2025-11-10');
      const recent = createLocation('0001-test', 'completed', '2025-11-14');

      const winner = selectWinner([old, recent]);

      expect(winner).toBe(recent);
    });
  });
});
```

### Integration Tests

**File**: `tests/integration/increment-lifecycle.test.ts`

```typescript
describe('Increment Lifecycle with Duplicate Prevention', () => {
  it('should prevent creating increment with existing number', async () => {
    // Setup: create increment 0001
    await createIncrement('0001-existing');

    // Execute & Assert: attempt to create another 0001
    await expect(
      createIncrement('0001-different-name')
    ).rejects.toThrow('Increment number 0001 already exists');
  });

  it('should prevent archiving when already exists in archive', async () => {
    // Setup
    await createIncrement('0002-test');
    await archiveIncrement('0002-test');
    await restoreIncrement('0002-test'); // Back to active

    // Execute & Assert: attempt to archive again
    await expect(
      archiveIncrement('0002-test')
    ).rejects.toThrow('already exists in archive folder');
  });
});
```

### E2E Tests

**File**: `tests/e2e/duplicate-prevention.spec.ts`

```typescript
test('full duplicate prevention flow', async () => {
  // Create increment
  await command('/specweave:increment "Feature A"');
  expect(await incrementExists('0001-feature-a')).toBe(true);

  // Complete increment
  await command('/specweave:done 0001');
  expect(await getStatus('0001')).toBe('completed');

  // Increment should still be in active folder (NOT archived)
  expect(await exists('.specweave/increments/0001-feature-a')).toBe(true);
  expect(await exists('.specweave/increments/_archive/0001-feature-a')).toBe(false);

  // Attempt to create another 0001 (should fail)
  await command('/specweave:increment "Feature B"');
  expect(await getError()).toContain('Increment number 0001 already exists');

  // Manual archive
  await command('/specweave:archive --keep-last 5');

  // Now should be archived
  expect(await exists('.specweave/increments/_archive/0001-feature-a')).toBe(true);
  expect(await exists('.specweave/increments/0001-feature-a')).toBe(false);
});
```

## Edge Cases

1. **Nested .specweave folders**: Ignore `.specweave/increments/.specweave/`
2. **Symbolic links**: Follow symlinks but detect loops
3. **Incomplete increments**: Missing metadata.json → skip validation
4. **Concurrent operations**: Lock-file based synchronization
5. **Filesystem errors**: Graceful degradation + clear error messages

## Performance Considerations

- **Caching**: Cache scan results for 60s (invalidate on write)
- **Lazy scanning**: Only scan when needed (not on every command)
- **Parallel scanning**: Use Promise.all() to scan active/archive/abandoned in parallel
- **Incremental updates**: Update cache on create/archive/delete operations
- **Memory**: Limit scan to metadata.json only (don't load full files)

## Migration Strategy

For users with existing duplicates:

```bash
# Step 1: Detect existing duplicates
/specweave:fix-duplicates --dry-run

# Step 2: Review proposed resolutions
# Output shows:
#   Duplicate: 0031
#   Locations:
#     - active (.specweave/increments/0031-*) [WINNER]
#     - archive (_archive/0031-*)
#   Resolution: Keep active, delete archive
#   Merge: 15 reports from archive → active

# Step 3: Apply fixes
/specweave:fix-duplicates --merge

# Step 4: Verify no duplicates remain
/specweave:fix-duplicates --dry-run
# Output: No duplicates detected
```

## Rollback Plan

If issues discovered:
1. Revert code changes via git
2. Restore deleted increments from git history
3. Manual cleanup if needed

No database migrations needed (pure filesystem operations).
