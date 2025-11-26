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
| Start new feature | `/specweave:increment "feature name"` |
| Implement current feature | `/specweave:do` |
| See what's in progress | `/specweave:progress` |
| Complete an increment | `/specweave:done 0001` |
| Pause for other work | `/specweave:pause 0001` |
| Resume paused work | `/specweave:resume 0001` |
| Validate before closing | `/specweave:validate 0001` |
| Sync to GitHub/JIRA | `/specweave:sync-progress` |
| Save and push changes | `/specweave:save` |

---

## Decision Flowcharts

### "What should I do next?"

```mermaid
flowchart TD
    A[What's my situation?] --> B{Have active increment?}
    B -->|No| C[/specweave:increment]
    B -->|Yes| D{Is it complete?}
    D -->|Yes| E[/specweave:done]
    D -->|No| F{Am I blocked?}
    F -->|Yes, temporarily| G[/specweave:pause]
    F -->|Yes, deprioritized| H[/specweave:backlog]
    F -->|No| I[/specweave:do]
```

### "I finished my task"

```mermaid
flowchart TD
    A[Task complete] --> B{All tasks done?}
    B -->|No| C[Continue with /specweave:do]
    B -->|Yes| D[/specweave:validate]
    D --> E{Validation passed?}
    E -->|Yes| F[/specweave:done]
    E -->|No| G[Fix issues, then validate again]
```

---

## By Scenario

### Starting Work

| Scenario | Command | Notes |
|----------|---------|-------|
| New feature | `/specweave:increment "feature name"` | Creates spec, plan, tasks |
| New bug fix | `/specweave:increment "fix: bug description"` | Use `fix:` prefix |
| New experiment | `/specweave:increment "experiment: idea"` | Use `experiment:` prefix |
| Resume from backlog | `/specweave:resume 0001` | Picks up where you left off |

### During Implementation

| Scenario | Command | Notes |
|----------|---------|-------|
| Implement tasks | `/specweave:do` | Autonomous implementation |
| Check progress | `/specweave:progress` | Shows task completion |
| View current status | `/specweave:status` | Shows all increments |
| Run quality check | `/specweave:qa` | AI quality assessment |

### Pausing Work

| Scenario | Command | Notes |
|----------|---------|-------|
| Temporarily blocked | `/specweave:pause 0001` | External dependency, will resume |
| Deprioritized | `/specweave:backlog 0001` | Not abandoned, just later |
| Feature canceled | `/specweave:abandon 0001` | Won't continue this work |

### Completing Work

| Scenario | Command | Notes |
|----------|---------|-------|
| Validate before closing | `/specweave:validate 0001` | Checks tasks, tests, docs |
| Close with PM review | `/specweave:done 0001` | 3-gate validation |
| Move to next increment | `/specweave:next` | Auto-close current, suggest next |

### Syncing & Saving

| Scenario | Command | Notes |
|----------|---------|-------|
| Sync to external tools | `/specweave:sync-progress` | GitHub/JIRA/ADO |
| Update living docs | `/specweave:sync-docs` | Bidirectional sync |
| Save and push to git | `/specweave:save` | Commits and pushes |

---

## Command Categories

### Lifecycle Commands

```
Start     →  /specweave:increment
Implement →  /specweave:do
Validate  →  /specweave:validate
Complete  →  /specweave:done
```

### Status Management

```
Pause      →  /specweave:pause    (temporary block)
Backlog    →  /specweave:backlog  (deprioritized)
Resume     →  /specweave:resume   (continue work)
Abandon    →  /specweave:abandon  (cancel)
Reopen     →  /specweave:reopen   (needs more work)
```

### Visibility

```
Progress   →  /specweave:progress   (task completion)
Status     →  /specweave:status     (all increments)
Workflow   →  /specweave:workflow   (next steps)
```

### Synchronization

```
Sync All       →  /specweave:sync-progress   (tasks → docs → external)
Sync Docs      →  /specweave:sync-docs       (living docs)
Sync Tasks     →  /specweave:sync-tasks      (external → tasks.md)
Sync ACs       →  /specweave:sync-acs        (acceptance criteria)
```

