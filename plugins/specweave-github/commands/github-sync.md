---
name: specweave.github.sync
description: Synchronize SpecWeave increment with GitHub issue. Updates issue with current progress, task checklist, labels, and comments. Bidirectional sync available.
---

# Sync Increment with GitHub Issue

Synchronize the current state of a SpecWeave increment with its GitHub issue.

## Usage

```bash
/specweave:github:sync <increment-id> [options]
```

## Arguments

- `increment-id`: Increment ID (e.g., `0004` or `0004-plugin-architecture`)

## Options

- `--tasks`: Update task checklist in issue body
- `--comment`: Post progress comment (default)
- `--labels`: Update issue labels based on status
- `--force`: Force sync even if up-to-date
- `--direction`: Sync direction (`to-github`, `from-github`, `bidirectional`)
- `--all`: Sync all active increments

## Examples

```bash
# Basic sync (post progress comment)
/specweave:github:sync 0004

# Update task checklist
/specweave:github:sync 0004 --tasks

# Full sync (comment + checklist + labels)
/specweave:github:sync 0004 --tasks --labels

# Force sync even if unchanged
/specweave:github:sync 0004 --force

# Sync from GitHub to SpecWeave
/specweave:github:sync 0004 --direction from-github

# Sync all increments
/specweave:github:sync --all
```

## What This Command Does

### To GitHub (Default)

1. **Reads Increment State**
   - Current task: Which task is in progress
   - Completed tasks: Count and list
   - Progress percentage: X/Y tasks
   - Duration: Time since creation

2. **Checks Last Sync**
   - Reads `.metadata.yaml`
   - Compares current state with last sync
   - Skips if no changes (unless `--force`)

3. **Generates Progress Comment**
   ```markdown
   **Progress Update**

   Completed: 7/48 tasks (15%)
   Current: T-008 - Implement Cursor plugin compiler
   Status: Week 1 in progress

   **Recent Completions**:
   - ✅ T-007: Implement Claude plugin installer (8h)
   - ✅ T-006: Update adapter interface (4h)
   - ✅ T-005: Implement PluginDetector (6h)

   **Next Up**:
   - ⏳ T-008: Implement Cursor compiler (6h)
   - ⏸️ T-009: Implement Copilot compiler (6h)

   ---
   🤖 Auto-synced by SpecWeave at 2025-10-30 14:30:00
   ```

4. **Posts Comment** (via GitHub CLI)
   ```bash
   gh issue comment 130 --body "$(cat progress-comment.md)"
   ```

5. **Updates Task Checklist** (if `--tasks`)
   - Marks completed tasks with `[x]`
   - Updates progress bars
   - Refreshes issue body

6. **Updates Labels** (if `--labels`)
   - Add `in-progress` when first task starts
   - Add `testing` when implementation complete
   - Add `blocked` if any tasks blocked
   - Remove `planning` when work begins

7. **Updates Metadata**
   - Save last sync timestamp
   - Store comment ID
   - Log sync count

### From GitHub

When `--direction from-github`:

1. **Fetches GitHub Issue**
   ```bash
   gh issue view 130 --json state,labels,comments,body
   ```

2. **Parses Changes**
   - Issue closed → Mark increment completed
   - Labels changed → Update increment status
   - New comments → Log to increment notes
   - Assignees changed → Update metadata

3. **Updates Increment**
   - Write to `.metadata.yaml`
   - Update status in `spec.md` frontmatter
   - Log changes to `.specweave/logs/github-sync.log`

4. **Reports Changes**
   ```
   ✅ Synced from GitHub issue #130

   Changes detected:
   - Issue closed by @developer1
   - Comment added: "All tests passing!"
   - Label added: ready-for-merge

   Increment 0004 updated:
   - Status: completed
   - Completion note logged
   ```

### Bidirectional

When `--direction bidirectional`:

1. Detect conflicts (both sides changed)
2. Show diff of changes
3. Ask user which to keep (increment or issue)
4. Apply chosen changes
5. Update both sides for consistency

## Configuration

Settings from `.specweave/config.yaml`:

```yaml
plugins:
  settings:
    specweave-github:
      # Auto-sync after tasks
      auto_update_progress: true

      # Sync frequency
      sync_frequency: "every-task"  # or "daily", "manual"

      # What to sync
      sync_settings:
        post_comments: true
        update_checklist: true
        update_labels: true
        include_file_changes: true
        include_time_tracking: true
```

## Output Format

### Success (To GitHub)

```
🔄 Syncing increment 0004 to GitHub...

✓ Increment loaded: 0004-plugin-architecture
✓ GitHub issue: #130
✓ Last synced: 30 minutes ago

Changes detected:
- 3 new tasks completed (T-005, T-006, T-007)
- Progress: 4/48 → 7/48 (15%)
- Current task: T-008

Syncing...
✓ Posted progress comment (ID: 1234567)
✓ Updated task checklist (7 tasks marked complete)
✓ Updated labels: +in-progress
✓ Metadata updated

✅ Sync Complete!

GitHub Issue: https://github.com/owner/repo/issues/130
Last synced: just now
```

