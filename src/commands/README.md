# SpecWeave Slash Commands

This directory contains all slash commands for SpecWeave.

## Available Commands (v0.2.0)

**IMPORTANT**: All SpecWeave commands are now namespaced with `specweave-` prefix to avoid collisions in brownfield projects.

### Core Workflow Commands (Smart Workflow)

| Command | Shorthand via /specweave | Description |
|---------|--------------------------|-------------|
| `/specweave-increment` | `/specweave inc` | Plan increment (PM-led, auto-closes previous if ready) |
| `/specweave-inc` | `/specweave inc` | Alias for /specweave-increment |
| `/specweave-do` | `/specweave do` | Execute work (smart resume, hooks after every task) |
| `/specweave-next` | `/specweave next` | Smart transition (close + suggest next) |
| `/specweave-progress` | `/specweave progress` | Show status (task %, PM gates, next action) |
| `/specweave-validate` | `/specweave validate` | Validate quality (rule-based + optional LLM judge) |
| `/specweave-done` | `/specweave done` | Close explicitly (optional, /inc auto-closes) |

### Supporting Commands

| Command | Shorthand via /specweave | Description |
|---------|--------------------------|-------------|
| `/specweave-list-increments` | `/specweave list-increments` | List all increments with status and WIP tracking |
| `/specweave-sync-docs` | `/specweave sync-docs` | Review strategic docs vs implementation |
| `/specweave-sync-github` | `/specweave sync-github` | Sync increment to GitHub issues with granular control |
| `/specweave-sync-jira` | `/specweave sync-jira` | Sync increment to Jira epics/stories with granular control |

### Master Router Command

| Command | Description |
|---------|-------------|
| `/specweave` | Master router for all subcommands (use `/specweave <subcommand>`) |

## Smart Workflow Features (v0.2.0)

**What makes the workflow "smart"?**

1. ✅ **Auto-resume**: `/specweave do` automatically finds next incomplete task (no manual tracking)
2. ✅ **Auto-close**: `/specweave inc` auto-closes previous increment if PM gates pass (seamless)
3. ✅ **Suggest-not-force**: `/specweave inc` presents options if previous incomplete (user control)
4. ✅ **Progress visibility**: `/specweave progress` shows exactly where you are anytime
5. ✅ **Natural flow**: finish → start next without administrative overhead

## Typical Workflow

**Natural append-only workflow** (0001 → 0002 → 0003):

```bash
# 1. Initialize project (CLI, before any AI session)
npx specweave init my-saas

# 2. Plan your first increment (PM-led planning)
/specweave inc "AI-powered customer support chatbot"
# PM creates: spec.md + plan.md + tasks.md (auto-generated!) + tests.md

# 3. Build it (smart resume)
/specweave do
# Auto-resumes from next incomplete task
# Hooks run after EVERY task completion

# 4. Check progress anytime
/specweave progress
# Shows: 5/12 tasks (42%), next: T006, PM gates status

# 5. Continue building
/specweave do
# Picks up where you left off automatically

# 6. Start next feature (auto-closes previous!)
/specweave inc "real-time chat dashboard"
# Smart check:
#   If 0001 complete (PM gates pass) → Auto-close, create 0002
#   If 0001 incomplete → Present options (never forces)

# 7. Keep building
/specweave do
# Auto-finds active increment 0002

# Repeat: /specweave inc → /specweave do → /specweave progress → ...
```

## Namespaced Commands (Brownfield Safety)

**Design decision**: All commands prefixed with `specweave-` for collision avoidance.

- ✅ No conflicts with existing project commands
- ✅ Clear ownership (framework vs. project commands)
- ✅ Use master router `/specweave` for convenience
- ✅ Brownfield projects can adopt SpecWeave without risk

**Most used workflow**:
```bash
/specweave inc "feature"     # ← Create new increment
/specweave do             # ← Execute work
/specweave progress          # ← Check status
/specweave next              # ← Smart transition to next work
```

## Command Design Philosophy

### 1. Natural Flow Without Overhead

**Problem with traditional workflows**:
- Manual task tracking ("which task am I on?")
- Manual closure ("do I need to close this?")
- Administrative overhead ("update project board")

**SpecWeave solution**:
- `/do` auto-resumes (no tracking needed)
- `/inc` auto-closes if ready (no manual /done needed)
- `/progress` shows status anytime (no board updates)

### 2. Suggest, Never Force

**Critical principle**: User always in control.

**Example**: When starting new increment while previous incomplete:
```
/inc "new feature"

📊 Checking previous increment 0001-authentication...
   Status: in-progress
   PM Gates: ❌ 2 P1 tasks remaining

❌ Cannot auto-close 0001 (incomplete)

Options:
  A) Complete 0001 first (recommended)
     → Finish remaining work before starting new

  B) Move incomplete tasks to 0002
     → Transfer T006, T007 to new increment
     → Close 0001 as "completed with deferrals"

  C) Cancel new increment
     → Stay on 0001, continue working
     → Retry /inc when ready

Your choice? _
```

**Never**: "Auto-closed 0001 with incomplete work" (surprising, loses context)

### 3. Progressive Disclosure

**Only show complexity when needed**:
- ✅ Happy path: `/inc` → Auto-close, create new (1 step)
- ⚠️ Issues found: Show options, explain, let user decide

## Installation

Commands are automatically installed when you:
- Run `specweave init` (new projects)
- Install SpecWeave as dependency (`npm install specweave --save-dev`)

For manual installation:
```bash
npm run install:commands
```

## Creating Custom Commands

You can create project-specific commands:

**1. Create `.claude/commands/custom.md`**:
```markdown
---
name: custom
description: Your custom command description
---

# Custom Command

[Your command implementation]
```

**2. Use it**:
```bash
/custom
```

## Documentation

- **Command Reference**: See `.claude/commands/` for all command implementations
- **CLAUDE.md**: Quick reference table with all commands
- **Official Docs**: https://spec-weave.com/docs/commands

---

**💡 Pro Tip**: Master the smart workflow - natural append-only progression!

**Core cycle**: `/inc` (plan) → `/do` (implement) → `/progress` (check) → `/inc` (next)

**One alias to rule them all**: `/inc` (short for `/increment`)
