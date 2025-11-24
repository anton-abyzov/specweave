# ADR-0125: Incremental vs Batch Deletion Strategy

**Date**: 2025-11-23
**Status**: Accepted
**Deciders**: Architect, Tech Lead
**Priority**: P1

---

## Context

The `/specweave:delete-feature` command needs to support different deletion scenarios:

1. **Single feature deletion**: `specweave delete-feature FS-052` (most common)
2. **Batch deletion**: `specweave delete-feature FS-050,FS-051,FS-052` (cleanup scenarios)
3. **Pattern-based deletion**: `specweave delete-feature "FS-05*"` (advanced use case)

**Problem**: How should we handle multiple features?

**Options**:
- **Incremental**: Delete one feature at a time, prompt for each
- **Batch**: Delete all at once, single confirmation
- **Hybrid**: Delete one by one, but with batch validation

**Use Cases**:

### Use Case 1: Single Feature Deletion (90% of cases)
```bash
$ specweave delete-feature FS-052
> Validation complete.
> Delete feature FS-052? (y/N): y
> ✓ Deleted successfully
```

### Use Case 2: Cleanup Duplicates (10% of cases)
```bash
$ specweave delete-feature FS-050,FS-051
> Found 2 features to delete:
>   - FS-050: 23 files
>   - FS-051: 17 files
> Delete all 2 features? (y/N): y
> ✓ Deleted FS-050 (1/2)
> ✓ Deleted FS-051 (2/2)
```

### Use Case 3: Pattern Deletion (Future)
```bash
$ specweave delete-feature "FS-05*"
> Found 3 matching features: FS-050, FS-051, FS-052
> Delete all 3 features? (y/N): y
```

**Key Questions**:
1. Should we support batch deletion in v1?
2. If yes, how do we handle partial failures (1 succeeds, 2 fails)?
3. Should confirmation be per-feature or batch-wide?

---

## Decision

**Incremental Deletion Only (v1) with Batch Support Planned (v2)**

### v1 Implementation (Increment 0052)

**Single feature only**:
```bash
$ specweave delete-feature FS-052
```

**Batch syntax rejected** (for now):
```bash
$ specweave delete-feature FS-050,FS-051  # ERROR: Only one feature supported
```

**Workaround for batch deletion**:
```bash
$ for feature in FS-050 FS-051 FS-052; do
    specweave delete-feature $feature --yes
  done
```

### v2 Planned Implementation (Future Increment)

**Batch deletion with incremental execution**:
```typescript
// src/core/feature-deleter/batch-deleter.ts

export class BatchFeatureDeleter {
  async execute(featureIds: string[], options: DeletionOptions): Promise<BatchResult> {
    const results: DeletionResult[] = [];
    const failures: Array<{ featureId: string; error: string }> = [];

    // Validate all features first
    for (const featureId of featureIds) {
      const validation = await this.validator.validate(featureId, options);
      if (!validation.valid) {
        failures.push({ featureId, error: validation.errors.join(', ') });
      }
    }

    // Abort if any validation failed
    if (failures.length > 0) {
      throw new BatchValidationError(failures);
    }

    // Confirm batch deletion (single prompt)
    if (!options.yes) {
      const confirmed = await this.confirmBatchDeletion(featureIds);
      if (!confirmed) {
        throw new UserCancelledError();
      }
    }

    // Delete incrementally (one at a time)
    for (let i = 0; i < featureIds.length; i++) {
      const featureId = featureIds[i];

      try {
        this.logger.info(`Deleting ${featureId} (${i + 1}/${featureIds.length})...`);
        const result = await this.deleter.execute(featureId, options);
        results.push(result);
      } catch (error) {
        // Continue-on-error: Don't abort batch on single failure
        this.logger.error(`Failed to delete ${featureId}: ${error.message}`);
        failures.push({ featureId, error: error.message });
      }
    }

    return {
      total: featureIds.length,
      succeeded: results.length,
      failed: failures.length,
      results,
      failures
    };
  }
}
```

**Rationale for v1 decision**:
- **Simplicity**: Single feature deletion is 90% of use cases
- **Safety**: No batch logic = fewer edge cases
- **Testability**: Easier to test single feature deletion thoroughly
- **Incremental delivery**: Get core working first, add batch later

**Rationale for v2 approach**:
- **Incremental execution**: Easier to understand (one feature at a time)
- **Continue-on-error**: One failure doesn't abort entire batch
- **Clear progress**: Show which feature currently deleting
- **Atomic per-feature**: Each feature deletion uses transaction pattern

---

## Alternatives Considered

### 1. Batch Deletion with All-or-Nothing

