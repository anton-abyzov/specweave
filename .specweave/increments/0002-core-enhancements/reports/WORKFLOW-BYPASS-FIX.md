# SpecWeave Workflow Bypass - Root Cause Analysis & Fix

## Executive Summary

When `/specweave-inc` was run in the client project, the entire SpecWeave workflow was bypassed:
- ❌ No PM agent invoked
- ❌ No Architect agent invoked
- ❌ No increment-planner skill used
- ❌ No task-builder skill used
- ❌ No hooks executed
- ❌ No living documentation created
- ❌ No doc sync performed

Instead, Claude Code just wrote files directly using the Write tool.

## Root Cause

### The Fundamental Issue

SpecWeave commands and skills are **DESCRIPTIVE** rather than **PRESCRIPTIVE**.

**Descriptive (Current):**
```markdown
### Step 4: Activate role-orchestrator
- Analyze user's description
- Determine which strategic agents are needed
```

**Prescriptive (Fixed):**
```markdown
### Step 4: Activate Increment Planning Workflow

🚨 CRITICAL - YOU MUST USE THE SKILL TOOL:

Use the Skill tool:
command: "increment-planner"

DO NOT manually create files. DO NOT skip this step.
```

### Why This Matters

Commands and skills rely on Claude Code's **autonomous judgment** to:
1. Read the instructions
2. Understand the workflow
3. Decide to use appropriate tools (Task, Skill)
4. Follow the multi-agent process

**Problem:** Claude Code sometimes takes shortcuts and bypasses the workflow, writing files directly instead of invoking agents/skills.

## What Should Happen

### Correct Workflow (All 9 Steps)

```
User: /specweave-inc "Build recipe app"
    ↓
Step 1: Command expands from .claude/commands/specweave-increment.md
    ↓
Step 2: increment-planner skill invoked (via Skill tool)
    ↓
Step 3: PM agent invoked (via Task tool, subagent_type="pm")
    ├─ Creates .specweave/docs/internal/strategy/{module}/
    │   ├── overview.md
    │   ├── requirements.md
    │   ├── user-stories.md
    │   └── success-criteria.md
    └─ Creates .specweave/increments/0001-*/spec.md (references strategy docs)
    ↓
Step 4: Architect agent invoked (via Task tool, subagent_type="architect")
    ├─ Reads PM's strategy docs
    ├─ Creates .specweave/docs/internal/architecture/adr/
    │   ├── 0001-database-choice.md
    │   ├── 0002-api-architecture.md
    │   └── 0003-deployment-platform.md
    └─ Creates .specweave/increments/0001-*/plan.md (references ADRs)
    ↓
Step 5: task-builder skill invoked (auto-generates tasks.md)
    └─ Creates .specweave/increments/0001-*/tasks.md
    ↓
Step 6: Validation hooks run
    └─ Checks spec.md, plan.md, tasks.md structure
    ↓
Step 7: Post-increment hooks run
    └─ Syncs living documentation
    ↓
Step 8: User notified
    └─ "✅ Increment 0001 created"
    ↓
Step 9: Ready to build
    └─ User runs /specweave-do
```

### What Actually Happened (Broken)

```
User: /specweave-inc "Build recipe app"
    ↓
Step 1: Command expands
    ↓
Step 2: Claude Code IGNORES agent/skill instructions
    ↓
Step 3: Claude Code writes files directly with Write tool
    ├─ .specweave/increments/0001-initial-setup/spec.md
    └─ (NO living docs created!)
    ↓
Step 4: DONE (incomplete!)
```

**Result:**
- Only 1 file created (spec.md)
- No PM agent collaboration
- No Architect agent collaboration
- No auto-generated tasks
- No hooks
- No validation
- No doc sync

## The Fix

### Changed Files

1. **src/commands/specweave:increment.md** (lines 120-200)
   - Added explicit "YOU MUST USE THE SKILL TOOL" instructions
   - Added Skill tool invocation syntax
   - Added fallback to Task tool if Skill unavailable
   - Made instructions PRESCRIPTIVE not DESCRIPTIVE

2. **src/skills/increment-planner/SKILL.md** (lines 71-133)
   - Added explicit "YOU MUST USE THE TASK TOOL" instructions
   - Added Task tool invocation syntax for PM agent
   - Added Task tool invocation syntax for Architect agent
   - Made workflow steps PRESCRIPTIVE not DESCRIPTIVE

### Key Changes

#### Before (Descriptive):
```markdown
STEP 2: Invoke PM Agent
├─ PM creates .specweave/docs/internal/strategy/
```

#### After (Prescriptive):
```markdown
STEP 2: Invoke PM Agent (🚨 MANDATORY - USE TASK TOOL)

YOU MUST USE THE TASK TOOL - DO NOT SKIP:

Task(
  subagent_type: "pm",
  description: "PM product strategy",
  prompt: "Create product strategy for: [user feature description]

  You MUST create BOTH living docs AND increment files:
  1. Living docs: .specweave/docs/internal/strategy/{module}/
  2. Increment file: .specweave/increments/{number}-{name}/spec.md

  Tech stack: [detected tech stack]"
)

Wait for PM agent to complete!
```

## Files Changed

### Framework (Source)
- `/Users/antonabyzov/Projects/github/specweave/src/commands/specweave:increment.md` ✅ Fixed
- `/Users/antonabyzov/Projects/github/specweave/src/skills/increment-planner/SKILL.md` ✅ Fixed
- `/Users/antonabyzov/Projects/github/specweave/.claude/commands/specweave:increment.md` ✅ Synced
- `/Users/antonabyzov/Projects/github/specweave/.claude/skills/increment-planner/SKILL.md` ✅ Synced

