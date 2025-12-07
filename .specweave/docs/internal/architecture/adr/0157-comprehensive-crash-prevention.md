# ADR-0157: Comprehensive Crash Prevention Rules

**Status**: Accepted
**Date**: 2025-12-02
**Context**: Critical audit after Claude Code crashes from hook registration issues

## Summary

This ADR consolidates ALL crash prevention rules discovered through systematic codebase audits. Following these rules ensures Claude Code never crashes due to SpecWeave hooks or configurations.

---

## Critical Issues Found and Fixed (2025-12-02)

### Issue 1: Duplicate Hook Registration (FIXED)

**Problem**: Triple hook registration from multiple sources:
- `.claude-plugin/plugin.json` (inline hooks)
- `hooks/hooks.json` (main hooks file)
- `hooks/v2/hooks.json` (orphaned duplicate)

**Fix Applied**:
1. Removed hooks section from `.claude-plugin/plugin.json`
2. Deleted `hooks/v2/hooks.json`
3. Deleted orphaned backup files (`hooks.json.bak`, `hooks.json.v1-backup`)

**Prevention**: See Rule 1 below.

### Issue 2: `set -e` in Hook Scripts (FIXED)

**Problem**: `plugins/specweave/hooks/lib/scheduler-startup.sh` had `set -e` which causes crashes when any command fails.

**Fix Applied**: Changed to `set +e` with comment explaining why.

**Prevention**: See Rule 2 below.

---

## Crash Prevention Rules

### Rule 1: Single Source of Truth for Hooks

```
plugins/<plugin>/
├── .claude-plugin/
│   └── plugin.json          ← NO "hooks" section (metadata only)
├── hooks/
│   ├── hooks.json           ← SINGLE source of truth
│   └── universal/
│       └── dispatcher.mjs   ← All hooks route through here
```

**Checklist**:
- [ ] Only ONE `hooks.json` per plugin (in `hooks/` directory)
- [ ] `.claude-plugin/plugin.json` has NO `hooks` section (or empty `{}`)
- [ ] No nested hooks.json in subdirectories (v2/, v3/, etc.)
- [ ] No backup files (`.bak`, `.v1-backup`, `.old`) in hooks/

### Rule 2: Never `set -e` in Hooks

All hook shell scripts MUST start with:

```bash
#!/bin/bash
# CRITICAL: NEVER use 'set -e' in hooks - causes Claude Code crashes
set +e
```

**Why**: Claude Code treats non-zero exit codes as errors. `set -e` causes the script to exit on ANY failed command (even `grep` finding nothing), which crashes the hook system.

### Rule 3: Always Use Universal Dispatcher

Hook commands MUST use the Node.js universal dispatcher:

```json
{
  "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/universal/dispatcher.mjs\" <event>"
}
```

**Never** register shell scripts directly:

```json
// WRONG - DO NOT DO THIS
{
  "command": "${CLAUDE_PLUGIN_ROOT}/hooks/some-hook.sh"
}
```

**Why**:
- Variable expansion may fail
- stdin not properly piped
- No cross-platform handling

### Rule 4: Recursion Guards Required

All `post-*` hooks that write files MUST have recursion guards:

```bash
# File-based recursion guard (v0.26.0+)
RECURSION_GUARD_FILE="$PROJECT_ROOT/.specweave/state/.hook-recursion-guard"
if [[ -f "$RECURSION_GUARD_FILE" ]]; then
  exit 0
fi
touch "$RECURSION_GUARD_FILE"
trap 'rm -f "$RECURSION_GUARD_FILE"' EXIT
```

### Rule 5: Kill Switch Support

All hooks MUST check the kill switch early:

```bash
[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0
```

### Rule 6: Always Exit 0

Hooks MUST exit with code 0 unless intentionally blocking:

```bash
# Good - always succeed
exit 0

# Good - intentional block (PreToolUse guards only)
exit 2  # Blocks the tool call

# Bad - crash risk
exit 1
```

### Rule 7: Circuit Breakers

High-frequency hooks need circuit breakers:

```bash
CIRCUIT_BREAKER_FILE=".specweave/state/.hook-circuit-breaker"
TRIP_COUNT=$(cat "$CIRCUIT_BREAKER_FILE" 2>/dev/null || echo 0)
if [[ "$TRIP_COUNT" -gt 10 ]]; then
  exit 0  # Circuit breaker tripped
fi
```

### Rule 8: Process Cleanup

Background processes MUST be properly managed:

```bash
# Start background work
(
  # work here
) &

# Immediately disown to prevent zombie processes
disown 2>/dev/null || true
```

### Rule 9: Lock Files for Concurrency

Hooks that do heavy work need locking:

```bash
LOCK_FILE=".specweave/state/.hook-name.lock"
if ! mkdir "$LOCK_FILE" 2>/dev/null; then
  exit 0  # Another instance running
fi
trap 'rm -rf "$LOCK_FILE"' EXIT
```

### Rule 10: Debounce Rapid Fires

Prevent hook spam with debouncing:

```bash
DEBOUNCE_SECONDS=5
TIMESTAMP_FILE=".specweave/state/.hook-timestamp"
LAST_RUN=$(cat "$TIMESTAMP_FILE" 2>/dev/null || echo 0)
NOW="$(date" +%s)
if [[ $((NOW - LAST_RUN)) -lt $DEBOUNCE_SECONDS ]]; then
  exit 0
fi
echo "$NOW" > "$TIMESTAMP_FILE"
```

---

## Pre-Merge Checklist

Before merging ANY hook changes:

```bash
# 1. Check for set -e in hooks
grep -r "^set -e" plugins/*/hooks/*.sh && echo "FAIL: Found set -e"

# 2. Check for duplicate hooks.json
find plugins -name "hooks.json" | wc -l  # Should match plugin count

# 3. Check for hooks in plugin.json
grep -l '"hooks":' plugins/*/.claude-plugin/plugin.json | \
  xargs -I {} sh -c 'grep -q '"'"'"hooks": {}'"'"' {} || echo "WARN: {} has hooks"'

# 4. Check for orphan backup files
find plugins -name "*.bak" -o -name "*.backup" -o -name "*v1*"

# 5. Verify recursion guards in post-* hooks
for f in plugins/*/hooks/post-*.sh; do
  grep -q "recursion-guard\|RECURSION_GUARD" "$f" || echo "MISSING GUARD: $f"
done
```

---

## Emergency Recovery

If Claude Code is crashing:

```bash
# 1. Disable ALL hooks
export SPECWEAVE_DISABLE_HOOKS=1

# 2. Clean state files
rm -f .specweave/state/.hook-*
rm -rf .specweave/state/.processor.lock.d

# 3. Rebuild
npm run rebuild

# 4. Restart Claude Code
```

---

## Related ADRs

- ADR-0060: Hook Optimization
- ADR-0070: Hook Consolidation
- ADR-0073: Hook Recursion Prevention
- ADR-0128: Hierarchical Hook Early Exit
- ADR-0133: Skills Must Not Spawn Large Agents
- ADR-0156: Hook Registration Single Source of Truth
