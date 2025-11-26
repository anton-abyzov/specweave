# Hook Crash Recovery Procedure

**Status**: ACTIVE (2025-11-22)
**Severity**: CRITICAL
**Impact**: Claude Code crashes during hook execution

## Emergency Recovery (IMMEDIATE ACTION)

```bash
# 1. KILL SWITCH: Disable ALL hooks immediately
export SPECWEAVE_DISABLE_HOOKS=1

# 2. Reset circuit breakers
rm -f .specweave/state/.hook-circuit-breaker*

# 3. Clear stale locks
rm -rf .specweave/state/.hook-*.lock

# 4. Rebuild (if needed)
npm run rebuild
```

## Root Cause

**NOT the hook scripts themselves** - they have proper v0.24.3 protections:
- ✅ set +e (prevents crashes on hook errors)
- ✅ Kill switch check (SPECWEAVE_DISABLE_HOOKS)
- ✅ exit 0 (always exits cleanly)  
- ✅ File locking (prevents concurrent runs)
- ✅ Circuit breaker (3-failure threshold)
- ✅ Debouncing (5s window)

**Likely cause**: Claude Code's hook coordination layer struggling when running multiple PreToolUse hooks simultaneously.

## Symptoms

- Claude Code shows "Running PreToolUse hooks… (0/2 done)" and crashes
- Happens during Edit/Write operations on spec.md or tasks.md
- Circuit breakers may be open (3+ consecutive failures)
- Stale lock directories exist

## Verification

```bash
# Check circuit breaker status
cat .specweave/state/.hook-circuit-breaker 2>/dev/null || echo "Not tripped"

# Check for stale locks
ls -la .specweave/state/.hook-*.lock/ 2>/dev/null || echo "No locks"

# Check recent hook execution
tail -50 .specweave/logs/hooks-debug.log

# Count running processes
ps aux | grep -E "(hook|update-status-line)" | grep -v grep
```

## See Also

- ADR-0060: Three-Tier Hook Optimization Architecture
- plugins/specweave/hooks/README.md
