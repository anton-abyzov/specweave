# Troubleshooting: Instant Commands Not Working

**Affected Commands**: `/sw:jobs`, `/sw:status`, `/sw:progress`, `/sw:workflow`, `/sw:costs`, `/sw:analytics`

**Symptoms**: Commands show "blocked by hook" message or fail with "too many arguments" error

**Fixed In**: v1.0.91+ (VSCode detection), v1.0.93 (complete output)

---

## Problem History

These instant commands were broken for approximately 3-4 weeks due to two separate root causes:

### Root Cause 1: Double-Parsing Antipattern (CLI)

**Symptom**: `specweave jobs` fails with:
```
error: too many arguments. Expected 0 arguments but got 2
```

**Cause**: `bin/specweave.js` was calling `parseAsync()` on already-parsed commands:

```javascript
// ❌ BROKEN CODE
await jobsCmd.parseAsync(['node', 'jobs', ...process.argv.slice(3)]);
// Commander.js saw 'jobs' as a positional argument
```

**Fix**: Direct function invocation pattern:

```typescript
// ✅ FIXED CODE
export async function jobsCommand(options: JobsCommandOptions = {}): Promise<void> {
  // ... implementation
}

// bin/specweave.js
.action(async (options) => {
  const { jobsCommand } = await import('../dist/src/cli/commands/jobs.js');
  await jobsCommand(options);
});
```

### Root Cause 2: VSCode Hook Blocking (VSCode Extension)

**Symptom**: Commands show in VSCode:
```
⏺ UserPromptSubmit operation blocked by hook
```

**Cause**: Fundamental difference in hook behavior:
- **CLI**: `{"decision":"block","reason":"..."}` shows output inline and allows continuation
- **VSCode**: `{"decision":"block"}` shows UI blocking message and STOPS execution

**Fix**: Environment detection and conditional behavior:

```bash
is_vscode() {
  [[ -n "${CLAUDE_CODE_ENTRYPOINT}" ]] && [[ "${CLAUDE_CODE_ENTRYPOINT}" == "claude-vscode" ]]
}

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

---

## Quick Fix Steps

### For End Users

1. **Update SpecWeave**:
   ```bash
   npm install -g specweave@latest
   ```

2. **VSCode Extension**: Restart Claude Code after update

3. **Verify**:
   ```bash
   specweave --version  # Should be 1.0.93 or higher
   ```

### For Contributors

1. **Pull latest changes**:
   ```bash
   git pull origin develop
   ```

2. **Rebuild and install globally**:
   ```bash
   npm run rebuild
   npm install -g .
   ```

3. **Refresh marketplace**:
   ```bash
   bash scripts/refresh-marketplace.sh
   ```

4. **Restart Claude Code** (critical for VSCode extension)

---

## Version History

### v1.0.91 (2026-01-04)
- ✅ Fixed double-parsing antipattern in CLI
- ✅ Added VSCode detection in hooks
- ✅ Universal compatibility (CLI + VSCode)

### v1.0.92 (2026-01-04)
- ✅ Changed `/sw:jobs` to show all jobs by default
- ✅ Updated `SHOW_ALL=true` in bash script

### v1.0.93 (2026-01-04)
- ✅ Added timestamps to completed jobs ("3 days ago")
- ✅ Fixed contradictory message in output
- ✅ Complete job details display

---

## How Instant Commands Work

### CLI Execution (Fast Path)

1. User types `/sw:jobs`
2. UserPromptSubmit hook intercepts
3. Hook detects CLI environment
4. Executes `read-jobs.sh` directly (<100ms)
5. Returns `{"decision":"block","reason":"<output>"}`
6. Output shown immediately, command "blocks" (completes)

### VSCode Execution (Fallback Path)

1. User types `/sw:jobs`
2. UserPromptSubmit hook intercepts
3. Hook detects VSCode via `CLAUDE_CODE_ENTRYPOINT=claude-vscode`
4. Returns `{"decision":"approve"}`
5. Command file (`commands/jobs.md`) takes over
6. Executes `specweave jobs` via Bash tool
7. Output shown to user

---

## Testing Verification

### CLI Test
```bash
# Should complete in <100ms
time specweave jobs

# Should show:
# ✅ Completed (N):
#    [abc12345] job-type - X items - 3 days ago
```

### VSCode Test
```
# In Claude Code VSCode extension:
/sw:jobs

# Should show full output without "blocked by hook" message
```

---

## Technical Details

### Files Modified

1. **bin/specweave.js**
   - Removed double-parsing antipattern
   - Changed to direct function calls

2. **src/cli/commands/jobs.ts** (and status.ts, progress.ts)
   - Exported `jobsCommand()` function
   - Simplified `createJobsCommand()` to just call the function

3. **plugins/specweave/hooks/user-prompt-submit.sh**
   - Added `is_vscode()` helper
   - Conditional behavior for 6 instant commands

4. **plugins/specweave/scripts/read-jobs.sh**
   - Changed `SHOW_ALL=true` default
   - Added timestamp calculation
   - Fixed contradictory message logic

### Environment Variables

- `CLAUDE_CODE_ENTRYPOINT=claude-vscode`: Set by VSCode extension
- Used to detect execution environment
- Enables conditional hook behavior

### Hook Decision Types

- `{"decision":"approve"}`: Allow command to continue (VSCode)
- `{"decision":"block","reason":"..."}`: Show output and complete (CLI)
- `{"decision":"deny","reason":"..."}`: Block with error

---

## Related Documentation

- **ADR-0223**: VSCode Hook Detection Pattern
- **CLAUDE.md**: Troubleshooting section
- **Hook Overview**: `.specweave/docs/internal/repos/hooks/overview.md`
- **CLI Overview**: `.specweave/docs/internal/repos/cli/overview.md`

---

## Prevention

To prevent similar issues in the future:

1. **Test in BOTH environments** (CLI and VSCode) before release
2. **Use Direct Function Invocation Pattern** for all CLI commands
3. **Document environment-specific behavior** in hooks
4. **Maintain version history** in CHANGELOG.md
5. **Update all documentation** when fixing critical bugs

---

## Contact

If issues persist after updating to v1.0.93+:

1. Check version: `specweave --version`
2. Verify installation: `which specweave`
3. Check for multiple installations: `npm list -g specweave`
4. Report issue: https://github.com/anton-abyzov/specweave/issues