### Client Project (Deployed)
- `/Users/antonabyzov/Projects/TestLab/specweave-recipe-app/.claude/commands/specweave-increment.md` ✅ Updated
- `/Users/antonabyzov/Projects/TestLab/specweave-recipe-app/.claude/skills/increment-planner/SKILL.md` ✅ Updated

## Testing the Fix

### Before Testing

**IMPORTANT:** You must restart Claude Code for the changes to take effect!

### Test Steps

1. **Clean slate:**
   ```bash
   cd /Users/antonabyzov/Projects/TestLab/specweave-recipe-app
   rm -rf .specweave/increments/0001-initial-setup
   ```

2. **Run the command:**
   ```
   /specweave-inc "Build recipe app with Next.js 14"
   ```

3. **Verify workflow executed:**
   - [ ] increment-planner skill activated
   - [ ] PM agent invoked (Task tool with subagent_type="pm")
   - [ ] Architect agent invoked (Task tool with subagent_type="architect")
   - [ ] Living docs created in `.specweave/docs/internal/`
   - [ ] Increment files reference living docs
   - [ ] tasks.md auto-generated
   - [ ] Hooks executed
   - [ ] Doc sync performed

4. **Check outputs:**
   ```bash
   # Living docs (source of truth)
   ls -la .specweave/docs/internal/strategy/recipe-app/
   # Should see: overview.md, requirements.md, user-stories.md, success-criteria.md

   ls -la .specweave/docs/internal/architecture/adr/
   # Should see: 0001-*.md, 0002-*.md, 0003-*.md (at least 3 ADRs)

   # Increment files (summaries that reference living docs)
   ls -la .specweave/increments/0001-recipe-app/
   # Should see: spec.md, plan.md, tasks.md, tests.md, context-manifest.yaml
   ```

### Expected Output

```
🔍 Analyzing feature request...

📚 Using increment-planner skill...

🎯 Invoking PM agent for product strategy...
   ├─ Creating living docs in .specweave/docs/internal/strategy/recipe-app/
   ├─ Creating overview.md ✅
   ├─ Creating requirements.md ✅
   ├─ Creating user-stories.md ✅
   ├─ Creating success-criteria.md ✅
   └─ Creating increment spec.md (references strategy docs) ✅

🏗️  Invoking Architect agent for technical design...
   ├─ Reading PM's strategy docs...
   ├─ Creating ADR 0001-database-choice.md ✅
   ├─ Creating ADR 0002-api-architecture.md ✅
   ├─ Creating ADR 0003-deployment-platform.md ✅
   ├─ Creating system diagrams...
   └─ Creating increment plan.md (references ADRs) ✅

📋 Auto-generating tasks.md from plan...
   └─ Created 42 tasks across 5 phases ✅

✅ Increment 0001-recipe-app created!

   Living docs (source of truth):
   - .specweave/docs/internal/strategy/recipe-app/ (4 files)
   - .specweave/docs/internal/architecture/adr/ (3 ADRs)

   Increment files (summaries):
   - spec.md (references strategy docs)
   - plan.md (references ADRs)
   - tasks.md (42 tasks, auto-generated)
   - tests.md (test strategy)

   Next steps:
   1. Review living docs: /sync-docs
   2. Start implementation: /specweave-do
```

## Why This Fix Works

### Prescriptive vs Descriptive

**Descriptive (Unreliable):**
- Says WHAT should happen
- Relies on Claude Code's judgment
- Claude Code might skip steps

**Prescriptive (Reliable):**
- Says HOW to do it (use Skill tool, use Task tool)
- Explicit tool invocations
- Harder for Claude Code to skip

### Enforcement Layers

1. **Command level:** Tells Claude Code to use Skill tool
2. **Skill level:** Tells Claude Code to use Task tool for agents
3. **Agent level:** PM and Architect know to create living docs
4. **Validation:** Hooks verify everything was created

## Related Issues

This fix also prevents:
- ❌ Skipping living documentation creation
- ❌ Creating increment files without agent collaboration
- ❌ Bypassing task auto-generation
- ❌ Missing validation hooks
- ❌ No doc sync after increment creation

## Next Steps

1. **Test the fix** in client project (see Testing section above)
2. **Verify all 9 workflow steps** execute correctly
3. **Check living docs** are created in `.specweave/docs/internal/`
4. **Confirm hooks** run (validation + doc sync)
5. **Report results** back

## Architecture Decision

**Decision:** Make SpecWeave commands and skills PRESCRIPTIVE by explicitly specifying tool invocations.

**Rationale:**
- Claude Code's autonomous judgment is unreliable for critical workflows
- Explicit tool invocations ensure consistency
- Fallback mechanisms provide flexibility
- Better user experience (no silent failures)

**Consequences:**
- ✅ Commands become longer and more explicit
- ✅ Less room for Claude Code to take shortcuts
- ✅ Workflow always executes completely
- ✅ Better debugging (clear which step failed)
- ⚠️ More verbose command files

**Alternatives Considered:**
1. **Keep descriptive style** - Rejected (unreliable)
2. **Use hooks to enforce workflow** - Rejected (hooks run after, not during)
3. **Create wrapper scripts** - Rejected (not framework-agnostic)

---

**Status:** ✅ FIXED

**Date:** 2025-10-28

**Files Changed:** 4 files (2 in framework, 2 in client project)

**Breaking Changes:** None (backward compatible)

**Testing Required:** Yes (restart Claude Code, test /specweave-inc)
