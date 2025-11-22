# ADR-0059: Cancelation Strategy with State Persistence

**Date**: 2025-11-21
**Status**: Accepted

## Context

ADR-0055 established the need for graceful cancelation during bulk operations. Now we need concrete implementation details for how cancelation works.

**Requirements**:
- Detect Ctrl+C (SIGINT signal) during bulk operations
- Save partial progress to disk (survive process termination)
- Clean exit with summary (no errors thrown)
- Resume capability (continue from saved state)
- State TTL (24 hours, force fresh start if stale)

**User Expectations**:
- "If I hit Ctrl+C during import, don't lose my progress"
- "Let me resume where I left off"
- "Show me what succeeded before I canceled"

**Technical Constraints**:
- Node.js SIGINT handling (process.on('SIGINT'))
- Atomic file writes (no partial state corruption)
- Fast state save (< 500ms, don't delay exit)

## Decision

Implement **CancelationHandler with atomic state persistence**:

### Architecture

```typescript
class CancelationHandler {
  private canceled: boolean = false;
  private stateFile: string;
  private cleanupCallbacks: (() => Promise<void>)[] = [];

  constructor(options: CancelationOptions) {
    this.stateFile = options.stateFile;
    this.registerSigintHandler();
  }

  private registerSigintHandler(): void {
    process.on('SIGINT', async () => {
      if (this.canceled) {
        // Second Ctrl+C → force exit
        console.log('\n⚠️  Force exit (second Ctrl+C)');
        process.exit(1);
      }

      this.canceled = true;
      console.log('\n⚠️  Cancelation requested. Saving progress...');

      // Execute cleanup callbacks
      for (const cleanup of this.cleanupCallbacks) {
        await cleanup();
      }

      process.exit(0);  // Clean exit
    });
  }

  shouldCancel(): boolean {
    return this.canceled;
  }

  onCleanup(callback: () => Promise<void>): void {
    this.cleanupCallbacks.push(callback);
  }

  async saveState(state: CancelationState): Promise<void> {
    const stateWithMeta = {
      ...state,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };

    // Atomic write (temp file → rename)
    const tempFile = `${this.stateFile}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(stateWithMeta, null, 2));
    await fs.rename(tempFile, this.stateFile);

    console.log(chalk.cyan(`State saved to ${this.stateFile}`));
  }

  async loadState(): Promise<CancelationState | null> {
    if (!fs.existsSync(this.stateFile)) {
      return null;
    }

    const content = await fs.readFile(this.stateFile, 'utf-8');
    const state = JSON.parse(content);

    // Validate TTL (24 hours)
    const stateAge = Date.now() - new Date(state.timestamp).getTime();
    const ttlMs = 24 * 60 * 60 * 1000;  // 24 hours

    if (stateAge > ttlMs) {
      console.warn(chalk.yellow('⚠️  Saved state expired (> 24 hours old)'));
      await fs.unlink(this.stateFile);
      return null;
    }

    return state;
  }

  async clearState(): Promise<void> {
    if (fs.existsSync(this.stateFile)) {
      await fs.unlink(this.stateFile);
    }
  }
}
```

### State Structure

**File**: `.specweave/cache/import-state.json`

```typescript
interface CancelationState {
  // Operation metadata
  operation: string;           // "import-projects"
  provider: string;            // "jira" | "github" | "ado"
  domain?: string;             // "example.atlassian.net"

  // Progress tracking
  timestamp: string;           // ISO 8601 timestamp
  version: string;             // State schema version
  total: number;               // Total items to process
  completed: number;           // Items completed

  // Counters
  succeeded: number;           // Successful imports
  failed: number;              // Failed imports
  skipped: number;             // Skipped imports

  // Remaining work
  remaining: Array<{
    key: string;               // "PROJECT-123"
    name: string;              // "Backend Services"
  }>;

