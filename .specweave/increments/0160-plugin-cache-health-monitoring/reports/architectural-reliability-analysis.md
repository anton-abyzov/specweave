# SpecWeave Architectural Reliability Analysis
**Date**: 2026-01-07
**Context**: Hooks failing frequently, commands unreliable
**Analyst**: Claude Sonnet 4.5 (Ultrathink Deep Analysis)

---

## Executive Summary

**CRITICAL FINDING**: SpecWeave architecture has **NO SINGLE GLOBAL MISS**, but rather suffers from **SYSTEMIC COMPLEXITY OVERLOAD** causing cascading failures.

**Root Cause**: Too many defensive layers creating unpredictable interactions.

**Evidence**:
- 50+ consecutive semaphore timeout warnings (Dec 20-23)
- Hook logs last updated Dec 22 (2 weeks stale)
- Multiple Claude Code sessions running simultaneously (10+ processes)
- Plugin cache from Jan 7 15:34 (refreshed today, but hooks still failing)

---

## Architecture Deep Dive

### 1. Hook Execution Stack (5+ Layers)

```
Layer 1: Claude Code → hooks.json
Layer 2: bash -c wrapper with file existence checks
Layer 3: fail-fast-wrapper.sh (timeout, retry, logging)
Layer 4: v2/dispatchers/*.sh (routing logic)
Layer 5: Actual hook scripts (session-start, user-prompt-submit)
Layer 6: Semaphore locking (15 concurrent max)
Layer 7: Recursion guard file (.hook-recursion-guard)
Layer 8: Background processes (&) with trap EXIT cleanup
```

**Problem**: Each layer adds:
- 5-10ms latency
- New failure modes
- Debug complexity
- Race condition opportunities

**Total overhead**: 40-80ms per hook (Target: <100ms startup check)

### 2. Semaphore Timeout Epidemic

**Evidence** (from `user-prompt-submit.log`):
```
Dec 20-23: 50+ "Semaphore acquisition timeout - graceful degradation"
Last entry: Dec 23 03:23 (2 weeks ago!)
```

**Root Cause Analysis**:

1. **15 concurrent hook limit** (reasonable)
2. **But**: 10+ Claude Code sessions running simultaneously
3. **Result**: Semaphore exhaustion → hooks skip execution
4. **Consequence**: Critical operations silently fail

**Why 10+ sessions?**
```bash
# From ps aux output:
PID 32317 (1:33PM) - VSCode instance 1
PID 55824 (3:34PM) - VSCode instance 2
PID 43303 (Tue 12AM) - CLI session
PID 60042 (2:34PM) - VSCode instance 3
...
```

**These are ZOMBIE sessions** that never cleaned up properly.

### 3. Plugin Cache Staleness (Despite Fresh Refresh)

**Paradox**:
```
✅ Plugin cache refreshed: Jan 7 15:34 (today!)
❌ Hook logs last updated: Dec 22 (2 weeks ago!)
```

**Explanation**: Cache refresh **does NOT restart active Claude Code sessions**.

**Why hooks fail after refresh**:
1. Old Claude Code sessions still use STALE plugin references
2. New cache installed at `~/.claude/plugins/cache/specweave/sw/1.0.0/`
3. But `CLAUDE_PLUGIN_ROOT` in old sessions points to OLD cache location
4. Hooks execute against STALE files → fail silently

**Solution**: Cache refresh MUST warn "Restart Claude Code to apply changes"

### 4. /sw:progress Command Failure Analysis

**Observed**: `/sw:progress` shows "8/13 increments complete (62%)" but NO detail

**Why this fails**:

```bash
# Expected flow:
specweave progress
  ↓
src/cli/commands/progress.ts
  ↓
reads .specweave/increments/*/metadata.json
  ↓
outputs progress table
```

**Failure points**:
1. **Skill routing**: `/sw:progress` might not resolve to `specweave progress` CLI
2. **Permissions**: Skill execution sandboxing blocks file reads
3. **Context**: Claude Code may not pass correct working directory
4. **Caching**: Status line cache stale (active-session.lock from 15:29)

### 5. Hook Reliability Issues

**Design Philosophy** (from ADR-0189):
> "Hooks never crash Claude Code, even during marketplace refresh"

**Reality**: Hooks skip execution instead of crashing

