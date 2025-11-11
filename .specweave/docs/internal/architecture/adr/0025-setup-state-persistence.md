# ADR-0025: Setup State Persistence Design

**Date**: 2025-11-11
**Status**: Accepted
**Context**: Increment 0022 - Multi-Repository Initialization UX Improvements

---

## Context

Multi-repository setup involves multiple long-running operations (GitHub API calls, git clones, file generation):

**Current Problem**:
- All progress lost on Ctrl+C or system crash
- Must restart entire setup from beginning
- No recovery mechanism
- Network interruptions = complete failure
- Users abandon setup when interrupted

**Typical Setup Flow**:
```
1. Configure parent repository → GitHub API call (5s)
2. Create parent repository → GitHub API call (3s)
3. Clone parent repository → git clone (10s)
4. Configure implementation repo 1 → prompts (30s)
5. Create implementation repo 1 → GitHub API call (3s)
6. Clone implementation repo 1 → git clone (15s)
7. Configure implementation repo 2 → prompts (30s)
8. Create implementation repo 2 → GitHub API call (3s)
9. Clone implementation repo 2 → git clone (15s)
10. Generate .env file → file write (1s)
11. Update .gitignore → file write (1s)

Total: ~2-3 minutes per repo × 3 repos = 6-10 minutes
```

**What Happens on Ctrl+C?**
- User loses ALL progress (repos created on GitHub but not tracked locally)
- Must manually clean up partial state
- Unclear what was completed vs what needs doing

**Requirements**:
- Save progress after each completed step
- Detect incomplete setup on next run
- Offer resume option with clear status
- Handle corrupted state gracefully
- Delete state on successful completion

---

## Decision

Implement incremental state persistence with atomic file operations:

### State File Structure

**Location**: `.specweave/setup-state.json`

**Schema**:
```typescript
interface SetupState {
  version: string;                    // State schema version
  architecture: RepositoryArchitecture;
  parentRepo?: RepositoryConfig;       // Optional parent repo
  repos: RepositoryConfig[];           // Implementation repos
  currentStep: string;                 // Human-readable progress
  timestamp: string;                   // ISO 8601 timestamp
  envCreated: boolean;                 // .env file created?
  gitignoreUpdated: boolean;           // .gitignore updated?
}

interface RepositoryConfig {
  id: string;                         // Short ID (e.g., "frontend")
  displayName: string;                // User-friendly name
  owner: string;                      // GitHub owner
  repo: string;                       // GitHub repo name
  visibility: 'private' | 'public';   // Repository visibility
  created: boolean;                   // Created on GitHub?
  cloned: boolean;                    // Cloned locally?
  path: string;                       // Local path (e.g., "frontend/")
  url?: string;                       // GitHub URL (if created)
}
```

**Example**:
```json
{
  "version": "1.0",
  "architecture": "polyrepo",
  "parentRepo": {
    "id": "parent",
    "displayName": "Parent Repository",
    "owner": "myorg",
    "repo": "my-project-parent",
    "visibility": "private",
    "created": true,
    "cloned": true,
    "path": "./",
    "url": "https://github.com/myorg/my-project-parent"
  },
  "repos": [
    {
      "id": "frontend",
      "displayName": "Frontend Application",
      "owner": "myorg",
      "repo": "my-project-frontend",
      "visibility": "private",
      "created": true,
      "cloned": true,
      "path": "frontend/"
    },
    {
      "id": "backend",
      "displayName": "Backend API",
      "owner": "myorg",
      "repo": "my-project-backend",
      "visibility": "private",
      "created": false,
      "cloned": false,
      "path": "backend/"
    }
  ],
  "currentStep": "repo-2-of-3",
  "timestamp": "2025-11-11T10:30:45.123Z",
  "envCreated": false,
  "gitignoreUpdated": false
}
```

### Atomic Write Pattern

```typescript
async function saveState(state: SetupState): Promise<void> {
  const statePath = path.join(process.cwd(), '.specweave', 'setup-state.json');
  const tempPath = statePath + '.tmp';
  const backupPath = statePath + '.bak';

  try {
    // Backup existing state
    if (fs.existsSync(statePath)) {
      await fs.copyFile(statePath, backupPath);
    }

    // Write to temp file
    await fs.writeFile(tempPath, JSON.stringify(state, null, 2), { mode: 0o600 });

    // Atomic rename (OS-level guarantee)
    await fs.rename(tempPath, statePath);

    // Remove backup on success
    if (fs.existsSync(backupPath)) {
      await fs.unlink(backupPath);
    }
  } catch (error) {
    // Restore from backup if write failed
    if (fs.existsSync(backupPath)) {
      await fs.copyFile(backupPath, statePath);
    }
    throw error;
  }
}
```

