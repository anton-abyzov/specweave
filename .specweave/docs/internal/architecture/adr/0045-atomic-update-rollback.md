# ADR-0045: Atomic Update & Rollback Strategy for Dual-File Sync

**Date**: 2025-11-18
**Status**: Accepted
**Increment**: 0043-spec-md-desync-fix

## Context

Per ADR-0043, spec.md is the single source of truth, but metadata.json is kept as a performance cache. This means `MetadataManager.updateStatus()` must update **TWO files atomically**:

1. `metadata.json` (fast, JSON write)
2. `spec.md` (slower, YAML parsing + frontmatter update)

### The Problem: Partial Update Risk

**Scenario 1: Both updates succeed** (happy path):
```
✅ metadata.json updated: status="completed"
✅ spec.md updated: status="completed"
✅ Files in sync
```

**Scenario 2: metadata.json succeeds, spec.md fails** (disaster!):
```
✅ metadata.json updated: status="completed"
❌ spec.md update failed (YAML parsing error)
❌ DESYNC: metadata="completed", spec="active"
```

**Scenario 3: metadata.json fails** (early exit):
```
❌ metadata.json update failed (permission error)
⏭️  spec.md not attempted (safe)
✅ No desync (nothing changed)
```

### The Question

**What happens if one update succeeds and the other fails?**

This is a classic **distributed transaction problem**:
- Two separate files (not a single atomic database)
- No native OS-level transaction support for multi-file updates
- Must implement application-level atomicity

**Requirements**:
1. **Atomicity**: Both files updated or neither (no partial state)
2. **Consistency**: Files never desync (single source of truth maintained)
3. **Isolation**: Concurrent updates don't corrupt files
4. **Durability**: Updates persisted reliably (atomic write)

## Decision

**Use two-phase commit with rollback strategy**:

1. **Phase 1**: Update metadata.json (can be rolled back)
2. **Phase 2**: Update spec.md (if fails → rollback Phase 1)

**Order**: metadata.json FIRST, spec.md SECOND.

**Rollback**: If spec.md update fails, restore metadata.json to original state.

### Implementation

```typescript
static updateStatus(
  incrementId: string,
  newStatus: IncrementStatus,
  reason?: string
): IncrementMetadata {
  const metadata = this.read(incrementId);
  const originalMetadata = { ...metadata }; // ← BACKUP FOR ROLLBACK

  // Validate transition
  if (!isValidTransition(metadata.status, newStatus)) {
    throw new MetadataError(
      `Invalid status transition: ${metadata.status} → ${newStatus}`,
      incrementId
    );
  }

  // Update metadata object
  metadata.status = newStatus;
  metadata.lastActivity = new Date().toISOString();
  // ... update status-specific fields ...

  // **PHASE 1**: Update metadata.json (can be rolled back)
  this.write(incrementId, metadata);

  // **PHASE 2**: Update spec.md (with rollback on failure)
  try {
    await SpecFrontmatterUpdater.updateStatus(incrementId, newStatus);
  } catch (error) {
    // **ROLLBACK**: Restore metadata.json to original state
    this.write(incrementId, originalMetadata);

    throw new MetadataError(
      `Failed to update spec.md, rolled back metadata.json: ${error.message}`,
      incrementId,
      error
    );
  }

  // Update active increment cache (existing logic)
  const activeManager = new ActiveIncrementManager();
  if (newStatus === IncrementStatus.ACTIVE) {
    activeManager.setActive(incrementId);
  } else {
    activeManager.smartUpdate();
  }

  return metadata;
}
```

## Rationale

### Why Update metadata.json FIRST?

**Rationale**:
1. **Fast operation**: JSON write is cheap (simple `JSON.stringify` + `fs.writeFile`)
2. **Easy to rollback**: Single file write (just write original back)
3. **Fail fast**: If metadata.json fails, exit early (no spec.md attempt)