```typescript
async execute(featureIds: string[]): Promise<void> {
  // Validate all
  const validations = await Promise.all(featureIds.map(id => validate(id)));

  // Delete all at once (transaction)
  const transaction = new BatchTransaction();
  for (const featureId of featureIds) {
    transaction.add(() => this.deleteFeature(featureId));
  }

  try {
    await transaction.commit();
  } catch (error) {
    await transaction.rollback(); // Undo all deletions
    throw error;
  }
}
```

**Pros**:
- ✅ True atomicity (all or nothing)

**Cons**:
- ❌ Complex rollback (must restore multiple features)
- ❌ All features fail if one fails (too strict)
- ❌ Harder to debug (which feature caused failure?)

**Why Rejected**: Too strict. If FS-050 deletion succeeds and FS-051 fails, rollback is overkill.

---

### 2. Parallel Batch Deletion

```typescript
async execute(featureIds: string[]): Promise<void> {
  // Delete all features in parallel
  const results = await Promise.allSettled(
    featureIds.map(id => this.deleteFeature(id))
  );

  // Report results
  const succeeded = results.filter(r => r.status === 'fulfilled');
  const failed = results.filter(r => r.status === 'rejected');
}
```

**Pros**:
- ✅ Faster (parallel execution)

**Cons**:
- ❌ Git conflicts (multiple commits at once)
- ❌ Race conditions (two deletions modify same files)
- ❌ Poor UX (no progress indication)

**Why Rejected**: Git operations must be sequential (cannot commit in parallel).

---

### 3. Pattern-Based Deletion (Glob Matching)

```typescript
async execute(pattern: string): Promise<void> {
  // Match pattern (e.g., "FS-05*" → [FS-050, FS-051, FS-052])
  const featureIds = await this.matchPattern(pattern);

  // Delete matched features
  await this.batchDelete(featureIds);
}
```

**Pros**:
- ✅ Convenient for bulk cleanup

**Cons**:
- ❌ Dangerous (typo deletes wrong features)
- ❌ Hard to predict matches (what does "FS-*" match?)
- ❌ No preview before deletion

**Why Rejected**: Too risky. Explicit list safer than pattern matching.

---

## Consequences

### Positive (v1 - Single Feature Only)

- ✅ **Simple implementation**: No batch logic complexity
- ✅ **Easy to test**: Fewer edge cases
- ✅ **Clear UX**: One feature, one confirmation
- ✅ **Fast delivery**: Core functionality in v1

### Positive (v2 - Batch Support)

- ✅ **Incremental execution**: Clear progress tracking
- ✅ **Continue-on-error**: Partial success better than all-or-nothing
- ✅ **Atomic per-feature**: Each deletion uses transaction pattern
- ✅ **Backward compatible**: v1 single-feature deletion still works

### Negative

- ⚠️ **v1 limitation**: Must use shell loop for batch deletion
- ⚠️ **Manual workaround**: `for feature in ...; do delete; done`

### Neutral

- ℹ️ **v2 planned**: Batch support deferred to future increment
- ℹ️ **Pattern matching**: Not planned (too risky)

---

## v1 Command Interface

```typescript
// src/cli/commands/delete-feature.ts

export function registerDeleteFeatureCommand(program: Command): void {
  program
    .command('delete-feature <feature-id>')  // Single feature ID only
    .description('Delete a feature and all related files')
    .option('--force', 'Bypass active increment validation')
    .option('--dry-run', 'Preview deletion without executing')
    .option('--no-git', 'Skip git operations')
    .option('--no-github', 'Skip GitHub issue deletion')
    .option('--yes', 'Skip all confirmations')
    .action(async (featureId: string, options) => {
      // Validate single feature ID format
      if (!isValidFeatureId(featureId)) {
        console.error('Error: Invalid feature ID format. Expected: FS-XXX');
        process.exit(1);
      }

      // Reject batch syntax
      if (featureId.includes(',')) {
        console.error('Error: Batch deletion not supported in v1. Delete one feature at a time.');
        console.log('Workaround: for feature in FS-050 FS-051; do specweave delete-feature $feature --yes; done');
        process.exit(1);
      }

      // Execute single feature deletion
      const deleter = new FeatureDeleter({ logger });
      const result = await deleter.execute(featureId, options);

      console.log(result.summary);
    });
}

function isValidFeatureId(featureId: string): boolean {
  return /^FS-\d{3}$/.test(featureId);
}
```

---

## v2 Command Interface (Planned)

