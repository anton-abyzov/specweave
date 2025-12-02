# ADR-0156: Hook Registration Single Source of Truth

**Status**: Accepted
**Date**: 2025-12-01
**Context**: Critical bug causing Claude Code crashes from duplicate hook registrations

## Decision

**Hook registration MUST use a single source of truth**: `hooks/hooks.json`

## Problem Statement

On 2025-12-01, SpecWeave was causing Claude Code crashes with errors like:
```
PostToolUse:Edit says: Plugin hook error:
/bin/sh: /Users/.../hooks/v2/dispatchers/post-tool-use.sh: No such file or directory
```

Root cause analysis revealed **triple hook registration**:

| Location | Pattern | Status |
|----------|---------|--------|
| `hooks/hooks.json` | `node dispatcher.mjs post-tool-use` | ✅ CORRECT |
| `hooks/v2/hooks.json` | `${CLAUDE_PLUGIN_ROOT}/hooks/v2/...` | ❌ BROKEN |
| `.claude-plugin/plugin.json` | `${CLAUDE_PLUGIN_ROOT}/hooks/v2/...` | ❌ BROKEN |

The broken patterns failed because:
1. `${CLAUDE_PLUGIN_ROOT}` may not expand when executed directly by shell
2. Shell scripts using `cat` for stdin hang without proper stdin piping
3. Duplicate registrations cause the same hook to fire multiple times

## Architecture

### Correct Pattern (via Node.js Universal Dispatcher)

```
hooks.json → node dispatcher.mjs <event> → bash v2/dispatchers/<script>.sh
```

The universal dispatcher (`hooks/universal/dispatcher.mjs`):
1. Receives hook call from Claude Code
2. Handles stdin properly via `stdio: 'inherit'`
3. Spawns bash script with proper environment
4. Works cross-platform (Windows Git Bash, WSL, macOS, Linux)

### Broken Pattern (Direct Shell Execution)

```
plugin.json → ${CLAUDE_PLUGIN_ROOT}/hooks/v2/dispatchers/post-tool-use.sh
```

This fails because:
1. Variable expansion happens in wrong context
2. No stdin piping → `cat` hangs
3. No cross-platform handling

## Rules

### 1. Single hooks.json Location

```
plugins/specweave/
├── .claude-plugin/
│   └── plugin.json          ← NO hooks section
├── hooks/
│   ├── hooks.json           ← SINGLE source of truth
│   ├── universal/
│   │   └── dispatcher.mjs   ← Routes all hooks
│   └── v2/
│       ├── dispatchers/     ← Shell scripts (called by dispatcher.mjs)
│       ├── handlers/
│       ├── detectors/
│       └── guards/
```

### 2. Never Put Hooks in plugin.json

```json
// .claude-plugin/plugin.json - CORRECT
{
  "name": "specweave",
  "version": "0.25.0"
  // NO "hooks" section
}
```

### 3. Always Use Node.js Universal Dispatcher

```json
// hooks/hooks.json - CORRECT
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [{
        "type": "command",
        "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/universal/dispatcher.mjs\" post-tool-use"
      }]
    }]
  }
}
```

### 4. Never Register Shell Scripts Directly

```json
// WRONG - DO NOT DO THIS
{
  "command": "${CLAUDE_PLUGIN_ROOT}/hooks/post-tool-use.sh"
}
```

### 5. No Nested hooks.json Files

Do NOT create `v2/hooks.json`, `v3/hooks.json`, etc. Only ONE `hooks/hooks.json`.

## Prevention Checklist

Before merging hook changes:

- [ ] Only ONE `hooks.json` exists in `plugins/specweave/hooks/`
- [ ] `.claude-plugin/plugin.json` has NO `hooks` section
- [ ] All hook commands use `node dispatcher.mjs <event>` pattern
- [ ] No backup files (`.bak`, `.v1-backup`, `.old`) in hooks directory
- [ ] No nested `hooks.json` in subdirectories

## Consequences

### Positive
- Single source of truth eliminates duplicate registration
- Universal dispatcher handles cross-platform differences
- Stdin properly piped to shell scripts
- Easier debugging (one place to check)

### Negative
- Slight indirection through Node.js layer
- Must update dispatcher.mjs when adding new hook types

## Related

- ADR-0060: Hook Optimization
- ADR-0070: Hook Consolidation
- ADR-0128: Hierarchical Hook Early Exit