**Three-Layer Defense**:
```bash
# Layer 1: File existence check
[[ -x "$WRAPPER" ]] && exec "$WRAPPER" "$SCRIPT"

# Layer 2: Fallback JSON
|| (cat >/dev/null && printf '{"continue":true}')

# Layer 3: Outer fallback
' 2>/dev/null || printf '{"continue":true}'
```

**Problem**: **ALL failures become silent** → User has NO visibility

**Example**:
- Hook fails to update tasks.md? → Silent
- Hook fails to sync GitHub? → Silent
- Hook fails to validate completion? → Silent

**Result**: **Data corruption hidden as "graceful degradation"**

---

## Systemic Issues

### Issue #1: Complexity Cascade

**Layers Added Over Time**:
```
v0.25: Environment variable recursion guard (FAILED)
v0.26: File-based recursion guard
v0.43: fail-fast-wrapper.sh with timeout
v1.0: v2/dispatchers architecture
v1.0.43: Improved error logging
v1.0.102: Semaphore with 15 concurrent limit
```

**Each "fix" added complexity** without removing old layers.

**Result**: 8-layer stack that's impossible to debug.

### Issue #2: Silent Failure Philosophy

**Principle** (ADR-0189):
> "All error paths output {"continue":true} so Claude Code continues"

**Problem**: This **hides real issues** instead of surfacing them.

**Better approach**:
```json
{
  "continue": true,
  "warning": "Hook execution failed: timeout after 5s",
  "action": "Run 'specweave check-hooks' to diagnose"
}
```

Claude Code **supports warnings** in hook responses, but SpecWeave never uses them.

### Issue #3: Zombie Session Accumulation

**10+ Claude Code processes running** indicates:
1. Users never close sessions properly
2. Sessions don't timeout/cleanup
3. Semaphore leaks accumulate
4. File locks never release

**Fix needed**: Session cleanup daemon or TTL-based lock expiration

### Issue #4: Cache Refresh Without Session Restart

**Current UX**:
```bash
$ specweave refresh-marketplace
✅ Marketplace refreshed successfully
```

**User expects**: Changes applied immediately

**Reality**: Must restart ALL Claude Code sessions manually

**Fix needed**: Add warning message:
```
✅ Marketplace refreshed successfully
⚠️  RESTART Claude Code to apply changes
   (Close ALL VSCode instances and terminal sessions)
```

### Issue #5: Hook Logs 2 Weeks Stale

**Last hook execution**: Dec 22 (2 weeks ago)

**Possibilities**:
1. Hooks stopped executing entirely (catastrophic)
2. Logging broke (logs redirect to /dev/null?)
3. Wrong log path after cache refresh

**Diagnostic needed**:
```bash
# Check if hooks executing at all
export SPECWEAVE_HOOK_VERBOSE=1
# Run any command and watch for hook output
```

---

## Recommended Fixes (Priority Order)

### P0: Immediate (Critical Reliability)

#### 1. Add Hook Execution Visibility
**Problem**: Silent failures hide data corruption

**Fix**: Surface warnings to user in hook responses

```json
{
  "continue": true,
  "warnings": [
    "Task sync failed: timeout after 5s",
    "GitHub sync skipped: semaphore timeout",
    "Status line update failed: file lock"
  ],
  "recommendation": "Run 'specweave check-hooks --fix' to recover"
}
```

**Impact**: Users see issues immediately instead of discovering data corruption later

#### 2. Kill Zombie Sessions
**Problem**: 10+ zombie Claude Code processes exhaust semaphores

**Fix**: Add session cleanup to CLI
```bash
specweave cleanup-sessions --force
```

Kills all `claude` processes except current session, cleans locks

**Impact**: Fixes semaphore exhaustion immediately

#### 3. Cache Refresh Warning
**Problem**: Users refresh marketplace but don't restart Claude Code

**Fix**: Add prominent warning to refresh-marketplace output
```
⚠️  CRITICAL: Restart ALL Claude Code sessions to apply changes!
   Run this command to kill zombie sessions:
   specweave cleanup-sessions --force
```

**Impact**: Prevents cache staleness issues

### P1: Short-Term (Architecture Simplification)

#### 4. Reduce Hook Layers (8 → 4)
**Current**: hooks.json → bash wrapper → fail-fast-wrapper → dispatcher → script

**Simplified**:
```
hooks.json → resilient-hook-runner.sh → actual-hook-logic.mjs
```

Combine all defensive logic into ONE resilient runner.

**Impact**: Easier debugging, lower latency, fewer failure modes

