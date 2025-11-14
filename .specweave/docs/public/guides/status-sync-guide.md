# Status Synchronization Guide

**Bidirectional status sync between SpecWeave increments and external tools (GitHub, JIRA, Azure DevOps)**

## Overview

Status synchronization keeps SpecWeave increment statuses in sync with external project management tools. When you complete an increment in SpecWeave, the corresponding GitHub issue, JIRA story, or ADO work item can be automatically updated - and vice versa.

### Supported Tools

- **GitHub Issues** - Bidirectional sync with issue statuses
- **JIRA** - Bidirectional sync with story/epic statuses
- **Azure DevOps** - Bidirectional sync with work item states

### Sync Directions

1. **To External** (SpecWeave → External): Update GitHub/JIRA/ADO when SpecWeave status changes
2. **From External** (External → SpecWeave): Update SpecWeave when GitHub/JIRA/ADO status changes
3. **Bidirectional** (Both ways): Sync in both directions with conflict resolution

---

## Quick Start

### 1. Configure Status Mappings

Edit `.specweave/config.json`:

```json
{
  "sync": {
    "statusSync": {
      "enabled": true,
      "autoSync": false,
      "promptUser": true,
      "conflictResolution": "prompt",
      "mappings": {
        "github": {
          "planning": "open",
          "active": "open",
          "completed": "closed",
          "abandoned": "closed"
        },
        "jira": {
          "planning": "To Do",
          "active": "In Progress",
          "completed": "Done",
          "abandoned": "Cancelled"
        },
        "ado": {
          "planning": "New",
          "active": "Active",
          "completed": "Closed",
          "abandoned": "Removed"
        }
      }
    }
  }
}
```

### 2. Link Increment to External Tool

When creating increment with GitHub sync:

```bash
/specweave-github:create-issue 0001-user-authentication
```

This creates `metadata.json` with GitHub link:

```json
{
  "id": "0001-user-authentication",
  "status": "active",
  "github": {
    "issue": 42,
    "url": "https://github.com/owner/repo/issues/42"
  }
}
```

### 3. Complete Increment

```bash
/specweave:done 0001
```

If status sync is enabled, you'll be prompted:

```
🔄 Status Sync: GitHub Issue #42

SpecWeave status: completed → GitHub status: closed

Update GitHub issue #42 to "closed"?
  1. Yes
  2. No
  3. Custom mapping
```

Select **Yes** to sync status to GitHub.

---

## Configuration

### Status Mappings

Map SpecWeave statuses to external tool statuses:

```json
{
  "sync": {
    "statusSync": {
      "mappings": {
        "github": {
          "planning": "open",
          "active": "open",
          "completed": "closed",
          "paused": "open",
          "abandoned": "closed"
        }
      }
    }
  }
}
```

**SpecWeave Statuses**: `planning`, `active`, `paused`, `completed`, `abandoned`

**GitHub Statuses**: `open`, `closed`

**JIRA Statuses**: Depends on your workflow (e.g., `To Do`, `In Progress`, `Done`)

**ADO Statuses**: `New`, `Active`, `Resolved`, `Closed`, `Removed`

### Sync Modes

#### Manual Sync (Default)

Prompts user before syncing:

```json
{
  "sync": {
    "statusSync": {
      "enabled": true,
      "autoSync": false,
      "promptUser": true
    }
  }
}
```

#### Auto-Sync Mode

Syncs automatically without prompts:

```json
{
  "sync": {
    "statusSync": {
      "enabled": true,
      "autoSync": true,
      "promptUser": false
    }
  }
}
```

**Use when**: You trust the mappings and want frictionless sync.

### Conflict Resolution Strategies

When both SpecWeave and external status change:

```json
{
  "sync": {
    "statusSync": {
      "conflictResolution": "last-write-wins"
    }
  }
}
```

#### Available Strategies

1. **`prompt`** (Recommended): Ask user how to resolve conflict
2. **`last-write-wins`**: Use the most recently changed status
3. **`specweave-wins`**: Always prefer SpecWeave status
4. **`external-wins`**: Always prefer external tool status

**Example Conflict**:

```
Conflict detected!

SpecWeave: completed (changed 2025-11-10 12:00)
GitHub:    open (changed 2025-11-10 11:00)

How to resolve?
  1. Use SpecWeave status (completed → close GitHub issue)
  2. Use GitHub status (open → revert SpecWeave to active)
```

---

## Usage

### Sync After Increment Completion

Status sync happens automatically when using `/specweave:done`:

```bash
/specweave:done 0001-user-authentication
```

Output:

