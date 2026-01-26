# Command Fixes - Ultrathink Analysis & Documentation

**Date**: 2026-01-08
**Fixes**: Info commands hanging + Auto command natural language support
**Version**: v1.0.106+

---

## 🎯 Executive Summary

Two critical fixes were deployed that fundamentally improved SpecWeave command reliability:

1. **Info Commands Fix (v1.0.106)**: Commands like `/sw:status`, `/sw:progress`, `/sw:jobs` were HANGING and not showing output
   - **Root Cause**: Using `"block"` decision which erases commands from context
   - **Fix**: Changed to `"approve"` + `"systemMessage"` to display output and continue
   - **Impact**: All info commands now work instantly without hanging

2. **Auto Command Fix (v1.0.107)**: `/sw:auto` couldn't handle natural language like "fix e2e tests"
   - **Root Cause**: Using ````!` auto-execution pattern with freeform text
   - **Fix**: Switched to instruction pattern (like 106+ other commands)
   - **Impact**: Users can now say "auto fix e2e tests" naturally

---

## Part 1: Info Commands Hanging Bug

### 🐛 The Problem

**Symptoms**:
```
User: /sw:status
Claude: [Shows output once, then sits idle forever]
User: what's the status?
Claude: [No response, appears to be "marinating"]
```

**Affected commands**:
- `/sw:status` - Show increment status
- `/sw:progress` - Show task progress
- `/sw:jobs` - Show active work
- `/sw:workflow` - Show workflow state
- `/sw:costs` - Show API costs
- `/sw:analytics` - Show usage stats

**Why it looked like hanging**:
1. Command executed successfully (output shown)
2. But hook returned `{"decision":"block"}`
3. Claude Code interpreted "block" as "erase this command from context"
4. User tries to follow up → Claude has no memory of the command
5. Appears frozen/unresponsive

---

### 🔬 Root Cause Analysis

**The Hook Decision API**:
```typescript
// UserPromptSubmit hook can return:
{
  "decision": "approve",      // ✅ Execute command, keep in context
  "decision": "block",        // ❌ DON'T execute, erase from context
  "systemMessage": "output"   // Show this to user
}
```

**What we were doing (WRONG)**:
```bash
# In user-prompt-submit.sh (v1.0.105 and earlier)
if echo "$PROMPT" | grep -q "^/sw:status"; then
  OUTPUT=$(bash "$SCRIPTS_DIR/show-status.sh")
  OUTPUT_ESCAPED=$(escape_json "$OUTPUT")

  # WRONG: "block" erases command from context!
  printf '{"decision":"block","reason":"%s"}\n' "$OUTPUT_ESCAPED"
  exit 0
fi
```

**Why "block" was used initially**:
- Historical misunderstanding of hook API
- Thought "block" meant "I handled it, you don't need to"
- Didn't realize "block" = "erase from history"
- Worked for ONE execution, but broke follow-ups

**What happens with "block"**:
```
1. User: /sw:status
2. Hook executes script, shows output
3. Hook returns {"decision":"block"}
4. Claude Code shows output BUT erases "/sw:status" from context
5. Conversation now has NO record of the command
6. User: "show me more details"
7. Claude: "About what?" (context lost!)
```

---

### ✅ The Fix (v1.0.106)

**Changed to "approve" + "systemMessage"**:
```bash
# In user-prompt-submit.sh (v1.0.106+)
if echo "$PROMPT" | grep -q "^/sw:status"; then
  OUTPUT=$(bash "$SCRIPTS_DIR/show-status.sh")
  OUTPUT_ESCAPED=$(escape_json "$OUTPUT")

  # CORRECT: "approve" keeps command in context!
  printf '{"decision":"approve","systemMessage":"%s"}\n' "$OUTPUT_ESCAPED"
  exit 0
