# ADR-0025: Incremental State Persistence

**Status**: Accepted
**Date**: 2025-11-11
**Deciders**: System Architect, Tech Lead
**Technical Story**: Increment 0022 - Multi-Repo Initialization UX Improvements

## Context

Multi-repository setup requires multiple GitHub API calls, local git operations, and user prompts. The process can take 5-15 minutes for projects with multiple repos.

**Problems Without State Persistence**:
1. **Ctrl+C loses all progress**: User must restart from beginning
2. **Network failures**: API call fails → lose all configuration
3. **No audit trail**: Can't review what was configured vs what succeeded
4. **Poor UX**: Users afraid to interrupt or modify setup mid-process

**User Impact**: Frustration from having to re-enter all repository configurations after any interruption.

## Decision

Implement incremental state persistence using atomic file operations with automatic backup and corruption recovery.

### Architecture

**State File**: `.specweave/setup-state.json`

```json
{
  "version": "1.0.0",
  "architecture": "parent",
  "parentRepo": {
    "name": "my-project-parent",
    "owner": "my-org",
    "description": "Parent repo for specs",
    "visibility": "private",
    "createOnGitHub": true,
    "url": "https://github.com/my-org/my-project-parent"
  },
  "repos": [
    {
      "id": "frontend",
      "displayName": "my-project-frontend",
      "owner": "my-org",
      "repo": "my-project-frontend",
      "visibility": "private",
      "created": true,
      "cloned": false,
      "path": "frontend",
      "url": "https://github.com/my-org/my-project-frontend"
    }
  ],
  "currentStep": "repos-configured",
  "timestamp": "2025-11-11T15:30:00Z",
  "envCreated": false
}
```

### Atomic Write Pattern

```typescript
class SetupStateManager {
  async saveState(state: SetupState): Promise<void> {
    const tempPath = this.paths.temp;
    const statePath = this.paths.state;
    const backupPath = this.paths.backup;

    // 1. Create backup of existing state (if exists)
    if (fs.existsSync(statePath)) {
      await fs.copy(statePath, backupPath);
    }

    // 2. Write to temp file
    await fs.writeJson(tempPath, state, { spaces: 2, mode: 0o600 });

    // 3. Atomic rename (POSIX guarantee)
    await fs.rename(tempPath, statePath);

    // 4. Set secure permissions
    await fs.chmod(statePath, 0o600); // -rw-------
  }
}
```

**Why atomic?** Rename operation is atomic on POSIX systems. If process crashes during write:
- Temp file corrupted → Original state intact
- Backup exists → Can restore from backup
- No partial writes visible to readers

### Recovery Flow

```typescript
async detectAndResumeSetup(): Promise<SetupState | null> {
  // 1. Try to read state file
  if (fs.existsSync(this.paths.state)) {
    try {
      const state = await fs.readJson(this.paths.state);

      // 2. Validate state structure
      if (this.isValidState(state)) {
        return state;
      }

      // 3. State corrupted → Try backup
      console.warn('State corrupted, attempting backup recovery...');
      if (fs.existsSync(this.paths.backup)) {
        const backup = await fs.readJson(this.paths.backup);
        if (this.isValidState(backup)) {
          // Restore from backup
          await fs.copy(this.paths.backup, this.paths.state);
          return backup;
        }
      }

      // 4. Both corrupted → Delete and start fresh
      await this.deleteState();
      return null;

    } catch (error) {
      // JSON parse error → Try backup → Delete
      return await this.recoverFromBackup();
    }
  }

  return null; // No state found
}
```

### Save Points

State is saved after each significant step:

| Step | State Saved | Reason |
|------|-------------|--------|
| Architecture selected | `currentStep: "architecture-selected"` | User chose single/multi-repo/parent |
| Parent repo configured | `currentStep: "parent-repo-configured"` | Parent repo details entered |
| Repo N configured | `currentStep: "repo-N-configured"` | Each implementation repo entered |
| GitHub repos created | `created: true` per repo | Track which repos succeeded |
| Local repos cloned | `cloned: true` per repo | Track which clones succeeded |
| .env file created | `envCreated: true` | Track .env generation |

**Granularity**: After EVERY user input or API call. This ensures minimal data loss on interruption.

## Alternatives Considered

### Alternative 1: No State Persistence

**Approach**: Start from scratch on every run

