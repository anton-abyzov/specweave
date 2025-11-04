---
name: github-sync
description: Bidirectional synchronization between SpecWeave increments and GitHub Issues. Creates issues from increments, tracks progress via comments, updates increment status from issue state, and closes issues when increments complete. Activates for GitHub sync, issue creation, increment tracking, GitHub integration, issue management, sync to GitHub.
---

# GitHub Sync - Bidirectional Increment ↔ Issue Synchronization

**Purpose**: Seamlessly synchronize SpecWeave increments with GitHub Issues for team visibility and project management.

**When to Use**:
- Creating new increments (auto-create GitHub issue)
- Syncing increment progress to GitHub (comments with task completion %)
- Closing increments (auto-close GitHub issue)
- Importing GitHub issues as increments
- Manual sync operations

**Integration**: Works with `/specweave:github:sync` command

---

## How GitHub Sync Works

### 1. Increment → GitHub Issue (Export)

**Trigger**: After `/specweave:inc` creates a new increment

**Actions**:
1. Create GitHub issue with:
   - Title: `[Increment ${ID}] ${Title}`
   - Body: Executive summary from spec.md
   - Labels: `increment`, `specweave`, priority label (P0/P1/P2/P3)
   - Milestone: Current release (if configured)

2. Store issue number in increment metadata:
   ```yaml
   # .specweave/increments/####-name/.metadata.yaml
   github:
     issue_number: 123
     issue_url: https://github.com/owner/repo/issues/123
     synced_at: 2025-10-30T10:00:00Z
   ```

3. Add link to issue in increment README

**Example Issue**:
```markdown
# [Increment 0004] Plugin Architecture

**Status**: Planning
**Priority**: P1
**Created**: 2025-10-30

## Executive Summary

Implement a modular plugin architecture for SpecWeave...

## SpecWeave Increment

This issue tracks SpecWeave increment `0004-plugin-architecture`.

- **Spec**: `.specweave/increments/0004-plugin-architecture/spec.md`
- **Plan**: `.specweave/increments/0004-plugin-architecture/plan.md`
- **Tasks**: 48 tasks across 4 weeks

## Progress

- [ ] Week 1: Foundation (0/12 tasks)
- [ ] Week 2: GitHub Plugin (0/10 tasks)
- [ ] Week 3: Additional Plugins (0/15 tasks)
- [ ] Week 4: Documentation & Testing (0/11 tasks)

---

🤖 Auto-synced by SpecWeave GitHub Plugin
```

### 2. Progress Updates (Increment → Issue)

**Trigger**: After each `/specweave:do` task completion (via post-task-completion hook)

**Actions**:
1. **Update issue description** (v0.7.0+):
   - Updates task checklist in issue body
   - Marks completed tasks with `[x]`
   - Updates progress bars
   - Keeps issue description synchronized

2. Post comment to GitHub issue:
   ```markdown
   **Task Completed**: T-007 - Implement Claude plugin installer

   **Progress**: 7/48 tasks (15%)
   **Status**: Week 1 in progress

   ---
   🤖 Auto-updated by SpecWeave
   ```

3. Update issue labels:
   - Add `in-progress` label when first task starts
   - Add `testing` label when implementation phase completes
   - Add `ready-for-review` label when all tasks done

**Note**: As of v0.7.0+, the post-task-completion hook automatically uses `--tasks` flag to update both the issue description AND add comments. This ensures the main issue stays in sync with increment progress.

### 3. Increment Completion (Close Issue)

**Trigger**: `/specweave:done` closes increment

**Actions**:
1. Post final comment:
   ```markdown
   ✅ **Increment Completed**

   **Final Stats**:
   - 48/48 tasks completed (100%)
   - 127 test cases passing
   - Duration: 4 weeks

   **Deliverables**:
   - Plugin architecture implemented
   - 15 plugins migrated
   - Documentation updated

   Closing this issue as the increment is complete.

   ---
   🤖 Auto-closed by SpecWeave
   ```

2. Close GitHub issue
3. Update metadata with completion timestamp

### 4. GitHub Issue → Increment (Import)

**Use Case**: Import existing GitHub issues as SpecWeave increments

**Command**: `/specweave:github:import <issue-number>`

**Actions**:
1. Fetch issue via GitHub CLI:
   ```bash
   gh issue view 123 --json title,body,labels
   ```

2. Create increment structure:
   - Parse issue title → increment title
   - Parse issue body → spec.md executive summary
   - Map labels → increment priority

3. Generate spec.md, plan.md, tasks.md from issue description

4. Link issue to increment in metadata

---

## Configuration

Configure GitHub sync in `.specweave/config.yaml`:

```yaml
plugins:
  enabled:
    - specweave-github
  settings:
    specweave-github:
      # GitHub repository (auto-detected from git remote)
      repo: "owner/repo"

      # Auto-create issues for new increments
      auto_create_issue: true

      # Auto-update progress after tasks
      auto_update_progress: true

      # Auto-close issues when increments complete
      auto_close_issue: true

      # Default labels to add
      default_labels:
        - "specweave"
        - "increment"

      # Milestone to use (optional)
      milestone: "v0.4.0"

      # Sync frequency for progress updates
      # Options: "every-task", "daily", "manual"
      sync_frequency: "every-task"
```

---

## GitHub CLI Requirements

This skill requires GitHub CLI (`gh`) to be installed and authenticated:

```bash
# Install GitHub CLI
brew install gh              # macOS
sudo apt install gh          # Ubuntu
choco install gh             # Windows

# Authenticate
gh auth login

# Verify
gh auth status
```

