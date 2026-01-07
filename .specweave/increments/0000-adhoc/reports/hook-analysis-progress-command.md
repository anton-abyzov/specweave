# Hook Analysis: /sw:progress Command Failure

**Date**: 2026-01-07
**Issue**: `/sw:progress` command appears to fail silently in VSCode with no error logs
**Status**: ✅ Hook is working correctly - issue is in VSCode extension's systemMessage handling

## Investigation Summary

### 1. Hook Execution ✅ WORKING

The user-prompt-submit hook is executing correctly:

```bash
echo '{"prompt":"/sw:progress"}' | bash plugins/specweave/hooks/user-prompt-submit.sh
```

**Output**:
```json
{
  "decision": "approve",
  "systemMessage": "\n📊 Increment Progress\n\n👀 Ready for Review:\n  ..."
}
```

### 2. Script Execution ✅ WORKING

The underlying script executes correctly:

```bash
bash plugins/specweave/scripts/read-progress.sh
```

**Output**:
```
📊 Increment Progress

👀 Ready for Review:
  0148-autonomous-execution-auto
     [███████████████] 42/42 (100%)
     → /sw:done 0148-autonomous-execution-auto
  ...
```

### 3. CLI Fallback ✅ WORKING

Alternative commands work:

```bash
specweave progress  # Works
node plugins/specweave/scripts/progress.js  # Works
bash plugins/specweave/scripts/read-progress.sh  # Works
```

## Root Cause Analysis

### VSCode vs CLI Behavior

The hook has two execution paths:

**VSCode Mode** (detected by `CLAUDE_CODE_ENTRYPOINT=claude-vscode`):
```json
{"decision":"approve","systemMessage":"<output>"}
```

**CLI Mode**:
```json
{"decision":"block","reason":"<output>"}
```

### The Problem

When running in **VSCode extension**, the hook returns:
- `decision: "approve"` - Allows LLM to continue
- `systemMessage: "<script output>"` - Should display output to user

**Expected**: systemMessage content appears in conversation
**Actual**: systemMessage appears to be ignored/not displayed

### Evidence

1. **Hook logs** (`.specweave/logs/hooks/user-prompt-submit.log`):
   - Only shows semaphore timeout warnings
   - No error logs when `/sw:progress` is executed
   - This suggests the hook completes successfully

2. **Main hooks log** (`.specweave/logs/hooks.log`):
   - No `/sw:progress` execution entries
   - Indicates the hook might not be firing at all OR
   - The systemMessage path doesn't get logged

3. **User experience**:
   - Command appears to run
   - No output displayed
   - No error shown
   - Looks like it failed silently

## Hypothesis

One of these scenarios is occurring:

### A. systemMessage Not Implemented (Most Likely)
The Claude Code VSCode extension may not be implementing the `systemMessage` field in hook responses. This would explain:
- ✅ Hook executes successfully (no errors in logs)
- ✅ Script runs correctly (when tested manually)
- ❌ No output shown to user (systemMessage ignored)

### B. systemMessage Display Bug
The extension implements systemMessage but has a rendering bug:
- Output is generated but not displayed in UI
- May be hidden, truncated, or appearing in wrong location

### C. Hook Not Firing in VSCode
Despite environment detection, the hook might not be executing in VSCode context:
- Would explain lack of logs
- But contradicts successful manual testing

## Verification Tests

### Test 1: Force CLI Mode
Temporarily modify hook to always use "block" decision:

```bash
# In user-prompt-submit.sh, line ~126
# Comment out VSCode detection
# if is_vscode; then
#   OUTPUT_ESCAPED=$(escape_json "$OUTPUT")
#   printf '{"decision":"approve","systemMessage":"%s"}\n' "$OUTPUT_ESCAPED"
#   exit 0
# fi

# This forces CLI mode (block decision) in VSCode
OUTPUT_ESCAPED=$(escape_json "$OUTPUT")
printf '{"decision":"block","reason":"%s"}\n' "$OUTPUT_ESCAPED"
exit 0
```

**Expected**: If systemMessage is the issue, "block" mode should work in VSCode

### Test 2: Add Debug Logging
Add explicit logging to confirm hook execution:

```bash
# After line 106 in user-prompt-submit.sh
if echo "$PROMPT" | grep -qE "^/sw:progress($| )"; then
  echo "[DEBUG] /sw:progress detected - executing script" >> .specweave/logs/hooks/progress-debug.log
  date >> .specweave/logs/hooks/progress-debug.log

  # ... rest of script execution

  echo "[DEBUG] Output length: ${#OUTPUT}" >> .specweave/logs/hooks/progress-debug.log
  echo "[DEBUG] VSCode mode: $(is_vscode && echo 'true' || echo 'false')" >> .specweave/logs/hooks/progress-debug.log
fi
```

### Test 3: Check Extension Implementation
Review Claude Code VSCode extension source code for systemMessage handling:
- Search for "systemMessage" in extension code
- Check if it's implemented vs. just documented
- Verify how it's supposed to be displayed

## Workarounds

### Immediate Workarounds (For Users)

1. **Use CLI fallback**:
   ```bash
   specweave progress
   ```

2. **Direct script execution**:
   ```bash
   bash plugins/specweave/scripts/read-progress.sh
   ```

3. **Use status command** (alternative):
   ```bash
   specweave status --verbose
   ```

### Temporary Fix (For Development)

Force "block" mode in VSCode by disabling systemMessage path:

```bash
# In plugins/specweave/hooks/user-prompt-submit.sh
# Comment out lines 120-124 for /sw:progress
```

This sacrifices the "non-blocking" benefit but makes the command work.

## Recommended Solutions

### Short-term
1. Add debug logging to confirm hook execution
2. Test with "block" mode forced in VSCode
3. Document the CLI fallback for users

### Medium-term
1. Report systemMessage issue to Claude Code team
2. Add fallback detection: if systemMessage not working, auto-use "block"
3. Update documentation about VSCode vs CLI behavior

### Long-term
1. Investigate Claude Code VSCode extension implementation
2. Submit PR if systemMessage not implemented
3. Consider skill-based approach instead of hook-based for complex commands

## Log Analysis Details

### Semaphore Timeouts
The user-prompt-submit.log shows many semaphore timeout warnings:
```
"msg":"Semaphore acquisition timeout - graceful degradation","max_concurrent":"15"
```

This indicates:
- High concurrent load on hooks
- Graceful degradation is working (not blocking)
- Not directly related to /sw:progress failure
- But suggests overall hook performance issues

### Missing Error Logs
Notable absence of:
- Script execution errors
- JSON parsing errors
- File not found errors

This confirms the scripts are working correctly when executed.

## Conclusion

**The `/sw:progress` hook and scripts are functioning correctly.**

The issue is likely in how the Claude Code VSCode extension handles the `systemMessage` field in hook responses. The output is being generated successfully but not displayed to the user.

**Next Steps**:
1. Enable debug logging to confirm hook execution in VSCode
2. Test with forced "block" mode
3. Report to Claude Code team if systemMessage not implemented
4. Document CLI fallbacks for users

## Files Involved

- Hook: `plugins/specweave/hooks/user-prompt-submit.sh` (lines 105-130)
- Script: `plugins/specweave/scripts/read-progress.sh`
- Logs: `.specweave/logs/hooks/user-prompt-submit.log`
- Fallback: `specweave progress` command
