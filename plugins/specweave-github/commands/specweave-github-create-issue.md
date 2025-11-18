---
name: specweave-github:create-issue
description: Create a GitHub issue for a SpecWeave increment. Generates issue from increment specs with task checklist, labels, and milestone. Links issue to increment metadata.
---

# Create GitHub Issue from Increment

Create a GitHub issue for the specified SpecWeave increment.

## Usage

```bash
/specweave:github:create-issue <increment-id> [options]
```

## Arguments

- `increment-id`: Increment ID (e.g., `0004` or `0004-plugin-architecture`)

## Options

- `--force`: Force create even if issue already exists
- `--labels`: Comma-separated labels (default: from config)
- `--milestone`: Milestone name (default: from config)
- `--assignee`: Assign to user (@username)
- `--project`: Add to GitHub project (project number)

## Examples

```bash
# Basic usage
/specweave:github:create-issue 0004

# With custom labels
/specweave:github:create-issue 0004 --labels "urgent,backend"

# Assign to developer
/specweave:github:create-issue 0004 --assignee @developer1

# Add to project
/specweave:github:create-issue 0004 --project 3

# Force recreate
/specweave:github:create-issue 0004 --force
```

## What This Command Does

1. **Loads Increment**
   - Reads `.specweave/increments/<increment-id>/`
   - Parses `spec.md`, `plan.md`, `tasks.md`
   - Checks `.metadata.yaml` for existing issue

2. **Detects Repository**
   - Extracts repo from git remote
   - Format: `owner/repo`
   - Verifies write permissions

3. **Generates Issue Body**
   - Executive summary from `spec.md`
   - Task checklist from `tasks.md`
   - Progress tracker (0% initially)
   - Links to increment files

4. **Creates GitHub Issue** (via GitHub CLI)
   - Uses `gh issue create`
   - Applies labels (specweave, increment, priority)
   - Sets milestone (if configured)
   - Assigns to user (if specified)

5. **Updates Metadata**
   - Saves issue number to `.metadata.yaml`
   - Stores issue URL
   - Logs creation timestamp

6. **Reports Result**
   - Issue number and URL
   - Labels applied
   - Milestone set
   - Auto-sync status

## Requirements

- GitHub CLI (`gh`) installed and authenticated
- Write access to repository
- Valid increment directory

## Configuration

Settings from `.specweave/config.yaml`:

```yaml
plugins:
  settings:
    specweave-github:
      repo: "owner/repo"  # Auto-detected from git remote
      default_labels:
        - "specweave"
        - "increment"
      milestone: "v0.4.0"  # Optional
```

## Error Handling

**Increment not found**:
```
❌ Error: Increment '0004' not found

Check: ls .specweave/increments/
```

**Issue already exists**:
```
⚠️  GitHub issue already exists for increment 0004

Issue #130: https://github.com/owner/repo/issues/130

Use --force to recreate (will close existing issue first).
```

**GitHub CLI not authenticated**:
```
❌ Error: GitHub CLI not authenticated

Please run: gh auth login

Then retry this command.
```

**No write permissions**:
```
❌ Error: Insufficient permissions

Required: Write access to owner/repo

Contact repository admin to request access.
```

## Implementation

This command invokes the `github-manager` agent via the Task tool:

```typescript
const agent = new TaskAgent('github-manager', {
  prompt: `Create GitHub issue for increment ${incrementId}`,
  context: {
    incrementPath: `.specweave/increments/${incrementId}`,
    options: { force, labels, milestone, assignee, project }
  }
});

await agent.execute();
```

The agent handles:
- File reading (spec.md, tasks.md)
- GitHub API calls (via `gh` CLI)
- Metadata updates
- Error handling

## Output Format

### Success

```
📦 Creating GitHub issue for increment 0004...

✓ Increment loaded: 0004-plugin-architecture
✓ Repository detected: owner/repo
✓ Issue body generated (2,500 characters)

Creating issue...
✓ Issue #130 created
✓ Labels applied: specweave, increment, P1
✓ Milestone set: v0.4.0
✓ Metadata updated

✅ GitHub Issue Created! (❌ DEPRECATED FORMAT)

Issue #130: [Increment 0004] Plugin Architecture  # ❌ DEPRECATED
URL: https://github.com/owner/repo/issues/130

Auto-sync enabled: progress will update automatically after each task.
```

### Failure

```
❌ Failed to create GitHub issue

Error: API rate limit exceeded
Rate limit resets at: 2025-10-30 15:30:00

Options:
1. Wait 30 minutes
2. Use authenticated token (higher limit)

Run /specweave:github:status 0004 to check sync state.
```

## Related Commands

- `/specweave:github:sync <increment-id>`: Update existing issue
- `/specweave:github:close-issue <increment-id>`: Close issue
- `/specweave:github:status <increment-id>`: Check sync status

## Tips

1. **Auto-Create**: Enable `auto_create_issue: true` in config to auto-create issues when running `/specweave:inc`

2. **Templates**: Customize issue template in `.specweave/github/issue-template.md`

3. **Labels**: Use labels for filtering in GitHub Projects:
   - `specweave`: All SpecWeave increments
   - `increment`: Differentiate from regular issues
   - `P0`/`P1`/`P2`/`P3`: Priority levels

4. **Milestones**: Group increments by release milestone for progress tracking

5. **Projects**: Add issues to GitHub Projects for Kanban-style tracking

## Advanced

### Custom Issue Body Template

Create `.specweave/github/issue-template.md`:

```markdown
# [Increment {{id}}] {{title}}

{{summary}}

## Details

- **Spec**: [spec.md]({{spec_url}})
- **Priority**: {{priority}}
- **Duration**: {{duration}}

## Tasks

{{tasks}}

---

_Auto-created by SpecWeave_
```

### Bulk Create

Create issues for multiple increments:

```bash
for i in 0004 0005 0006; do
  /specweave:github:create-issue $i
done
```

Or using a script:

```bash
# Create issues for all increments in backlog
ls .specweave/increments/_backlog/ | while read inc; do
  /specweave:github:create-issue $inc
done
```

### Dry Run

Preview issue body before creating:

```bash
/specweave:github:create-issue 0004 --dry-run
```

Output:
```
📄 Preview: Issue body for increment 0004 (❌ DEPRECATED FORMAT)

Title: [Increment 0004] Plugin Architecture  # ❌ DEPRECATED
Labels: specweave, increment, P1
Milestone: v0.4.0

Body:
---
# [Increment 0004] Plugin Architecture  # ❌ DEPRECATED

**Status**: Planning
**Priority**: P1

## Executive Summary

Implement a modular plugin architecture for SpecWeave...

[... full body ...]

---

Run without --dry-run to create this issue.
```

---

**Command**: `/specweave:github:create-issue`
**Plugin**: specweave-github
**Agent**: github-manager
**Version**: 1.0.0
**Last Updated**: 2025-10-30
