# /sw:progress Command Debugging Summary

**Date**: 2026-01-07
**Issue**: `/sw:progress` command fails silently in Claude Code VSCode extension
**Status**: 🔍 Debug logging added, ready for testing

## TL;DR

The `/sw:progress` hook and scripts work perfectly when tested directly. The issue is that when run through Claude Code VSCode extension, the output doesn't appear to the user. I've added comprehensive debug logging to trace exactly what's happening.

## What I Found

### ✅ Hook Works Correctly
```bash
echo '{"prompt":"/sw:progress"}' | bash plugins/specweave/hooks/user-prompt-submit.sh
```
Returns proper JSON with systemMessage containing the progress output.

### ✅ Script Works Correctly
```bash
bash plugins/specweave/scripts/read-progress.sh
```
Displays beautiful progress bars and status information.

### ✅ CLI Fallback Works
```bash
specweave progress
```
Works perfectly as alternative.

### ❌ VSCode Extension Issue
When running `/sw:progress` in Claude Code VSCode extension, the hook executes but output isn't displayed to user.

## Root Cause Hypothesis

The hook returns different responses based on environment:

**VSCode Mode**:
```json
{"decision":"approve","systemMessage":"<progress output>"}
```

**CLI Mode**:
```json
{"decision":"block","reason":"<progress output>"}
```

The VSCode extension may not be properly handling the `systemMessage` field, causing the output to be lost.

## Debug Logging Added

I've added comprehensive logging to [user-prompt-submit.sh:109-142](../../../plugins/specweave/hooks/user-prompt-submit.sh#L109-L142):

```bash
DEBUG_LOG=".specweave/logs/hooks/progress-debug.log"
```

Logs will show:
- ✅ Hook triggered
- ✅ Arguments parsed
- ✅ VSCode mode detection
- ✅ Script executed
- ✅ Output length
- ✅ Response type (systemMessage vs block)

## Next Steps to Test

### 1. Test in VSCode
Run `/sw:progress` again and check the debug log:

```bash
cat .specweave/logs/hooks/progress-debug.log
```

**Expected output**:
```
[2026-01-07 XX:XX:XX] /sw:progress detected - executing script
[2026-01-07 XX:XX:XX] ARGS: ''
[2026-01-07 XX:XX:XX] SCRIPTS_DIR: /path/to/plugins/specweave/scripts
[2026-01-07 XX:XX:XX] VSCode mode: true
[2026-01-07 XX:XX:XX] Script: read-progress.sh
[2026-01-07 XX:XX:XX] Output length: 456 chars
[2026-01-07 XX:XX:XX] Exit code: 0
[2026-01-07 XX:XX:XX] Returning VSCode response (systemMessage)
```

### 2. Analyze Results

**If log file is EMPTY or MISSING**:
- Hook never executed
- Prompt matching failed
- Hook disabled/bypassed

**If log shows execution but no output**:
- Script execution failed
- Output capture failed
- JSON escaping issue

**If log shows everything succeeded**:
- ✅ Hook working perfectly
- ❌ VSCode extension not displaying systemMessage
- Need to report to Claude Code team

### 3. Temporary Workaround (If Needed)

If the issue is confirmed to be VSCode's systemMessage handling, we can force "block" mode:

```bash
# In user-prompt-submit.sh, comment out lines 133-138
# if is_vscode; then
#   OUTPUT_ESCAPED=$(escape_json "$OUTPUT")
#   echo "[...] Returning VSCode response (systemMessage)" >> "$DEBUG_LOG"
#   printf '{"decision":"approve","systemMessage":"%s"}\n' "$OUTPUT_ESCAPED"
#   exit 0
# fi
```

This will make VSCode use the same "block" mode as CLI, which should work.

## Alternative Solutions

### Immediate (User Workarounds)

1. **Use CLI command**:
   ```bash
   specweave progress
   ```

2. **Direct script**:
   ```bash
   bash plugins/specweave/scripts/read-progress.sh
   ```

3. **Use status command**:
   ```bash
   specweave status --verbose
   ```

### Short-term (Development Fix)

1. ✅ Add debug logging (DONE)
2. Test and analyze logs
3. Force "block" mode if systemMessage broken
4. Update CLAUDE.md with workarounds

### Long-term (Permanent Fix)

1. Report systemMessage issue to Claude Code team
2. Submit PR to VSCode extension if bug confirmed
3. Add fallback detection in hook
4. Migrate complex commands to skill-based execution

## Log Locations

- **Progress debug**: `.specweave/logs/hooks/progress-debug.log` (NEW)
- **Hook execution**: `.specweave/logs/hooks/user-prompt-submit.log`
- **General hooks**: `.specweave/logs/hooks.log`
- **Hook warnings**: `.specweave/logs/hook-warnings.log`

## Test Commands

```bash
# Test the command
/sw:progress

# Check debug log
cat .specweave/logs/hooks/progress-debug.log

# Test script directly
bash plugins/specweave/scripts/read-progress.sh

# Test hook manually
echo '{"prompt":"/sw:progress"}' | bash plugins/specweave/hooks/user-prompt-submit.sh | jq .

# Use CLI fallback
specweave progress
```

## What to Look For

When you test `/sw:progress` next time:

1. **Check if debug log created**:
   ```bash
   ls -la .specweave/logs/hooks/progress-debug.log
   ```

2. **Read the log**:
   ```bash
   cat .specweave/logs/hooks/progress-debug.log
   ```

3. **Check last entry timestamp** - should match when you ran command

4. **Verify VSCode mode** - should show "VSCode mode: true"

5. **Check output length** - should be >400 chars if script worked

6. **Verify response type** - should show "Returning VSCode response"

If all checks pass but you still don't see output, the issue is 100% in Claude Code VSCode extension's systemMessage handling.

## Files Modified

- ✅ [plugins/specweave/hooks/user-prompt-submit.sh](../../../plugins/specweave/hooks/user-prompt-submit.sh) - Added debug logging

## Files Created

- ✅ [.specweave/increments/0000-adhoc/reports/hook-analysis-progress-command.md](./hook-analysis-progress-command.md) - Detailed analysis
- ✅ [.specweave/increments/0000-adhoc/reports/progress-command-debugging-summary.md](./progress-command-debugging-summary.md) - This file

## Ready for Testing

Try running `/sw:progress` now and share the debug log output. That will tell us exactly what's happening.