**Example**:
```typescript
// metadata.json write: ~1ms
this.write(incrementId, metadata);

// spec.md write: ~5ms (YAML parsing + frontmatter update)
await SpecFrontmatterUpdater.updateStatus(incrementId, newStatus);
```

**If we swapped order** (spec.md first):
- spec.md update takes 5ms
- If metadata.json then fails, we wasted 5ms
- Violates "fail fast" principle

### Why Update spec.md SECOND?

**Rationale**:
1. **Slower operation**: YAML parsing + frontmatter update (~5ms)
2. **More likely to fail**: YAML parsing errors, file corruption, etc.
3. **Failure happens AFTER metadata.json updated**: Needs rollback

**Failure scenarios**:
- **YAML parsing error**: Corrupt frontmatter → throw `YAMLException`
- **File not found**: spec.md missing → throw `ENOENT`
- **Permission error**: Read-only file → throw `EACCES`
- **Disk full**: Write fails → throw `ENOSPC`

**All require rollback** (metadata.json must be restored).

### Why Rollback metadata.json (Not Retry spec.md)?

**Alternative Considered**: Retry spec.md update (no rollback).

**Pros**:
- Eventually consistent (if transient failure)
- No rollback complexity

**Cons**:
- ❌ **Infinite loop risk**: If YAML corrupt, retry forever
- ❌ **No user feedback**: Silent retries (user doesn't know what's happening)
- ❌ **Desync during retries**: metadata.json updated, spec.md stale
- ❌ **Hard to debug**: Why is update taking so long? (hidden retries)

**Why Rollback is Better**:
1. **Deterministic**: Rollback always succeeds (simple file write)
2. **Fail loudly**: User sees error immediately (not silent retry)
3. **No desync**: Both files restored to original state
4. **Clear debugging**: Error message shows exact failure point

### Why Backup Original Metadata?

**Backup strategy**:
```typescript
const originalMetadata = { ...metadata }; // Shallow copy
```

**Why shallow copy is sufficient**:
- `metadata` is a flat object (no nested objects that need deep copy)
- Fields are primitives: `status`, `lastActivity`, `created`, etc.
- No arrays or nested objects in `IncrementMetadata`

**Alternative considered**: Deep clone
```typescript
const originalMetadata = JSON.parse(JSON.stringify(metadata));
```

**Why NOT deep clone**:
- Over-engineering (shallow copy sufficient)
- Performance overhead (serialize/deserialize)
- No nested structures to worry about

## Alternatives Considered

### Alternative 1: Update spec.md First, Then metadata.json

**Proposal**: Reverse order (spec.md → metadata.json).

**Example**:
```typescript
// PHASE 1: Update spec.md
await SpecFrontmatterUpdater.updateStatus(incrementId, newStatus);

// PHASE 2: Update metadata.json
this.write(incrementId, metadata);
```

**Pros**:
- If metadata.json fails, spec.md already updated (source of truth wins)

**Cons**:
- ❌ **Violates "fail fast"**: Slow spec.md update before fast metadata.json
- ❌ **Wastes time on failure**: If metadata.json fails, we wasted 5ms on spec.md
- ❌ **Rollback harder**: YAML serialization to restore spec.md (not just JSON write)

**Why NOT chosen**: Violates "fail fast" principle, wastes time, harder rollback.

### Alternative 2: Retry spec.md Update (No Rollback)

**Proposal**: If spec.md fails, retry 3 times before giving up.

**Example**:
```typescript
this.write(incrementId, metadata);

let retries = 3;
while (retries > 0) {
  try {
    await SpecFrontmatterUpdater.updateStatus(incrementId, newStatus);
    break; // Success
  } catch (error) {
    retries--;
    if (retries === 0) {
      throw error; // Give up
    }
    await sleep(100); // Backoff
  }
}
```

**Pros**:
- Eventually consistent (handles transient failures)

