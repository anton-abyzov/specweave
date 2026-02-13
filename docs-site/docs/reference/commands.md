---
sidebar_position: 2
title: Commands Reference
description: Complete reference for all SpecWeave slash commands
---

# Commands Reference

This page lists all SpecWeave slash commands organized by purpose. Commands execute specific actions in your development workflow.

:::info Commands vs Skills
**Commands** are action-oriented (`/sw:do`, `/sw:done`) while **Skills** provide domain expertise (`/sw:pm`, `/sw:architect`). Both are invoked the same way - with `/sw:name` or `/sw-plugin:name`.

For domain expertise, see [Skills Reference](./skills).
:::

## Quick Reference Card

```
PLAN → EXECUTE → MONITOR → GRILL → COMPLETE

/sw:increment "feature"    Start new work
/sw:auto                   Run autonomously (hours!)
/sw:progress               Check status
/sw:grill 0007             Code review (MANDATORY)
/sw:next                   Complete and suggest next
```

---

## 1. Planning Commands

Start new work and create specifications.

| Command | Purpose | Example |
|---------|---------|---------|
| `/sw:increment` | Create new increment | `/sw:increment "User auth with JWT"` |
| `/sw:backlog` | View/manage backlog | `/sw:backlog` |

### /sw:increment

**The entry point for all new work.**

```bash
# Basic usage
/sw:increment "User authentication with JWT"

# With options
/sw:increment "Payment processing" --priority high
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

| Command | Purpose | Best For |
|---------|---------|----------|
| `/sw:auto` | Autonomous execution | Hands-free work (hours) |
| `/sw:do` | Manual task execution | Complex decisions |
| `/sw:auto-parallel` | Multi-agent parallel | Large isolated features |
| `/sw:auto-status` | Check auto progress | Monitoring |
| `/sw:cancel-auto` | Emergency stop | Only when needed |

### /sw:auto

**Ship features while you sleep.** The flagship command.

```bash
/sw:auto           # Start autonomous execution
/sw:auto --tdd     # With TDD enforcement
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

### /sw:do

**Manual task-by-task execution.**

```bash
/sw:do        # Auto-finds active increment
/sw:do 0007   # Specific increment
```

**When to use:**
- Architecture decisions requiring human judgment
- Debugging complex issues
- Learning the codebase
- Exploratory work

### /sw:auto-parallel

**Multi-agent parallel execution in isolated git worktrees.**

```bash
/sw:auto-parallel      # Start parallel execution
```

**Spawns specialized agents:**
- Frontend Agent (React, Vue)
- Backend Agent (API, database)
- Database Agent (migrations, queries)
- DevOps Agent (CI/CD, infra)
- QA Agent (tests, validation)

Each works in its own worktree - no merge conflicts during execution.

### /sw:auto-status

**Check autonomous execution progress from another terminal.**

```bash
/sw:auto-status    # Current status
```

Shows: Current task, completion percentage, recent activity, errors.

### /sw:cancel-auto

**Emergency stop for autonomous execution.**

```bash
/sw:cancel-auto    # Stop immediately
```

:::warning Use Sparingly
Only use if auto mode is stuck or producing bad results. Normal completion happens automatically.
:::

---

## 3. Monitoring Commands

Track progress and status.

| Command | Purpose | Example |
|---------|---------|---------|
| `/sw:progress` | Detailed progress report | `/sw:progress 0007` |
| `/sw:status` | List all increments | `/sw:status` |
| `/sw:jobs` | View background jobs | `/sw:jobs` |

### /sw:progress

**Detailed progress for an increment.**

```bash
/sw:progress         # Current increment
/sw:progress 0007    # Specific increment
```

**Shows:**
- Task completion (e.g., 12/15 tasks, 80%)
- Time tracking (started, elapsed)
- Current phase (planning, implementing, testing)
- Upcoming tasks
- Blockers (if any)

### /sw:status

**Overview of all increments.**

```bash
/sw:status    # List all increments
```

**Shows:**
- Active increments
- Paused increments
- Recently completed
- Abandoned (in _abandoned/)

---

## 4. Quality Commands

Validate quality before completion.

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/sw:validate` | Rule-based validation (120+ checks) | Quick validation |
| `/sw:qa` | AI quality assessment | Before release |
| `/sw:grill` | Implementation audit | Deep code review |

### /sw:validate

**Fast rule-based validation.**

```bash
/sw:validate 0007              # Quick check
/sw:validate 0007 --quality    # Include AI assessment
```

**Checks:**
- Spec consistency (AC-IDs match)
- Task completeness
- Traceability (tasks → specs)
- File structure

### /sw:qa

**AI-powered quality gate using LLM-as-Judge pattern.**

```bash
/sw:qa 0007          # Standard assessment
/sw:qa 0007 --pre    # Pre-implementation check
/sw:qa 0007 --gate   # Full quality gate
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

### /sw:grill

**Comprehensive implementation audit.**

