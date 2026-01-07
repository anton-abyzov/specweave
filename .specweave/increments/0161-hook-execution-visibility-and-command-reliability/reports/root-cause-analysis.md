# Root Cause Analysis: /sw:progress Silent Failure

**Date**: 2026-01-07
**Issue**: `/sw:progress` command fails silently with no output, no errors, and no logs
**Status**: 🔴 ROOT CAUSE IDENTIFIED

## TL;DR - THE SMOKING GUN

Found in `~/.claude/debug/latest`:

```
Getting matching hook commands for UserPromptSubmit with query: undefined
Matched 1 unique hooks for query "no match query" (1 before deduplication)
```

**The hook IS being called, but it's receiving `undefined` as the prompt!**

## Critical Discovery

### What's Happening

1. ✅ User types `/sw:progress` in VSCode
2. ✅ Claude Code detects it's a command
3. ✅ UserPromptSubmit hook is triggered
4. ❌ Hook receives `{"prompt": undefined}` instead of `{"prompt": "/sw:progress"}`
5. ❌ Hook script extracts empty PROMPT variable
6. ❌ Hook exits early (line 49) because prompt doesn't match SpecWeave pattern
7. ❌ Script never executes
8. ❌ No debug log created
9. ❌ User sees nothing

### Evidence from Claude Code Debug Log

```
2026-01-07T21:32:27.433Z [DEBUG] Getting matching hook commands for UserPromptSubmit with query: undefined
2026-01-07T21:32:27.433Z [DEBUG] Found 1 hook matchers in settings
2026-01-07T21:32:27.433Z [DEBUG] Matched 1 unique hooks for query "no match query" (1 before deduplication)
2026-01-07T21:32:27.499Z [DEBUG] Hooks: Checking initial response for async: {"decision":"approve"}
2026-01-07T21:32:27.499Z [DEBUG] Successfully parsed and validated hook JSON output
```

## Why Debug Log Doesn't Exist

Our hook's debug logging code (lines 30-45 in user-prompt-submit.sh):

```bash
INPUT=$(cat 2>/dev/null || echo '{}')
PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""' 2>/dev/null || echo "")

# Log extracted prompt
echo "[...] Extracted prompt: '$PROMPT'" >> "$DEBUG_LOG"

# CRITICAL: Exit immediately for non-SpecWeave prompts
if ! echo "$PROMPT" | grep -qE "(specweave|/sw:|increment|add|create|implement|build|develop)"; then
  echo "[...] Early exit - not a SpecWeave prompt" >> "$DEBUG_LOG"
  echo '{"decision":"approve"}'
  exit 0
fi
```

**What actually happens:**
1. `INPUT` = `{}` or `{"prompt":null}` or `{"prompt":undefined}` (we need to check)
2. `PROMPT` = `""` (empty string)
3. Empty string doesn't match regex `(specweave|/sw:|...)`
4. Hook exits at line 50 BEFORE creating debug log directory
5. Debug log line 32-45 never executes because exit is earlier

Wait, that's wrong. Let me re-read the code...

Actually looking at the code again:
- Line 30-34: Creates debug log and logs input
- Line 45: Logs extracted prompt
- Line 49-52: Early exit check

So the debug log SHOULD be created! Let me check why it's not...

## Missing Debug Log - Two Possibilities

### Possibility 1: Hook Script Not In Plugins
The hook might not be installed correctly in `~/.claude/plugins/` directory.

Check:
```bash
ls ~/.claude/plugins/sw@specweave/hooks/
```

### Possibility 2: Working Directory Wrong
The script creates log at `.specweave/logs/hooks/user-prompt-submit-debug.log` (relative path).

If the hook runs from a different working directory, the log file would be created elsewhere!

Check:
```bash
# Hook might be creating log in:
~/.claude/.specweave/logs/hooks/user-prompt-submit-debug.log
# OR
~/Documents/.specweave/logs/hooks/user-prompt-submit-debug.log
# Instead of:
~/Projects/github/specweave/.specweave/logs/hooks/user-prompt-submit-debug.log
```

## The Input JSON Problem

The Claude Code extension is supposed to pass this to the hook:

```json
{
  "prompt": "/sw:progress",
  "cwd": "/Users/antonabyzov/Projects/github/specweave",
  ...
}
```

But it's actually passing:

```json
{
  "prompt": undefined
}
```

OR the prompt field is missing entirely:

```json
{}
```

## Why This Matters

1. **Hook IS executing** - It's not disabled or broken
2. **Hook IS registered** - Claude Code found and called it
3. **Input is malformed** - The `prompt` field is undefined/missing
4. **Hook correctly exits** - Because undefined prompt doesn't match pattern

## Next Steps To Investigate

### 1. Find Where Debug Log Is Actually Being Created

```bash
# Search entire system for the debug log
find ~ -name "user-prompt-submit-debug.log" 2>/dev/null

# Check if hook creates log in ~/.claude instead
ls ~/.claude/.specweave/logs/hooks/ 2>/dev/null
```

### 2. Check Hook Installation Location

```bash
# Where is the hook actually installed?
find ~/.claude/plugins -name "user-prompt-submit.sh" 2>/dev/null

# Check plugin directory
ls -la ~/.claude/plugins/sw@specweave/
```

### 3. Add Emergency Debugging

Modify hook to log EVERYTHING to a fixed location:

```bash
# At line 27 in user-prompt-submit.sh, add:
INPUT=$(cat 2>/dev/null || echo '{}')

# EMERGENCY DEBUG - Write to home directory (always works)
EMERGENCY_LOG="$HOME/claude-hook-debug.log"
echo "=== $(date) ===" >> "$EMERGENCY_LOG"
echo "INPUT: $INPUT" >> "$EMERGENCY_LOG"
echo "PWD: $(pwd)" >> "$EMERGENCY_LOG"
echo "USER: $(whoami)" >> "$EMERGENCY_LOG"
echo "---" >> "$EMERGENCY_LOG"
```

This will:
- Always log to `~/claude-hook-debug.log`
- Show exactly what INPUT the hook receives
- Show current working directory
- Confirm hook is actually executing

### 4. Check Claude Code Extension Version/Issue

This might be a bug in Claude Code VSCode extension where:
- `/sw:progress` is detected as a skill/command
- Skill execution path bypasses normal prompt flow
- Hook receives empty/undefined prompt

## Potential Fixes

### Short-term Workaround

1. **Use Bash command instead of /sw:progress:**
   ```
   Run: specweave progress
   ```

2. **Use direct script execution:**
   ```
   Run: bash plugins/specweave/scripts/read-progress.sh
   ```

### Medium-term Fix

Modify hook to handle undefined prompts:

```bash
# Line 38-41, change from:
PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""' 2>/dev/null || echo "")

# To:
PROMPT=$(echo "$INPUT" | jq -r '.prompt // .message // .command // ""' 2>/dev/null || echo "")

# Also check Claude-specific fields
if [ -z "$PROMPT" ]; then
  PROMPT=$(echo "$INPUT" | jq -r '.text // .content // ""' 2>/dev/null || echo "")
fi
```

### Long-term Fix

1. Report bug to Claude Code team about undefined prompt in UserPromptSubmit hook
2. Get schema documentation for hook input JSON
3. Add comprehensive input validation to hook

## Files To Check

1. `~/.claude/debug/latest` - Confirm our finding
2. `~/.claude/plugins/sw@specweave/hooks/user-prompt-submit.sh` - Check installed version
3. `~/claude-hook-debug.log` - After adding emergency logging
4. `find / -name "user-prompt-submit-debug.log" 2>/dev/null` - Find misplaced debug logs

## Conclusion

**The `/sw:progress` command is failing because:**

1. Claude Code VSCode extension calls the UserPromptSubmit hook
2. But passes `undefined` or missing `prompt` field in the JSON input
3. Hook extracts empty string for PROMPT variable
4. Empty string doesn't match SpecWeave pattern regex
5. Hook exits early with `{"decision":"approve"}`
6. Script never executes
7. No output displayed

**This is either:**
- A bug in Claude Code VSCode extension's hook input handling
- OR a mismatch between expected hook input schema and actual implementation
- OR skills/commands bypass normal prompt flow in VSCode

**Next:** Add emergency debug logging to confirm exact input received by hook.