**Cons**:
- ❌ **Infinite loop risk**: If YAML corrupt, retry 3 times (wasted effort)
- ❌ **No user feedback during retries**: User sees long delay, no progress
- ❌ **Desync during retries**: metadata.json updated, spec.md stale for ~300ms
- ❌ **Hard to debug**: Did it succeed after retry 1, 2, or 3?

**Why NOT chosen**: Infinite loop risk, poor UX, desync window.

### Alternative 3: Two-Phase Commit (Database-Style)

**Proposal**: Write both files to temp locations, then rename atomically.

**Example**:
```typescript
// PHASE 1: Prepare (write to temp files)
await fs.writeFile(`${metadataPath}.tmp`, JSON.stringify(metadata));
await fs.writeFile(`${specPath}.tmp`, updatedSpecContent);

// PHASE 2: Commit (atomic rename both files)
await fs.rename(`${metadataPath}.tmp`, metadataPath);
await fs.rename(`${specPath}.tmp`, specPath);
```

**Pros**:
- True atomicity (OS-level rename is atomic)
- No rollback needed (both files committed together)

**Cons**:
- ❌ **Not atomic across two files**: `rename()` is atomic per file, not multi-file
- ❌ **Race condition**: If crash between two renames, files desync
- ❌ **Complexity**: Cleanup temp files on crash recovery
- ❌ **No benefit**: SpecWeave enforces WIP limit = 1 (no concurrent updates)

**Why NOT chosen**: Doesn't solve problem (still two separate operations), added complexity.

### Alternative 4: Treat metadata.json as Source of Truth (Don't Rollback)