**Rejected because**:
- Poor user experience
- Wastes time re-entering configurations
- Increases likelihood of errors (users rush through)
- No audit trail of what was attempted

### Alternative 2: Database (SQLite, LevelDB)

**Approach**: Use embedded database for state storage

**Rejected because**:
- Overkill for simple state object
- Adds dependency complexity
- Harder to inspect/debug (binary format)
- JSON is human-readable and git-friendly

### Alternative 3: In-Memory Only

**Approach**: Keep state in memory, prompt user to save before exit

**Rejected because**:
- Can't recover from crashes
- Doesn't help with Ctrl+C (still loses state)
- Requires user action (adds friction)
- No automatic backup

### Alternative 4: State in .specweave/config.json

**Approach**: Store setup state in main config file

**Rejected because**:
- Pollutes permanent config with temporary state
- Harder to clean up after completion
- Mixing concerns (config vs temporary state)
- Lockfile approach clearer (separate file = separate concern)

## Consequences

### Positive

✅ **Ctrl+C recovery**
- Users can safely interrupt setup
- Resume exactly where they left off
- No lost work or re-entry

✅ **Network resilience**
- GitHub API failures don't lose progress
- Can retry failed steps without restarting
- State tracks which repos succeeded vs failed

✅ **Audit trail**
- Complete record of setup process
- Can review what was configured
- Helps debugging setup issues

✅ **Better error handling**
- Partial failures clearly identified
- Can fix specific issues without full restart
- State shows exactly what needs completion

✅ **Corruption recovery**
- Automatic backup on every save
- Fallback to backup if state corrupted
- Graceful degradation (delete and restart if both corrupted)

### Negative

⚠️ **Stale state files**
- If user never completes setup, state file remains
- Must be manually cleaned up or auto-detected
- Could confuse next setup attempt

⚠️ **Race conditions (theoretical)**
- Multiple SpecWeave processes could conflict
- Unlikely in practice (CLI tool, single user)
- File locking not implemented (KISS principle)

⚠️ **Disk space usage**
- 2 files (state + backup) instead of 0
- Each ~1-5KB depending on repo count
- Negligible impact, auto-cleaned on completion

### Mitigation

**Stale state detection**: Prompt user on next setup
```typescript
if (resumedState) {
  console.log('⏸️  Detected interrupted setup from 2 hours ago');
  const { shouldResume } = await inquirer.prompt([{
    message: 'Resume previous setup?',
    default: true
  }]);

  if (!shouldResume) {
    await this.deleteState(); // Clean start
  }
}
```

**Automatic cleanup**: Delete state on successful completion
```typescript
async finalizeSetup(): Promise<void> {
  // Setup complete → Clean up state files
  await this.stateManager.deleteState();

  console.log('✅ Setup complete! State files cleaned up.');
}
```

## Implementation

**Files Created**:
- `src/core/repo-structure/setup-state-manager.ts` - State persistence logic (180 lines)
- `tests/unit/repo-structure/setup-state-manager.test.ts` - Unit tests (150 lines)

**Integration**:
- `src/core/repo-structure/repo-structure-manager.ts:65` - Instantiate state manager
- `src/core/repo-structure/repo-structure-manager.ts:81` - Detect and resume
- `src/core/repo-structure/repo-structure-manager.ts:545` - Save state checkpoints
- `src/core/repo-structure/repo-structure-manager.ts:711` - Delete on completion

**Test Coverage**: 85% (covers atomic writes, corruption recovery, validation)

## References

- **Increment 0022 Spec**: `.specweave/increments/0022-multi-repo-init-ux/spec.md`
- **User Story**: US-007 - Ctrl+C Recovery
- **Acceptance Criteria**: AC-US7-01 through AC-US7-06
- **Related ADRs**:
  - ADR-0027: .env File Structure (similar security considerations)

## Notes

**File Permissions**: State files use `0600` (-rw-------) for security
- Only owner can read/write
- Prevents accidental exposure of GitHub tokens (if stored)
- Consistent with .env file permissions

**POSIX Atomicity**: Rename operation is atomic on all POSIX systems (Linux, macOS, BSD)
- Windows: Rename NOT atomic (but "good enough" for this use case)
- Future: Could use Windows-specific atomic operations if needed

**Future Enhancements**:
- Expire old state files (>7 days) automatically
- Cloud sync for team collaboration (optional)
- State migration on version upgrades
- Rollback to previous state (multi-level undo)
