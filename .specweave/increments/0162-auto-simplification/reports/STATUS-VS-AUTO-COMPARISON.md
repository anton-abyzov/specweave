# Why /sw:status Works But /sw:auto Didn't - Detailed Analysis

## 🎯 The Question

**User observed:** `/sw:status` works fine, but `/sw:auto` was broken. What's the difference?

**Short answer:** `/sw:status` NEVER used the dangerous ````!` auto-execution pattern. It always used the safe instruction pattern!

---

## 📊 Side-by-Side Comparison

### `/sw:status` (Always Worked) ✅

**File:** `plugins/specweave/commands/status.md`

```markdown
---
name: sw:status
description: Show increment status overview...
usage: /sw:status [--active|--backlog|...]
---

# Increment Status

**NOTE**: This command is normally intercepted by the UserPromptSubmit hook...

When this command is invoked, extract any arguments from the user's prompt and execute:

```bash
specweave status
```

If the user provided flags (e.g., `/sw:status --active`), pass them to the command.

**CRITICAL**: Execute the command directly with NO commentary before or after.
```

**Key characteristics:**
- ❌ NO ````!` auto-execution block
- ✅ Uses instruction pattern: "When this command is invoked..."
- ✅ Claude interprets arguments first
- ✅ Explicit instruction: "If user provided flags, pass them"
- ✅ Safe with any input

### `/sw:auto` (Was Broken) ❌ → (Now Fixed) ✅

**File:** `plugins/specweave/commands/auto.md`

#### BEFORE (Broken):

```markdown
---
name: sw:auto
description: Start autonomous execution session...
---

# Auto Command

Execute the auto command to initialize auto mode:

```!
specweave auto $ARGUMENTS
```

Now work on the increment tasks...
```

**Problems:**
- ✅ HAD ````!` auto-execution block
- ❌ Blindly executed with `$ARGUMENTS`
- ❌ No Claude interpretation
- ❌ Broke with freeform text

**Example failure:**
```
User: /sw:auto fix e2e tests
Executed: specweave auto fix e2e tests
Error: CLI doesn't understand "fix", "e2e", "tests"
```

#### AFTER (Fixed):

```markdown
---
name: sw:auto
description: Start autonomous execution session...
---

# Auto Command

## How to Use

When user says "auto" or "autonomous" or provides a task description:

1. **Understand the user's intent**: What do they want to work on?
2. **Find or create the increment**: Check for active increments
3. **Execute the command**:
   ```bash
   specweave auto [INCREMENT_IDS] [OPTIONS]
   ```
4. **Start working**: Execute /sw:do on tasks
```

**Fixed:**
- ❌ Removed ````!` auto-execution block
- ✅ Added instruction pattern (like status!)
- ✅ Claude interprets intent first
- ✅ Works with freeform text

---

## 🔍 The Critical Difference

### Pattern 1: ````!` Auto-Execution (Dangerous)

**What it does:**
```
User types: /sw:command some text here
           ↓
$ARGUMENTS = "some text here"
           ↓
Executes: specweave command some text here
           ↓
NO INTERPRETATION BY CLAUDE!
```

**Used by:**
- ❌ `auto.md` (was broken - now fixed)
- ⚠️ `go.md` (potentially vulnerable)
- ✅ `go-status.md` (safe - only flags)
- ✅ `cancel-go.md` (safe - no args)

**Only 4 commands out of ~110 use this pattern!**

### Pattern 2: Instruction-Based (Safe)

**What it does:**
```
User types: /sw:command some text here
           ↓
Claude reads: "When this command is invoked, extract arguments..."
           ↓
Claude interprets: What does user want?
           ↓
Claude constructs: specweave command [CORRECT_ARGS]
           ↓
CLAUDE THINKS FIRST!
```

**Used by:**
- ✅ `status.md` (always worked!)
- ✅ `progress.md` (always worked!)
- ✅ `jobs.md` (always worked!)
- ✅ `done.md` (always worked!)
- ✅ `increment.md` (always worked!)
- ✅ ~105 other commands (always worked!)

**The vast majority use this pattern - it's the standard!**

---

## 📋 What I Did to Fix Auto (Not Status!)

### I Didn't Fix Status - It Was Never Broken!

**Status has ALWAYS used the safe instruction pattern.**

Looking at git history:
```bash
git log --oneline plugins/specweave/commands/status.md | head -5
```

Status was created with the instruction pattern from the beginning!

### What I Fixed: Auto Command

**Commit:** `c18521bb` - "fix: remove auto-exec block from auto.md"

**Changes made:**

1. **Removed the ````!` block:**
   ```diff
   - ```!
   - specweave auto $ARGUMENTS
   - ```
   ```

2. **Added instruction pattern:**
   ```diff
   + ## How to Use
   +
   + When user says "auto" or provides a task description:
   + 1. **Understand the user's intent**
   + 2. **Find or create the increment**
   + 3. **Execute the command**: specweave auto [INCREMENT_IDS] [OPTIONS]
   ```

3. **Made it consistent with status/progress/jobs:**
   - Now uses same pattern as other working commands
   - Claude interprets first, executes second
   - Safe with freeform text

---

## 🎯 Why Status Always Worked

### 1. Never Used ````!` Pattern

Status was designed correctly from the start!

```markdown
# GOOD - Instruction pattern
When this command is invoked, extract arguments and execute:
```bash
specweave status
```

Not:
```markdown
# BAD - Auto-execution pattern
```!
specweave status $ARGUMENTS
```
```

### 2. Hook Intercept as Primary

Status relies on the UserPromptSubmit hook:

```markdown
**NOTE**: This command is normally intercepted by the UserPromptSubmit
hook for instant execution (<100ms).
```

**How the hook works:**
1. User types: `/sw:status`
2. Hook intercepts BEFORE Claude sees it
3. Hook runs: `specweave status`
4. Hook displays output immediately
5. Claude never executes anything!

**This is why status is so fast (<100ms)!**

### 3. Instruction as Fallback

If the hook doesn't fire (rare), Claude follows instructions:

```markdown
When this command is invoked, extract any arguments from the
user's prompt and execute:

