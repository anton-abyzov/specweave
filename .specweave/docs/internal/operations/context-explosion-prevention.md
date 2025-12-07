# Context Explosion Prevention & Recovery

**Last Updated**: 2025-11-24
**Related**: ADR-0133, CLAUDE.md Section 0, Section 15
**Incident**: Increment 0058, init.ts edit crash

---

## Overview

Claude Code crashes when total context exceeds ~280KB during tool invocations (especially `AskUserQuestion`). This occurs when editing large files while a large increment spec is active.

---

## Symptoms

### Pre-Crash Indicators
- Status bar shows `Tasks: X/10+` (large increment active)
- Editing files with 2000+ lines outside increment directory
- Claude thinking for unusually long time (4+ seconds)
- Message: "Updating question with X options..."

### Crash Behavior
- Claude Code freezes during tool invocation
- Terminal becomes unresponsive
- No error message (silent crash)
- Work may or may not be saved

---

## Root Cause

### Context Composition at Crash
```
Component                      Size      Source
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Large increment spec/tasks     800+ lines    .specweave/increments/XXXX/
Large file being edited      2,000+ lines    src/cli/commands/init.ts
CLAUDE.md instructions         600 lines     CLAUDE.md
System context/tools           ~50KB        Built-in
Conversation history           ~20KB        Session state
─────────────────────────────────────────────────────────
SUBTOTAL                      ~260KB

Tool invocation (AskUserQuestion)  ~30KB    Option formatting, UI state
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL AT CRASH                ~290KB+      ❌ OVER LIMIT
```

### Why AskUserQuestion is High-Overhead
- Parses and renders all option descriptions
- Buffers multi-select UI state
- Markdown rendering for rich descriptions
- Validation logic for option types
- Response handling structure

Each character in option labels/descriptions gets tokenized and buffered.

---

## Prevention Strategies

### Strategy 1: Pause Large Increments ⭐ (Most Effective)

**Rule**: If status bar shows `Tasks: X/10+`, pause before editing unrelated files.

```bash
# Check status bar first
Tasks: 0/12 (0%)  ← HIGH RISK (12 tasks = large spec ~800+ lines)
       ↑
# Pause increment
/specweave:pause 0058

# Edit unrelated files safely (context reduced by ~40KB)
# work on init.ts, living-docs-sync.ts, etc.

# Resume when done
/specweave:resume 0058
```

**Benefit**: Immediately frees 40-80KB of context (entire increment spec/tasks).

---

### Strategy 2: Use Focused File Reads

**Problem**: Reading entire 2400-line file loads ~120KB into context.

```bash
# ❌ HIGH RISK: Loads entire file
Read(file_path="src/cli/commands/init.ts")
# Result: 2,393 lines (~120KB) in memory

# ✅ SAFE: Loads only section being edited
Read(file_path="src/cli/commands/init.ts", offset="1220," limit="50)"
# Result: 50 lines (~2.5KB) in memory
# Savings: ~117KB
```

---

### Strategy 3: Avoid AskUserQuestion Under High Context

**When context > 200KB**, use simple text prompts instead of `AskUserQuestion`.

```typescript
// ❌ HIGH OVERHEAD (~30KB)
AskUserQuestion({
  questions: [{
    question: "Test the updated initialization flow?",
    options: [
      {
        label: "Yes, run full test suite",
        description: "Runs npm test with full coverage and integration tests"
      },
      {
        label: "No, commit as-is",
        description: "Commits changes without running tests"
      }
    ]
  }]
})

// ✅ LOW OVERHEAD (~1KB)
"I've updated the repository structure prompt. Options:
1. Run tests: npm test
2. Commit: git commit -m 'feat: improve init prompts'

Which would you like?"
```

**When to use each**:
- `AskUserQuestion`: Context < 200KB, complex multi-select needed
- Text prompts: Context > 200KB, simple yes/no or 2-3 options

---

### Strategy 4: Monitor Status Bar

**Red Flag Patterns**:

```bash
# Pattern 1: High task count
Tasks: 0/12 (0%) | ACs: 0/16 (0%)
       ↑             ↑
    12 tasks     16 acceptance criteria
    = Large spec = Detailed requirements

# Pattern 2: Working outside increment directory
Current file: src/cli/commands/init.ts  ← NOT in .specweave/increments/_archive/0058/
Active increment: 0058-fix-status-sync

# Pattern 3: Both combined = CRASH RISK
Tasks: 0/12 + Editing src/cli/commands/init.ts (2,393 lines) = ⚠️  PAUSE FIRST
```

**Action**: When you see both patterns, pause increment before continuing.

---

### Strategy 5: "One Context" Discipline

