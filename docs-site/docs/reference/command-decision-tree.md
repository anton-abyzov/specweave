---
sidebar_position: 1
title: Command Decision Tree
description: Know exactly which SpecWeave command to use in any situation
---

# SpecWeave Command Decision Tree

**Quick guide**: Find the right command for your situation.

---

## Quick Reference Card

| I want to... | Command |
|--------------|---------|
| Start new feature | `/sw:increment "feature name"` |
| Implement current feature | `/sw:do` |
| See what's in progress | `/sw:progress` |
| Code review before close | `/sw:grill 0001` **(mandatory!)** |
| Complete an increment | `/sw:done 0001` (requires grill) |
| Pause for other work | `/sw:pause 0001` |
| Resume paused work | `/sw:resume 0001` |
| Validate before closing | `/sw:validate 0001` |
| Sync to GitHub/JIRA | `/sw:sync-progress` |
| Save and push changes | `/sw:save` |

---

## Decision Flowcharts

### "What should I do next?"

```mermaid
flowchart TD
    A[What's my situation?] --> B{Have active increment?}
    B -->|No| C[/sw:increment]
    B -->|Yes| D{Is it complete?}
    D -->|Yes| E[/sw:done]
    D -->|No| F{Am I blocked?}
    F -->|Yes, temporarily| G[/sw:pause]
    F -->|Yes, deprioritized| H[/sw:backlog]
    F -->|No| I[/sw:do]
```

### "I finished my task"

```mermaid
flowchart TD
    A[Task complete] --> B{All tasks done?}
    B -->|No| C[Continue with /sw:do]
    B -->|Yes| D[/sw:validate]
    D --> E{Validation passed?}
    E -->|Yes| F[/sw:grill]
    F --> G{Grill passed?}
    G -->|Yes| H[/sw:done]
    G -->|No| I[Fix issues, run grill again]
    E -->|No| J[Fix issues, then validate again]
```

---

## By Scenario

### Starting Work

| Scenario | Command | Notes |
|----------|---------|-------|
| New feature | `/sw:increment "feature name"` | Creates spec, plan, tasks |
| New bug fix | `/sw:increment "fix: bug description"` | Use `fix:` prefix |
| New experiment | `/sw:increment "experiment: idea"` | Use `experiment:` prefix |
| Resume from backlog | `/sw:resume 0001` | Picks up where you left off |

### During Implementation

| Scenario | Command | Notes |
|----------|---------|-------|
| Implement tasks | `/sw:do` | Autonomous implementation |
| Check progress | `/sw:progress` | Shows task completion |
| View current status | `/sw:status` | Shows all increments |
| Run quality check | `/sw:qa` | AI quality assessment |

### Pausing Work

| Scenario | Command | Notes |
|----------|---------|-------|
| Temporarily blocked | `/sw:pause 0001` | External dependency, will resume |
| Deprioritized | `/sw:backlog 0001` | Not abandoned, just later |
| Feature canceled | `/sw:abandon 0001` | Won't continue this work |

### Completing Work

| Scenario | Command | Notes |
|----------|---------|-------|
| Validate before closing | `/sw:validate 0001` | Checks tasks, tests, docs |
| Code review before close | `/sw:grill 0001` | **MANDATORY** - blocks /sw:done |
| Close with PM review | `/sw:done 0001` | Requires grill to pass first |
| Move to next increment | `/sw:next` | Auto-close current, suggest next |

### Syncing & Saving

| Scenario | Command | Notes |
|----------|---------|-------|
| Sync to external tools | `/sw:sync-progress` | GitHub/JIRA/ADO |
| Update living docs | `/sw:sync-docs` | Bidirectional sync |
| Save and push to git | `/sw:save` | Commits and pushes |

---

## Command Categories

### Lifecycle Commands

```
Start     →  /sw:increment
Implement →  /sw:do
Validate  →  /sw:validate
Review    →  /sw:grill (mandatory!)
Complete  →  /sw:done
```

### Status Management

```
Pause      →  /sw:pause    (temporary block)
Backlog    →  /sw:backlog  (deprioritized)
Resume     →  /sw:resume   (continue work)
Abandon    →  /sw:abandon  (cancel)
Reopen     →  /sw:reopen   (needs more work)
```

### Visibility

