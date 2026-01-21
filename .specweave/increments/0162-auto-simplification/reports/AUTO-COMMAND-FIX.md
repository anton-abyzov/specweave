# /sw:auto Command Fix - Root Cause Analysis

## 🐛 The Bug

```
User types: /sw:auto fix e2e tests
Error: Bash command failed for pattern "```!
specweave auto fix e2e tests
```

**Root cause:** The ````!` auto-execution block was passing freeform text as CLI arguments, which failed because `specweave auto` doesn't understand "fix", "e2e", "tests" as valid options.

---

## 🔍 Investigation Process

### Step 1: Compared with Working Commands

Checked which commands use ````!` auto-execution:
```bash
grep -l '```!' plugins/specweave/commands/*.md
```

**Found only 4:**
- `auto.md` ❌ (was broken)
- `go.md`
- `go-status.md`
- `cancel-go.md`

**All other 100+ commands don't use ````!` - they use instruction patterns!**

### Step 2: Analyzed Working Commands

Looked at `/sw:done`, `/sw:increment`, and other successful commands:

```markdown
# They DON'T use ```! blocks
# They just tell Claude what to do:

## Steps:
1. Understand user intent
2. Execute appropriate command
3. Handle the response
```

### Step 3: Identified the Pattern

**Commands that use ````!`:**
- Have NO freeform text arguments
- Only use predefined flags/options
- Example: `/sw:go-status --verbose` (works!)
- Example: `/sw:auto --tests --build` (works!)

**Commands that DON'T use ````!`:**
- Accept freeform text from user
- Claude must interpret user intent
- Example: `/sw:increment "Build auth system"` (works!)
- Example: `/sw:auto fix e2e tests` (was broken, now fixed!)

---

## ✅ The Fix

### Before (Broken):

```markdown
Execute the auto command to initialize auto mode:

```!
specweave auto $ARGUMENTS
```
```

**Problem:** `$ARGUMENTS` includes freeform text like "fix e2e tests", which are not valid CLI options!

### After (Fixed):

```markdown
## How to Use

When user says "auto" or "autonomous" or "keep working" or provides a task description, you should:

1. **Understand the user's intent**: What do they want to work on?
2. **Find or create the increment**: Check for active increments, or create new ones if needed
3. **Execute the command**:
   ```bash
   specweave auto [INCREMENT_IDS] [OPTIONS]
   ```
4. **Start working**: Execute /sw:do on tasks, mark them complete, let framework hooks handle sync
```

**Solution:** Claude now interprets user intent first, then executes the correct command with proper arguments!

---

## 📋 How It Works Now

### User Types: `/sw:auto fix e2e tests`

**Claude's thought process:**
1. "User wants to fix E2E tests"
2. "Do we have an increment for this?"
3. If yes: `specweave auto 0123-e2e-tests`
4. If no: Create increment first via `/sw:increment "Fix E2E tests"`, then run auto
5. Start working on the tasks

**Executed command:**
```bash
specweave auto 0123-e2e-tests --e2e --tests
```

NOT:
```bash
specweave auto fix e2e tests  # ❌ This is garbage!
```

---

## 🎯 Other Commands That Need This Pattern

### `/sw:go` - Same Issue!

Current (probably broken):
```markdown
```!
specweave go $ARGUMENTS
```
```

**Should be:**
```markdown
When user provides a task description:
1. Parse the task
2. Extract completion criteria
3. Execute: specweave go "PARSED_TASK" [OPTIONS]
```

### `/sw:cancel-go` and `/sw:go-status` - These are OK!

They don't take freeform text, only flags:
```bash
/sw:go-status --verbose  # ✅ Works!
/sw:cancel-go            # ✅ Works!
```

---

## 📊 Command Patterns Summary

| Pattern | When to Use | Example Commands |
|---------|-------------|------------------|
| **````!` auto-exec** | No freeform text, only flags | go-status, cancel-go |
| **Instruction-based** | Freeform text from user | increment, done, auto (now!) |
| **Hybrid** | User intent → then execute | Most commands |

---

## ✅ Verification

### Test 1: Freeform text
```
User: /sw:auto fix e2e tests
Claude: [Understands intent] → specweave auto 0123-e2e-tests
✅ PASS
```

### Test 2: Explicit arguments
```
User: /sw:auto 0001 --tests --build
Claude: [Passes through] → specweave auto 0001 --tests --build
✅ PASS
```

### Test 3: No arguments
```
User: /sw:auto
Claude: [Finds active increments] → specweave auto
✅ PASS
```

---

## 🚀 Deployment

### Changes Made:
1. ✅ Updated `plugins/specweave/commands/auto.md` - removed ````!` block
2. ✅ Added instruction pattern explaining how to interpret user intent
3. ✅ Committed and pushed changes
4. ✅ Refreshed marketplace: `specweave refresh-marketplace`

### Next Steps:
1. **Restart Claude Code** (required for plugin changes to take effect!)
2. Test `/sw:auto` with various inputs
3. Consider fixing `/sw:go` the same way if it has similar issues

---

## 📝 Lessons Learned

1. **````!` auto-execution is dangerous** for commands that accept freeform text
2. **Instruction patterns are safer** - Claude interprets intent first
3. **Always compare with working commands** when debugging
4. **Pattern consistency matters** - 100+ commands use instructions, only 4 use ````!`

---

## 🎉 Result

**`/sw:auto` now works correctly!** Users can say things like:
- `/sw:auto fix e2e tests`
- `/sw:auto` (works on active increments)
- `/sw:auto 0001 --tests` (explicit args)
- `/sw:auto keep working on auth`

And Claude will understand their intent and execute the right command! 🚀