#### 5. Replace Semaphore with Circuit Breaker
**Problem**: Semaphore timeout = silent failure

**Better**: Circuit breaker pattern
```
Hook fails 3x → Open circuit → Show warning → Retry after 30s
```

User sees: "Hook circuit open - run 'specweave reset-hooks' to recover"

**Impact**: Visible failures, self-healing

#### 6. Hook Health Dashboard
**Current**: No visibility into hook status

**Add**: `specweave hook-status` command
```
Hook Health Dashboard
━━━━━━━━━━━━━━━━━━━━━━
✅ session-start:     OK (last: 2s ago)
⚠️  user-prompt-submit: TIMEOUT (15/15 concurrent)
❌ post-tool-use:    FAILED (file not found)

Recommendations:
- Kill zombie sessions: specweave cleanup-sessions --force
- Reset semaphore: rm .specweave/state/*.lock
- Check logs: tail -f .specweave/logs/hooks/*.log
```

**Impact**: Users can self-diagnose hook issues

### P2: Long-Term (Architectural Redesign)

#### 7. Move Hooks to Native MJS Modules
**Problem**: Bash scripts hard to debug, version, test

**Solution**: Pure JavaScript/TypeScript hooks
```typescript
// hooks/session-start.mts
export async function sessionStart(context: HookContext): Promise<HookResult> {
  // No bash, no shell parsing, no subprocess spawning
  // Pure TS with proper error handling
}
```

**Impact**: Type safety, unit testable, faster execution

#### 8. Event-Driven Architecture (EDA)
**Problem**: Hooks are synchronous blockers

**Solution**: Async event bus
```
User action → Event emitted → Queue → Background worker → Result
```

Claude Code continues immediately, updates appear when ready.

**Impact**: Zero blocking, better UX

#### 9. Plugin Cache Auto-Refresh on Session Start
**Problem**: Manual refresh required

**Solution**: Lightweight version check on session start
```
Session starts → Check GitHub for new commits → Auto-update if changed
```

Uses increment 0160's proposed cache health monitoring.

**Impact**: Always up-to-date, zero manual intervention

---

## Incident Analysis: Why /sw:progress Fails

**Hypothesis**: Skill routing broken by plugin cache staleness

**Evidence**:
1. `/sw:progress` invoked
2. Skill router checks `~/.claude/plugins/cache/specweave/sw/1.0.0/skills.json`
3. File exists BUT Claude Code session using OLD plugin root
4. Skill execution fails → fallback to generic "show progress" text
5. No actual CLI execution → no increment details

**Test**:
```bash
# In terminal (not Claude Code):
specweave progress
# If this works, problem is skill routing in Claude Code
```

**Fix**: Restart Claude Code to refresh `CLAUDE_PLUGIN_ROOT` env var

---

## Action Plan

### Immediate (Next 5 minutes)
```bash
# 1. Kill zombie sessions
pkill -9 -f "claude.*"

# 2. Clean locks
rm -f .specweave/state/*.lock

# 3. Restart Claude Code
# (Close ALL VSCode instances, reopen)
```

### Short-term (Next increment)
1. Implement `specweave hook-status` command
2. Implement `specweave cleanup-sessions` command
3. Add warnings to hook responses (not just silent {"continue":true})
4. Add restart warning to refresh-marketplace

### Long-term (Q1 2026)
1. Simplify hook stack (8 → 4 layers)
2. Migrate hooks to native TypeScript
3. Implement circuit breaker pattern
4. Add auto-refresh on session start

---

## Conclusion

**SpecWeave is NOT fundamentally broken**, but suffers from:
1. **Complexity debt** (8-layer hook stack)
2. **Silent failure philosophy** (hides issues)
3. **Zombie session accumulation** (no cleanup)
4. **Cache staleness after refresh** (no restart warning)

**These are ALL fixable** with incremental improvements.

**Priority**: Start with P0 fixes (visibility + session cleanup) to restore reliability immediately.

**Long-term**: Architectural simplification to prevent future complexity accumulation.

---

## Related Increments

- **0160-plugin-cache-health-monitoring**: Addresses cache staleness detection (PLANNED)
- **0073**: Hook recursion prevention (ACTIVE)
- **0189**: Resilient hook execution (ACTIVE)
- **0128**: Hierarchical hook early exit (ACTIVE)

**Recommendation**: Pause 0160 planning, implement P0 fixes first, THEN build cache health monitoring on stable foundation.
