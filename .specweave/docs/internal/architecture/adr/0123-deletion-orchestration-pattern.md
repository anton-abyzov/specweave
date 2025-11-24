# ADR-0123: Deletion Orchestration Pattern (Step-by-Step with Checkpointing)

**Date**: 2025-11-23
**Status**: Accepted
**Deciders**: Architect, Tech Lead
**Priority**: P1

---

## Context

Feature deletion involves multiple operations that must execute in a specific order:
1. Validate feature exists
2. Scan files and increments
3. Confirm with user
4. Delete files (tracked vs untracked)
5. Commit to git
6. Close GitHub issues
7. Update orphaned increment metadata (if force mode)
8. Log to audit trail

**Problem**: If any step fails midway, we may end up in an **inconsistent state**:
- Files partially deleted
- Git commit created but GitHub issues not closed
- Audit log missing

**Requirements**:
- **Atomic-like behavior**: All or nothing (where possible)
- **Rollback on error**: Restore state if critical step fails
- **Checkpointing**: Track progress for partial recovery
- **Continue-on-failure**: Some failures are non-fatal (e.g., GitHub API down)

**Key Question**: Should we use transaction-like pattern (all-or-nothing) or step-by-step pattern (continue-on-failure)?

---

## Decision

**Step-by-Step Orchestration with Checkpointing & Continue-on-Failure**

```typescript
// src/core/feature-deleter/orchestrator.ts

export class FeatureDeletionOrchestrator {
  async execute(featureId: string, options: DeletionOptions): Promise<DeletionResult> {
    const checkpoint = new Checkpoint();
    const result: DeletionResult = {
      success: false,
      steps: [],
      errors: []
    };

    try {
      // STEP 1: Validate (CRITICAL - abort on failure)
      checkpoint.record('validation', 'started');
      const validation = await this.validator.validate(featureId, options);
      if (!validation.valid) {
        throw new ValidationError(validation.errors);
      }
      checkpoint.record('validation', 'completed');
      result.steps.push({ step: 'validation', status: 'success' });

      // STEP 2: Confirm (CRITICAL - abort if declined)
      if (!options.yes && !options.dryRun) {
        checkpoint.record('confirmation', 'started');
        const confirmed = await this.promptConfirmation(validation.report);
        if (!confirmed) {
          throw new UserCancelledError();
        }
        checkpoint.record('confirmation', 'completed');
      }
      result.steps.push({ step: 'confirmation', status: 'success' });

      // STEP 3: Delete Files (CRITICAL - rollback on failure)
      checkpoint.record('file-deletion', 'started');
      const deletionResult = await this.deleteFilesWithRollback(validation.files);
      checkpoint.record('file-deletion', 'completed', deletionResult);
      result.steps.push({ step: 'file-deletion', status: 'success', data: deletionResult });

      // STEP 4: Git Commit (CRITICAL - rollback on failure)
      if (!options.noGit) {
        checkpoint.record('git-commit', 'started');
        const commitSha = await this.gitService.commitDeletion({
          featureId,
          fileCount: deletionResult.total,
          mode: options.force ? 'force' : 'safe',
          orphanedIncrements: validation.orphanedIncrements
        });
        checkpoint.record('git-commit', 'completed', { commitSha });
        result.steps.push({ step: 'git-commit', status: 'success', data: { commitSha } });
      }

      // STEP 5: GitHub Issue Closure (NON-CRITICAL - continue on failure)
      if (!options.noGithub && validation.githubIssues.length > 0) {
        try {
          checkpoint.record('github-deletion', 'started');
          const githubResult = await this.githubService.deleteIssues(validation.githubIssues);
          checkpoint.record('github-deletion', 'completed', githubResult);
          result.steps.push({ step: 'github-deletion', status: 'success', data: githubResult });
        } catch (error) {
          // NON-FATAL: GitHub down doesn't block deletion
          this.logger.warn(`GitHub deletion failed: ${error.message}`);
          result.steps.push({ step: 'github-deletion', status: 'failed', error: error.message });
          result.errors.push(error);
        }
      }

      // STEP 6: Update Orphaned Metadata (NON-CRITICAL)
      if (options.force && validation.orphanedIncrements.length > 0) {
        try {
          checkpoint.record('metadata-update', 'started');
          await this.updateOrphanedMetadata(validation.orphanedIncrements);
          checkpoint.record('metadata-update', 'completed');
          result.steps.push({ step: 'metadata-update', status: 'success' });
        } catch (error) {
          this.logger.warn(`Metadata update failed: ${error.message}`);
          result.steps.push({ step: 'metadata-update', status: 'failed', error: error.message });
        }
      }

      // STEP 7: Audit Log (NON-CRITICAL - best effort)
      try {
        checkpoint.record('audit-log', 'started');
        await this.auditLogger.logDeletion({
          featureId,
          user: options.user || 'unknown',
          mode: options.force ? 'force' : 'safe',
          summary: { fileCount: deletionResult.total, ... },
          status: result.errors.length === 0 ? 'success' : 'partial'
        });
        checkpoint.record('audit-log', 'completed');
      } catch (error) {
        this.logger.warn(`Audit log failed: ${error.message}`);
      }

      result.success = true;
      return result;

    } catch (error) {
      // CRITICAL FAILURE: Rollback
      await this.rollback(checkpoint);
      throw error;
    }
  }

  private async deleteFilesWithRollback(files: string[]): Promise<DeletionResult> {
    const deletedFiles: string[] = [];

    try {
      for (const file of files) {
        await fs.unlink(file);
        deletedFiles.push(file);
      }
      return { total: deletedFiles.length, files: deletedFiles };
    } catch (error) {
      // ROLLBACK: Restore deleted files (if possible)
      this.logger.error(`File deletion failed: ${error.message}. Attempting rollback...`);
      await this.restoreFiles(deletedFiles);
      throw error;
    }
  }

  private async rollback(checkpoint: Checkpoint): Promise<void> {
    const steps = checkpoint.getSteps();

    // Rollback in reverse order
    for (let i = steps.length - 1; i >= 0; i--) {
      const step = steps[i];

      if (step.name === 'file-deletion' && step.status === 'completed') {
        await this.restoreFiles(step.data.files);
      }

      if (step.name === 'git-commit' && step.status === 'completed') {
        await this.gitService.reset('HEAD~1'); // Undo commit
      }
    }
  }
}
```

