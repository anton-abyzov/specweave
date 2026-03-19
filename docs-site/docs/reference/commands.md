---
sidebar_position: 2
title: Commands Reference
description: Complete reference for all SpecWeave slash commands
---

import CommandTabs from '@site/src/components/CommandTabs';

# Commands Reference

This page lists all SpecWeave commands organized by purpose. Every command can be invoked three ways:

1. **Natural language** -- just describe what you want (easiest)
2. **Slash command** -- `sw:name` in Claude Code (precise)
3. **Keyword** -- type `name` without prefix in Cursor, Copilot, and other AI tools

:::info Commands vs Skills
**Commands** are action-oriented (`sw:do`, `sw:done`) while **Skills** provide domain expertise (`sw:pm`, `sw:architect`). Both support all three invocation methods.

For domain expertise, see [Skills Reference](./skills).
:::

## Quick Reference Card

| Natural Language | Claude Code | Other AI | Purpose |
|-----------------|-------------|----------|---------|
| "let's build X" | `sw:increment "X"` | `increment "X"` | Start new work |
| "ship while I sleep" | `sw:auto` | `auto` | Run autonomously (hours!) |
| "what's the status?" | `sw:progress` | `progress` | Check status |
| "review my work" | `sw:grill 0007` | `grill 0007` | Code review (MANDATORY) |
| "what's next?" | `sw:next` | `next` | Complete and suggest next |

---

## 1. Planning Commands

Start new work and create specifications.

| Natural Language | Claude Code | Other AI | Purpose |
|-----------------|-------------|----------|---------|
| "let's build X", "I want to create X", "add feature X" | `sw:increment "X"` | `increment "X"` | Create new increment |
| "what's in progress?" | `sw:status` | `status` | View/manage backlog |

### sw:increment

**The entry point for all new work.**

<CommandTabs
  natural="I want to build user authentication with JWT"
  claude='sw:increment "User authentication with JWT"'
  other='increment "User authentication with JWT"'
/>

```bash
# With options
sw:increment "Payment processing" --priority high
```

**What happens:**
1. Tech stack detection (React, Node, etc.)
2. PM-led spec creation (spec.md)
3. Architecture planning (plan.md)
4. Task breakdown (tasks.md)
5. Strategic agent review (Architect, Security, QA)

**Output:** Creates `.specweave/increments/XXXX-feature-name/` with all files.

---

## 2. Execution Commands

Execute tasks and implement features.

| Natural Language | Claude Code | Other AI | Purpose |
|-----------------|-------------|----------|---------|
| "ship while I sleep", "autonomous mode" | `sw:auto` | `auto` | Hands-free work (hours) |
| "start implementing", "execute tasks" | `sw:do` | `do` | Manual task execution |
| "parallel agents" | `sw:auto-parallel` | `auto-parallel` | Multi-agent parallel |
| "check auto progress" | `sw:auto-status` | `auto-status` | Monitoring |
| "stop auto mode" | `sw:cancel-auto` | `cancel-auto` | Emergency stop |

### sw:auto

**Ship features while you sleep.** The flagship command.

<CommandTabs
  natural="Ship it while I sleep"
  claude="sw:auto"
  other="auto"
/>

```bash
sw:auto --tdd     # With TDD enforcement
```

**What it does:**
- Reads next task from tasks.md
- Implements the code
- Runs tests
- If tests fail: analyzes, fixes, retries (max 3)
- If tests pass: marks complete, moves to next
- Syncs to GitHub/JIRA (if enabled)
- Updates living documentation

**Stop conditions:**
- All tasks complete + all tests passing
- Max iterations reached (default: 2500)
- 3 consecutive test failures → pauses for human

**Duration:** Proven for 2-3 hour continuous sessions.

### sw:do

**Manual task-by-task execution.**

<CommandTabs
  natural="Start implementing the tasks"
  claude="sw:do"
  other="do"
/>

```bash
sw:do 0007   # Specific increment
```

**When to use:**
- Architecture decisions requiring human judgment
- Debugging complex issues
- Learning the codebase
- Exploratory work

### sw:auto-parallel

**Multi-agent parallel execution in isolated git worktrees.**

<CommandTabs
  natural="Build this with parallel agents"
  claude="sw:auto-parallel"
  other="auto-parallel"
/>

