# ADR-0224: Watchdog Complete Removal

**Status**: Accepted
**Date**: 2026-01-07
**Deciders**: Anton Abyzov, Claude Code
**Context**: ADR-0141 (Session Registry), ADR-0159 (VSCode Extension)
**Update**: Initially disabled by default, now completely removed

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

**Completely remove watchdog** from the codebase.

### Files Removed

1. **Watchdog daemon**: `plugins/specweave/scripts/session-watchdog.sh`
2. **CLI tools**: `src/cli/check-watchdog.ts`, `src/cli/register-session.ts`
3. **Session registry**: `src/utils/session-registry.ts`, `src/types/session.ts`
4. **Environment detection**: `src/utils/environment-detection.ts`
5. **Tests**: All watchdog-related test files
6. **Cleanup scripts**: `.specweave/scripts/cleanup-existing-zombies.sh`
7. **Hook integration**: Removed from `plugins/specweave/hooks/v2/dispatchers/session-start.sh`

### Migration Path

**All users**: Watchdog completely removed - no daemons, no opt-in, no configuration.
**Stuck sessions**: Use VSCode Extension Host restart (Cmd+Shift+P → "Restart Extension Host")

---

## Consequences

### Positive

✅ **Zero daemon proliferation** - No background processes by default
✅ **Safe `.specweave` folder deletion** - No persistent processes blocking cleanup
✅ **Reduced resource consumption** - No 24/7 monitoring overhead
✅ **Simpler mental model** - VSCode extension manages lifecycle, not daemons
✅ **Cleaner process tree** - No orphaned watchdog zombies

### Negative

❌ **No automatic stuck session detection** - Users restart Extension Host manually

### Neutral

🔄 **VSCode handles everything** - No user action needed for normal operation

---

## Alternatives Considered

### Alternative 1: Fix Watchdog Daemon Cleanup
**Rejected** - Adds complexity (PID tracking, auto-termination logic) for minimal value.

### Alternative 2: Remove Watchdog Entirely
**ACCEPTED** - Complete removal is simpler and eliminates all maintenance burden.

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
# Before removal: 8 zombie watchdog processes
$ ps aux | grep watchdog | wc -l
8

# After removal: Code doesn't exist
$ ls plugins/specweave/scripts/session-watchdog.sh
# No such file or directory

# No watchdog processes possible
$ ps aux | grep watchdog | wc -l
0
```

---

## Notes

**All users**: VSCode extension manages lifecycle → No watchdog needed.
**Code removed**: Eliminates maintenance burden, prevents accidental re-enabling.
**Result**: Zero daemons, zero pollution, zero complexity.
