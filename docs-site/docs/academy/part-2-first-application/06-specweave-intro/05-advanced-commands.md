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

## The `/specweave:save` Command

**Save and push changes across all repositories in one command.**

When working with multiple repositories (umbrella mode) or even a single repo, this command streamlines git operations.

### Basic Usage

```bash
# Auto-generate commit message from changes
/specweave:save

# With explicit commit message
/specweave:save "feat: Add menu builder feature"

# Preview what would happen
/specweave:save --dry-run
```

### Auto-Generated Commit Messages

When you run `/specweave:save` without a message, SpecWeave analyzes your changes:

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
/specweave:save "feat: Complete user registration flow"

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

### `/specweave:sync-docs`

**Full documentation sync** — updates ALL documentation areas.

```bash
# Review before implementation
/specweave:sync-docs review

# Update after implementation
/specweave:sync-docs update
```

What it syncs:
- ADRs (Proposed → Accepted)
- Architecture diagrams
- API documentation
- Feature documentation
- User stories

### `/specweave:sync-specs`

**Specs-only sync** — just user stories and features.

```bash
# Sync current increment
/specweave:sync-specs

# Sync specific increment
/specweave:sync-specs 0042

# Preview changes
/specweave:sync-specs 0042 --dry-run
```

**When to use which**:

| Command | Use When |
|---------|----------|
| `/specweave:sync-docs` | Full documentation update needed |
| `/specweave:sync-specs` | Only user stories/features changed |

---

## Platform-Specific Sync Commands

### GitHub Sync

```bash
# Check GitHub connection
/specweave-github:status

# Sync increment to GitHub issue
/specweave-github:sync 0042

# Create GitHub issue for increment
/specweave-github:create-issue 0042

# Close GitHub issue when done
/specweave-github:close-issue 0042
```

**Bidirectional Sync**:

```bash
# Pull changes FROM GitHub to SpecWeave
/specweave-github:sync 0042 --from-external

# Push changes TO GitHub from SpecWeave (default)
/specweave-github:sync 0042
```

### JIRA Sync

```bash
# Check JIRA connection
/specweave-jira:status

# Sync increment to JIRA
/specweave-jira:sync 0042

# Link existing JIRA issue
/specweave-jira:link 0042 --issue PROJ-123
```

### Azure DevOps Sync

```bash
# Check ADO connection
/specweave-ado:status

# Sync increment to ADO work item
/specweave-ado:sync 0042

# Create ADO work item
/specweave-ado:create-item 0042
```

---

## Full Progress Sync

The `/specweave:sync-progress` command syncs EVERYTHING at once:

```bash
/specweave:sync-progress

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
/specweave:validate-status
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

Run `/specweave:validate-status` when:
- Status line shows wrong percentage
- You edited tasks.md manually
- After resolving git conflicts
- Status seems stuck

---

## The `/specweave:workflow` Command

Get a complete workflow dashboard:

```bash
/specweave:workflow
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
  1. /specweave:validate 0042 --quality
  2. /specweave:done 0042
```

---

## Command Quick Reference

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/specweave:save` | Git add, commit, push all repos | Saving work |
| `/specweave:sync-docs` | Full documentation sync | Major updates |
| `/specweave:sync-specs` | Specs/stories only | Quick spec sync |
| `/specweave:sync-progress` | Sync to external tools | Full external sync |
| `/specweave-github:sync` | GitHub-specific sync | GitHub updates |
| `/specweave-jira:sync` | JIRA-specific sync | JIRA updates |
| `/specweave-ado:sync` | ADO-specific sync | ADO updates |
| `/specweave:validate-status` | Fix status line | Status issues |
| `/specweave:workflow` | Dashboard view | See full state |

---

## Best Practices

### 1. Use `:save` After Each Session

```bash
# End of coding session
/specweave:save
```

Keeps all repos in sync with consistent commit messages.

### 2. Validate Status After Manual Edits

```bash
# After editing tasks.md manually
/specweave:validate-status
```

Ensures the status line reflects reality.

### 3. Use Sync Commands After `/specweave:done`

```bash
/specweave:done 0042
/specweave:sync-progress
```

Ensures external tools are updated.

### 4. Check Workflow When Confused

```bash
/specweave:workflow
```

Shows exactly where you are and what to do next.

---

## Key Takeaways

1. **`/specweave:save`** — One command to commit and push all repos
2. **`/specweave:sync-docs`** — Full docs sync when needed
3. **`/specweave:sync-specs`** — Quick specs-only sync
4. **Platform-specific syncs** — GitHub, JIRA, ADO support
5. **`/specweave:validate-status`** — Fix status line desync
6. **`/specweave:workflow`** — Dashboard for full visibility

---

## Next Lesson

You now have the complete toolkit for professional SpecWeave development.

→ [Continue to Part 3: Testing](../../part-3-testing/)
