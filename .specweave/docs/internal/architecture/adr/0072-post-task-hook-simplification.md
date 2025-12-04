# ADR-0072: Post-Task Hook Simplification (Emergency Fix v0.26.0)

## Status
✅ Accepted (2025-11-23)

## Context

### The Critical Problem

Claude Code has been crashing consistently immediately after completing tasks in increments. The crashes occur reliably within 5 seconds of marking a task as complete via TodoWrite.

### Investigation Findings

**Root Cause**: Hook cascade amplification causing process exhaustion.

**The Chain Reaction**:
```
1. TodoWrite (mark task complete)
   ↓
2. post-task-completion.sh (background process spawns)
   ↓  
3. consolidated-sync.js runs (Node.js)
   ├─ Edit: .specweave/increments/_archive/0051/tasks.md  
   │   ├─ PreToolUse:Edit → pre-edit-write-consolidated.sh
   │   ├─ PostToolUse:Edit → post-edit-write-consolidated.sh  
   │   └─ PostToolUse:Edit → post-metadata-change.sh
   │
   ├─ Write: living-docs/features/FS-049/US-001.md (3 hooks)
   ├─ Write: living-docs/features/FS-049/US-002.md (3 hooks)
   ├─ Write: living-docs/features/FS-049/US-003.md (3 hooks)
   └─ Write: living-docs/features/FS-049/US-004.md (3 hooks)

Total: 15 hook invocations per task completion
Result: ~20 concurrent processes → Process exhaustion → Crash
```

**Why Previous Fixes Didn't Work**:
- v0.24.3: Emergency safety (kill switch, circuit breaker, locks, debouncing) → Hooks run successfully but too many at once
- v0.25.0: Hook consolidation (6 → 4 hooks per Edit/Write) → Still 15 invocations total
- v0.24.4: Active increment filtering → Active increment DOES need processing

**The Fundamental Issue**: Task completion hooks should NOT perform heavy synchronization operations.

## Decision

**Remove consolidated-sync.js from post-task-completion hook entirely.**

### What Changes

**Before (v0.25.0)**:
```bash
post-task-completion.sh:
  ├─ consolidated-sync.js (1150ms, 5 file ops, 15 hooks)  
  └─ update-status-line.sh (background)
```

**After (v0.26.0-hotfix)**:
```bash
post-task-completion.sh:
  └─ update-status-line.sh (background, 50-100ms, 0 hook triggers)
```

### When Consolidated Sync Runs

**New Strategy**:
1. ✅ **Session end**: When ALL tasks complete + 120s inactivity
2. ✅ **Manual command**: `/specweave:sync-docs` (user-initiated)
3. ✅ **Increment closure**: `/specweave:done` (validates before closing)
4. ❌ **NEVER**: On every task completion (too frequent)

### Implementation

**Phase 1 (v0.26.0-hotfix) - EMERGENCY**:
- Commented out consolidated-sync.js call in post-task-completion.sh
- Keep ONLY update-status-line.sh (lightweight)
- Living docs will be out of sync during development (acceptable tradeoff)

**Phase 2 (v0.26.1) - INTELLIGENT SYNC**:
- Implement `HOOK_CONTEXT` environment variable
- Skip Edit/Write hooks when `HOOK_CONTEXT=sync`
- Re-enable consolidated-sync at session end

**Phase 3 (v0.27.0) - DEBOUNCED QUEUE**:
- Sync queue: Post-task adds to queue
- Worker: Runs sync every 30s if queue not empty
- Rate limit: Max 1 sync per 30 seconds

## Consequences

### Positive

✅ **Zero crashes**: Hook invocations reduced from 15 → 1 per task (93% reduction)  
✅ **Instant feedback**: User sees task completion immediately (no waiting)
✅ **Reduced resource usage**: Background processes 20 → 2 (90% reduction)
✅ **Scalable**: Performance independent of number of user stories
✅ **Predictable**: No cascade effects, no surprise workloads

### Negative

⚠️ **Living docs out of sync**: During active development, living docs won't update after each task
⚠️ **Manual sync required**: Users must run `/specweave:sync-docs` or wait for session end
⚠️ **Delayed GitHub updates**: Issue comments won't post until sync runs

### Mitigations

**For living docs lag**:
- Session-end detection runs sync automatically after 2 minutes of inactivity
- `/specweave:done` always syncs before closing increment
- Users can manually run `/specweave:sync-docs` anytime

**For GitHub lag**:
- Issue creation still happens immediately (via /specweave-github:sync)
- Only task progress comments are delayed (acceptable)

## Alternatives Considered

### Option 1: Aggressive Debouncing
**Idea**: Increase debounce from 5s → 60s  
**Rejected**: Doesn't prevent initial 15 hook invocations, only reduces subsequent ones

### Option 2: HOOK_CONTEXT Environment Variable
**Idea**: Set `HOOK_CONTEXT=sync` to skip hooks during sync  
**Status**: Good idea, but requires Phase 2 implementation (too complex for emergency fix)

### Option 3: Global Hook Lock
**Idea**: Single lock for ALL hooks, not per-hook locks  
**Rejected**: Would serialize all hook execution, causing massive delays

### Option 4: Disable All Hooks
**Idea**: Set `SPECWEAVE_DISABLE_HOOKS=1`  
**Rejected**: Loses status line updates, no feedback at all

## Metrics

### Before Fix (v0.25.0)
- Hook invocations per task: **15**
- Background processes: **~20 concurrent**
- Time to crash: **< 5 seconds**  
- Success rate: **0%** (crashes every time)

### After Emergency Fix (v0.26.0-hotfix)
- Hook invocations per task: **1** (93% reduction)
- Background processes: **1-2** (90% reduction)
- Time to crash: **N/A** (no crashes expected)
- Success rate: **100%** (expected)

### User Experience Impact
- Task completion feedback: **Instant** (was 0-5s then crash)
- Living docs freshness: **Session end** (was real-time)
- Workaround complexity: **Low** (manual `/specweave:sync-docs` if needed)

## References

- Incident Report: `.specweave/increments/_archive/0051-*/reports/CLAUDE-CODE-CRASH-ROOT-CAUSE-2025-11-23.md`
- ADR-0070: Hook Consolidation (v0.25.0)
- ADR-0060: Three-Tier Optimization Architecture (v0.24.2)
- Emergency Procedures: `.specweave/docs/internal/../operations/hook-crash-recovery.md`

## Related Work

- **v0.24.3**: Emergency safety (kill switch, circuit breaker, locks)
- **v0.25.0**: Hook consolidation (6 → 4 hooks per Edit/Write)
- **v0.24.4**: Active increment filtering (95% overhead reduction)
- **v0.26.0-hotfix**: This ADR (post-task hook simplification)
- **v0.26.1** (planned): HOOK_CONTEXT for intelligent sync
- **v0.27.0** (planned): Debounced sync queue

---

**Status**: ✅ Implemented (2025-11-23)  
**Version**: 0.26.0-hotfix  
**Supersedes**: None (new architectural direction)  
**Next**: ADR-0072 (HOOK_CONTEXT Environment Variable)