**Safe Patterns** ✅:
```bash
# Pattern 1: Work ONLY on increment files
/specweave:do 0058
# Edits only files in .specweave/increments/_archive/0058/
# OR files specified in spec.md
# Context: Increment spec + 1 file at a time

# Pattern 2: Work on project files WITHOUT increment
/specweave:pause 0058
# Edit init.ts, living-docs-sync.ts, etc.
# Context: Project files only (no increment spec)
/specweave:resume 0058
```

**Unsafe Pattern** ❌:
```bash
# Increment 0058 active (800 lines spec/tasks) +
# Editing init.ts (2,400 lines) +
# AskUserQuestion invocation (30KB) =
# ~290KB+ → CRASH
```

---

## Recovery Procedure

When Claude Code crashes mid-work:

### Step 1: Assess Damage
```bash
# Check what was in progress
git status
git diff --stat

# Check if work was saved
ls -lah src/cli/commands/init.ts  # Check timestamp
```

### Step 2: Decide Action
```bash
# Option A: Work is complete/good → Commit
git add src/cli/commands/init.ts
git commit -m "feat: improve repository structure prompt"

# Option B: Work is incomplete → Stash
git stash save "WIP: init flow improvements"

# Option C: Work is broken → Revert
git restore src/cli/commands/init.ts
```

### Step 3: Clear Context
```bash
# Option A: Close and reopen Claude Code (full reset)

# Option B: Use /clear command (clears conversation history)
/clear
```

### Step 4: Resume with Lower Context
```bash
# If working on increment:
/specweave:resume 0058

# If working on project files:
# Just continue - increment is paused
```

---

## Case Study: 2025-11-24 Incident

### Timeline
1. **Before crash**: Increment 0058 active (status sync implementation)
   - Spec: 200 lines
   - Tasks: 601 lines
   - Total: 801 lines (~40KB)

2. **During crash**: Editing `init.ts` (2,393 lines, ~120KB)
   - Improving repository structure prompts
   - Changing option descriptions

3. **Crash trigger**: Claude attempted `AskUserQuestion`
   - Message: "Updating question with 2 clear options..."
   - Context: ~260KB + 30KB tool = ~290KB
   - Result: Silent crash

4. **After crash**: Work was committed successfully
   - Commit: `228838ad` - "feat: improve repository structure question"
   - Changes: Updated 2 lines in init.ts

### What Went Right
- Changes were saved before crash
- Git history intact
- Work successfully committed

### What Should Have Happened
```bash
# Correct workflow:
/specweave:pause 0058                # Free 40KB context
# Edit init.ts
git commit -m "feat: improve init"   # Commit
/specweave:resume 0058               # Resume increment work
```

---

## Diagnostics

### Check Context Load
```bash
# 1. Check active increment size
wc -l .specweave/increments/_archive/0058-*/{spec,tasks}.md
# If total > 500 lines → HIGH RISK

# 2. Check file being edited
wc -l src/cli/commands/init.ts
# If > 1500 lines → HIGH RISK

# 3. Estimate total context
echo "Scale: If increment > 500 lines + file > 1500 lines = PAUSE FIRST"
```

### Check Status Bar
Look for:
- `Tasks: X/10+` → Large increment
- `ACs: X/10+` → Complex spec
- File path outside `.specweave/increments/` → Dual-context risk

---

## Quick Reference Card

### 🚨 When to Pause
```
IF (status_bar.tasks >= 10)
   AND (editing_file_outside_increment)
   AND (file_size > 1500 lines)
THEN pause_increment_first()
```

### ✅ Safe Workflow
```bash
1. Check status bar (Tasks: X/Y)
2. If X/10+: /specweave:pause XXXX
3. Edit files
4. Commit/test
5. /specweave:resume XXXX
```

### ❌ Dangerous Pattern
```bash
# Active increment (10+ tasks) +
# Editing large file (2000+ lines) +
# Tool invocation (AskUserQuestion) =
# CRASH
```

---

## Related Documents

- **ADR-0133**: Skills spawning agents (same pattern)
- **CLAUDE.md Section 0**: Think-Then-Act Discipline
- **CLAUDE.md Section 15**: Skills vs Agents
- **Incident Report**: Increment 0058, commit 228838ad

---

## Prevention Checklist

Before editing large files:
- [ ] Check status bar task count (X/10+ = pause first)
- [ ] Check file size (> 1500 lines = use focused reads)
- [ ] Estimate context load (increment + file + history)
- [ ] Pause increment if needed (`/specweave:pause XXXX`)
- [ ] Use text prompts instead of AskUserQuestion if context > 200KB

After crash:
- [ ] Check git status
- [ ] Commit/stash/revert as needed
- [ ] Close/reopen Claude Code or use `/clear`
- [ ] Resume with one context only

---

**Remember**: Context explosion is **preventable** through disciplined workflow. When in doubt, pause first.
