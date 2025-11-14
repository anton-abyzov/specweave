# Status Sync Migration Guide

**Upgrading from basic external tool sync to the new status synchronization system**

## Overview

The new status synchronization system (v0.20.0+) provides:

✅ **Bidirectional sync** - Changes flow both ways (SpecWeave ↔ External)
✅ **Conflict resolution** - Smart handling of simultaneous changes
✅ **Auto-sync mode** - Frictionless automatic synchronization
✅ **Event logging** - Complete audit trail of all sync operations
✅ **Performance** - Caching and bulk operations reduce API calls

---

## Before You Start

### Check Your Version

```bash
specweave --version
```

If < v0.20.0, upgrade first:

```bash
npm install -g specweave@latest
```

### Backup Your Data

```bash
# Backup config
cp .specweave/config.json .specweave/config.json.backup

# Backup metadata
cp -r .specweave/increments .specweave/increments.backup
```

---

## Migration Steps

### Step 1: Update Config Structure

**Old Config** (v0.19.x):

```json
{
  "sync": {
    "enabled": true,
    "activeProfile": "github-default",
    "profiles": {
      "github-default": {
        "provider": "github",
        "config": {
          "owner": "anton-abyzov",
          "repo": "specweave"
        }
      }
    }
  }
}
```

**New Config** (v0.20.0+):

```json
{
  "sync": {
    "enabled": true,
    "activeProfile": "github-default",
    "profiles": {
      "github-default": {
        "provider": "github",
        "config": {
          "owner": "anton-abyzov",
          "repo": "specweave"
        }
      }
    },
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
        }
      }
    }
  }
}
```

**Changes**:
1. Added `statusSync` section (required)
2. Added `mappings` for each tool you use

### Step 2: Test Status Mappings

Create a test increment to verify mappings work:

```bash
# 1. Create test increment
/specweave:increment "Test status sync"

# 2. Link to GitHub (creates issue)
/specweave-github:create-issue 0999-test-status-sync

# 3. Complete increment
/specweave:done 0999

# 4. Verify prompt appears
# Output should show:
# 🔄 Status Sync: GitHub Issue #X
# SpecWeave status: completed → GitHub status: closed
# Update GitHub issue #X to "closed"?
```

If prompt appears and sync works, mappings are correct!

### Step 3: Enable Auto-Sync (Optional)

If you trust the mappings, enable auto-sync:

```json
{
  "sync": {
    "statusSync": {
      "enabled": true,
      "autoSync": true,
      "promptUser": false,
      "conflictResolution": "last-write-wins"
    }
  }
}
```

**When to use**:
- ✅ Mappings tested and working
- ✅ Trust conflict resolution strategy
- ✅ Want frictionless workflow

**When NOT to use**:
- ❌ New to status sync (test manually first)
- ❌ Complex workflows with custom statuses
- ❌ Multiple team members (risk of conflicts)

---

## Configuration Examples

### Example 1: GitHub Only (Simple)

```json
{
  "sync": {
    "enabled": true,
    "activeProfile": "github-default",
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
          "paused": "open",
          "abandoned": "closed"
        }
      }
    }
  }
}
```

### Example 2: JIRA with Custom Workflow

```json
{
  "sync": {
    "enabled": true,
    "activeProfile": "jira-default",
    "statusSync": {
      "enabled": true,
      "autoSync": true,
      "promptUser": false,
      "conflictResolution": "last-write-wins",
      "mappings": {
        "jira": {
          "planning": "Backlog",
          "active": "In Progress",
          "completed": "Done",
          "paused": "On Hold",
          "abandoned": "Won't Do"
        }
      }
    }
  }
}
```

### Example 3: Multi-Tool (GitHub + JIRA + ADO)