  // Error tracking
  errors: Array<{
    projectKey: string;
    error: string;
    timestamp: string;
  }>;
}
```

### Integration with AsyncProjectLoader

```typescript
class AsyncProjectLoader {
  async fetchAllProjects(
    credentials: Credentials,
    totalCount: number,
    options: FetchOptions
  ): Promise<FetchResult> {
    const cancelHandler = new CancelationHandler({
      stateFile: '.specweave/cache/import-state.json'
    });

    // Register cleanup callback (save state on Ctrl+C)
    cancelHandler.onCleanup(async () => {
      await cancelHandler.saveState({
        operation: 'import-projects',
        provider: 'jira',
        domain: credentials.domain,
        total: totalCount,
        completed: projects.length,
        succeeded: projects.filter(p => p.status === 'success').length,
        failed: errors.length,
        skipped: 0,
        remaining: allProjects.slice(projects.length),
        errors
      });

      console.log(chalk.yellow(`\n⚠️  Operation canceled`));
      console.log(chalk.cyan(`   Imported ${projects.length}/${totalCount} projects (${Math.floor(projects.length / totalCount * 100)}% complete)`));
      console.log(chalk.cyan(`   Resume with: /specweave-jira:import-projects --resume`));
    });

    // Main loop
    for (let offset = 0; offset < totalCount; offset += batchSize) {
      // Check for cancelation
      if (cancelHandler.shouldCancel()) {
        return { canceled: true, projects, errors };
      }

      // Fetch batch
      const batch = await this.fetchBatch(offset, batchSize);
      projects.push(...batch);
    }

    // Success → clear saved state
    await cancelHandler.clearState();
    return { projects, succeeded: projects.length, errors };
  }
}
```

### Resume Flow

**Command**: `/specweave-jira:import-projects --resume`

**Implementation**:
```typescript
async function resumeImport(): Promise<void> {
  const cancelHandler = new CancelationHandler({
    stateFile: '.specweave/cache/import-state.json'
  });

  // Load saved state
  const state = await cancelHandler.loadState();
  if (!state) {
    console.error(chalk.red('❌ No operation to resume'));
    console.log(chalk.cyan('   Start a new import with: /specweave-jira:import-projects'));
    return;
  }

  // Validate state
  if (state.operation !== 'import-projects') {
    console.error(chalk.red(`❌ Invalid state (expected "import-projects", got "${state.operation}")`));
    return;
  }

  // Show resume summary
  console.log(chalk.cyan(`Resuming from ${state.completed}/${state.total} (${Math.floor(state.completed / state.total * 100)}% complete)`));
  console.log(chalk.cyan(`   Remaining: ${state.remaining.length} projects`));
  if (state.errors.length > 0) {
    console.log(chalk.yellow(`   ⚠️  ${state.errors.length} errors (will retry)`));
  }

  // Continue from remaining projects
  const loader = new AsyncProjectLoader();
  const result = await loader.fetchProjects(
    credentials,
    state.remaining
  );

  // Clear state on success
  await cancelHandler.clearState();

  // Show final summary
  console.log(chalk.green(`✅ Import complete!`));
  console.log(chalk.cyan(`   Total: ${state.completed + result.succeeded}/${state.total}`));
  console.log(chalk.cyan(`   Previously: ${state.completed}, Now: ${result.succeeded}`));
}
```

### Double Ctrl+C Handling

**First Ctrl+C**: Graceful cancelation (save state, clean exit)
```
^C
⚠️  Cancelation requested. Saving progress...
State saved to .specweave/cache/import-state.json
⚠️  Operation canceled
   Imported 47/127 projects (37% complete)
   Resume with: /specweave-jira:import-projects --resume