**Spawns specialized agents:**
- Frontend Agent (React, Vue)
- Backend Agent (API, database)
- Database Agent (migrations, queries)
- DevOps Agent (CI/CD, infra)
- QA Agent (tests, validation)

Each works in its own worktree - no merge conflicts during execution.

### sw:auto-status

**Check autonomous execution progress from another terminal.**

<CommandTabs
  natural="Check auto mode progress"
  claude="sw:auto-status"
  other="auto-status"
/>

Shows: Current task, completion percentage, recent activity, errors.

### sw:cancel-auto

**Emergency stop for autonomous execution.**

<CommandTabs
  natural="Stop auto mode"
  claude="sw:cancel-auto"
  other="cancel-auto"
/>

:::warning Use Sparingly
Only use if auto mode is stuck or producing bad results. Normal completion happens automatically.
:::

---

## 3. Monitoring Commands

Track progress and status.

| Natural Language | Claude Code | Other AI | Purpose |
|-----------------|-------------|----------|---------|
| "what's the status?", "show progress" | `sw:progress` | `progress` | Detailed progress report |
| "list all increments" | `sw:status` | `status` | List all increments |
| "show background jobs", "check jobs" | `sw:jobs` | `jobs` | View background jobs |

### sw:progress

**Detailed progress for an increment.**

<CommandTabs
  natural="How far along are we?"
  claude="sw:progress"
  other="progress"
/>

```bash
sw:progress 0007    # Specific increment
```

**Shows:**
- Task completion (e.g., 12/15 tasks, 80%)
- Time tracking (started, elapsed)
- Current phase (planning, implementing, testing)
- Upcoming tasks
- Blockers (if any)

### sw:status

**Overview of all increments.**

```bash
sw:status    # List all increments
```

**Shows:**
- Active increments
- Paused increments
- Recently completed
- Abandoned (in _abandoned/)

---

## 4. Quality Commands

Validate quality before completion.

| Natural Language | Claude Code | Other AI | Purpose |
|-----------------|-------------|----------|---------|
| "check quality", "validate it" | `sw:validate` | `validate` | Rule-based validation (120+ checks) |
| "quality check", "assess quality" | `sw:qa` | `qa` | AI quality assessment |
| "review my work", "critique the code" | `sw:grill` | `grill` | Implementation audit |

### sw:validate

**Fast rule-based validation.**

<CommandTabs
  natural="Validate the increment"
  claude="sw:validate 0007"
  other="validate 0007"
/>

```bash
sw:validate 0007 --quality    # Include AI assessment
```

**Checks:**
- Spec consistency (AC-IDs match)
- Task completeness
- Traceability (tasks → specs)
- File structure

### sw:qa

**AI-powered quality gate using LLM-as-Judge pattern.**

<CommandTabs
  natural="Assess the quality of this increment"
  claude="sw:qa 0007 --gate"
  other="qa 0007 --gate"
/>

```bash
sw:qa 0007 --pre    # Pre-implementation check
```

**Returns:** 🟢 PASS | 🟡 CONCERNS | 🔴 FAIL

**Evaluates 7 dimensions:**
1. Clarity (18%)
2. Testability (22%)
3. Completeness (18%)
4. Feasibility (13%)
5. Maintainability (9%)
6. Edge Cases (9%)
7. Risk (11%) - BMAD P×I scoring

### sw:grill

**Comprehensive implementation audit.**

<CommandTabs
  natural="Review my implementation for issues"
  claude="sw:grill 0007"
  other="grill 0007"
/>

```bash
sw:grill src/auth           # Specific module
sw:grill --focus security   # Focus area
sw:grill --full             # Maximum depth
```

**Uses parallel subagents to audit:**
- Structure and organization
- Code quality patterns
- Consistency across codebase
- Documentation completeness
- Dependency health
- Test coverage
- Security vulnerabilities

---

## 5. Completion Commands

Finish work and move on.

| Natural Language | Claude Code | Other AI | Purpose |
|-----------------|-------------|----------|---------|
| "what's next?" | `sw:next` | `next` | Complete + suggest next (recommended) |
| "we're done", "close it", "finish up" | `sw:done` | `done` | Close increment |

### sw:next

**Smart workflow transition.** (Recommended)

<CommandTabs
  natural="What should I work on next?"
  claude="sw:next"
  other="next"
/>

**What it does:**
1. Validates quality gates
2. Closes increment (moves to _archive/)
3. Suggests next work (from backlog or new)

