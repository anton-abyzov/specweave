---
name: detector
description: Detects SpecWeave context and provides workflow documentation for available commands. Use when learning SpecWeave commands, understanding available slash commands (/sw:increment, /sw:do, /sw:progress, /sw:done), or getting workflow guidance. Explains command syntax and recommended workflow patterns.
---

# SpecWeave - Smart Workflow Documentation

SpecWeave provides explicit slash commands for reliable workflow execution.

**NOTE**: Auto-detection of product descriptions is handled by the `increment-planner` skill. This skill provides command documentation and workflow guidance.

## How SpecWeave Works

**To use SpecWeave**: Type `/inc "Feature description"` to start

**Smart workflow features**:
- ✅ Auto-resume (`/do` finds next incomplete task)
- ✅ Auto-close (`/inc` closes previous if PM gates pass)
- ✅ Progress tracking (`/progress` shows status anytime)
- ✅ Natural flow (finish → start next, no overhead)

## Available Slash Commands

### Core Workflow Commands

| Command | Alias | Description | Example |
|---------|-------|-------------|---------|
| `/increment` | `/inc` | **Plan Increment** (PM-led, auto-closes previous) | `/inc "User auth"` |
| `/do` | - | **Execute tasks** (smart resume, hooks after every task) | `/do` |
| `/progress` | - | **Show status** (task %, PM gates, next action) | `/progress` |
| `/validate` | - | **Validate quality** (rule-based + optional LLM judge) | `/validate 0001 --quality` |
| `/done` | - | **Close explicitly** (optional, `/inc` auto-closes) | `/done 0001` |

### Supporting Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/list-increments` | List all increments with status | `/list-increments` |
| `/sw:sync-docs` | Review strategic docs vs code | `/sw:sync-docs --increment=003` |
| `/sync-github` | Sync increment to GitHub issues | `/sync-github` |

## Why Only ONE Alias?

**Design decision**: `/inc` is the ONLY alias (most frequently used command).

- ✅ Minimizes cognitive overhead (one alias to remember)
- ✅ Other commands use full names for clarity
- ✅ Simpler mental model

## Typical Workflow

**Natural append-only workflow** (0001 → 0002 → 0003):

```bash
# 1. Initialize project (CLI, before Claude session)
npx specweave init my-saas

# 2. Plan your first increment (PM-led)
/inc "AI-powered customer support chatbot"
# PM creates: spec.md + plan.md + tasks.md (auto!) + tests.md

# 3. Build it (smart resume)
/do
# Auto-resumes from next incomplete task
# Hooks run after EVERY task

# 4. Check progress anytime
/progress
# Shows: 5/12 tasks (42%), next: T006, PM gates status

# 5. Continue building
/do
# Picks up where you left off

# 6. Start next feature (auto-closes previous!)
/inc "real-time chat dashboard"
# Smart check:
#   PM gates pass → Auto-close 0001, create 0002
#   PM gates fail → Present options (never forces)

# 7. Keep building
/do
# Auto-finds active increment 0002

# Repeat: /sw:increment → /sw:do → /sw:progress → /sw:increment (auto-closes) → /sw:do...
```

## Command Details

### `/inc` or `/increment` - Plan Increment

**Most important command!** PM-led planning with auto-close intelligence.

```bash
# Short form (recommended)
/inc "User authentication with JWT and RBAC"

# Full form
/increment "User authentication with JWT and RBAC"
```

**What happens**:
1. **Smart Check Previous**: If increment in-progress:
   - PM gates pass → Auto-close previous, create new (seamless)
   - PM gates fail → Present options (complete first / move tasks / cancel)
2. **PM-Led Planning**: PM Agent analyzes requirements
3. **Creates**: spec.md (WHAT & WHY), plan.md (HOW)
4. **Auto-generates**: tasks.md (from plan), tests.md (test strategy)
5. **Ready to build**: Status set to "planned"

### `/do` - Execute Tasks (Smart Resume)

**Smart resume**: Automatically finds next incomplete task.

```bash
# Auto-finds active increment, resumes from next task
/do

# Or specify increment explicitly
/do 0001
```

**What happens**:
1. Finds active increment (or uses specified ID)
2. Parses tasks.md, finds first incomplete task
3. Shows resume context (task T006, description, priority)
4. Executes task implementation
5. **Runs hooks after EVERY task completion** (docs update, validation)
6. Repeats for next task when you run `/do` again

**No manual tracking needed!** Just keep running `/do`.

### `/progress` - Show Status

**Progress visibility**: See exactly where you are anytime.

```bash
/progress

# Auto-finds active increment, shows:
# - Task completion % (P1 weighted higher)
# - PM gates preview (tasks, tests, docs)
# - Next action guidance
# - Time tracking & stuck task warnings
```

### `/validate` - Validate Quality