```json
{
  "sync": {
    "enabled": true,
    "activeProfile": "github-default",
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

---

## Conflict Resolution Migration

### Old Behavior (v0.19.x)

No conflict detection - last write always won (silently).

### New Behavior (v0.20.0+)

Conflicts detected and resolved based on strategy:

```json
{
  "sync": {
    "statusSync": {
      "conflictResolution": "prompt"
    }
  }
}
```

**Available strategies**:

1. **`prompt`** - Ask user (recommended for migration)
2. **`last-write-wins`** - Use newest timestamp (closest to old behavior)
3. **`specweave-wins`** - Always prefer SpecWeave status
4. **`external-wins`** - Always prefer external tool status

**Recommended for migration**: Start with `prompt` to understand conflicts, then switch to `last-write-wins` once comfortable.

---

## Testing Your Migration

### Test Plan

1. **Create test increment**
   ```bash
   /specweave:increment "Migration test"
   ```

2. **Link to external tool**
   ```bash
   /specweave-github:create-issue 0998-migration-test
   ```

3. **Complete increment**
   ```bash
   /specweave:done 0998
   ```

4. **Verify sync**
   - ✅ Prompt appears (if `promptUser: true`)
   - ✅ GitHub issue closes when selecting "Yes"
   - ✅ Sync event logged to `.specweave/logs/sync-events.json`

5. **Test bidirectional sync**
   ```bash
   # Close GitHub issue manually
   # Then sync from external:
   /specweave-github:sync-from 0998
   ```
   - ✅ Prompt appears about SpecWeave status change
   - ✅ Selecting "Yes" updates SpecWeave to `completed`

6. **Test conflict resolution**
   ```bash
   # Change SpecWeave status to "active"
   # Change GitHub status to "closed"
   # Then sync:
   /specweave-github:sync 0998
   ```
   - ✅ Conflict detected
   - ✅ Prompt shows both statuses with timestamps
   - ✅ Resolution works based on selected option

---

## Backwards Compatibility

### What Still Works

✅ **Old sync commands** - `/specweave-github:sync` still works
✅ **Existing metadata** - Old `metadata.json` files compatible
✅ **Profiles** - Sync profiles unchanged

### What Changed

❌ **No silent overwrites** - Conflicts now detected and resolved
❌ **Mappings required** - Must define status mappings in config
❌ **Prompts by default** - Auto-sync must be explicitly enabled

### Breaking Changes

**None!** The old sync system continues to work. New status sync is opt-in via `statusSync.enabled: true`.

---

## Rollback Plan

If you need to revert to old sync:

1. **Disable status sync**
   ```json
   {
     "sync": {
       "statusSync": {
         "enabled": false
       }
     }
   }
   ```

2. **Restore backup config**
   ```bash
   cp .specweave/config.json.backup .specweave/config.json
   ```

3. **Use old sync commands**
   ```bash
   /specweave-github:sync 0001 --legacy-mode
   ```

---

## Troubleshooting

### Issue: Prompts not appearing

**Cause**: `promptUser` is `false` or `autoSync` is `true`

**Fix**:
```json
{
  "sync": {
    "statusSync": {
      "promptUser": true,
      "autoSync": false
    }
  }
}
```

### Issue: Invalid status mapping error

**Cause**: SpecWeave status doesn't have mapping defined

**Fix**: Add missing mapping:
```json
{
  "sync": {
    "statusSync": {
      "mappings": {
        "github": {
          "paused": "open"  ← Add this
        }
      }
    }
  }
}
```

### Issue: Sync fails silently

**Cause**: `statusSync.enabled` is `false`

**Fix**:
```json
{
  "sync": {
    "statusSync": {
      "enabled": true
    }
  }
}
```

### Issue: Conflicts not detected

**Cause**: Using `specweave-wins` or `external-wins` strategy

**Fix**: Switch to `prompt` to see conflicts:
```json
{
  "sync": {
    "statusSync": {
      "conflictResolution": "prompt"
    }
  }
}
```

---

## FAQ

### Q: Do I need to migrate all increments at once?

**A**: No! Migration is incremental. Old increments continue working. New increments use new sync automatically.

### Q: Can I use both old and new sync?

**A**: Yes, but not recommended. Old sync is deprecated and will be removed in v1.0.0.

### Q: What happens to old sync logs?

**A**: Old logs are preserved. New logs go to `.specweave/logs/sync-events.json`.

### Q: How do I test without affecting production?

**A**: Use test increments (e.g., `0999-test-sync`) or dry-run mode:
```bash
/specweave-github:sync 0001 --dry-run
```

---

## Next Steps

1. [Status Sync Guide](./status-sync-guide.md) - Complete user guide
2. [Architecture](../internal/architecture/adr/0031-status-sync-architecture.md) - Technical details
3. [API Reference](../api/status-sync-api.md) - Programmatic usage

---

**Need Help?** Open an issue at https://github.com/anton-abyzov/specweave/issues
