# ADR-0223: VSCode Hook Detection Pattern for Instant Commands

**Status**: Accepted
**Date**: 2026-01-04
**Context**: Instant commands (jobs, status, progress, workflow, costs, analytics) were broken in VSCode extension for 3-4 weeks

## Problem

UserPromptSubmit hooks intercepting instant commands behaved differently across environments:

- **CLI**: `{"decision":"block","reason":"..."}` shows output inline and allows continuation
- **VSCode**: `{"decision":"block"}` shows UI blocking message ("⏺ UserPromptSubmit operation blocked by hook") and STOPS execution entirely

This caused instant commands to fail silently in VSCode while working perfectly in CLI.

## Root Causes Identified

### 1. Double-Parsing Antipattern (CLI)

`bin/specweave.js` was calling `parseAsync()` on already-parsed commands:

```javascript
// ❌ BROKEN
await jobsCmd.parseAsync(['node', 'jobs', ...process.argv.slice(3)]);
// Commander.js saw 'jobs' as positional argument → "too many arguments"
```

### 2. Hook Blocking Behavior (VSCode)

Hooks returning `{"decision":"block"}` in VSCode prevented fallback command execution:

```bash
# In VSCode: Hook blocks → Shows UI message → STOPS
# In CLI: Hook blocks → Shows output → Continues
```

## Decision

### 1. Environment Detection

Detect VSCode via `CLAUDE_CODE_ENTRYPOINT` environment variable:

```bash
is_vscode() {
  [[ -n "${CLAUDE_CODE_ENTRYPOINT}" ]] && [[ "${CLAUDE_CODE_ENTRYPOINT}" == "claude-vscode" ]]
}
```

### 2. Conditional Hook Behavior

```bash
if echo "$PROMPT" | grep -qE "^/sw:jobs($| )"; then
  # VSCode mode: Skip hook execution, let command file handle it
  if is_vscode; then
    echo '{"decision":"approve"}'
    exit 0
  fi

  # CLI mode: Execute instantly and block with output
  ARGS=$(echo "$PROMPT" | sed 's|^/sw:jobs\s*||')
  OUTPUT=$(bash "$SCRIPTS_DIR/read-jobs.sh" $ARGS 2>&1)
  OUTPUT_ESCAPED=$(echo "$OUTPUT" | jq -Rs .)
  printf '{"decision":"block","reason":"%s"}\n' "$OUTPUT_ESCAPED"
  exit 0
fi
```

### 3. Direct Function Invocation Pattern

Replace double-parsing with direct function calls:

```typescript
// ✅ FIXED
export async function jobsCommand(options: JobsCommandOptions = {}): Promise<void> {
  // ... implementation
}

// bin/specweave.js
.action(async (options) => {
  const { jobsCommand } = await import('../dist/src/cli/commands/jobs.js');
  await jobsCommand(options);
});
```

## Consequences

### Positive

1. **Universal Compatibility**: Commands work in both CLI and VSCode
2. **Performance Preservation**: CLI still gets instant execution (<100ms)
3. **Clean Fallback**: VSCode uses proper command file fallback
4. **No Breaking Changes**: Existing CLI behavior unchanged

### Negative

1. **Environment-Specific Logic**: Hooks now have conditional behavior
2. **Two Execution Paths**: CLI (hook-based) vs VSCode (command-based)

## Implementation

Applied to 6 instant commands:
- `/sw:jobs`
- `/sw:status`
- `/sw:progress`
- `/sw:workflow`
- `/sw:costs`
- `/sw:analytics`

Released in:
- **v1.0.91**: VSCode detection + direct function calls
- **v1.0.92**: Default `--all` for jobs command
- **v1.0.93**: Timestamps and output improvements

## Alternatives Considered

### 1. Remove Hooks Entirely
**Rejected**: Would lose instant CLI execution (<100ms vs 3-5 seconds)

### 2. Make VSCode Hook Block Properly
**Rejected**: Would require changes to Claude Code extension itself (out of scope)

### 3. Duplicate Logic in Both Paths
**Rejected**: Maintenance burden, code duplication

## Related

- ADR-0062: GitHub-First Development Workflow
- ADR-0130: Hook Bulk Operation Detection
- UserPromptSubmit Hook: `plugins/specweave/hooks/user-prompt-submit.sh`
- CLI Commands: `src/cli/commands/jobs.ts`, `status.ts`, `progress.ts`

## Verification

```bash
# CLI (instant execution)
time specweave jobs  # <100ms

# VSCode (command fallback)
/sw:jobs  # Shows output via command.md fallback
```

## Notes

- Hook detection uses `CLAUDE_CODE_ENTRYPOINT` which is set by Claude Code extension
- CLI keeps fast execution path via hooks
- VSCode gets reliable execution via command files
- Pattern is reusable for future instant commands