### Success (From GitHub)

```
🔄 Syncing from GitHub issue #130...

✓ Fetched issue state
✓ Detected 2 changes

Changes from GitHub:
1. Issue closed by @developer1 (2 hours ago)
   Comment: "Increment completed! All deliverables met."

2. Label added: "ready-for-release"

Applying changes...
✓ Marked increment as completed
✓ Logged closure note to .metadata.yaml
✓ Updated status in spec.md

✅ Sync Complete!

Increment 0004 is now marked as completed.
```

### No Changes

```
ℹ️  Increment 0004 is up-to-date with GitHub issue #130

No changes since last sync (30 minutes ago).

Use --force to sync anyway.
```

### Conflicts (Bidirectional)

```
⚠️  Conflict detected!

Both increment and issue have changed since last sync.

Increment changes:
- 3 tasks completed locally
- Status: in_progress → testing

GitHub changes:
- Issue closed by @pm
- Status: open → closed

Choose resolution:
1. Keep increment state (reopen issue)
2. Keep GitHub state (close increment)
3. Manual resolution (abort sync)

Enter choice (1-3):
```

## Requirements

- GitHub CLI (`gh`) installed and authenticated
- Valid increment with GitHub issue
- Network connectivity

## Error Handling

**Increment not synced to GitHub**:
```
❌ Error: Increment '0004' is not synced to GitHub

No issue found in .metadata.yaml

Run /specweave:github:create-issue 0004 first.
```

**Issue not found**:
```
❌ Error: GitHub issue #130 not found

Possible causes:
- Issue was deleted
- Wrong repository
- Access revoked

Run /specweave:github:status 0004 to check state.
```

**Rate limit exceeded**:
```
⚠️ GitHub API rate limit exceeded

Rate limit resets at: 2025-10-30 15:30:00

Sync will retry automatically when limit resets.
Alternatively, run with --manual for manual retry.
```

**Network error**:
```
❌ Error: Network error while syncing

Failed to connect to GitHub API.

Check:
1. Internet connection
2. GitHub status: https://githubstatus.com
3. Firewall settings

Retry: /specweave:github:sync 0004
```

## Related Commands

- `/specweave:github:create-issue <increment-id>`: Create issue first
- `/specweave:github:close-issue <increment-id>`: Close on completion
- `/specweave:github:status <increment-id>`: Check sync status

## Tips

1. **Auto-Sync**: Enable `auto_update_progress: true` for automatic sync after each task

2. **Manual Sync**: Disable auto-sync and run `/specweave:github:sync` manually when needed

3. **Sync All**: Use `--all` to sync all increments at once (useful for daily standup)

4. **Bidirectional**: Use `--direction bidirectional` to detect and resolve conflicts

5. **Dry Run**: Add `--dry-run` to preview changes without applying them

## Advanced

### Scheduled Sync

Run sync on a schedule (via cron or GitHub Actions):

```bash
# Daily sync at 9 AM
0 9 * * * cd /path/to/project && /specweave:github:sync --all
```

### Webhook Integration

Configure webhook for instant sync from GitHub:

```yaml
# .specweave/config.yaml
plugins:
  settings:
    specweave-github:
      webhook:
        enabled: true
        port: 3000
        secret: "your-webhook-secret"
        events:
          - issues
          - issue_comment
```

Then:
```bash
# Start webhook server
specweave github webhook-server
```

### Custom Sync Rules

Define custom sync rules:

```yaml
plugins:
  settings:
    specweave-github:
      sync_rules:
        # Sync only high-priority increments daily
        - match: "priority == 'P0' OR priority == 'P1'"
          frequency: "daily"

        # Sync low-priority manually
        - match: "priority == 'P2' OR priority == 'P3'"
          frequency: "manual"

        # Sync completed increments once (no updates)
        - match: "status == 'completed'"
          frequency: "once"
```

### Conflict Resolution Strategy

Configure automatic conflict resolution:

```yaml
plugins:
  settings:
    specweave-github:
      conflict_resolution:
        # Always prefer increment state
        strategy: "increment-wins"

        # Or always prefer GitHub state
        # strategy: "github-wins"

        # Or always prompt user
        # strategy: "manual"
```

### Sync Filters

Sync only specific data:

```bash
# Sync only comments (no checklist/labels)
/specweave:github:sync 0004 --filter comments

# Sync only labels
/specweave:github:sync 0004 --filter labels

# Sync everything except comments
/specweave:github:sync 0004 --exclude comments
```

### Batch Sync

Sync multiple increments efficiently:

```bash
# Sync all in-progress increments
/specweave:github:sync --status in_progress

# Sync all priority P0/P1
/specweave:github:sync --priority P0,P1

# Sync increments modified today
/specweave:github:sync --modified-since today
```

---

**Command**: `/specweave:github:sync`
**Plugin**: specweave-github
**Agent**: github-manager
**Version**: 1.0.0
**Last Updated**: 2025-10-30