```
✅ Increment 0001 completed!

🔄 Status Sync:
   ✓ GitHub issue #42: open → closed (with comment)
   ✓ JIRA story PROJ-123: In Progress → Done (with comment)
```

### Manual Sync

Force sync for a specific increment:

```bash
/specweave-github:sync 0001-user-authentication
```

Options:

```bash
# Specify direction
/specweave-github:sync 0001 --direction to-external

# Dry run (preview changes)
/specweave-github:sync 0001 --dry-run
```

### Bulk Sync

Sync multiple increments at once:

```bash
/specweave-github:bulk-sync --time-range 1M
```

This syncs all increments modified in the last month.

---

## Conflict Resolution

### Scenario 1: Last-Write-Wins

**Config**: `conflictResolution: "last-write-wins"`

**State**:
- SpecWeave: `completed` (changed at 12:00)
- GitHub: `open` (changed at 11:00)

**Result**: SpecWeave wins (newer timestamp) → GitHub updated to `closed`

### Scenario 2: Prompt User

**Config**: `conflictResolution: "prompt"`

**State**:
- SpecWeave: `completed` (changed at 12:00)
- JIRA: `In Progress` (changed at 11:30)

**Prompt**:

```
Conflict detected!

SpecWeave: completed (2025-11-10 12:00)
JIRA:      In Progress (2025-11-10 11:30)

How to resolve?
  1. Use SpecWeave status (completed → Done)
  2. Use JIRA status (In Progress → active)
  3. Cancel sync
```

User selects **Option 1** → JIRA updated to `Done`

### Scenario 3: SpecWeave-Wins

**Config**: `conflictResolution: "specweave-wins"`

**State**:
- SpecWeave: `abandoned`
- ADO: `Active`

**Result**: SpecWeave wins → ADO updated to `Removed`

---

## FAQ

### Q: What happens if external tool is down?

**A**: Sync fails gracefully with error message. Use retry:

```bash
/specweave-github:sync 0001 --retry
```

### Q: Can I customize status mappings per increment?

**A**: No, mappings are global in config. But you can use "Custom mapping" option during prompt.

### Q: What if I don't want to sync a specific increment?

**A**: Select "No" when prompted, or don't link external issue in metadata.

### Q: How do I see sync history?

**A**: Check `.specweave/logs/sync-events.json`:

```json
[
  {
    "incrementId": "0001-user-authentication",
    "tool": "github",
    "fromStatus": "active",
    "toStatus": "completed",
    "timestamp": "2025-11-10T12:00:00Z",
    "triggeredBy": "user",
    "success": true,
    "direction": "to-external"
  }
]
```

### Q: Can I sync from external tool to SpecWeave?

**A**: Yes! Use:

```bash
/specweave-github:sync-from 0001
```

This pulls GitHub status and updates SpecWeave.

### Q: What if status mapping is invalid?

**A**: Sync fails with clear error:

```
❌ Invalid mapping: "completed" → "invalid-status"
   Valid GitHub statuses: open, closed
```

---

## Troubleshooting

### Sync not working

**Check**:
1. ✅ Status sync enabled: `statusSync.enabled: true`
2. ✅ External link exists: `metadata.json` has `github.issue` field
3. ✅ Credentials configured: `.env` has `GITHUB_TOKEN`
4. ✅ Mappings valid: Status names match external tool

**Debug**:

```bash
# Check config
cat .specweave/config.json | jq '.sync.statusSync'

# Check metadata
cat .specweave/increments/0001/metadata.json

# Check sync logs
cat .specweave/logs/sync-events.json | jq '.'
```

### Conflict resolution not triggering

**Cause**: Both statuses are identical or conflictResolution is not "prompt"

**Fix**: Change config:

```json
{
  "sync": {
    "statusSync": {
      "conflictResolution": "prompt"
    }
  }
}
```

### Rate limit errors

**Solution**: Use bulk sync with delays:

```bash
/specweave-github:bulk-sync --batch-size 5 --delay 1000
```

This syncs 5 at a time with 1-second delay between batches.

---

## Best Practices

1. **Use `prompt` resolution** for important projects (manual verification)
2. **Use `last-write-wins`** for fast-paced projects (automatic sync)
3. **Review sync logs** regularly (`.specweave/logs/sync-events.json`)
4. **Test mappings** with dry-run before committing
5. **Enable auto-sync** only after testing mappings

---

## Next Steps

- [Migration Guide](./status-sync-migration.md) - Upgrade from old sync
- [Architecture](../internal/architecture/adr/0031-status-sync-architecture.md) - Technical details
- [API Reference](../api/status-sync-api.md) - Programmatic usage