### Quality

```
Validate   →  /specweave:validate   (rule-based)
QA         →  /specweave:qa         (AI assessment)
Check Tests →  /specweave:check-tests (test coverage)
```

---

## Common Workflows

### Basic Feature Workflow

```bash
# 1. Plan the feature
/specweave:increment "User authentication"

# 2. Implement it
/specweave:do

# 3. Check progress periodically
/specweave:progress

# 4. Validate when tasks complete
/specweave:validate 0001

# 5. Close when ready
/specweave:done 0001
```

### Handling Interruptions

```bash
# Working on feature A
/specweave:do

# Urgent bug comes in
/specweave:pause 0001

# Fix the bug
/specweave:increment "fix: critical login bug"
/specweave:do
/specweave:done 0002

# Resume feature A
/specweave:resume 0001
/specweave:do
```

### Team Handoff

```bash
# Before handoff: validate and sync
/specweave:validate 0001
/specweave:sync-progress

# Handoff to teammate with clean state
# They can see progress in GitHub/JIRA
```

### End of Day

```bash
# Sync all progress
/specweave:sync-progress

# Save and push
/specweave:save
```

---

## When Things Go Wrong

### Increment Needs More Work (Closed Too Early)

```bash
/specweave:reopen 0001
# Continue work
/specweave:do
/specweave:done 0001
```

### Wrong Increment Active

```bash
# Check what's active
/specweave:status

# Switch to correct one
/specweave:pause 0001    # Pause wrong one
/specweave:resume 0002   # Resume correct one
```

### Sync Failed

```bash
# Check sync status
/specweave-github:specweave-github-status

# Force sync
/specweave:sync-progress
```

### Validation Fails

```bash
# See what failed
/specweave:validate 0001

# Common issues:
# - Tasks not complete → mark tasks done
# - Tests not passing → fix tests
# - Docs not updated → run /specweave:sync-docs
```

---

## Platform-Specific Commands

### GitHub

```bash
/specweave-github:specweave-github-sync       # Sync increment
/specweave-github:specweave-github-create-issue  # Create issue
/specweave-github:specweave-github-close-issue   # Close issue
/specweave-github:specweave-github-status        # Check status
```

### JIRA

```bash
/specweave-jira:specweave-jira-sync    # Sync increment
/specweave-jira:import-projects        # Import JIRA projects
```

### Azure DevOps

```bash
/specweave-ado:specweave-ado-sync           # Sync increment
/specweave-ado:specweave-ado-create-workitem  # Create work item
/specweave-ado:specweave-ado-status           # Check status
```

---

## Command Cheat Sheet

### Most Used (Daily)

| Command | Shortcut | Purpose |
|---------|----------|---------|
| `/specweave:increment` | - | Start new work |
| `/specweave:do` | - | Implement tasks |
| `/specweave:progress` | - | Check completion |
| `/specweave:done` | - | Complete increment |
| `/specweave:save` | - | Commit and push |

### Frequent (Weekly)

| Command | Purpose |
|---------|---------|
| `/specweave:pause` | Temporarily stop |
| `/specweave:resume` | Continue paused |
| `/specweave:validate` | Pre-close check |
| `/specweave:sync-progress` | Sync external tools |

### Occasional (As Needed)

| Command | Purpose |
|---------|---------|
| `/specweave:backlog` | Deprioritize |
| `/specweave:abandon` | Cancel work |
| `/specweave:reopen` | Needs more work |
| `/specweave:qa` | Quality assessment |

---

## Tips

1. **Start with `/specweave:increment`** — Always plan before coding
2. **Use `/specweave:progress` often** — Stay aware of status
3. **Validate before closing** — `/specweave:validate` catches issues
4. **Sync at end of day** — `/specweave:sync-progress` keeps everyone informed
5. **Save frequently** — `/specweave:save` protects your work

---

## Related

- [Commands Overview](/docs/commands/overview)
- [Workflow Guide](/docs/workflows/overview)
- [Troubleshooting](/docs/guides/troubleshooting/)