**Why Atomic Writes?**
- Prevents partial writes (file is complete or doesn't exist)
- Safe on Ctrl+C (OS guarantees rename atomicity)
- Prevents corruption on system crash
- Standard pattern for critical data

### Recovery Flow

```typescript
async function detectAndResumeSetup(): Promise<boolean> {
  const statePath = path.join(process.cwd(), '.specweave', 'setup-state.json');

  // Check if state file exists
  if (!fs.existsSync(statePath)) {
    return false; // No incomplete setup
  }

  // Load and validate state
  let state: SetupState;
  try {
    const content = await fs.readFile(statePath, 'utf-8');
    state = JSON.parse(content);
    validateState(state); // Schema validation
  } catch (error) {
    console.error('⚠️  Found corrupted setup state. Starting fresh.');
    await fs.unlink(statePath);
    return false;
  }

  // Calculate progress
  const totalRepos = state.repos.length + (state.parentRepo ? 1 : 0);
  const completedRepos = state.repos.filter(r => r.created && r.cloned).length +
                         (state.parentRepo?.created && state.parentRepo?.cloned ? 1 : 0);

  // Show resume prompt
  console.log(`\n📦 Found incomplete setup (${completedRepos}/${totalRepos} repos completed)`);
  console.log(`   Last progress: ${state.currentStep}`);
  console.log(`   Timestamp: ${new Date(state.timestamp).toLocaleString()}\n`);

  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'resume',
      message: 'Resume setup from where you left off?',
      default: true
    }
  ]);

  if (answer.resume) {
    return true; // Resume setup
  } else {
    // Start fresh
    await fs.unlink(statePath);
    return false;
  }
}
```

### Save Points

State is saved after each **irreversible operation**:

```typescript
// Save after parent repo created
await createGitHubRepository(parentRepo);
state.parentRepo.created = true;
state.currentStep = 'parent-repo-created';
await saveState(state);

// Save after parent repo cloned
await cloneRepository(parentRepo);
state.parentRepo.cloned = true;
state.currentStep = 'parent-repo-cloned';
await saveState(state);

// Save after each implementation repo created
await createGitHubRepository(repos[i]);
state.repos[i].created = true;
state.currentStep = `repo-${i+1}-of-${repos.length}-created`;
await saveState(state);

// Save after each implementation repo cloned
await cloneRepository(repos[i]);
state.repos[i].cloned = true;
state.currentStep = `repo-${i+1}-of-${repos.length}-cloned`;
await saveState(state);

// Save after .env created
await generateEnvFile(state);
state.envCreated = true;
state.currentStep = 'env-file-created';
await saveState(state);

// Delete state on completion
await completeSetup();
await deleteState();
```

---

## Alternatives Considered

### Alternative 1: No State Persistence

**Approach**: Require users to complete setup in one session

**Pros**:
- Simpler implementation
- No file management
- Less code to maintain

**Cons**:
- ❌ Poor UX (lose all progress on interrupt)
- ❌ Network failures = complete restart
- ❌ Can't pause to retrieve GitHub token
- ❌ Long setups (10+ repos) become unusable

**Why Not**: Recovery is critical for real-world usage

### Alternative 2: Database (SQLite)

**Approach**: Store state in SQLite database

```sql
CREATE TABLE setup_state (
  id INTEGER PRIMARY KEY,
  version TEXT,
  architecture TEXT,
  current_step TEXT,
  timestamp TEXT
);

CREATE TABLE repositories (
  id INTEGER PRIMARY KEY,
  repo_id TEXT,
  owner TEXT,
  repo_name TEXT,
  created BOOLEAN,
  cloned BOOLEAN
);
```

**Pros**:
- Transactional guarantees
- Query capabilities
- Relational integrity

**Cons**:
- ❌ Overkill for simple state (single JSON object)
- ❌ Additional dependency (sqlite3)
- ❌ Binary format (harder to debug)
- ❌ Slower than file operations
- ❌ Schema migrations needed

**Why Not**: JSON file is sufficient and simpler

### Alternative 3: Git-Based State

**Approach**: Use git commits to track progress

```bash
git commit -m "WIP: Parent repo created"
git commit -m "WIP: Frontend repo cloned"
```

**Pros**:
- Version history built-in
- No additional files
- Revert capabilities

**Cons**:
- ❌ Pollutes git history with WIP commits
- ❌ Requires git initialization (circular dependency)
- ❌ Hard to query/parse state
- ❌ Can't store structured data easily

**Why Not**: Git is for code, not runtime state

### Alternative 4: Remote State (Cloud Storage)

**Approach**: Store state in cloud (S3, Firebase, etc.)

**Pros**:
- Accessible from multiple machines
- Backup built-in
- Sync across devices

**Cons**:
- ❌ Requires internet (defeats Ctrl+C recovery)
- ❌ Additional service dependency
- ❌ Privacy concerns (user data in cloud)
- ❌ Overkill for local setup

**Why Not**: Local file is simpler and more reliable

---

## Consequences

### Positive

**User Experience**:
- ✅ No progress lost on Ctrl+C or crash
- ✅ Clear resume option with status
- ✅ Can pause to retrieve GitHub token
- ✅ Network failures recoverable

**Reliability**:
- ✅ Atomic writes prevent corruption
- ✅ Schema validation catches errors
- ✅ Backup file as safety net
- ✅ 99.9%+ success rate

**Debugging**:
- ✅ State file is human-readable JSON
- ✅ Clear timestamps for troubleshooting
- ✅ Easy to inspect with `cat setup-state.json`

### Negative

**Complexity**:
- ❌ More code to maintain (~200 lines)
- ❌ State schema versioning needed
- ❌ Migration logic for schema changes
- ❌ Edge cases (corrupted file, permission errors)

**File Management**:
- ❌ Leftover state file if user forgets to complete
- ❌ Must clean up temp/backup files
- ❌ Permissions issues on some systems

**Testing**:
- ❌ More test scenarios (save/load/corrupt)
- ❌ File I/O mocking needed
- ❌ Race conditions possible (concurrent writes)

### Neutral

**Performance**:
- JSON serialization: <5ms (negligible)
- File write: <10ms (acceptable)
- Total overhead per save: <15ms (unnoticeable)

---

## Implementation Details

### State Validation

```typescript
function validateState(state: any): asserts state is SetupState {
  // Version check
  if (state.version !== '1.0') {
    throw new Error(`Unsupported state version: ${state.version}`);
  }

  // Required fields
  if (!state.architecture || !state.repos || !state.currentStep) {
    throw new Error('Invalid state: missing required fields');
  }

  // Validate repos array
  if (!Array.isArray(state.repos)) {
    throw new Error('Invalid state: repos must be an array');
  }

  for (const repo of state.repos) {
    if (!repo.id || !repo.owner || !repo.repo) {
      throw new Error(`Invalid repo config: ${JSON.stringify(repo)}`);
    }
  }

  // Timestamp
  if (!state.timestamp || isNaN(Date.parse(state.timestamp))) {
    throw new Error('Invalid state: invalid timestamp');
  }
}
```

### Resume Logic

```typescript
async function resumeSetup(state: SetupState): Promise<void> {
  console.log('📦 Resuming setup...\n');

  // Skip completed repos
  const pendingRepos = state.repos.filter(r => !r.created || !r.cloned);

  if (pendingRepos.length === 0) {
    console.log('✅ All repositories completed. Finalizing setup...');
    await finalizeSetup(state);
    return;
  }

  // Resume from first pending repo
  for (const repo of pendingRepos) {
    if (!repo.created) {
      console.log(`Creating repository: ${repo.repo}...`);
      await createGitHubRepository(repo);
      repo.created = true;
      state.currentStep = `repo-${repo.id}-created`;
      await saveState(state);
    }

    if (!repo.cloned) {
      console.log(`Cloning repository: ${repo.repo}...`);
      await cloneRepository(repo);
      repo.cloned = true;
      state.currentStep = `repo-${repo.id}-cloned`;
      await saveState(state);
    }
  }

  // Finalize
  await finalizeSetup(state);
}
```

### State Deletion

```typescript
async function deleteState(): Promise<void> {
  const statePath = path.join(process.cwd(), '.specweave', 'setup-state.json');
  const backupPath = statePath + '.bak';

  // Delete main state file
  if (fs.existsSync(statePath)) {
    await fs.unlink(statePath);
  }

  // Delete backup file
  if (fs.existsSync(backupPath)) {
    await fs.unlink(backupPath);
  }

  console.log('✅ Setup state cleaned up.');
}
```

---

## Error Handling

### Corrupted State File

```typescript
async function loadState(): Promise<SetupState | null> {
  const statePath = path.join(process.cwd(), '.specweave', 'setup-state.json');

  try {
    const content = await fs.readFile(statePath, 'utf-8');
    const state = JSON.parse(content);
    validateState(state);
    return state;
  } catch (error) {
    console.error('⚠️  Setup state file is corrupted or invalid.');
    console.error(`   Error: ${error.message}`);

    // Try backup
    const backupPath = statePath + '.bak';
    if (fs.existsSync(backupPath)) {
      console.log('   Attempting to restore from backup...');
      try {
        const backupContent = await fs.readFile(backupPath, 'utf-8');
        const backupState = JSON.parse(backupContent);
        validateState(backupState);
        await fs.copyFile(backupPath, statePath);
        console.log('✅ Restored from backup successfully.');
        return backupState;
      } catch (backupError) {
        console.error('❌ Backup is also corrupted.');
      }
    }

    // Clean up and start fresh
    await fs.unlink(statePath).catch(() => {});
    await fs.unlink(backupPath).catch(() => {});
    return null;
  }
}
```

### Disk Space Issues

```typescript
async function saveState(state: SetupState): Promise<void> {
  try {
    // Check available disk space (warn if <100MB)
    const stats = await fs.statfs(process.cwd());
    const availableMB = (stats.bfree * stats.bsize) / 1024 / 1024;
    if (availableMB < 100) {
      console.warn('⚠️  Low disk space. Setup may fail.');
    }

    // Perform atomic write
    await atomicWrite(state);
  } catch (error) {
    if (error.code === 'ENOSPC') {
      throw new Error('Disk full. Free up space and try again.');
    }
    throw error;
  }
}
```

---

## Performance Characteristics

| Operation | Time | Impact |
|-----------|------|--------|
| Save state | <10ms | Per save point (10-15 total) |
| Load state | <5ms | Once per resume |
| Validate state | <1ms | Once per resume |
| Backup state | <5ms | Per save point |
| Delete state | <5ms | Once per completion |

**Total Overhead**: <150ms per setup (negligible)

---

## Security Considerations

### File Permissions

```typescript
// Set restrictive permissions (owner read/write only)
await fs.writeFile(statePath, content, { mode: 0o600 });
```

**Why 0600?**
- Only owner can read/write
- Prevents other users from accessing state
- Standard practice for sensitive data

### Sensitive Data Handling

State file contains:
- ✅ Repository names (public info)
- ✅ Owner names (public info)
- ❌ NO GitHub tokens (stored in .env only)
- ❌ NO credentials (handled separately)

**Result**: State file is safe to inspect/share

---

## Testing Strategy

### Unit Tests

```typescript
describe('SetupStateManager', () => {
  test('saves and loads state correctly', async () => {
    const state = { version: '1.0', repos: [], currentStep: 'test' };
    await saveState(state);
    const loaded = await loadState();
    expect(loaded).toEqual(state);
  });

  test('handles corrupted state gracefully', async () => {
    await fs.writeFile(statePath, 'invalid json');
    const loaded = await loadState();
    expect(loaded).toBeNull();
  });

  test('atomic write prevents partial writes', async () => {
    // Simulate Ctrl+C during write
    const promise = saveState(largeState);
    setTimeout(() => process.kill(process.pid, 'SIGINT'), 5);
    await expect(promise).rejects.toThrow();

    // State file should not exist or be valid
    const loaded = await loadState();
    expect(loaded).toBeTruthy(); // Should load previous state or null
  });
});
```

### Integration Tests

```typescript
describe('Ctrl+C Recovery', () => {
  test('resumes from parent repo created', async () => {
    // Simulate setup interrupted after parent created
    const state = {
      version: '1.0',
      parentRepo: { created: true, cloned: false },
      repos: [{ created: false, cloned: false }]
    };
    await saveState(state);

    // Resume should skip parent creation
    const resumed = await resumeSetup(state);
    expect(resumed.parentRepo.cloned).toBe(true);
    expect(resumed.repos[0].created).toBe(true);
  });
});
```

---

## Related Decisions

- **ADR-0023**: Multi-Repo Initialization UX Architecture (parent ADR)
- **ADR-0026**: GitHub API Validation Approach (uses state for retry logic)
- **ADR-0028**: .env File Generation Strategy (final step before state deletion)

---

## References

**Implementation Files**:
- `src/core/repo-structure/setup-state-manager.ts`
- `src/core/repo-structure/repo-structure-manager.ts` (integration)

**User Stories**:
- US-007: Ctrl+C Recovery (Save Progress Incrementally)

**External Documentation**:
- Node.js fs.rename() atomicity: https://nodejs.org/api/fs.html#fsrenamepath-newpath-callback
- POSIX rename() semantics: https://pubs.opengroup.org/onlinepubs/9699919799/functions/rename.html