fi
```

**What "approve" does**:
```
1. User: /sw:status
2. Hook executes script, shows output via systemMessage
3. Hook returns {"decision":"approve"}
4. Claude Code KEEPS "/sw:status" in context
5. Conversation has full record: command + output
6. User: "show me more details"
7. Claude: "Based on the status I just showed..." (context preserved!)
```

---

### 📊 Before vs After Comparison

| Aspect | Before (block) | After (approve) | Result |
|--------|---------------|-----------------|--------|
| **First execution** | ✅ Works | ✅ Works | Same |
| **Follow-up questions** | ❌ Lost context | ✅ Has context | Fixed! |
| **Command in history** | ❌ Erased | ✅ Preserved | Fixed! |
| **User experience** | "Claude is frozen" | "Instant response" | Fixed! |
| **Hook complexity** | Simple | Same simple | No change |

---

### 🔍 Why This Wasn't Caught Earlier

**Three reasons**:

1. **Single-use testing**: Tested "/sw:status" once → worked → shipped
   - Didn't test follow-up questions
   - Didn't notice context erasure

2. **Misleading API naming**: "block" sounds like "I handled it"
   - Expected: block = prevent default execution
   - Actual: block = erase from context entirely

3. **Silent failure**: No error messages
   - Hook succeeded
   - Output shown to user
   - Context loss only visible on follow-up

**The test that would have caught it**:
```typescript
it('should allow follow-up questions after /sw:status', async () => {
  await agent.run('/sw:status');
  const response = await agent.run('show me more details');

  // This would FAIL with "block" (context lost)
  // This would PASS with "approve" (context preserved)
  expect(response).toContain('based on the status');
});
```

---

### 🎯 Commands Fixed

All 6 info commands updated in commit `46d2fecc`:

```bash
# Each changed from:
printf '{"decision":"block","reason":"%s"}\n' "$OUTPUT_ESCAPED"

# To:
printf '{"decision":"approve","systemMessage":"%s"}\n' "$OUTPUT_ESCAPED"
```

**List of fixed commands**:
1. `/sw:status` - Increment status display
2. `/sw:progress` - Task progress tracking
3. `/sw:jobs` - Active work overview
4. `/sw:workflow` - Workflow state machine
5. `/sw:costs` - API cost tracking
6. `/sw:analytics` - Usage statistics

---

### 🚀 Impact & Validation

**Performance improvement**:
- Before: Info commands appeared to "hang" on follow-up
- After: Instant response, full context preservation

**User experience**:
```
# Before (BROKEN):
User: /sw:status
Claude: [Shows status table]
User: show me increment 0162
Claude: What increment? [NO CONTEXT]

# After (FIXED):
User: /sw:status
Claude: [Shows status table]
User: show me increment 0162
Claude: Based on the status I just showed, 0162 is "planning" with 25 tasks... ✅
```

**Validation**:
- [x] All 6 commands tested with follow-up questions
- [x] Context preserved across multiple turns
- [x] No hanging or "marinating" behavior
- [x] Output still shows instantly (no regression)

---

## Part 2: Auto Command Natural Language Bug

### 🐛 The Problem

**Symptoms**:
```
User: /sw:auto fix e2e tests
Error: Bash command failed: unknown option 'fix'
```

**What was happening**:
```bash
# In commands/auto.md (BEFORE):
```!
specweave auto $ARGUMENTS
```

# User types: /sw:auto fix e2e tests
# Executed as:  specweave auto fix e2e tests
# CLI error:    "unknown option 'fix'" (not a valid flag!)
```

**Why it failed**:
- `specweave auto` only accepts flags: `--tests`, `--build`, increment IDs
- Freeform text like "fix e2e tests" is NOT a valid argument
- ````!` pattern passes args literally → CLI rejects them

---

### 🔬 Root Cause Analysis

**The ````!` Auto-Execution Pattern**:

```markdown
# What it does:
```!
command $ARGUMENTS
```
# Immediately executes: command + user's exact words
# NO Claude interpretation, NO intent parsing
```

**When it works**:
```
User: /sw:go-status --verbose
Executes: specweave go-status --verbose ✅ (valid flag)

User: /sw:cancel-go --force
Executes: specweave cancel-go --force ✅ (valid flag)
```

**When it breaks**:
```
User: /sw:auto fix e2e tests
Executes: specweave auto fix e2e tests ❌ ("fix" is not a flag!)

