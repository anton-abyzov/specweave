# Sync Configuration Guide

**Version**: 1.0.0
**For**: SpecWeave v0.24.0+

## Overview

SpecWeave automatically syncs your work across three levels:
1. **Living Docs** (internal documentation)
2. **Specs** (feature/module specifications)
3. **External Tools** (GitHub, JIRA, Azure DevOps)

Control WHAT syncs and WHEN using permission-based configuration.

## Quick Start

### Default Configuration (Recommended)

```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,
      "canUpdateExternalItems": true,
      "autoSyncOnCompletion": true
    },
    "github": { "enabled": true }
  }
}
```

**Result**: Living docs + GitHub issues update automatically when you complete work.

## Permission Settings

### canUpsertInternalItems

Controls living docs creation and updates.

- **`true`**: Living docs sync automatically
- **`false`**: NO sync (read-only mode)

### canUpdateExternalItems

Controls pushing changes TO external tools.

- **`true`**: SpecWeave can update GitHub/JIRA/ADO
- **`false`**: External tools remain read-only

### autoSyncOnCompletion

Controls automatic vs manual sync.

**Default**: `true` (automatic sync enabled)

- **`true`** (default): Sync happens automatically on `/specweave:done`
- **`false`**: Requires manual `/specweave-github:sync` command

### canUpdateStatus

Controls status field updates in external tools.

- **`true`**: Can mark issues as "closed"
- **`false`**: Comment-only (preserves status)

## Common Scenarios

### Full Auto-Sync (Greenfield)

```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,
      "canUpdateExternalItems": true,
      "autoSyncOnCompletion": true
    },
    "github": { "enabled": true }
  }
}
```

### Manual Sync (Staged Releases)

```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,
      "canUpdateExternalItems": true,
      "autoSyncOnCompletion": false
    }
  }
}
```

**Workflow**: Complete increment � Review docs � Manual sync when ready

### Read-Only External

```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,
      "canUpdateExternalItems": false
    }
  }
}
```

**Result**: Import from external tools, never push back.

## Troubleshooting

### "Living docs sync BLOCKED"

**Fix**: Set `canUpsertInternalItems = true` in config.json

### "Automatic sync DISABLED"

**Option 1**: Set `autoSyncOnCompletion = true`
**Option 2**: Run `/specweave-github:sync` manually

### "GitHub sync SKIPPED"

**Fix**: Set `github.enabled = true` in config.json

## Best Practices

1. **New projects**: Enable all permissions
2. **Sensitive projects**: Use manual mode (`autoSyncOnCompletion = false`)
3. **Multi-tool**: Enable only your primary tool
4. **Test first**: Use `--dry-run` before enabling auto-sync

## Reference

See `.specweave/docs/internal/architecture/hld-permissions.md` for technical architecture details.
