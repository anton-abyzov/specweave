---
name: specweave-github:sync-from
description: Sync state from GitHub to SpecWeave (bidirectional sync). Fetches issue state, comments, and detects conflicts.
---

# Sync from GitHub to SpecWeave

Bidirectional sync - pull changes from GitHub issue back to SpecWeave increment.

## Usage

```bash
/specweave-github:sync-from <incrementId>
```

## What It Does

1. **Fetches GitHub Issue State**:
   - Issue status (open/closed)
   - Comments
   - Labels, assignees, milestones
   - Last updated timestamp

2. **Detects Conflicts**:
   - GitHub closed but SpecWeave active
   - SpecWeave completed but GitHub open
   - GitHub abandoned but issue open

3. **Syncs Comments**:
   - Saves GitHub comments to `.specweave/increments/<id>/logs/github-comments.md`
   - Only syncs new comments (tracks IDs)

4. **Updates Metadata**:
   - Updates `metadata.json` with latest GitHub state
   - Tracks last sync timestamp

## Examples

### Basic Sync

```bash
/specweave-github:sync-from 0015-hierarchical-sync
```

**Output**:
```
🔄 Syncing from GitHub for increment: 0015-hierarchical-sync
   Syncing from anton-abyzov/specweave#29
✅ No conflicts - GitHub and SpecWeave in sync
📝 Syncing 3 new comment(s)
✅ Comments saved to: logs/github-comments.md
✅ Metadata updated
✅ Bidirectional sync complete
```

### Conflict Detection

```bash
/specweave-github:sync-from 0015-hierarchical-sync
```

**Output**:
```
🔄 Syncing from GitHub for increment: 0015-hierarchical-sync
   Syncing from anton-abyzov/specweave#29
⚠️  Detected 1 conflict(s)

⚠️  Conflict detected: status
   GitHub: closed
   SpecWeave: active

⚠️  **CONFLICT**: GitHub issue closed but SpecWeave increment still active!
   Recommendation: Run /specweave:done 0015-hierarchical-sync to close increment
   Or reopen issue on GitHub if work is not complete

✅ Bidirectional sync complete
```

## When to Use

Use this command when:
- ✅ Someone closed/reopened the GitHub issue
- ✅ Comments were added on GitHub (want to import them)
- ✅ Want to check if GitHub and SpecWeave are in sync
- ✅ Resolving conflicts between GitHub and SpecWeave state

## Requirements

- GitHub CLI (`gh`) installed and authenticated
- GitHub issue linked in metadata.json
- Repository has GitHub remote configured

## Conflict Resolution

### GitHub Closed, SpecWeave Active

**Resolution**: Close SpecWeave increment
```bash
/specweave:done 0015-hierarchical-sync
```

**Or**: Reopen GitHub issue if work not complete
```bash
gh issue reopen 29
```

### SpecWeave Completed, GitHub Open

**Resolution**: Close GitHub issue
```bash
gh issue close 29 --comment "Increment completed in SpecWeave"
```

### SpecWeave Abandoned, GitHub Open

**Resolution**: Close GitHub issue with reason
```bash
gh issue close 29 --comment "Increment abandoned: Requirements changed"
```

## Files Modified

- `.specweave/increments/<id>/logs/github-comments.md` - GitHub comments
- `.specweave/increments/<id>/metadata.json` - Sync metadata

## Related Commands

- `/specweave-github:sync` - One-way sync (SpecWeave → GitHub)
- `/specweave-github:create-issue` - Create GitHub issue
- `/specweave-github:close-issue` - Close GitHub issue
- `/specweave-github:status` - Check sync status

## Automation

For automatic bidirectional sync, add to cron or CI/CD:

```bash
# Sync all active increments hourly
0 * * * * cd /path/to/project && \
  for inc in $(ls .specweave/increments/ | grep -v _backlog); do \
    /specweave-github:sync-from $inc; \
  done
```

## Implementation

Invokes `github-sync-bidirectional` agent with conflict detection and resolution logic.