```bash
/sw:grill                    # Full project
/sw:grill 0007               # Specific increment
/sw:grill src/auth           # Specific module
/sw:grill --focus security   # Focus area
/sw:grill --full             # Maximum depth
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

| Command | Purpose | Recommended |
|---------|---------|-------------|
| `/sw:next` | Complete + suggest next | Yes |
| `/sw:done` | Close increment | Use `/sw:next` instead |

### /sw:next

**Smart workflow transition.** (Recommended)

```bash
/sw:next    # Complete current and suggest next
```

**What it does:**
1. Validates quality gates
2. Closes increment (moves to _archive/)
3. Suggests next work (from backlog or new)

### /sw:done

**Close specific increment.**

```bash
/sw:done 0007    # Close increment 0007
```

**Prerequisites:**
- `/sw:grill` must pass first (creates marker file)

**Validations:**
- All P1 tasks must be complete
- Tests must pass
- Acceptance criteria must be met
- Grill marker file exists

:::warning Grill Required
`/sw:done` is BLOCKED if `/sw:grill` hasn't passed. Run `/sw:grill 0007` first.
:::

:::tip Use /sw:next
`/sw:next` does everything `/sw:done` does, plus suggests what to work on next.
:::

---

## 6. State Management Commands

Control increment lifecycle.

| Command | Purpose | Example |
|---------|---------|---------|
| `/sw:pause` | Pause increment | `/sw:pause 0007` |
| `/sw:resume` | Resume paused | `/sw:resume 0007` |
| `/sw:abandon` | Abandon increment | `/sw:abandon 0007` |
| `/sw:reopen` | Reopen completed | `/sw:reopen 0007` |
| `/sw:restore` | Restore abandoned | `/sw:restore 0007` |
| `/sw:archive` | Manual archive | `/sw:archive 0007` |

### /sw:pause

**Pause active increment.**

```bash
/sw:pause 0007    # Pause for later
```

Moves to `_paused/` folder. Resume with `/sw:resume`.

### /sw:resume

**Resume paused increment.**

```bash
/sw:resume 0007   # Continue working
```

### /sw:abandon

**Abandon increment (soft delete).**

```bash
/sw:abandon 0007   # Move to _abandoned/
```

Can be restored with `/sw:restore`.

---

## 7. External Sync Commands

Integrate with GitHub, JIRA, Azure DevOps.

| Command | Plugin | Purpose |
|---------|--------|---------|
| `/sw-github:sync` | sw-github | Sync to GitHub Issues |
| `/sw-jira:sync` | sw-jira | Sync to JIRA |
| `/sw-ado:sync` | sw-ado | Sync to Azure DevOps |

### /sw-github:sync

**Two-way sync with GitHub Issues.**

```bash
/sw-github:sync 0007              # Sync increment
/sw-github:sync 0007 --dry-run    # Preview changes
```

**Maps:**
- Feature → GitHub Milestone
- User Story → GitHub Issue
- Task → Issue checkbox

**Requires:** `gh` CLI authenticated, config enabled.

### /sw-jira:sync

**Bidirectional JIRA sync.**

```bash
/sw-jira:sync 0007    # Sync to JIRA
```

**Maps:**
- Feature → JIRA Epic
- User Story → JIRA Story
- Task → Sub-task

### /sw-ado:sync

**Azure DevOps sync.**

```bash
/sw-ado:sync 0007    # Sync to Azure DevOps
```

---

## 8. Documentation Commands

Sync and manage documentation.

| Command | Purpose | Example |
|---------|---------|---------|
| `/sw:sync-docs` | Sync living docs | `/sw:sync-docs` |
| `/sw:sync-specs` | Sync specs only | `/sw:sync-specs` |
| `/sw:import-docs` | Import external docs | `/sw:import-docs` |
| `/sw:docs` | Load project context | `/sw:docs auth` |

### /sw:sync-docs

**Synchronize living documentation.**

```bash
/sw:sync-docs    # Update all docs
```

Syncs: ADRs, specs, runbooks to external systems.

### /sw:docs

**Load relevant project context.**

```bash
/sw:docs auth        # Load auth-related docs
/sw:docs database    # Load DB architecture
```

---

## 9. Utility Commands

Maintenance and diagnostics.

| Command | Purpose | Example |
|---------|---------|---------|
| `/sw:save` | Git commit current work | `/sw:save` |
| `/sw:fix-duplicates` | Fix ID collisions | `/sw:fix-duplicates` |
| `/sw:check-hooks` | Verify hook setup | `/sw:check-hooks` |
| `/sw:reflect` | Review learnings | `/sw:reflect` |
| `/sw:analytics` | Usage analytics | `/sw:analytics` |

### /sw:save

**Commit current work with proper message.**

```bash
/sw:save    # Git add + commit
```

Scans for nested repositories and commits each appropriately.

### /sw:fix-duplicates

**Fix increment ID collisions.**

```bash
/sw:fix-duplicates    # Scan and fix
```

---

## 10. TDD Commands

Test-Driven Development workflow.

| Command | Purpose | TDD Phase |
|---------|---------|-----------|
| `/sw:tdd-red` | Write failing tests | RED |
| `/sw:tdd-green` | Minimal implementation | GREEN |
| `/sw:tdd-refactor` | Improve code | REFACTOR |
| `/sw:tdd-cycle` | Full TDD workflow | All |

### /sw:tdd-cycle

**Complete TDD workflow.**

```bash
/sw:tdd-cycle    # RED → GREEN → REFACTOR
```

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
| `specweave refresh-marketplace` | Plugin-only refresh |
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

```bash
# Start new feature
/sw:increment "Add user dashboard"

# Autonomous execution (go grab coffee)
/sw:auto

# Check progress (from another terminal)
/sw:auto-status

# Complete and move on
/sw:next
```

### Quality Check Before Release

```bash
# Quick validation
/sw:validate 0007

# AI quality gate
/sw:qa 0007 --gate

# Deep code audit
/sw:grill 0007
```

### Sync to External Tools

```bash
# GitHub
/sw-github:sync 0007

# JIRA
/sw-jira:sync 0007

# Azure DevOps
/sw-ado:sync 0007
```

### State Management

```bash
# Pause/resume
/sw:pause 0007
/sw:resume 0007

# Abandon/restore
/sw:abandon 0007
/sw:restore 0007
```

---

## Next Steps

- [Skills Reference](./skills) - Domain expertise skills
- [Auto Mode Deep Dive](/docs/commands/auto) - Autonomous execution details
- [Quick Start](/docs/getting-started) - Get started in 5 minutes