**Rationale**:
- **Step-by-step**: Clear error reporting (which step failed)
- **Checkpointing**: Track progress for rollback
- **Continue-on-failure**: Non-critical steps (GitHub, metadata) don't block
- **Rollback**: Critical steps (files, git) roll back on error

---

## Alternatives Considered

### 1. Transaction-Like Pattern (All or Nothing)

```typescript
async execute(): Promise<void> {
  const transaction = new Transaction();

  try {
    transaction.add(() => this.deleteFiles());
    transaction.add(() => this.gitCommit());
    transaction.add(() => this.githubDelete());

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

**Pros**:
- ✅ True atomicity

**Cons**:
- ❌ GitHub failure blocks entire deletion (too strict)
- ❌ Cannot partially succeed (all-or-nothing only)
- ❌ Complex rollback logic

**Why Rejected**: Too strict. GitHub API being down shouldn't prevent local file deletion.

---

### 2. Fire-and-Forget (No Rollback)

```typescript
async execute(): Promise<void> {
  await this.deleteFiles(); // If fails, abort
  await this.gitCommit();   // If fails, abort
  await this.githubDelete(); // If fails, ignore
}
```

**Pros**:
- ✅ Simple

**Cons**:
- ❌ No rollback (inconsistent state on failure)
- ❌ No checkpointing (cannot resume)

**Why Rejected**: No safety net for critical failures.

---

## Consequences

### Positive

- ✅ **Partial success**: Non-critical failures don't block
- ✅ **Rollback support**: Critical failures restore state
- ✅ **Clear error reporting**: Know exactly which step failed
- ✅ **Checkpointing**: Can resume after Ctrl+C (future enhancement)
- ✅ **Testable**: Each step independently testable

### Negative

- ⚠️ **Complexity**: More code than fire-and-forget
- ⚠️ **Rollback limitations**: Cannot restore deleted files if git committed

### Neutral

- ℹ️ **Best-effort rollback**: Rollback is best-effort, not guaranteed

---

## Step Classification

| Step | Criticality | Rollback | Continue on Failure |
|------|-------------|----------|---------------------|
| Validation | CRITICAL | N/A | No (abort) |
| Confirmation | CRITICAL | N/A | No (abort) |
| File Deletion | CRITICAL | Yes (restore files) | No (abort) |
| Git Commit | CRITICAL | Yes (reset HEAD) | No (abort) |
| GitHub Issues | NON-CRITICAL | No | Yes (log warning) |
| Metadata Update | NON-CRITICAL | No | Yes (log warning) |
| Audit Log | NON-CRITICAL | No | Yes (log warning) |

---

## Checkpointing

**Purpose**: Track execution progress for debugging and future resume support

```typescript
class Checkpoint {
  private steps: CheckpointStep[] = [];

