---
sidebar_position: 5
title: "06.5 Advanced Workflow Commands"
description: "Power commands for multi-repo, sync, and status management"
---

# Lesson 06.5: Advanced Workflow Commands

**Duration**: 45 minutes | **Difficulty**: Intermediate

---

## Learning Objectives

By the end of this lesson, you will understand:
- How to save and push changes across multiple repositories
- When and how to sync documentation manually
- Platform-specific sync commands (GitHub, JIRA, ADO)
- How to validate and fix status line issues

---

## The `/sw:save` Command

**Save and push changes across all repositories in one command.**

When working with multiple repositories (umbrella mode) or even a single repo, this command streamlines git operations.

### Basic Usage

```bash
# Auto-generate commit message from changes
/sw:save

# With explicit commit message
/sw:save "feat: Add menu builder feature"

# Preview what would happen
/sw:save --dry-run
```

### Auto-Generated Commit Messages

When you run `/sw:save` without a message, SpecWeave analyzes your changes:

```
📊 Analyzing changes...

Detected:
  📄 5 modified documentation files
  📁 1 new docs section (academy/)

🤖 Auto-generated commit message:

  docs(docs-site): add academy section and update documentation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

? Choose action:
  1. ✅ Use this message
  2. ✏️  Edit message
  3. 📝 Enter custom message
```

### Multi-Repo (Umbrella Mode)

For projects with multiple repositories:

```bash
/sw:save "feat: Complete user registration flow"

Scanning for repositories...
Mode: Umbrella (3 child repos)

Checking git status...

frontend:
  Status: 4 files changed
  Remote: origin -> github.com/user/frontend

backend:
  Status: 2 files changed
  Remote: origin -> github.com/user/backend

shared:
  Status: No changes (skipping)

Saving changes...

frontend:
  ✓ git add -A
  ✓ git commit -m "feat: Complete user registration flow"
  ✓ git push origin main

backend:
  ✓ git add -A
  ✓ git commit -m "feat: Complete user registration flow"
  ✓ git push origin main

Summary:
  Saved: 2/3 repositories
  Skipped: 1 (no changes)
```

### Options

| Flag | Description |
|------|-------------|
| `--dry-run` | Show what would happen |
| `--repos <list>` | Only save specific repos |
| `--skip-no-remote` | Skip repos without remotes |
| `--no-push` | Commit but don't push |
| `--yes` or `-y` | Accept auto-generated message |

---

## Documentation Sync Commands

SpecWeave keeps documentation in sync automatically via hooks, but sometimes you need manual control.

### `/sw:sync-docs`

**Full documentation sync** — updates ALL documentation areas.

```bash
# Review before implementation
/sw:sync-docs review

# Update after implementation
/sw:sync-docs update
```

What it syncs:
- ADRs (Proposed → Accepted)
- Architecture diagrams
- API documentation
- Feature documentation
- User stories

### `/sw:sync-specs`

**Specs-only sync** — just user stories and features.

```bash
# Sync current increment
/sw:sync-specs

# Sync specific increment
/sw:sync-specs 0042

# Preview changes
/sw:sync-specs 0042 --dry-run
```

**When to use which**:

| Command | Use When |
|---------|----------|
| `/sw:sync-docs` | Full documentation update needed |
| `/sw:sync-specs` | Only user stories/features changed |

---

## Platform-Specific Sync Commands

SpecWeave provides **git-style commands** for external tool synchronization.

### Git-Style Commands (Recommended)

Just like `git pull` and `git push`, SpecWeave has simple commands:

| Command | Purpose |
|---------|---------|
| `/sw-ado:pull` | Pull changes from ADO (like `git pull`) |
| `/sw-ado:push` | Push progress to ADO (like `git push`) |
| `/sw-github:pull` | Pull changes from GitHub |
| `/sw-github:push` | Push progress to GitHub |
| `/sw-jira:pull` | Pull changes from Jira |
| `/sw-jira:push` | Push progress to Jira |

### GitHub Sync

```bash
# Git-style commands (recommended)
/sw-github:pull              # Pull changes from GitHub
/sw-github:push              # Push progress to GitHub
/sw-github:pull --all        # Pull ALL specs across projects

# Other commands
/sw-github:status            # Check connection
/sw-github:sync 0042         # Two-way sync (pull + push)
/sw-github:create 0042       # Create GitHub issue
/sw-github:close 0042        # Close GitHub issue
```

### JIRA Sync

```bash
# Git-style commands (recommended)
/sw-jira:pull                # Pull changes from Jira
/sw-jira:push                # Push progress to Jira
/sw-jira:pull --all          # Pull ALL specs

# Other commands
/sw-jira:status              # Check connection
/sw-jira:sync 0042           # Two-way sync
```

### Azure DevOps Sync

```bash
# Git-style commands (recommended)
/sw-ado:pull                 # Pull changes from ADO
/sw-ado:push                 # Push progress to ADO
/sw-ado:pull --all           # Pull ALL specs across projects
/sw-ado:pull --project xyz   # Pull specific project only

# Other commands
/sw-ado:status               # Check connection
/sw-ado:sync 0042            # Two-way sync
/sw-ado:create 0042          # Create ADO work item
/sw-ado:close 0042           # Close work item
```

### Sync Brief Output

After every sync operation, you'll see a brief summary:

```
┌─────────────────────────────────────────────────────────┐
│  PULL COMPLETE                                    ✓ ADO │
├─────────────────────────────────────────────────────────┤
│  Scanned: 47 specs across 3 projects                    │
│  Updated: 7 specs                                       │
│  Conflicts: 2 (resolved: external wins)                 │
├─────────────────────────────────────────────────────────┤
│  CHANGES APPLIED                                        │
│    ↓ Status changes:    4                               │
│    ↓ Priority changes:  2                               │
│    + Comments imported: 8                               │
└─────────────────────────────────────────────────────────┘
```

**Symbols**: `↓` = pulled (incoming), `↑` = pushed (outgoing), `✓` = success

---

## Full Progress Sync

The `/sw:sync-progress` command syncs EVERYTHING at once:

```bash
/sw:sync-progress

Syncing progress across all platforms...

✅ Living docs updated
  • 4 user stories synced
  • 2 ADRs updated

✅ GitHub Issue #142 updated
  • Checkboxes: 37/37 checked
  • Progress comment added

⚪ JIRA: Not configured
⚪ ADO: Not configured

Sync complete!
```

This is useful when:
- You've made many changes offline
- External tool sync got out of sync
- You want to force a full refresh

---

## Status Line Management

The status line shows your current progress. Sometimes it can get out of sync.

### Validate Status Line

```bash
/sw:validate-status
```

This command:
1. Validates cache matches tasks.md reality
2. Auto-fixes desync issues if found
3. Reports before/after comparison

### Example Output

```
Running status line validation...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATUS LINE VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Checking increment 0042-safe-deletion...

❌ Desync detected!

  Cache shows:  35/37 tasks (95%)
  Actual:       37/37 tasks (100%)

Auto-fixing...
  ✓ Updated frontmatter
  ✓ Refreshed cache

Re-validating...
  ✅ Status line now accurate

Before: 35/37 (95%)
After:  37/37 (100%)
```

### When to Use

Run `/sw:validate-status` when:
- Status line shows wrong percentage
- You edited tasks.md manually
- After resolving git conflicts
- Status seems stuck

---

## The `/sw:workflow` Command

Get a complete workflow dashboard:

```bash
/sw:workflow
```

Shows:
- Current phase (Planning, Implementing, Review, etc.)
- Completion status (tasks, ACs)
- External tool status (GitHub, JIRA, ADO)
- Living docs status
- Suggested next steps

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WORKFLOW NAVIGATOR: 0042-user-authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CURRENT PHASE: REVIEW_READY

━━━ WORKFLOW PROGRESS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [x] Planning     - spec.md and plan.md created
  [x] Tasks        - tasks.md generated (37 tasks)
  [x] Implementing - All tasks completed (37/37)
  [ ] Review       - Review spec.md and tasks.md  <-- YOU ARE HERE
  [ ] Validate     - Run quality validation
  [ ] Close        - PM validation and closure
  [ ] Sync         - Update living docs & external tools

━━━ EXTERNAL TOOLS STATUS ━━━━━━━━━━━━━━━━━━━━━━━━━

  GitHub Issue #142:
    Status: open 🔵
    Checklist: 35/37 checked

  JIRA: ⚪ Not configured

━━━ NEXT STEPS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Recommended:
  1. /sw:validate 0042 --quality
  2. /sw:done 0042
```

---

## Command Quick Reference

### Core Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/sw:save` | Git add, commit, push all repos | Saving work |
| `/sw:sync-docs` | Full documentation sync | Major updates |
| `/sw:sync-specs` | Specs/stories only | Quick spec sync |
| `/sw:sync-progress` | Sync to external tools | Full external sync |
| `/sw:validate-status` | Fix status line | Status issues |
| `/sw:workflow` | Dashboard view | See full state |

### External Tool Sync (Git-Style)

| Command | Purpose |
|---------|---------|
| `/sw-ado:pull` | Pull changes from Azure DevOps |
| `/sw-ado:push` | Push progress to Azure DevOps |
| `/sw-ado:sync` | Two-way sync (pull + push) |
| `/sw-ado:status` | Check ADO connection |
| `/sw-github:pull` | Pull changes from GitHub |
| `/sw-github:push` | Push progress to GitHub |
| `/sw-github:sync` | Two-way sync (pull + push) |
| `/sw-github:status` | Check GitHub connection |
| `/sw-jira:pull` | Pull changes from Jira |
| `/sw-jira:push` | Push progress to Jira |
| `/sw-jira:sync` | Two-way sync (pull + push) |

### Sync Scope Options

| Flag | Effect |
|------|--------|
| `--all` | Sync ALL specs across all projects |
| `--project <name>` | Sync only specified project |
| `--feature <id>` | Sync specific feature hierarchy |

---

## Best Practices

### 1. Use `:save` After Each Session

```bash
# End of coding session
/sw:save
```

Keeps all repos in sync with consistent commit messages.

### 2. Validate Status After Manual Edits

```bash
# After editing tasks.md manually
/sw:validate-status
```

Ensures the status line reflects reality.

### 3. Use Sync Commands After `/sw:done`

```bash
/sw:done 0042
/sw:sync-progress
```

Ensures external tools are updated.

### 4. Check Workflow When Confused

```bash
/sw:workflow
```

Shows exactly where you are and what to do next.

---

## Key Takeaways

1. **`/sw:save`** — One command to commit and push all repos
2. **`/sw:sync-docs`** — Full docs sync when needed
3. **`/sw:sync-specs`** — Quick specs-only sync
4. **Platform-specific syncs** — GitHub, JIRA, ADO support
5. **`/sw:validate-status`** — Fix status line desync
6. **`/sw:workflow`** — Dashboard for full visibility

---

## Next Lesson

You now have the complete toolkit for professional SpecWeave development.

→ [Continue to Part 3: Testing](../../part-3-testing/)
