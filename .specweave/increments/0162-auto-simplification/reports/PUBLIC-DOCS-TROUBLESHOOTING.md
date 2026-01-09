# SpecWeave Troubleshooting Guide - Public Documentation

**For**: spec-weave.com/docs/troubleshooting
**Date**: 2026-01-08
**Versions**: v1.0.106+ (info commands fix), v1.0.107+ (auto command fix)

---

## Commands Not Responding or Hanging

### Problem

Commands like `/sw:status`, `/sw:progress`, `/sw:jobs`, `/sw:workflow`, `/sw:costs`, or `/sw:analytics` execute once and show output, but then appear frozen or unresponsive. Follow-up questions don't work.

**Example**:
```
You: /sw:status
Claude: [Shows status table]
You: tell me about increment 0162
Claude: [No response or "What are you referring to?"]
```

### Cause

This was a hook configuration issue in versions v1.0.105 and earlier. The UserPromptSubmit hook was using the `"block"` decision type, which:
1. Executed the command successfully
2. Showed the output to the user
3. But then **erased the command from context**

This meant follow-up questions had no memory of what was just shown.

### Solution

**Update to v1.0.106 or later**:

```bash
# Update SpecWeave plugins
specweave refresh-marketplace

# Restart Claude Code (REQUIRED for hooks to reload)
# Close and reopen Claude Code application
```

### Verification

After updating, test that context is preserved:

```
You: /sw:status
Claude: [Shows status table]
You: tell me about increment 0162
Claude: Based on the status I just showed, increment 0162 is in "planning" status... ✅
```

If Claude references "the status I just showed," the fix is working correctly!

### Technical Details

The fix changed hook responses from:
```json
{"decision": "block", "reason": "...output..."}
```

To:
```json
{"decision": "approve", "systemMessage": "...output..."}
```

This preserves the command in conversation context while still showing instant output.

---

## /sw:auto Rejects Natural Language

### Problem

The `/sw:auto` command fails with errors like "unknown option" when using natural language descriptions.

**Example**:
```
You: /sw:auto fix e2e tests
Error: unknown option 'fix'
```

### Cause

Versions v1.0.106 and earlier used an auto-execution pattern that passed arguments literally to the CLI:

```
User input: /sw:auto fix e2e tests
Executed as: specweave auto fix e2e tests
Error: "fix" is not a valid CLI option
```

The `specweave auto` command only accepts increment IDs and flags (like `--build`, `--tests`), not freeform text.

### Solution

**Update to v1.0.107 or later**:

```bash
# Update SpecWeave plugins
specweave refresh-marketplace

# Restart Claude Code (REQUIRED)
# Close and reopen Claude Code application
```

### Usage

After updating, you can use natural language with `/sw:auto`:

```
✅ /sw:auto fix e2e tests
✅ /sw:auto build authentication system
✅ /sw:auto implement user profile
✅ /sw:auto finish remaining tasks
```

**How it works**:
1. Claude interprets your natural language request
2. Finds an existing increment matching the description (or creates one)
3. Runs `specweave auto [increment-id]` with the correct increment

**Example**:
```
You: /sw:auto fix e2e tests
Claude: I found increment 0164-e2e-test-infrastructure-fix. Starting auto mode...
[Executes: specweave auto 0164]
```

### Technical Details

The fix changed from auto-execute pattern:
```markdown
```!
specweave auto $ARGUMENTS
```
```

To instruction pattern:
```markdown
When user requests auto mode:
1. Understand their intent
2. Find or create appropriate increment
3. Execute: specweave auto [INCREMENT_IDS] [OPTIONS]
```

This allows Claude to interpret natural language before executing the command.

---

## Common Update Issues

### "specweave command not found"

**Solution**: Install or update SpecWeave globally:
```bash
npm install -g specweave
```

### Hooks Still Using Old Behavior

**Solution**: After `specweave refresh-marketplace`, you MUST restart Claude Code:
1. Close Claude Code completely
2. Reopen Claude Code
3. Hooks will now use updated version

**Why restart is required**: Hooks are loaded at startup and cached in memory.

### "refresh-marketplace command not found"

**For end users**:
```bash
# Use CLI command (v1.0.100+)
specweave refresh-marketplace
```

**For contributors** (in specweave repo):
```bash
# Use script directly
bash scripts/refresh-marketplace.sh
```

---

## Version Check

**Check your SpecWeave version**:
```bash
specweave --version
```

**Check installed plugins**:
```
# In Claude Code
/plugin list --installed
```

**Minimum versions for fixes**:
- Info commands fix: v1.0.106+
- Auto command fix: v1.0.107+

---

## Still Having Issues?

### 1. Check Logs

```bash
# Hook execution logs
cat ~/.specweave/logs/hooks/user-prompt-submit.log

# Session logs
cat ~/.specweave/logs/session-*.log
```

### 2. Clean Cache

```bash
# Clear plugin cache
rm -rf ~/.claude/plugins/cache/specweave

# Refresh marketplace
specweave refresh-marketplace

# Restart Claude Code
```

### 3. Report Issue

If problems persist after updating and restarting:

1. Check GitHub issues: https://github.com/spec-weave/specweave/issues
2. Create new issue with:
   - SpecWeave version (`specweave --version`)
   - Claude Code version
   - Exact command that failed
   - Error message or unexpected behavior
   - Relevant log excerpts

---

## Migration Guide

### From v1.0.105 or Earlier

**Step 1: Backup** (optional but recommended)
```bash
cp -r ~/.claude/plugins ~/.claude/plugins.backup
```

**Step 2: Update**
```bash
specweave refresh-marketplace
```

**Step 3: Restart**
- Close Claude Code
- Reopen Claude Code

**Step 4: Verify**
```
# Test info command with follow-up
/sw:status
# Then ask: "show me more about [some increment]"
# Claude should reference "the status I just showed"

# Test auto with natural language
/sw:auto fix e2e tests
# Should find/create increment and start auto mode
```

### Breaking Changes

**None!** These are bug fixes that restore expected behavior:
- Info commands SHOULD preserve context (they do now)
- Auto command SHOULD accept natural language (it does now)

No changes to existing workflows or commands.

---

## Related Documentation

- [Commands Reference](./commands.md) - Full command list
- [Hooks System](./hooks.md) - Hook architecture
- [Auto Mode Guide](./auto-mode.md) - Autonomous execution
- [Workflow Guide](./workflow.md) - Development workflow

---

## Summary

**Info Commands Hanging** → Update to v1.0.106+ and restart Claude Code
**Auto Command Errors** → Update to v1.0.107+ and restart Claude Code

Both fixes require:
1. `specweave refresh-marketplace`
2. Complete restart of Claude Code
3. No other changes needed

After updating, commands work as expected with full context preservation and natural language support!