  record(name: string, status: 'started' | 'completed' | 'failed', data?: any): void {
    this.steps.push({
      name,
      status,
      timestamp: new Date().toISOString(),
      data
    });
  }

  getSteps(): CheckpointStep[] {
    return this.steps;
  }

  save(filePath: string): Promise<void> {
    return fs.writeFile(filePath, JSON.stringify(this.steps, null, 2));
  }
}
```

**Checkpoint File** (`.specweave/state/deletion-checkpoint.json`):
```json
[
  { "name": "validation", "status": "completed", "timestamp": "2025-11-23T14:30:00Z" },
  { "name": "confirmation", "status": "completed", "timestamp": "2025-11-23T14:30:05Z" },
  { "name": "file-deletion", "status": "started", "timestamp": "2025-11-23T14:30:10Z" },
  { "name": "file-deletion", "status": "failed", "timestamp": "2025-11-23T14:30:12Z", "error": "EACCES: permission denied" }
]
```

---

## Error Handling Strategy

### Critical Errors (Abort + Rollback)

- `ValidationError`: Feature doesn't exist
- `FileSystemError`: Permission denied, disk full
- `GitError`: Repository corrupted, merge conflict

**Action**: Abort, rollback, show error, suggest fix

### Non-Critical Errors (Log + Continue)

- `GitHubAPIError`: API down, rate limit exceeded
- `MetadataUpdateError`: metadata.json missing

**Action**: Log warning, continue, include in final report

---

## Testing

```typescript
describe('FeatureDeletionOrchestrator', () => {
  it('rolls back file deletion on git commit failure', async () => {
    mockGitService.commitDeletion.mockRejectedValue(new GitError('Commit failed'));

    await expect(orchestrator.execute('FS-052', {}))
      .rejects.toThrow(GitError);

    // Files should be restored
    expect(fs.existsSync('deleted-file.txt')).toBe(true);
  });

  it('continues on GitHub API failure', async () => {
    mockGitHubService.deleteIssues.mockRejectedValue(new GitHubAPIError('API down'));

    const result = await orchestrator.execute('FS-052', {});

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(1);
    expect(result.steps.find(s => s.step === 'github-deletion').status).toBe('failed');
  });
});
```

---

## References

- **Related ADR**: ADR-0121 (Validation Engine), ADR-0119 (Git Integration)
- **Pattern**: Saga pattern (distributed transactions)

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-11-23 | Step-by-step orchestration | Flexibility + error reporting |
| 2025-11-23 | Checkpointing | Debugging + future resume support |
| 2025-11-23 | Continue-on-failure for non-critical steps | Resilience |
| 2025-11-23 | Rollback for critical steps | Safety |