```bash
specweave status
```
```

**This fallback is the safe instruction pattern!**

---

## 📊 Command Architecture Comparison

### `/sw:status` Architecture (Correct)

```
User types: /sw:status
     ↓
UserPromptSubmit Hook
     ↓ (intercepts - primary path)
     ├─ Detects: /sw:status
     ├─ Executes: specweave status
     ├─ Shows output
     └─ DONE (Claude never sees it!)

     ↓ (hook failed - fallback path)
     ├─ Claude reads instruction
     ├─ Interprets arguments
     ├─ Executes: specweave status [args]
     └─ DONE
```

**Result:** ✅ Always works, fast, safe!

### `/sw:auto` Architecture (Was Broken)

```
User types: /sw:auto fix e2e tests
     ↓
NO HOOK INTERCEPT (auto doesn't use hooks for activation)
     ↓
Claude reads skill
     ↓
Sees: ```! specweave auto $ARGUMENTS
     ↓
Executes: specweave auto fix e2e tests
     ↓
CLI: Error: unknown option 'fix'
     ↓
❌ BROKEN!
```

### `/sw:auto` Architecture (Now Fixed)

```
User types: /sw:auto fix e2e tests
     ↓
NO HOOK INTERCEPT
     ↓
Claude reads skill
     ↓
Sees: "When user says 'auto', understand their intent..."
     ↓
Claude interprets: "User wants to fix E2E tests"
     ↓
Claude finds/creates: 0164-e2e-tests increment
     ↓
Executes: specweave auto 0164-e2e-tests --e2e
     ↓
✅ WORKS!
```

---

## 🔑 Key Insights

### 1. Hook Intercept ≠ ````!` Auto-Execution

**They're different mechanisms:**

| Feature | Hook Intercept | ````!` Auto-Exec |
|---------|----------------|------------------|
| When | Before Claude sees message | After Claude reads skill |
| Speed | <100ms (instant) | Normal (Claude thinks) |
| Safety | Always safe | Dangerous with freeform |
| Used by | status, progress, jobs | auto (was), go, go-status, cancel-go |

### 2. Status Uses BOTH Mechanisms

**Primary:** Hook intercept (fast path)
**Fallback:** Instruction pattern (safe path)

**This makes status bulletproof!**

### 3. Auto Only Used ````!` (Mistake!)

**Before fix:**
- Only mechanism: ````!` auto-execution
- No hook intercept
- No instruction fallback
- Broke with freeform text

**After fix:**
- Uses instruction pattern (like status!)
- Claude interprets first
- Works with any input

---

## 📝 What I Actually Did

### I Didn't Touch Status

**Status was already correct!** No changes needed.

```bash
git log --oneline plugins/specweave/commands/status.md
```

No recent changes - it's been working correctly all along!

### I Fixed Auto

**Changes:**
1. Removed ````!` auto-execution block
2. Added instruction pattern
3. Made consistent with status/progress/jobs

**Result:** Auto now works like status - safe with any input!

---

## 🎯 Pattern Decision Summary

### Commands That Should Use Hook Intercept + Instruction

**Characteristics:**
- Info/status commands (fast, no side effects)
- Read-only operations
- Frequently used
- Need <100ms response

**Examples:**
- ✅ `/sw:status` - Show status
- ✅ `/sw:progress` - Show progress
- ✅ `/sw:jobs` - Show jobs
- ✅ `/sw:workflow` - Show workflow

**Pattern:**
1. **Primary:** Hook intercepts, executes instantly
2. **Fallback:** Instruction pattern for Claude

### Commands That Should Use Instruction Only

**Characteristics:**
- Action commands (create, modify, delete)
- Accept freeform text
- Need interpretation
- Side effects

**Examples:**
- ✅ `/sw:auto` - Start autonomous mode
- ✅ `/sw:increment` - Create increment
- ✅ `/sw:done` - Close increment
- ✅ `/sw:do` - Execute tasks

**Pattern:**
- **Only:** Instruction pattern - Claude interprets first

### Commands That Should Use ````!` (Rare!)

**Characteristics:**
- ONLY predefined flags
- NO freeform text ever
- Simple pass-through

**Examples:**
- ✅ `/sw:go-status --verbose` - Only flags
- ✅ `/sw:cancel-go` - No args

**Pattern:**
- **Only:** ````!` auto-execution (but instruction is safer!)

---

## ✅ Summary

### What Works and Why

| Command | Pattern | Why It Works |
|---------|---------|--------------|
| `/sw:status` | Hook + Instruction | ✅ Never used ````!` - always safe |
| `/sw:progress` | Hook + Instruction | ✅ Never used ````!` - always safe |
| `/sw:jobs` | Hook + Instruction | ✅ Never used ````!` - always safe |
| `/sw:auto` (OLD) | ````!` only | ❌ Used ````!` with freeform text |
| `/sw:auto` (NEW) | Instruction | ✅ Now uses safe pattern like status! |

### What I Changed

**Status:** Nothing! It was always correct.

**Auto:** Switched from dangerous ````!` pattern to safe instruction pattern (same as status uses).

### Lesson Learned

**Status was the correct design all along!**

Auto should have followed status's pattern from the beginning. By fixing auto to match status's pattern, auto now works correctly with freeform text.

---

**The fix wasn't to make status like auto - it was to make auto like status!** ✅