---

## Manual Sync Operations

### Create Issue from Increment

```bash
/specweave:github:create-issue 0004
```

Creates GitHub issue for increment 0004 if not already synced.

### Sync Progress

```bash
/specweave:github:sync 0004
```

Posts current progress to GitHub issue.

### Close Issue

```bash
/specweave:github:close-issue 0004
```

Closes GitHub issue for completed increment.

### Check Status

```bash
/specweave:github:status 0004
```

Shows sync status (issue number, last sync time, progress %).

---

## Workflow Integration

### Full Automated Workflow

```bash
# 1. Create increment
/specweave:inc "Add dark mode toggle"
# → Auto-creates GitHub issue #125

# 2. Implement tasks
/specweave:do
# → Auto-updates issue with progress after each task

# 3. Complete increment
/specweave:done 0005
# → Auto-closes GitHub issue #125
```

### Team Collaboration

**For Developers**:
- Work in SpecWeave increments locally
- Automatic GitHub issue updates keep team informed
- No manual issue management needed

**For Project Managers**:
- View all increments as GitHub issues
- Track progress in GitHub Projects/Milestones
- Comment on issues to communicate with developers

**For Stakeholders**:
- See progress in familiar GitHub interface
- No need to understand SpecWeave structure
- Clear visibility into development status

---

## Conflict Resolution

**What if issue and increment diverge?**

The increment is always the source of truth. GitHub issues are a mirror for visibility.

**Sync conflicts** (rare):
1. Increment status conflicts with issue state
2. Manual edits to issue body/title

**Resolution**:
- Run `/specweave:github:sync 0004 --force` to overwrite issue from increment
- Or manually update increment metadata to match issue

---

## Privacy & Security

**What gets synced?**
- ✅ Increment title, summary, progress
- ✅ Task completion status (not implementation details)
- ❌ Code diffs, file contents (never synced)
- ❌ Internal notes, sensitive data

**Security**:
- Uses GitHub token from environment (GITHUB_TOKEN or GH_TOKEN)
- Respects repository permissions (read/write)
- No data sent to third parties

---

## Example Session

```
User: /specweave:inc "Implement user authentication"

Claude:
✓ Created increment: 0005-user-authentication
✓ Generated spec.md, plan.md, tasks.md, tests.md
✓ Creating GitHub issue...

GitHub Issue Created: #126
https://github.com/myorg/myapp/issues/126

Title: [Increment 0005] User Authentication
Labels: specweave, increment, P1
Status: Open

---

User: /specweave:do

Claude:
✓ Completed: T-001 - Design auth flow
✓ Updated GitHub issue #126 with progress (1/15 tasks, 7%)

---

[After 15 tasks...]

User: /specweave:done 0005

Claude:
✓ All PM gates passed
✓ Increment 0005 closed
✓ Closing GitHub issue #126...

GitHub Issue #126: Closed
Final comment posted with completion stats.

Increment complete! 🎉
```

---

## Benefits

**For SpecWeave Users**:
- ✅ No manual GitHub issue management
- ✅ Automatic team visibility
- ✅ Single source of truth (increment specs)
- ✅ GitHub integration without leaving IDE

**For Teams**:
- ✅ Track SpecWeave work in GitHub Projects
- ✅ Use milestones, labels, assignees as usual
- ✅ Comment on issues to communicate with developers
- ✅ View progress in real-time

**For Organizations**:
- ✅ Unified issue tracking across projects
- ✅ GitHub-native workflow (familiar to all)
- ✅ Audit trail (all syncs timestamped)
- ✅ Integration with GitHub Actions, webhooks

---

## Troubleshooting

**Issue not created?**
- Check GitHub CLI: `gh auth status`
- Verify repo permissions (write access)
- Check config: `.specweave/config.yaml`

**Sync failing?**
- Check network connectivity
- Verify issue still exists (not deleted)
- Check rate limits: `gh api rate_limit`

**Progress not updating?**
- Check `auto_update_progress: true` in config
- Verify hook execution: `.specweave/logs/hooks.log`
- Manually sync: `/specweave:github:sync 0005`

---

## Advanced Usage

### Custom Issue Templates

Create `.specweave/github/issue-template.md`:

```markdown
# [Increment {{id}}] {{title}}

{{summary}}

## SpecWeave Details

- **Spec**: [spec.md]({{spec_url}})
- **Priority**: {{priority}}
- **Estimated Duration**: {{duration}}

## Progress

{{progress_checklist}}
```

### Selective Sync

Sync only specific increments:

```yaml
# .specweave/config.yaml
plugins:
  settings:
    specweave-github:
      sync_increments:
        - 0004-plugin-architecture
        - 0005-user-authentication
      # Others won't create GitHub issues
```

### Multi-Repo Sync

For monorepos with multiple GitHub repositories:

```yaml
# .specweave/config.yaml
plugins:
  settings:
    specweave-github:
      repos:
        frontend:
          repo: "myorg/frontend"
          increments: ["0001-*", "0002-*"]
        backend:
          repo: "myorg/backend"
          increments: ["0003-*", "0004-*"]
```

---

## Related

- **github-issue-tracker**: Track individual tasks as issue comments
- **github-manager agent**: AI agent for GitHub operations
- **Commands**: `/specweave:github:create-issue`, `/specweave:github:sync`, `/specweave:github:close-issue`

---

**Version**: 1.0.0
**Plugin**: specweave-github
**Last Updated**: 2025-10-30