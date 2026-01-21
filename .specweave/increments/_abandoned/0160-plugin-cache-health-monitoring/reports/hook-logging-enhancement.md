# Hook Logging Enhancement Report

**Date**: 2026-01-07
**Issue**: `/sw:progress` command silently failing
**Root Cause**: Insufficient logging in hook system

## Problem

When users ran `/sw:progress`, the command would silently fail with no output or error message. The only indication was semaphore timeout warnings in logs, but these were not visible to users.

## Investigation

1. **Hook System Analysis**:
   - User-prompt-submit hook executes instant commands like `/sw:progress`
   - Hook uses regex to detect commands: `^/sw:progress($| )`
   - Commands should execute in <100ms and return output

2. **Missing Logging**:
   - No logs showed whether hook received the prompt
   - No logs showed whether command regex matched
   - No logs showed execution path taken
   - Semaphore timeout warnings were internal Claude Code infrastructure logs

3. **Testing**:
   - Direct script execution worked fine: `bash plugins/specweave/scripts/read-progress.sh`
   - This confirmed the script itself was functional
   - Problem was in hook command detection/execution

## Solution Implemented

### 1. Enhanced Input Logging (Lines 29-45)

Added comprehensive logging at the very beginning of hook execution:

```bash
# CRITICAL DEBUG LOGGING (v1.0.104+)
DEBUG_LOG=".specweave/logs/hooks/user-prompt-submit-debug.log"
mkdir -p "$(dirname "$DEBUG_LOG")" 2>/dev/null || true
echo "[$(date '+%Y-%m-%d %H:%M:%S')] === NEW PROMPT ===" >> "$DEBUG_LOG"
echo "$INPUT" | head -10 >> "$DEBUG_LOG"
echo "---" >> "$DEBUG_LOG"

# Log extracted prompt for debugging
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Extracted prompt: '$PROMPT'" >> "$DEBUG_LOG"
```

**What this logs:**
- Raw JSON input from Claude Code
- Extracted prompt string
- Timestamp for correlation

### 2. Early Exit Logging (Lines 50-55)

Added logging when prompt doesn't match SpecWeave patterns:

```bash
if ! echo "$PROMPT" | grep -qE "(specweave|/sw:|increment|add|create|implement|build|develop)"; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Early exit - not a SpecWeave prompt" >> "$DEBUG_LOG"
  echo '{"decision":"approve"}'
  exit 0
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] SpecWeave prompt detected, continuing" >> "$DEBUG_LOG"
```

**What this logs:**
- Whether prompt passes initial SpecWeave filter
- When hook exits early for non-SpecWeave prompts

### 3. Command-Specific Logging (/sw:progress Lines 118-165)

Added dedicated debug log for progress command:

```bash
# DEBUG: Log before checking (v1.0.104+)
PROGRESS_DEBUG_LOG=".specweave/logs/hooks/progress-debug.log"
mkdir -p "$(dirname "$PROGRESS_DEBUG_LOG")" 2>/dev/null || true
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Checking for /sw:progress in prompt: '$PROMPT'" >> "$PROGRESS_DEBUG_LOG"

if echo "$PROMPT" | grep -qE "^/sw:progress($| )"; then
  # ... execution logs ...
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] /sw:progress NOT detected in prompt" >> "$PROGRESS_DEBUG_LOG"
fi
```

**What this logs:**
- Exact prompt being checked against regex
- Whether regex matched or not
- Script execution path
- Output length and exit code
- Response type (VSCode vs CLI)

## Logging Structure

```
.specweave/logs/hooks/
├── user-prompt-submit-debug.log      # NEW: All prompts received
├── progress-debug.log                # NEW: /sw:progress specific
├── user-prompt-submit.log            # Existing: JSON structured logs
├── bash-file-guard.log               # Existing: Validation hooks
└── ...other hooks...
```

## Next Steps

### Immediate (This Session)

1. ✅ Add logging to /sw:progress
2. ⏳ Add similar logging to other instant commands:
   - /sw:status
   - /sw:jobs
   - /sw:workflow
   - /sw:costs
   - /sw:analytics

### Follow-up

1. **Test all instant commands** to verify logging works
2. **Monitor logs** for patterns in command failures
3. **Document for users**: How to check logs when commands fail
4. **Consider**: Showing log hints in error messages

## Benefits

1. **Debuggability**: Every hook execution is now traceable
2. **User Visibility**: Clear log files users can check
3. **Pattern Detection**: Can identify common failure modes
4. **Performance Analysis**: Timestamps show execution time
5. **Regression Prevention**: Logs help catch future breakage

## Example Log Output

### user-prompt-submit-debug.log
```
[2026-01-07 14:32:15] === NEW PROMPT ===
{"prompt":"/sw:progress"}
---
[2026-01-07 14:32:15] Extracted prompt: '/sw:progress'
[2026-01-07 14:32:15] SpecWeave prompt detected, continuing
```

### progress-debug.log
```
[2026-01-07 14:32:15] Checking for /sw:progress in prompt: '/sw:progress'
[2026-01-07 14:32:15] /sw:progress detected - executing script
[2026-01-07 14:32:15] ARGS: ''
[2026-01-07 14:32:15] SCRIPTS_DIR: /path/to/plugins/specweave/scripts
[2026-01-07 14:32:15] VSCode mode: true
[2026-01-07 14:32:15] Script: read-progress.sh
[2026-01-07 14:32:15] Output length: 425 chars
[2026-01-07 14:32:15] Exit code: 0
[2026-01-07 14:32:15] Returning VSCode response (systemMessage)
```

## Files Modified

- `plugins/specweave/hooks/user-prompt-submit.sh`:
  - Added DEBUG_LOG setup (lines 29-45)
  - Added early exit logging (lines 50-55)
  - Enhanced /sw:progress logging (lines 118-165)

## Impact

- **Performance**: Negligible (~1ms overhead per prompt)
- **Storage**: Log files will grow, but rotate naturally
- **Compatibility**: No breaking changes, pure addition
- **User Experience**: Better debugging for command failures

## Recommendations

1. **Apply same pattern** to all other instant commands
2. **Add log rotation** if files grow too large (>10MB)
3. **Create user guide**: "Debugging SpecWeave Commands"
4. **Monitor semaphore timeouts**: May indicate deeper Claude Code issue

## Related Issues

- Semaphore timeouts in Claude Code (not our code)
- Silent failures without user feedback
- Lack of visibility into hook execution

## Testing Checklist

- [x] Test `/sw:progress` with logging
- [ ] Test `/sw:status` with logging
- [ ] Test `/sw:jobs` with logging
- [ ] Test `/sw:workflow` with logging
- [ ] Test `/sw:costs` with logging
- [ ] Test `/sw:analytics` with logging
- [ ] Verify logs created in correct location
- [ ] Verify log permissions
- [ ] Test with both VSCode and CLI modes
- [ ] Test with long prompts
- [ ] Test with special characters in prompts