```
Progress   →  /sw:progress   (task completion)
Status     →  /sw:status     (all increments)
```

### Synchronization

```
Sync All       →  /sw:sync-progress   (tasks → docs → external)
Sync Docs      →  /sw:sync-docs       (living docs)
Sync Tasks     →  /sw:sync-tasks      (external → tasks.md)
```

### Quality

```
Validate   →  /sw:validate   (rule-based)
QA         →  /sw:qa         (AI spec assessment)
Grill      →  /sw:grill      (code review - MANDATORY before close!)
Judge-LLM  →  /sw:judge-llm  (ultrathink code validation)
```

---

## Common Workflows

### Basic Feature Workflow

```bash
# 1. Plan the feature
/sw:increment "User authentication"

# 2. Implement it
/sw:do

# 3. Check progress periodically
/sw:progress

# 4. Validate when tasks complete
/sw:validate 0001

# 5. Code review (mandatory!)
/sw:grill 0001

# 6. Close when ready
/sw:done 0001
```

### Handling Interruptions

```bash
# Working on feature A
/sw:do

# Urgent bug comes in
/sw:pause 0001

# Fix the bug
/sw:increment "fix: critical login bug"
/sw:do
/sw:done 0002

# Resume feature A
/sw:resume 0001
/sw:do
```

### Team Handoff

```bash
# Before handoff: validate and sync
/sw:validate 0001
/sw:sync-progress

# Handoff to teammate with clean state
# They can see progress in GitHub/JIRA
```

### End of Day

```bash
# Sync all progress
/sw:sync-progress

# Save and push
/sw:save
```

---

## When Things Go Wrong

### Increment Needs More Work (Closed Too Early)

```bash
/sw:reopen 0001
# Continue work
/sw:do
/sw:done 0001
```

### Wrong Increment Active

```bash
# Check what's active
/sw:status

# Switch to correct one
/sw:pause 0001    # Pause wrong one
/sw:resume 0002   # Resume correct one
```

### Sync Failed

```bash
# Check sync status
/sw-github:status

# Force sync
/sw:sync-progress
```

### Validation Fails

```bash
# See what failed
/sw:validate 0001

# Common issues:
# - Tasks not complete → mark tasks done
# - Tests not passing → fix tests
# - Docs not updated → run /sw:sync-docs
```

---

## Platform-Specific Commands

### GitHub

```bash
/sw-github:sync       # Sync increment
/sw-github:create     # Create issue
/sw-github:close      # Close issue
/sw-github:status     # Check status
```

### JIRA

```bash
/sw-jira:sync         # Sync increment
/sw-jira:import-projects        # Import JIRA projects
```

### Azure DevOps

```bash
/sw-ado:sync           # Sync increment
/sw-ado:create         # Create work item
/sw-ado:status         # Check status
```

---

## Command Cheat Sheet

### Most Used (Daily)

| Command | Shortcut | Purpose |
|---------|----------|---------|
| `/sw:increment` | - | Start new work |
| `/sw:do` | - | Implement tasks |
| `/sw:progress` | - | Check completion |
| `/sw:done` | - | Complete increment |
| `/sw:save` | - | Commit and push |

### Frequent (Weekly)

| Command | Purpose |
|---------|---------|
| `/sw:pause` | Temporarily stop |
| `/sw:resume` | Continue paused |
| `/sw:validate` | Pre-close check |
| `/sw:sync-progress` | Sync external tools |

### Occasional (As Needed)

| Command | Purpose |
|---------|---------|
| `/sw:backlog` | Deprioritize |
| `/sw:abandon` | Cancel work |
| `/sw:reopen` | Needs more work |
| `/sw:qa` | Quality assessment |

---

## Tips

1. **Start with `/sw:increment`** — Always plan before coding
2. **Use `/sw:progress` often** — Stay aware of status
3. **Validate before closing** — `/sw:validate` catches issues
4. **Always grill before done** — `/sw:grill` is mandatory for closure
5. **Sync at end of day** — `/sw:sync-progress` keeps everyone informed
6. **Save frequently** — `/sw:save` protects your work

---

## Related

- [Commands Overview](/docs/commands/overview)
- [Workflow Guide](/docs/workflows/overview)
- [Troubleshooting](/docs/guides/troubleshooting/)
