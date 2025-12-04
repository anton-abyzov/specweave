# ADR-0131: External Tool Sync Context Detection

**Status**: Accepted
**Date**: 2025-11-24
**Deciders**: Anton Abyzov (Tech Lead)
**Supersedes**: None (complements ADR-0129: US Sync Guard Rails)

## Context

### Problem Statement

SpecWeave has two distinct contexts for syncing specs to external tools (GitHub/JIRA/ADO):

1. **User-initiated context**: User runs `/specweave:sync-docs` or `/specweave:sync-specs` expecting specs to sync to living docs AND external tools automatically
2. **Hook-initiated context**: TodoWrite → post-task-completion hook → consolidated-sync → should sync ONLY to living docs (NOT external tools to prevent crashes)

**Before this ADR**, the flow was BROKEN:
- `/specweave:sync-specs` did NOT call external tool sync automatically
- Users had to manually run `/specweave-github:sync` as a separate step
- This violated the principle: "sync-docs calls sync-specs, which calls external tools"

**Emergency hotfix (v0.25.1)** disabled automatic external tool sync in hooks via `SKIP_US_SYNC=true`, but this also prevented user commands from syncing to external tools.

### The Crashes (Why This Matters)

**TodoWrite Crash Flow** (before this fix):
```
TodoWrite → post-task-completion.sh
  → consolidated-sync.js
    → us-completion-orchestrator.js
      → livingDocsSync.syncIncrement()
        → syncToExternalTools() [NO GUARD!]
          → syncToGitHub()
            → Edit/Write operations
              → NEW HOOK CHAIN
                → INFINITE RECURSION
                  → 💥 CRASH
```

**Root Cause**: `LivingDocsSync.syncIncrement()` had no way to distinguish between:
- User calling it (SHOULD sync to external tools)
- Hook calling it (should NOT sync to external tools)

## Decision

**Implement context-aware external tool sync using environment variables as context flags.**

### Architecture

#### Two Contexts, Two Behaviors

| Context | Trigger | SKIP_EXTERNAL_SYNC | External Sync? | Protection |
|---------|---------|-------------------|----------------|------------|
| **User** | `/specweave:sync-docs` or `/specweave:sync-specs` | Not set | ✅ YES | RECURSION_GUARD protects Edit/Write |
| **Hook** | TodoWrite → post-task-completion.sh | Set to `true` | ❌ NO | Prevents infinite loops |

#### Guard Rail Layering (Defense in Depth)

**Layer 1: Hook Context Detection**
```bash
# File: plugins/specweave/hooks/post-task-completion.sh (lines 463-469)
export SKIP_US_SYNC=true          # Prevent us-completion-orchestrator from running
export SKIP_EXTERNAL_SYNC=true    # Prevent LivingDocsSync.syncToExternalTools()
export SKIP_GITHUB_SYNC=true      # Prevent direct GitHub sync calls
```

**Layer 2: LivingDocsSync Protection**
```typescript
// File: src/core/living-docs/living-docs-sync.ts (lines 234-238)
if (!options.dryRun && process.env.SKIP_EXTERNAL_SYNC !== 'true') {
  await this.syncToExternalTools(incrementId, featureId, projectPath);
} else if (process.env.SKIP_EXTERNAL_SYNC === 'true') {
  this.logger.log('ℹ️  External tool sync skipped (SKIP_EXTERNAL_SYNC=true - hook context)');
}
```

**Layer 3: Universal Recursion Guard**
```bash
# All hooks check the same guard file
if [[ -f "$PROJECT_ROOT/.specweave/state/.hook-recursion-guard" ]]; then
  exit 0  # Prevents infinite hook chains
fi
```

#### Complete Flow Diagrams

**User-Initiated Flow** (External Tools Sync ✅):
```
/specweave:sync-docs 0053
  ↓
  [RECURSION_GUARD created at top level]
  ↓
  Calls /specweave:sync-specs 0053 (internal)
  ↓
  LivingDocsSync.syncIncrement()
    ↓
    Steps 1-6: Sync specs to living docs ✅
    ↓
    Step 7: Check process.env.SKIP_EXTERNAL_SYNC
      ↓
      Not set (user context) → syncToExternalTools() RUNS
      ↓
      syncToGitHub() / syncToJira() / syncToADO()
        ↓
        Edit/Write operations (update issue metadata)
        ↓
        PostToolUse:Edit/Write hooks fire
        ↓
        Hooks check RECURSION_GUARD
        ↓
        Guard exists → Exit early ✅
        ↓
        NO CRASH ✅
```

**Hook-Initiated Flow** (External Tools Skipped ✅):
```
TodoWrite (task marked complete)
  ↓
  post-task-completion.sh
    ↓
    Sets RECURSION_GUARD ✅
    Sets SKIP_US_SYNC=true ✅
    Sets SKIP_EXTERNAL_SYNC=true ✅
    ↓
    consolidated-sync.js
      ↓
      [5/6] us-completion-orchestrator.js
        ↓
        Checks: process.env.SKIP_US_SYNC === 'true'
        ↓
        Exits early → NO livingDocsSync.syncIncrement() ✅
        ↓
        (If somehow called anyway...)
        ↓
        LivingDocsSync.syncIncrement()
          ↓
          Checks: process.env.SKIP_EXTERNAL_SYNC === 'true'
          ↓
          Skips syncToExternalTools() ✅
          ↓
          NO external tool sync
          ↓
          NO crashes ✅
```

## Rationale

### Why Environment Variables?

**Alternatives Considered**:

1. **Pass `skipExternalSync` option through function calls**
   - ❌ Requires changing 10+ function signatures
   - ❌ Brittle (easy to forget to pass through)
   - ❌ Doesn't protect against indirect calls

2. **Detect call stack depth**
   - ❌ Unreliable (Node.js call stacks are complex)
   - ❌ False positives (legitimate nested calls)
   - ❌ Performance overhead

3. **Environment variables** (CHOSEN)
   - ✅ Universal (works across all code paths)
   - ✅ Simple to set (one line in hook)
   - ✅ Explicit intent (clear what context we're in)
   - ✅ Defense in depth (multiple layers can check)

### Why Three Separate Flags?

- **SKIP_US_SYNC**: Prevents us-completion-orchestrator from running (Layer 1)
- **SKIP_EXTERNAL_SYNC**: Prevents LivingDocsSync.syncToExternalTools() (Layer 2)
- **SKIP_GITHUB_SYNC**: Prevents direct GitHub sync calls (Layer 3 - legacy)

**Defense in Depth**: Even if one layer fails, the others provide protection.

### Why Universal Recursion Guard?

**Problem**: Edit/Write operations during external tool sync could trigger new hook chains.

**Solution**: ALL hooks check the SAME `RECURSION_GUARD_FILE` before executing ANY background work.

**Result**: Even if external tool sync runs (bug in code), Edit/Write hooks exit early, preventing infinite loops.

## Consequences

### Positive

1. **User Experience**: ✅ `/specweave:sync-docs` now does complete end-to-end sync (docs + external tools) in one command
2. **Safety**: ✅ TodoWrite can't crash Claude Code anymore (triple protection)
3. **Architecture**: ✅ Clear separation between user context and hook context
4. **Maintainability**: ✅ Future code can safely call LivingDocsSync without worrying about crashes
5. **Testability**: ✅ Easy to test both flows (just set environment variable)

### Negative

1. **Global State**: Environment variables are global state (but contained to process scope)
2. **Magic**: Developers need to know about SKIP_EXTERNAL_SYNC flag (documented here)
3. **Multiple Flags**: Three separate flags (SKIP_US_SYNC, SKIP_EXTERNAL_SYNC, SKIP_GITHUB_SYNC) - could consolidate in future

### Risks Mitigated

| Risk | Mitigation |
|------|------------|
| **Infinite recursion** | Universal recursion guard + SKIP flags |
| **Process exhaustion** | External tool sync disabled in hooks |
| **User confusion** | Clear error messages when sync skipped |
| **Regression** | Integration tests for both contexts |

## Implementation

### Files Changed

1. **src/core/living-docs/living-docs-sync.ts** (lines 234-238)
   - Added `process.env.SKIP_EXTERNAL_SYNC !== 'true'` check
   - Added informational log when skipped

2. **plugins/specweave/hooks/post-task-completion.sh** (line 469)
   - Added `export SKIP_EXTERNAL_SYNC=true`
   - Comment explaining defense in depth

### Testing Strategy

**Unit Tests**:
```typescript
describe('LivingDocsSync.syncIncrement', () => {
  it('should sync to external tools when SKIP_EXTERNAL_SYNC not set', async () => {
    delete process.env.SKIP_EXTERNAL_SYNC;
    const spy = vi.spyOn(sync, 'syncToExternalTools');
    await sync.syncIncrement('0053');
    expect(spy).toHaveBeenCalled();
  });

  it('should skip external tools when SKIP_EXTERNAL_SYNC=true', async () => {
    process.env.SKIP_EXTERNAL_SYNC = 'true';
    const spy = vi.spyOn(sync, 'syncToExternalTools');
    await sync.syncIncrement('0053');
    expect(spy).not.toHaveBeenCalled();
  });
});
```

**Integration Tests**:
```bash
# Test 1: User context
unset SKIP_EXTERNAL_SYNC
/specweave:sync-specs 0053
# Verify: GitHub issues created/updated

# Test 2: Hook context
export SKIP_EXTERNAL_SYNC=true
node plugins/specweave/lib/hooks/consolidated-sync.js 0053
# Verify: NO GitHub API calls
```

**Manual Testing**:
```bash
# Test user flow
/specweave:sync-docs 0053
# Expected: Living docs updated + GitHub synced

# Test hook flow
TodoWrite([{ content: "T-037", status: "completed" }])
# Expected: tasks.md updated + NO GitHub sync + NO crash
```

## Related

- **Increment**: 0053-safe-feature-deletion (implemented in this increment)
- **Previous ADRs**:
  - ADR-0129: US Sync Guard Rails (emergency hotfix)
  - ADR-0070: Hook Consolidation (v0.25.0)
  - ADR-0073: Hook Recursion Prevention Strategy
- **Root Cause Analysis**: `.specweave/increments/_archive/0053-safe-feature-deletion/reports/ROOT-CAUSE-ANALYSIS-TODOWRITE-CRASH-2025-11-24.md`

## Future Improvements

1. **Consolidate flags**: Single `SPECWEAVE_HOOK_CONTEXT=true` flag instead of three separate flags
2. **Explicit context API**: `sync.syncIncrement('0053', { context: 'hook' })` instead of environment variables
3. **Performance**: Cache external tool detection to avoid repeated file reads
4. **Observability**: Add metrics for external tool sync attempts/successes/skips

## Status

**Accepted** (2025-11-24)

**Implementation**: v0.26.2 (architectural fix)

**Related versions**:
- v0.25.1: Emergency hotfix (SKIP_US_SYNC only)
- v0.26.0: GitHub sync skip (SKIP_GITHUB_SYNC)
- v0.26.2: Complete fix (SKIP_EXTERNAL_SYNC + LivingDocsSync guard)