**Proposal**: If spec.md fails, leave metadata.json updated (it's the "backup source").

**Example**:
```typescript
this.write(incrementId, metadata);

try {
  await SpecFrontmatterUpdater.updateStatus(incrementId, newStatus);
} catch (error) {
  // NO ROLLBACK - metadata.json stays updated
  console.warn(`spec.md update failed, metadata.json updated anyway: ${error}`);
}
```

**Pros**:
- No rollback complexity
- metadata.json is always updated (cache is fresh)

**Cons**:
- ❌ **Violates ADR-0043**: spec.md is source of truth, not metadata.json
- ❌ **Creates desyncs**: Exactly the bug we're fixing!
- ❌ **Silent failure**: User doesn't know spec.md failed
- ❌ **Hooks read stale data**: Status line reads spec.md (stale)

**Why NOT chosen**: Defeats purpose of this fix, creates desyncs.

### Alternative 5: Database (SQLite)

**Proposal**: Replace both files with SQLite database (ACID transactions).

**Example**:
```sql
BEGIN TRANSACTION;
UPDATE increments SET status='completed' WHERE id='0043';
COMMIT;
```

**Pros**:
- True ACID transactions (atomicity guaranteed)
- No rollback logic needed (database handles it)

**Cons**:
- ❌ **Massive architectural change**: Rewrite entire framework
- ❌ **Breaks GitOps workflow**: Files = data principle (core to SpecWeave)
- ❌ **Not human-readable**: Requires tools to inspect database
- ❌ **Over-engineering**: Files work fine if kept in sync

**Why NOT chosen**: Too invasive, breaks core SpecWeave principle.

## Comparison Matrix

| Strategy | Atomicity | Complexity | Fail Fast | User Feedback | Verdict |
|----------|-----------|------------|-----------|---------------|---------|
| **metadata.json first + rollback** | ✅ Yes | ⚠️ Medium | ✅ Yes | ✅ Immediate | ✅ **SELECTED** |
| spec.md first + rollback | ✅ Yes | ⚠️ Medium | ❌ No | ✅ Immediate | ❌ Violates fail fast |
| Retry spec.md (no rollback) | ❌ No | ⚠️ Medium | ❌ No | ❌ Delayed | ❌ Desync risk |
| Two-phase commit | ❌ No | ⚠️ High | ✅ Yes | ✅ Immediate | ❌ Doesn't solve problem |
| No rollback (metadata.json wins) | ❌ No | ✅ Low | ✅ Yes | ❌ Silent | ❌ Creates desyncs |
| SQLite database | ✅ Yes | ❌ Very High | ✅ Yes | ✅ Immediate | ❌ Over-engineering |

## Consequences

### Positive

1. **Atomicity**: Both files updated or neither
   - No partial updates
   - No desyncs from failure
   - Clear success/failure (no ambiguity)

2. **Fail Loudly**: User sees error immediately
   - Error message: "Failed to update spec.md, rolled back metadata.json"
   - User knows update failed (not silent)
   - Can investigate spec.md issue

3. **Deterministic Rollback**: Always succeeds
   - Rollback is simple file write (can't fail)
   - No infinite retry loops
   - Clear rollback path

4. **Fail Fast**: Exit early if metadata.json fails
   - Don't waste time on spec.md if metadata.json fails
   - User gets error quickly
   - Efficient error handling

### Negative

1. **Two Writes on Failure**: Update + rollback
   - If spec.md fails, metadata.json written twice
   - Small performance overhead (~2ms extra on failure)
   - Acceptable: Failures are rare

2. **Slight Complexity Overhead**: Rollback logic
   - Must backup original metadata
   - Try-catch block for error handling
   - More code to maintain

**Trade-off**: Complexity for data integrity (worth it).

### Neutral

1. **Race Condition Risk**: Concurrent updates
   - **Mitigation**: SpecWeave enforces WIP limit = 1 (single active increment)
   - Only one developer updates status at a time
   - Race conditions extremely rare

2. **Future Enhancement**: File locking
   - If multi-user support needed, add file locking
   - For now, WIP limit is sufficient
   - Can revisit if needed

## Implementation Details

### Error Handling (Structured Errors)

```typescript
export class SpecFrontmatterError extends Error {
  constructor(
    message: string,
    public readonly incrementId: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'SpecFrontmatterError';
  }
}

export class MetadataError extends Error {
  constructor(
    message: string,
    public readonly incrementId: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'MetadataError';
  }
}
```

**Usage**:
```typescript
try {
  await SpecFrontmatterUpdater.updateStatus(incrementId, newStatus);
} catch (error) {
  this.write(incrementId, originalMetadata); // Rollback

  if (error instanceof SpecFrontmatterError) {
    throw new MetadataError(
      `Failed to update spec.md, rolled back metadata.json: ${error.message}`,
      incrementId,
      error
    );
  }
  throw error; // Re-throw unexpected errors
}
```

**Benefits**:
- Structured error with `incrementId` context
- Chained errors (cause → original error)
- Type-safe error handling

### Atomic Write (Temp File → Rename)

**SpecFrontmatterUpdater implementation**:
```typescript
private static async atomicWrite(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.tmp.${Date.now()}`;

  try {
    // Write to temp file
    await fs.writeFile(tempPath, content, 'utf-8');

    // Atomic rename (OS-level operation)
    await fs.rename(tempPath, filePath);

  } catch (error) {
    // Cleanup temp file if it exists
    try {
      await fs.remove(tempPath);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    throw error;
  }
}
```

**Why temp file → rename?**
1. **OS-level atomicity**: `rename()` is atomic on all major filesystems
2. **No partial writes**: If crash during write, old file intact
3. **No corruption**: Temp file written fully before rename
4. **Standard pattern**: Used by git, npm, etc.

### Logging (Audit Trail)

```typescript
static updateStatus(incrementId, newStatus, reason?) {
  // ... existing logic ...

  // Log status change (before update)
  logger.info('Updating increment status', {
    incrementId,
    oldStatus: metadata.status,
    newStatus,
    reason
  });

  this.write(incrementId, metadata);

  try {
    await SpecFrontmatterUpdater.updateStatus(incrementId, newStatus);
    logger.info('Status update succeeded', { incrementId, newStatus });
  } catch (error) {
    logger.error('Status update failed, rolling back', {
      incrementId,
      newStatus,
      error: error.message
    });
    this.write(incrementId, originalMetadata); // Rollback
    throw new MetadataError(...);
  }
}
```

**Benefits**:
- Audit trail (all status changes logged)
- Debug rollbacks (when/why they happened)
- Monitor failure rate (how often rollback occurs)

## Testing Strategy

### Unit Tests

**Test 1: Rollback on spec.md failure**:
```typescript
it('rolls back metadata.json if spec.md update fails', async () => {
  const originalMetadata = { id: '0001', status: 'active', ... };
  vi.spyOn(MetadataManager, 'read').mockReturnValue(originalMetadata);
  const writeSpy = vi.spyOn(MetadataManager, 'write').mockImplementation(() => {});

  // Simulate spec.md update failure
  vi.mocked(SpecFrontmatterUpdater.updateStatus).mockRejectedValue(
    new SpecFrontmatterError('YAML parsing failed', '0001')
  );

  // Act & Assert
  await expect(async () => {
    MetadataManager.updateStatus('0001', 'completed');
  }).rejects.toThrow('Failed to update spec.md, rolled back metadata.json');

  // Verify rollback: write() called twice (update + rollback)
  expect(writeSpy).toHaveBeenCalledTimes(2);
  expect(writeSpy).toHaveBeenLastCalledWith('0001', originalMetadata);
});
```

**Test 2: No rollback on success**:
```typescript
it('does NOT rollback if both updates succeed', async () => {
  vi.mocked(SpecFrontmatterUpdater.updateStatus).mockResolvedValue();
  const writeSpy = vi.spyOn(MetadataManager, 'write').mockImplementation(() => {});

  MetadataManager.updateStatus('0001', 'completed');

  // Verify no rollback: write() called once (update only)
  expect(writeSpy).toHaveBeenCalledTimes(1);
  expect(writeSpy).toHaveBeenCalledWith('0001', expect.objectContaining({
    status: 'completed'
  }));
});
```

### Integration Tests

**Test 3: E2E status update with rollback**:
```typescript
it('E2E: status update with spec.md failure triggers rollback', async () => {
  // Arrange: Create increment with status="active"
  const testDir = await createIsolatedTestDir('rollback-test');
  await createTestIncrement(testDir, '0001', 'active');

  // Corrupt spec.md to trigger failure
  const specPath = path.join(testDir, '.specweave/increments/0001/spec.md');
  await fs.writeFile(specPath, '---\ninvalid yaml: [unclosed\n---', 'utf-8');

  // Act: Attempt status update (should fail)
  await expect(async () => {
    MetadataManager.updateStatus('0001', 'completed');
  }).rejects.toThrow('Failed to update spec.md');

  // Assert: metadata.json NOT updated (rollback succeeded)
  const metadata = MetadataManager.read('0001');
  expect(metadata.status).toBe('active'); // ← Still original status
});
```

## Related Decisions

- **ADR-0043**: spec.md as Source of Truth - Why we need dual-file sync
- **ADR-0044**: YAML Parser Selection (gray-matter) - How to update spec.md

## References

**Two-Phase Commit Pattern**:
- Database transactions: https://en.wikipedia.org/wiki/Two-phase_commit_protocol
- Application-level transactions (saga pattern)

**Atomic File Operations**:
- POSIX rename() semantics: https://man7.org/linux/man-pages/man2/rename.2.html
- Git object storage (similar pattern)

**SpecWeave Implementation**:
- `src/core/increment/metadata-manager.ts` (rollback logic)
- `src/core/increment/spec-frontmatter-updater.ts` (atomic write)

---

**Last Updated**: 2025-11-18
**Author**: Architect Agent
**Review Status**: Pending Tech Lead approval