User: /sw:increment build auth
Executes: specweave increment build auth ❌ (if using ```!)
```

---

### 🎯 Pattern Analysis

**Commands that SHOULD use ````!`:**
- Fixed arguments only (no freeform text)
- All args are predefined flags/options
- Examples: `/sw:go-status`, `/sw:cancel-go`

**Commands that SHOULD NOT use ````!`:**
- Accept natural language
- Claude must interpret user intent
- Examples: `/sw:increment`, `/sw:auto`, `/sw:do`

**Survey of 110 SpecWeave commands**:
```bash
grep -l '```!' plugins/specweave/commands/*.md | wc -l
# Result: 4 commands

ls plugins/specweave/commands/*.md | wc -l
# Result: 110 commands

# Conclusion: Only 3.6% use ```! (and that's correct!)
```

**Why most commands avoid ````!`:**
- Users speak naturally: "auto fix e2e tests"
- Not in CLI syntax: "auto --fix --target=e2e --scope=tests"
- Claude translates intent → correct CLI syntax

---

### ✅ The Fix

**Changed from auto-execution to instruction pattern**:

```markdown
# BEFORE (auto.md):
Execute the auto command:
```!
specweave auto $ARGUMENTS
```

# AFTER (auto.md):
## How to Use

When user requests auto mode:
1. Understand their intent (what needs fixing/building)
2. Find or create the increment
3. Execute: specweave auto [INCREMENT_IDS] [OPTIONS]

Examples:
- User: "auto fix e2e tests" → Find/create increment → `specweave auto 0164`
- User: "auto with build" → `specweave auto --build`
```

**How it works now**:
```
User: /sw:auto fix e2e tests

Claude's thought process:
1. User wants auto mode
2. Task is "fix e2e tests"
3. Check for existing increment about e2e tests
4. Found: 0164-e2e-test-infrastructure-fix
5. Execute: specweave auto 0164

Result: ✅ Correct command, auto mode starts!
```

---

### 📊 Comparison: Auto-Execute vs Instruction Pattern

| Aspect | ````!` Auto-Execute | Instruction Pattern | Winner |
|--------|-------------------|---------------------|--------|
| **Fixed args** | ✅ Perfect | ✅ Works | Tie |
| **Natural language** | ❌ Breaks | ✅ Works | Instruction |
| **User friction** | Low (if syntax learned) | Zero (speak naturally) | Instruction |
| **Error handling** | CLI error (cryptic) | Claude explains issue | Instruction |
| **Flexibility** | None | Full interpretation | Instruction |
| **Speed** | Instant | Instant (same!) | Tie |

---

### 🎯 When to Use Each Pattern

**Use ````!` Auto-Execute when**:
- Command has ZERO freeform arguments
- All args are --flags or fixed values
- Examples:
  ```markdown
  /sw:go-status [--verbose]
  /sw:cancel-go [--force]
  /sw:validate 0162 [--strict]
  ```

**Use Instruction Pattern when**:
- Command accepts natural language
- Claude must interpret user intent
- Examples:
  ```markdown
  /sw:increment "Build auth system"
  /sw:auto fix e2e tests
  /sw:do "implement login form"
  ```

**Rule of thumb**:
- If user can say it 10 different ways → Instruction Pattern
- If user must say exact syntax → ````!` Auto-Execute

---

### 🚀 Impact & Validation

**Before fix**:
```
User: /sw:auto fix e2e tests
❌ Error: unknown option 'fix'

User: /sw:auto build auth system
❌ Error: unknown option 'build'
```

**After fix**:
```
User: /sw:auto fix e2e tests
✅ Claude finds/creates increment → runs auto mode

User: /sw:auto build auth system
✅ Claude finds/creates increment → runs auto mode
```

**Validation**:
- [x] Natural language phrases work
- [x] Claude correctly interprets intent
- [x] Creates increment if needed
- [x] Finds existing increment if exists
- [x] Falls back to asking user if ambiguous

---

## 🎓 Key Lessons Learned

### Lesson 1: Hook API Semantics Matter

**What we learned**:
- `"block"` doesn't mean "I handled it"
- `"block"` means "erase from context entirely"
- `"approve"` + `"systemMessage"` = show output + keep context

**Implication**:
- Read hook API docs carefully
- Test multi-turn conversations
- Don't assume based on naming

### Lesson 2: Auto-Execute is Rare for a Reason

**What we learned**:
- Only 4 of 110 commands use ````!` (3.6%)
- Natural language is the norm
- Users don't think in CLI syntax

**Implication**:
- Default to instruction pattern
- Only use ````!` for commands with ZERO freeform args
- When in doubt, let Claude interpret

### Lesson 3: Single-Use Testing Misses Context Issues

**What we learned**:
- Testing "/sw:status" once → looked fine
- Testing follow-up questions → revealed bug
- Context preservation is critical

**Implication**:
- Always test multi-turn conversations
- Check context preservation
- Simulate real user workflows

---

## 📚 Documentation Updates Needed

### 1. CLAUDE.md Updates

**Add troubleshooting section**:
```markdown
## Troubleshooting

### Commands Hanging or Not Responding

**Symptoms**: Command executes once but follow-up questions fail

**Fix**: Upgrade to v1.0.106+ with hook fixes:
- Info commands now use "approve" instead of "block"
- Context preserved across multiple turns
- No more "marinating" behavior

**Upgrade**: `specweave refresh-marketplace` + restart Claude Code
```

**Add auto command usage**:
```markdown
### /sw:auto Usage

**Natural language supported** (v1.0.107+):
- ✅ "/sw:auto fix e2e tests"
- ✅ "/sw:auto build auth system"
- ✅ "/sw:auto implement feature X"

Claude will:
1. Understand your intent
2. Find or create appropriate increment
3. Start auto mode on that increment
```

### 2. Public Docs (spec-weave.com)

**Add to Troubleshooting page**:

#### Commands Not Responding

**Problem**: Commands like `/sw:status`, `/sw:progress`, `/sw:jobs` show output once but then appear frozen.

**Cause**: Hook configuration issue in v1.0.105 and earlier using "block" decision incorrectly.

**Solution**:
```bash
# Update to latest version
specweave refresh-marketplace

# Restart Claude Code
# Commands will now work correctly with preserved context
```

**Verification**:
```
# Test command works across multiple turns:
You: /sw:status
Claude: [Shows status table]
You: tell me about increment 0162
Claude: Based on the status I showed, 0162 is... ✅
```

#### Natural Language with /sw:auto

**Problem**: `/sw:auto fix e2e tests` fails with "unknown option 'fix'"

**Cause**: Command definition issue in v1.0.106 and earlier using auto-execute pattern.

**Solution**:
```bash
# Update to latest version
specweave refresh-marketplace

# Now use natural language:
/sw:auto fix e2e tests
/sw:auto build authentication
/sw:auto implement feature X
```

**How it works**: Claude interprets your intent, finds/creates the increment, then starts auto mode.

---

## 🔧 Technical Reference

### Hook Decision Types

```typescript
// UserPromptSubmit hook responses:

// 1. APPROVE - Execute command, keep in context
{
  "decision": "approve",
  "systemMessage": "Optional output to show user"
}

// 2. BLOCK - DON'T execute, erase from context
{
  "decision": "block",
  "reason": "Why command was blocked"
}

// 3. MODIFY - Change command before execution
{
  "decision": "approve",
  "modifiedPrompt": "New command to execute",
  "systemMessage": "Optional explanation"
}
```

### When to Use Each

| Decision | Use Case | Example |
|----------|----------|---------|
| **approve** | Info commands that show output | `/sw:status`, `/sw:progress` |
| **approve** | Commands that should execute normally | Most commands |
| **block** | Validation errors that prevent execution | Task count exceeded |
| **modify** | Command transformations | Future use cases |

### Command Pattern Reference

```markdown
# Pattern 1: Auto-Execute (RARE - only 3.6% of commands)
```!
specweave command $ARGUMENTS
```
✅ Use when: ZERO freeform arguments, only --flags
❌ Don't use when: Natural language input

# Pattern 2: Instruction (STANDARD - 96.4% of commands)
When user requests X:
1. Understand intent
2. Execute: specweave command [args]
3. Handle response

✅ Use when: Natural language input
✅ Use when: Claude must interpret intent
✅ Use when: Multiple valid command forms
```

---

## 🎯 Commit References

**Info commands fix**:
```
Commit: 46d2fecc
Title: fix(hooks): use approve+systemMessage for info commands instead of block
Date: 2026-01-08
Files: plugins/specweave/hooks/user-prompt-submit.sh
```

**Auto command fix**:
```
Commit: 2b01069d
Title: fix(auto): replace bash script call with specweave CLI command
Date: 2026-01-08
Files: plugins/specweave/commands/auto.md
```

---

## ✅ Status

**Both fixes deployed**: v1.0.106+ (info commands) + v1.0.107+ (auto command)

**Validation**:
- [x] Info commands preserve context
- [x] Auto command accepts natural language
- [x] No regressions in existing functionality
- [x] User testing confirms fixes work

**Next steps**:
- [x] Update CLAUDE.md with troubleshooting
- [ ] Update spec-weave.com public docs
- [ ] Add multi-turn conversation tests to CI
- [ ] Document hook API semantics in contributor guide

---

**TL;DR**: Info commands were using "block" (which erases context) instead of "approve" (which preserves it). Auto command was using auto-execute pattern (which passes args literally) instead of instruction pattern (which lets Claude interpret). Both fixed by understanding the correct patterns and applying them consistently! 🚀
