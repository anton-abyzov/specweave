# Stale Plugin References

## Problem

After updating SpecWeave, you see "Plugin not found" errors for plugins that no longer exist in the marketplace:

```
Plugin Errors

  ❯ sw-tooling@specweave
     Plugin 'sw-tooling' not found in marketplace 'specweave'
     → Plugin may not exist in marketplace 'specweave'
```

## Root Cause

1. **Plugin was removed/renamed** in the SpecWeave marketplace
2. **Your `~/.claude/settings.json` still references it** from previous installation
3. **Claude Code validates enabled plugins** against marketplace on startup
4. **Validation fails** because plugin no longer exists

## Solution

### Automatic Cleanup (v0.35.2+)

Stale plugins are automatically cleaned up when you run:

```bash
specweave init .
```

The init command now includes automatic stale plugin detection and removal.

### Manual Cleanup

Run the cleanup command:

```bash
specweave cleanup-plugins
```

Or with verbose output:

```bash
specweave cleanup-plugins --verbose
```

Dry run (see what would be removed without removing):

```bash
specweave cleanup-plugins --dry-run
```

## What Gets Removed

The cleanup tool removes plugin references that:

1. **Don't exist in marketplace.json** anymore
2. **Are in the known removed plugins list**:
   - `sw-tooling` (removed 2025-12-11, functionality moved to core `/sw:skill`)
   - `sw-plugin-dev` (removed 2026-02-02, functionality moved to core `/sw:skill`)

## Files Modified

- `~/.claude/settings.json` - Your Claude Code settings
  - Removes `"plugin-name@specweave": true` entries for non-existent plugins

## Prevention

This is a normal part of framework evolution. Plugins are occasionally:
- **Renamed** - functionality moved to better-named plugin
- **Merged** - features consolidated into existing plugins
- **Deprecated** - no longer maintained

The automatic cleanup (v0.35.2+) prevents these errors from appearing.

## Related

- **ADR-0195**: Stale Plugin Reference Cleanup ([adr/0195-stale-plugin-cleanup.md](../architecture/adr/0195-stale-plugin-cleanup.md))
- **Plugin Installation**: [plugin-installation.md](plugin-installation.md)