### sw:done

**Close specific increment.**

<CommandTabs
  natural="We're done with this increment"
  claude="sw:done 0007"
  other="done 0007"
/>

**Prerequisites:**
- `sw:grill` must pass first (creates marker file)

**Validations:**
- All P1 tasks must be complete
- Tests must pass
- Acceptance criteria must be met
- Grill marker file exists

:::warning Grill Required
`sw:done` is BLOCKED if `sw:grill` hasn't passed. Run `sw:grill 0007` first.
:::

:::tip Use sw:next
`sw:next` does everything `sw:done` does, plus suggests what to work on next.
:::

---

## 6. State Management Commands

Control increment lifecycle.

| Natural Language | Claude Code | Other AI | Purpose |
|-----------------|-------------|----------|---------|
| "pause this", "put on hold" | `sw:pause 0007` | `pause 0007` | Pause increment |
| "resume work", "continue where we left off" | `sw:resume 0007` | `resume 0007` | Resume paused / reopen completed |
| "abandon this", "cancel increment" | `sw:abandon 0007` | `abandon 0007` | Abandon increment |
| "restore the abandoned increment" | `sw:restore 0007` | `restore 0007` | Restore abandoned |
| "archive the increment" | `sw:archive 0007` | `archive 0007` | Manual archive |

### sw:pause

**Pause active increment.**

<CommandTabs
  natural="Pause this work for now"
  claude="sw:pause 0007"
  other="pause 0007"
/>

Moves to `_paused/` folder. Resume with `sw:resume`.

### sw:resume

**Resume paused increment.**

<CommandTabs
  natural="Resume where we left off"
  claude="sw:resume 0007"
  other="resume 0007"
/>

### sw:abandon

**Abandon increment (soft delete).**

<CommandTabs
  natural="Cancel this increment"
  claude="sw:abandon 0007"
  other="abandon 0007"
/>

Can be restored with `sw:restore`.

---

## 7. External Sync Commands

Integrate with GitHub, JIRA, Azure DevOps.

| Command | Plugin | Purpose |
|---------|--------|---------|
| `sw-github:sync` | sw-github | Sync to GitHub Issues |
| `sw-jira:sync` | sw-jira | Sync to JIRA |
| `sw-ado:sync` | sw-ado | Sync to Azure DevOps |

### sw-github:sync

**Two-way sync with GitHub Issues.**

```bash
sw-github:sync 0007              # Sync increment
sw-github:sync 0007 --dry-run    # Preview changes
```

**Maps:**
- Feature → GitHub Milestone
- User Story → GitHub Issue
- Task → Issue checkbox

**Requires:** `gh` CLI authenticated, config enabled.

### sw-jira:sync

**Bidirectional JIRA sync.**

```bash
sw-jira:sync 0007    # Sync to JIRA
```

**Maps:**
- Feature → JIRA Epic
- User Story → JIRA Story
- Task → Sub-task

### sw-ado:sync

**Azure DevOps sync.**

```bash
sw-ado:sync 0007    # Sync to Azure DevOps
```

---

## 8. Documentation Commands

Sync and manage documentation.

| Natural Language | Claude Code | Other AI | Purpose |
|-----------------|-------------|----------|---------|
| "update the docs", "sync documentation" | `sw:sync-docs` | `sync-docs` | Sync living docs |
| "sync specs" | `sw:sync-specs` | `sync-specs` | Sync specs only |
| "import issues" | `sw:import` | `import` | Import external issues |
| "load auth context" | `sw:docs auth` | `docs auth` | Load project context |

### sw:sync-docs

**Synchronize living documentation.**

<CommandTabs
  natural="Update the documentation"
  claude="sw:sync-docs"
  other="sync-docs"
/>

Syncs: ADRs, specs, runbooks to external systems.

### sw:docs

**Load relevant project context.**

```bash
sw:docs auth        # Load auth-related docs
sw:docs database    # Load DB architecture
```

---

## 9. Utility Commands

Maintenance and diagnostics.

| Natural Language | Claude Code | Other AI | Purpose |
|-----------------|-------------|----------|---------|
| "save my work" | `sw:save` | `save` | Git commit current work |
| "fix duplicate IDs" | `sw:fix-duplicates` | `fix-duplicates` | Fix ID collisions |
| "check hooks" | `sw:check-hooks` | `check-hooks` | Verify hook setup |
| "review learnings" | `sw:reflect` | `reflect` | Review learnings |
| "show analytics" | `sw:analytics` | `analytics` | Usage analytics |