```typescript
// Future: Batch support

export function registerDeleteFeatureCommand(program: Command): void {
  program
    .command('delete-feature <feature-ids...>')  // Multiple IDs supported
    .description('Delete one or more features')
    .option('--force', 'Bypass active increment validation')
    .option('--dry-run', 'Preview deletion without executing')
    .option('--no-git', 'Skip git operations')
    .option('--no-github', 'Skip GitHub issue deletion')
    .option('--yes', 'Skip all confirmations')
    .option('--continue-on-error', 'Continue batch deletion on failure')
    .action(async (featureIds: string[], options) => {
      if (featureIds.length === 1) {
        // Single feature deletion (original behavior)
        await deleteSingleFeature(featureIds[0], options);
      } else {
        // Batch deletion (new behavior)
        const batchDeleter = new BatchFeatureDeleter({ logger });
        const result = await batchDeleter.execute(featureIds, options);

        console.log(`Batch deletion complete: ${result.succeeded}/${result.total} succeeded`);

        if (result.failed > 0) {
          console.error(`Failed to delete ${result.failed} features:`);
          result.failures.forEach(f => console.error(`  - ${f.featureId}: ${f.error}`));
          process.exit(1);
        }
      }
    });
}
```

---

## Edge Cases

### Case 1: Batch with Mixed Validation Results

**Scenario**: User tries to delete FS-050 (valid) and FS-051 (has active increments)

**v1 Behavior**: Not applicable (batch not supported)

**v2 Behavior**:
```
$ specweave delete-feature FS-050 FS-051
> Validation failed for 1 feature:
>   - FS-051: Active increment 0053 references this feature
>
> Fix the issue and try again, or use --force to override.
```

**Design Decision**: Abort entire batch if any validation fails (fail-fast).

---

### Case 2: Batch with Partial GitHub Failures

**Scenario**: FS-050 deletion succeeds, but GitHub API fails for FS-051

**v2 Behavior**:
```
$ specweave delete-feature FS-050 FS-051
> Deleting FS-050 (1/2)... ✓
> Deleting FS-051 (2/2)...
>   ✓ Files deleted
>   ✓ Git commit created
>   ✗ GitHub cleanup failed: Rate limit exceeded
>
> Warning: GitHub issues not closed for FS-051 (issue #42, #43)
> Manually close them using: gh issue close 42 43
>
> Batch deletion: 2/2 succeeded (1 partial success)
```

**Design Decision**: Continue on non-critical failures (GitHub, metadata).

---

## Migration Path

**v1 Users (single feature)**:
```bash
$ specweave delete-feature FS-052
```

**v2 Users (batch deletion)**:
```bash
# Same command works (backward compatible)
$ specweave delete-feature FS-052

# New batch syntax
$ specweave delete-feature FS-050 FS-051 FS-052
```

**No breaking changes**: v1 command interface fully compatible with v2.

---

## Testing Strategy

### v1 Tests (Single Feature)

```typescript
describe('FeatureDeleter (v1)', () => {
  it('deletes single feature successfully', async () => {
    const result = await deleter.execute('FS-052', {});
    expect(result.success).toBe(true);
    expect(result.filesDeleted).toBe(47);
  });

  it('rejects batch syntax', async () => {
    await expect(deleter.execute('FS-050,FS-051', {}))
      .rejects.toThrow('Invalid feature ID');
  });
});
```

### v2 Tests (Batch Support)

```typescript
describe('BatchFeatureDeleter (v2)', () => {
  it('deletes multiple features incrementally', async () => {
    const result = await batchDeleter.execute(['FS-050', 'FS-051'], {});
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('continues on single feature failure', async () => {
    mockDeleter.execute
      .mockResolvedValueOnce({ success: true }) // FS-050 succeeds
      .mockRejectedValueOnce(new Error('Fail')); // FS-051 fails

    const result = await batchDeleter.execute(['FS-050', 'FS-051'], { continueOnError: true });

    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(1);
  });

  it('aborts batch if any validation fails', async () => {
    mockValidator.validate
      .mockResolvedValueOnce({ valid: true })   // FS-050 valid
      .mockResolvedValueOnce({ valid: false }); // FS-051 invalid

    await expect(batchDeleter.execute(['FS-050', 'FS-051'], {}))
      .rejects.toThrow('Batch validation failed');

    // FS-050 should NOT be deleted (validation failed for batch)
    expect(mockDeleter.execute).not.toHaveBeenCalled();
  });
});
```

---

## Performance

**v1 Performance** (Single feature):
- Validation: ~100ms
- Deletion: ~2s
- Total: **~2.1s**

**v2 Performance** (Batch 3 features):
- Validation (all): ~300ms (parallel)
- Deletion (sequential): ~6s (2s per feature)
- Total: **~6.3s** (vs 3x2.1s = 6.3s manual)

**No significant overhead** from batch logic.

---

## References

- **Related ADR**: ADR-0124 (Atomic Deletion), ADR-0123 (Orchestration Pattern)
- **Pattern**: Incremental batch processing
- **Future**: Pattern-based deletion (ADR to be written)

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-11-23 | v1: Single feature only | Simplicity, 90% of use cases |
| 2025-11-23 | v2: Incremental batch (planned) | Continue-on-error, clear progress |
| 2025-11-23 | No pattern matching (v1/v2) | Too risky, explicit list safer |
| 2025-11-23 | Batch validation fail-fast | Prevent partial batch execution |
