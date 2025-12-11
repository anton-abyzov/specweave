---
id: specweave-do
title: /sw:do Command
sidebar_label: specweave:do
---

# /sw:do Command

The **`/sw:do`** command is SpecWeave's primary implementation command that executes tasks from [tasks.md](/docs/glossary/terms/tasks-md) with smart auto-resume.

## What It Does

**Key actions:**
- Auto-finds active [increment](/docs/glossary/terms/increments)
- Resumes from last incomplete task
- Executes tasks sequentially
- Runs [hooks](/docs/glossary/terms/hooks) after each task
- Updates [living docs](/docs/glossary/terms/living-docs) automatically
- Syncs to external tools (GitHub, JIRA, ADO)

## Usage

```bash
# Auto-find active increment
/sw:do

# Execute specific increment
/sw:do 0007
```

## Smart Features

### Auto-Resume

The command automatically resumes from the last incomplete task:

```bash
# First session: Tasks T-001 through T-005 completed
$ /sw:do 0007

# Second session: Automatically resumes at T-006
$ /sw:do 0007
→ Resuming from T-006...
```

### Cost Optimization

Uses smaller models for simple tasks:
- **Haiku**: Simple edits, file moves (3x faster, 20x cheaper)
- **Sonnet**: Complex logic, architecture decisions
- **Opus**: Strategic planning, complex refactoring

### Hook Integration

After EVERY task completion:
1. Updates [tasks.md](/docs/glossary/terms/tasks-md) status
2. Syncs to external tools
3. Plays completion sound
4. Updates CLAUDE.md, README, CHANGELOG

## Workflow

```mermaid
graph LR
    A[/sw:do] --> B{Find Increment}
    B --> C[Load tasks.md]
    C --> D[Find Next Task]
    D --> E[Execute Task]
    E --> F[Run Hooks]
    F --> G{More Tasks?}
    G -->|Yes| D
    G -->|No| H[Complete]
```

## Related

- [tasks.md](/docs/glossary/terms/tasks-md) - Task format
- [Hooks](/docs/glossary/terms/hooks) - Automation hooks
- [Increments](/docs/glossary/terms/increments) - Work units
- [/sw:progress](/docs/glossary/terms/specweave-progress) - Check progress
- [/sw:done](/docs/glossary/terms/specweave-done) - Close increment