### sw:save

**Commit current work with proper message.**

```bash
sw:save    # Git add + commit
```

Scans for nested repositories and commits each appropriately.

### sw:fix-duplicates

**Fix increment ID collisions.**

```bash
sw:fix-duplicates    # Scan and fix
```

---

## 10. TDD Commands

Test-Driven Development workflow.

| Natural Language | Claude Code | Other AI | TDD Phase |
|-----------------|-------------|----------|-----------|
| "write failing tests first" | `sw:tdd-red` | `tdd-red` | RED |
| "make the tests pass" | `sw:tdd-green` | `tdd-green` | GREEN |
| "refactor the code" | `sw:tdd-refactor` | `tdd-refactor` | REFACTOR |
| "TDD", "test-driven development" | `sw:tdd-cycle` | `tdd-cycle` | All |

### sw:tdd-cycle

**Complete TDD workflow.**

<CommandTabs
  natural="Let's do test-driven development"
  claude="sw:tdd-cycle"
  other="tdd-cycle"
/>

**Enforces:**
1. Write failing test first
2. Verify test fails for right reason
3. Write minimal code to pass
4. Verify test passes
5. Refactor without breaking tests

---

## CLI Commands (Terminal)

Commands run directly in terminal (not slash commands).

| Command | Purpose |
|---------|---------|
| `specweave init .` | Initialize project |
| `specweave update` | Full update (CLI + plugins + instructions) |
| `specweave refresh-plugins` | Plugin-only refresh |
| `specweave lsp refs Symbol` | Find references (LSP workaround) |
| `specweave lsp def Symbol` | Go to definition |

### specweave init

**Initialize SpecWeave in a project.**

```bash
specweave init .              # Current directory
specweave init ./my-project   # Specific directory
```

Creates `.specweave/` folder with config and initial increment.

### specweave update

**Update everything.**

```bash
specweave update              # Full update
specweave update --no-plugins # Skip plugin refresh
```

Updates: CLI version, plugins, CLAUDE.md instructions.

### specweave lsp

**Code navigation (workaround for Claude Code v2.1.0+ LSP bug).**

```bash
specweave lsp refs MyFunction       # Find references
specweave lsp def MyClass           # Go to definition
specweave lsp hover file.ts 42 10   # Type at position
```

---

## Command Cheat Sheet

### Daily Workflow

| Step | Natural Language | Claude Code | Other AI |
|------|-----------------|-------------|----------|
| Start new feature | "Build a user dashboard" | `sw:increment "Add user dashboard"` | `increment "Add user dashboard"` |
| Autonomous execution | "Ship while I sleep" | `sw:auto` | `auto` |
| Check progress | "How far along?" | `sw:auto-status` | `auto-status` |
| Complete and move on | "What's next?" | `sw:next` | `next` |

### Quality Check Before Release

| Step | Natural Language | Claude Code | Other AI |
|------|-----------------|-------------|----------|
| Quick validation | "Validate it" | `sw:validate 0007` | `validate 0007` |
| AI quality gate | "Assess quality" | `sw:qa 0007 --gate` | `qa 0007 --gate` |
| Deep code audit | "Review the code" | `sw:grill 0007` | `grill 0007` |

### Sync to External Tools

| Platform | Claude Code | Other AI |
|----------|-------------|----------|
| GitHub | `sw-github:sync 0007` | `github-sync 0007` |
| JIRA | `sw-jira:sync 0007` | `jira-sync 0007` |
| Azure DevOps | `sw-ado:sync 0007` | `ado-sync 0007` |

### State Management

| Action | Natural Language | Claude Code | Other AI |
|--------|-----------------|-------------|----------|
| Pause | "Put this on hold" | `sw:pause 0007` | `pause 0007` |
| Resume | "Continue working" | `sw:resume 0007` | `resume 0007` |
| Abandon | "Cancel this" | `sw:abandon 0007` | `abandon 0007` |
| Restore | "Bring it back" | `sw:restore 0007` | `restore 0007` |

---

## Next Steps

- [Skills Reference](./skills) - Domain expertise skills
- [Auto Mode Deep Dive](/docs/commands/auto) - Autonomous execution details
- [Quick Start](/docs/getting-started) - Get started in 5 minutes