**Two-level validation**: Rule-based (120 checks) + optional AI quality judge.

```bash
# Rule-based validation only
/validate 0001

# With AI quality assessment (LLM-as-judge)
/validate 0001 --quality

# Export suggestions to tasks.md
/validate 0001 --quality --export

# Auto-fix issues (experimental)
/validate 0001 --quality --fix
```

### `/done` - Close Explicitly

**Optional command**: Use when you need explicit closure (usually `/inc` handles this).

```bash
/done 0001

# System validates:
# - All P1 tasks completed
# - All tests passing
# - Documentation updated
#
# Offers leftover transfer options for P2/P3 tasks
```

**When to use**:
- Explicit closure before long break
- Force closure without starting new increment
- Generate closure report only

**Usually NOT needed**: `/inc` auto-closes previous increment if PM gates pass.

### `/list-increments` - List All

**WIP tracking**: View all increments with status and completion.

```bash
# All increments
/list-increments

# Filter by status
/list-increments --status in-progress

# Filter by priority
/list-increments --priority P1

# Show task breakdown
/list-increments --verbose

# Only WIP increments
/list-increments --wip-only
```

## Smart Workflow Features

### 1. Auto-Resume (No Manual Tracking)

**Problem**: Traditional workflows require manual tracking ("which task am I on?")

**Solution**: `/do` automatically finds next incomplete task.

```
/do

📋 Resuming increment 0001-authentication
   Next: T006 - Implement JWT token validation
   Priority: P1
   Estimate: 2 hours
   Context: After T005 (token generation)

Starting task T006...
```

### 2. Auto-Close (Seamless Flow)

**Problem**: Manual closure overhead ("do I need to close this?")

**Solution**: `/inc` auto-closes previous if PM gates pass.

**Happy path** (auto-close):
```
/inc "payment processing"

📊 Checking previous increment 0001-authentication...
   PM Gates: ✅ All P1 complete, tests pass, docs updated

✅ Auto-closing 0001 (seamless)
Creating 0002-payment-processing...
```

**Issues found** (present options):
```
/inc "payment processing"

📊 Checking previous increment 0001-authentication...
   PM Gates: ❌ 2 P1 tasks remaining

❌ Cannot auto-close 0001 (incomplete)

Options:
  A) Complete 0001 first (recommended)
  B) Move incomplete tasks to 0002
  C) Cancel new increment

Your choice? _
```

### 3. Suggest, Never Force

**Critical principle**: User always in control.

- ✅ Present options when issues found
- ✅ Explain consequences clearly
- ✅ Let user decide
- ❌ NEVER surprise user with forced closure

### 4. Progress Visibility

**Problem**: Status unclear ("how much is done?")

**Solution**: `/progress` shows status anytime.

```
/progress

📊 Increment 0001-authentication

Status: in-progress
Progress: 42% (5/12 tasks) ⏳

Task Breakdown:
  P1: 60% (3/5) ⏳
  P2: 33% (2/6)
  P3: 0% (0/1)

PM Gates Preview:
  ✅ All P1 tasks: 60% (not ready)
  ⏳ Tests passing: Running...
  ✅ Docs updated: Yes

Next Action: Complete T006 (P1, 2h)
Time on increment: 3 days
```

## Why Slash Commands?

**Problem**: Auto-activation doesn't work reliably in Claude Code.

**SpecWeave solution**: EXPLICIT slash commands for 100% reliability.

**Benefits**:
- ✅ 100% reliable activation (no guessing)
- ✅ Clear user intent (explicit action)
- ✅ Consistent behavior (no surprises)
- ✅ Easy to learn (visible in .claude/commands/)

## How to Get Help

**Within Claude Code**:
```
User: "How do I use SpecWeave?"
→ Claude shows this documentation
```

**Available commands**:
```
User: "What SpecWeave commands are available?"
→ Claude lists all slash commands
```

**Command syntax**:
```
User: "How do I create a new increment?"
→ Claude explains /sw:increment command with examples
```

## Documentation

- **Command Reference**: See `.claude/commands/` for all command implementations
- **Quick Reference**: See `CLAUDE.md` for quick reference table
- **Official Docs**: https://spec-weave.com/docs/commands

---

**💡 Pro Tip**: Master the smart workflow cycle!

**Core cycle**: `/inc` (plan) → `/do` (implement) → `/progress` (check) → `/inc` (next)

**Key insight**: Natural flow without overhead. Focus on building, not project management.

**One alias to remember**: `/inc` (short for `/increment`)

## Project-Specific Learnings

**Before starting work, check for project-specific learnings:**

```bash
# Check if skill memory exists for this skill
cat .specweave/skill-memories/detector.md 2>/dev/null || echo "No project learnings yet"
```

Project learnings are automatically captured by the reflection system when corrections or patterns are identified during development. These learnings help you understand project-specific conventions and past decisions.

