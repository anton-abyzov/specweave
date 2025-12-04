# ADR-0189: Resilient Hook Execution Pattern

## Status
Accepted

## Context

Claude Code hooks can crash with `MODULE_NOT_FOUND` errors when:
1. Marketplace is being refreshed (files temporarily unavailable)
2. File system sync delays occur
3. Race conditions during copy operations

The error looks like:
```
Error: Cannot find module '.../dispatcher.mjs'
    at Function._resolveFilename (node:internal/modules/cjs/loader:1410:15)
```

This crashes the entire Claude Code session because:
- Node.js throws before any error handling in dispatcher.mjs can run
- Claude Code's hook system doesn't receive valid JSON response
- User loses work context and must restart

## Decision

Implement **pre-flight file existence checks** in hooks.json commands using shell logic that runs BEFORE Node.js is invoked.

### Hook Command Pattern
```bash
bash -c 'F="path/to/file"; [ -f "$F" ] && node "$F" args || printf "{\"continue\":true}"' 2>/dev/null || printf '{"continue":true}'
```

### Defense Layers
1. **Layer 1**: Bash checks file existence with `[ -f "$F" ]`
2. **Layer 2**: If file doesn't exist, output valid JSON with `printf`
3. **Layer 3**: If bash fails entirely (Windows without Git Bash), outer `|| printf` catches it

### Additional Safeguards
- `hook-wrapper.sh`: POSIX script with retry logic (3 attempts, 50ms delay)
- `hook-wrapper.cmd`: Windows batch equivalent
- All error paths output `{"continue":true}` so Claude Code continues

## Consequences

### Positive
- Hooks never crash Claude Code, even during marketplace refresh
- Transient file system issues are handled gracefully
- User workflow is not interrupted
- Cross-platform compatibility maintained

### Negative
- More complex command strings in hooks.json
- Slight performance overhead from shell checks (~5ms)
- Debugging harder with multi-layer error handling

## Implementation

Files changed:
- `plugins/specweave/hooks/hooks.json`: Updated all commands with resilient pattern
- `plugins/specweave/hooks/universal/hook-wrapper.sh`: New POSIX wrapper
- `plugins/specweave/hooks/universal/hook-wrapper.cmd`: New Windows wrapper

## Testing

```bash
# Test with file present
CLAUDE_PLUGIN_ROOT="plugins/specweave" bash -c 'F="${CLAUDE_PLUGIN_ROOT}/hooks/universal/dispatcher.mjs"; [ -f "$F" ] && node "$F" session-start || printf "{\"continue\":true}"'
# Expected: {"continue":true} (from dispatcher)

# Test with file missing
CLAUDE_PLUGIN_ROOT="/nonexistent" bash -c 'F="${CLAUDE_PLUGIN_ROOT}/hooks/universal/dispatcher.mjs"; [ -f "$F" ] && node "$F" session-start || printf "{\"continue\":true}"'
# Expected: {"continue":true} (from fallback)
```

## Related
- ADR-0060: Hook Performance Optimization
- ADR-0073: Hook Recursion Prevention
- CLAUDE.md: Emergency hook disable instructions
