# ADR-0224: Watchdog Opt-In (Default Disabled)

**Status**: Accepted
**Date**: 2026-01-07
**Deciders**: Anton Abyzov, Claude Code
**Context**: ADR-0141 (Session Registry), ADR-0159 (VSCode Extension)

---

## Context

The session watchdog daemon was introduced to detect stuck Claude Code sessions (zombie heredoc processes, stale locks). However, production usage revealed significant issues:

### Problems Identified

1. **Daemon Proliferation**
   - 8+ zombie watchdog processes running indefinitely
   - Each new Claude Code session spawned a new watchdog
   - Daemons prevented `.specweave` folder deletion
   - Consumed system resources 24/7

2. **False `.specweave` Folder Creation Risk**
   - Watchdog defaults to `SPECWEAVE_ROOT=.specweave` (current directory)
   - If hook runs in wrong directory → creates `.specweave` in non-project folders
   - Example: User opens personal-docs → watchdog creates `.specweave` folder there

3. **VSCode Context Makes Watchdog Redundant**
   - VSCode extension manages Claude Code lifecycle
   - Session cleanup handled automatically on window close
   - Extension Host restart cleans up zombie processes
   - Watchdog adds no value in VSCode-managed environment

4. **Low Value Proposition**
   - Detects stuck sessions (rare event)
   - User must still manually run cleanup scripts
   - Notifications arrive too late (3+ consecutive warnings needed)
   - Better alternatives exist (manual `/sw:jobs` check, process monitoring)

### Evidence

```bash
$ ps aux | grep watchdog
antonabyzov  17815  bash .../session-watchdog.sh --daemon
antonabyzov  19458  bash .../session-watchdog.sh --daemon
antonabyzov  91239  bash .../session-watchdog.sh --daemon
# ... 8 total zombie processes
```

**Why so many?** Each watchdog runs indefinitely (no auto-cleanup), accumulating across sessions.

---

## Decision

**Make watchdog OPT-IN ONLY** (default disabled).

### Implementation

1. **Wrap watchdog startup in environment check**:
   ```bash
   # plugins/specweave/hooks/v2/dispatchers/session-start.sh
   if [[ "${SPECWEAVE_ENABLE_WATCHDOG:-0}" == "1" ]]; then
     # Start watchdog daemon
   fi
   ```

2. **Skip session registry in VSCode/CI contexts**:
   ```typescript
   // src/utils/session-registry.ts
   if (shouldSkipSessionRegistry()) {
     this.isValid = false; // Don't create .specweave/state
     return;
   }
   ```

3. **Document opt-in for power users**:
   ```bash
   # Enable watchdog for CLI multi-process scenarios
   export SPECWEAVE_ENABLE_WATCHDOG=1
   ```

### Migration Path

**Existing users**: Watchdog automatically disabled on next session start.
**Power users**: Can opt-in via environment variable if needed.
**VSCode users**: No action needed (extension handles lifecycle).

---

## Consequences

### Positive

✅ **Zero daemon proliferation** - No background processes by default
✅ **Safe `.specweave` folder deletion** - No persistent processes blocking cleanup
✅ **Reduced resource consumption** - No 24/7 monitoring overhead
✅ **Simpler mental model** - VSCode extension manages lifecycle, not daemons
✅ **Cleaner process tree** - No orphaned watchdog zombies

### Negative

❌ **No automatic stuck session detection** - Users must manually check `/sw:jobs`
❌ **Power users need opt-in** - Extra step for CLI multi-process scenarios

### Neutral

🔄 **Session registry still exists** - Used for `/sw:jobs` status display
🔄 **Cleanup scripts still available** - Manual recovery when needed
🔄 **Watchdog code preserved** - Can be re-enabled for specific use cases

---

## Alternatives Considered

### Alternative 1: Fix Watchdog Daemon Cleanup
**Rejected** - Adds complexity (PID tracking, auto-termination logic) for minimal value.

### Alternative 2: Remove Watchdog Entirely
**Deferred** - Keep code available for power users, but disable by default.

### Alternative 3: VSCode-Only Disabling
**Rejected** - CLI users also don't need persistent daemons in most scenarios.

---

## References

- **ADR-0141**: Session Registry (zombie prevention foundation)
- **ADR-0159**: VSCode Extension (native lifecycle management)
- **Issue**: `.specweave` folder pollution in personal-docs directory
- **Root Cause**: Watchdog daemons running in wrong directories

---

## Verification

```bash
# Before fix: 8 zombie watchdog processes
$ ps aux | grep watchdog | wc -l
8

# After fix: 0 watchdog processes (disabled by default)
$ ps aux | grep watchdog | wc -l
0

# Opt-in still works for power users
$ export SPECWEAVE_ENABLE_WATCHDOG=1
$ # Start Claude Code session
$ ps aux | grep watchdog | wc -l
1  # Single watchdog daemon as expected
```

---

## Notes

**VSCode users (99% of users)**: Extension manages lifecycle → Watchdog unnecessary.
**CLI users (1% of users)**: Can opt-in if multi-process monitoring needed.
**Default behavior**: Clean, simple, no daemons → Users control their environment.