```

**Second Ctrl+C** (within 5 seconds): Force exit (no state save)
```
^C
⚠️  Force exit (second Ctrl+C)
```

**Rationale**: Some users may want to abort immediately without waiting for state save.

### State Validation Rules

**On Resume**:
1. ✅ Check file exists (`.specweave/cache/import-state.json`)
2. ✅ Parse JSON (detect corruption)
3. ✅ Validate schema (required fields present)
4. ✅ Check TTL (< 24 hours old)
5. ✅ Validate operation type (`import-projects`)
6. ✅ Validate provider matches current config (`jira`)

**Validation Errors**:
- Missing file → "No operation to resume"
- Corrupted JSON → "Invalid state file (corrupted)"
- Expired (> 24h) → "State expired (start fresh)"
- Wrong operation → "Invalid state (expected 'import-projects')"
- Provider mismatch → "State is for 'github', not 'jira'"

## Alternatives Considered

### Alternative 1: No State Persistence (Exit Only)

**Approach**: Ctrl+C exits immediately without saving state

**Pros**:
- Simple implementation (just process.exit())
- No state file management

**Cons**:
- Users lose all progress
- Must restart from scratch
- Poor UX for long operations

**Why not**: Core requirement is to save partial progress.

---

### Alternative 2: In-Memory State Only

**Approach**: Keep state in memory, no disk persistence

**Pros**:
- Fast (no disk I/O)
- No TTL management

**Cons**:
- State lost on process exit (defeats purpose)
- Cannot resume after Ctrl+C
- Doesn't survive crashes

**Why not**: Resume capability requires disk persistence.

---

### Alternative 3: Database-Backed State

**Approach**: Save state to SQLite database

**Pros**:
- Transactional (atomic writes)
- Schema validation (SQL constraints)
- Easier to query (SQL vs. JSON)

**Cons**:
- Overkill for simple state persistence
- Adds dependency (SQLite driver)
- Harder to debug (binary file)
- Slower (database overhead)

**Why not**: JSON file is sufficient. Simpler and easier to debug.

---

### Alternative 4: Multiple Ctrl+C Modes (Graceful/Immediate/Force)

**Approach**: First Ctrl+C = graceful, second = immediate, third = force

**Pros**:
- More control for users
- Handles edge cases (hung operations)

**Cons**:
- Complex UX (users confused by three modes)
- Harder to document
- Unnecessary complexity

**Why not**: Two modes (graceful/force) are sufficient. Simpler UX.

## Consequences

**Positive**:
- ✅ Graceful cancelation (Ctrl+C doesn't lose progress)
- ✅ Resume capability (continue from saved state)
- ✅ Atomic state writes (no corruption risk)
- ✅ TTL expiration (stale state auto-cleaned)
- ✅ Double Ctrl+C force exit (emergency abort)

**Negative**:
- ❌ State file management complexity (TTL, validation)
- ❌ Resume command adds another UX path
- ❌ Atomic writes add latency (< 500ms, but noticeable)

**Risks & Mitigations**:

**Risk**: State file corrupted (invalid JSON)
- **Mitigation**: Atomic writes (temp file → rename)
- **Mitigation**: Validation on resume (prompt fresh start if invalid)

**Risk**: State save fails (disk full, permissions error)
- **Mitigation**: Catch write errors, log warning, exit anyway
- **Mitigation**: User can manually restart import

**Risk**: Ctrl+C during state save (partial write)
- **Mitigation**: Atomic writes (temp file → rename)
- **Mitigation**: Validation on resume detects partial write

**Risk**: State expires during operation (user resumes after 25 hours)
- **Mitigation**: TTL check before resume (prompt fresh start if > 24h)

## Implementation Notes

**Files Created**:
- `src/cli/helpers/cancelation-handler.ts` - CancelationHandler implementation
- `tests/unit/cli/helpers/cancelation-handler.test.ts` - Unit tests

**Files Modified**:
- `src/cli/helpers/project-fetcher.ts` - Integrate cancelation handler
- `src/cli/commands/init.ts` - Register SIGINT handler during init

**Config Fields** (`.specweave/config.json`):
```json
{
  "importStateTtlHours": 24,
  "importResumeEnabled": true,
  "importStatePath": ".specweave/cache/import-state.json"
}
```

**Dependencies**:
- `fs-extra` (already in use) - File operations
- `chalk` (already in use) - Terminal colors

**Testing**:
- Unit tests: State save/load, TTL validation, schema validation
- Integration tests: Simulate Ctrl+C at 50% completion, verify state saved
- E2E tests: Full resume flow (cancel → resume → complete)

## Related Decisions

- **ADR-0052**: Smart Pagination - Defines batch operations that need cancelation
- **ADR-0053**: CLI-First Defaults - Defines "Import all" strategy triggering bulk operations
- **ADR-0055**: Progress Tracking - Defines high-level cancelation requirements
- **ADR-0057**: Async Batch Fetching - Defines batch operations requiring cancelation handling
- **ADR-0058**: Progress Tracking Implementation - Defines progress UI during cancelation
