# ADR-0195: Automatic Stale Plugin Reference Cleanup

**Status**: Accepted
**Date**: 2025-12-12
**Context**: Plugin evolution, marketplace updates
**Impact**: User experience, error prevention

---

## Context

### The Problem

When SpecWeave plugins are removed, renamed, or refactored:

1. **User's `~/.claude/settings.json` retains old references**
   - Example: `"sw-tooling@specweave": true`
2. **Claude Code validates plugins on startup**
   - Checks if enabled plugins exist in registered marketplaces
3. **Validation fails for removed plugins**
   - Shows "Plugin not found" errors in `/plugin` UI
4. **Users see confusing errors** they can't easily fix

### Real Example (2025-12-11)

```
Plugin 'sw-tooling' not found in marketplace 'specweave'
```

**Root cause**:
- `sw-tooling` plugin was removed from `marketplace.json`
- Functionality moved to core SpecWeave (now `/sw:skill` command)
- User's settings still had `"sw-tooling@specweave": true`

### Why This Happens

- **Marketplace evolves**: Plugins get renamed, merged, deprecated
- **Settings persist**: User's enabled plugins list is stateful
- **No auto-sync**: Claude Code doesn't auto-remove missing plugins
- **Manual cleanup required**: Users must edit `~/.claude/settings.json`

---

## Decision

**Implement automatic stale plugin cleanup** in SpecWeave framework.

### Solution Components

#### 1. Cleanup Utility (`src/utils/cleanup-stale-plugins.ts`)

```typescript
export async function cleanupStalePlugins(
  marketplaceJsonPath: string,
  verbose: boolean = false
): Promise<CleanupResult>
```

**Algorithm**:
1. Read `~/.claude/settings.json`
2. Load `marketplace.json` to get valid plugin list
3. Compare enabled plugins against marketplace
4. Remove plugins that:
   - Don't exist in marketplace
   - Are in `REMOVED_PLUGINS` list
5. Write back cleaned settings

**Known removed plugins**:
```typescript
const REMOVED_PLUGINS = new Set([
  'sw-tooling',    // Removed 2025-12-11 (→ core /sw:skill)
  'sw-plugin-dev', // Removed 2026-02-02 (→ core /sw:skill)
]);
```

#### 2. Automatic Cleanup in `specweave init`

**Integration point**: `src/cli/helpers/init/plugin-installer.ts`

```typescript
// After marketplace refresh, before plugin installation
const cleanupResult = await cleanupStalePlugins(marketplaceJsonPath, false);

if (cleanupResult.removedCount > 0) {
  console.log(`🧹 Removed ${cleanupResult.removedCount} stale plugin(s)`);
}
```

**Timing**: Runs BEFORE plugin installation to ensure clean state.

#### 3. Manual Cleanup Command

**New CLI command**: `specweave cleanup-plugins`

```bash
# Show and remove stale plugins
specweave cleanup-plugins

# Dry run (preview only)
specweave cleanup-plugins --dry-run

# Verbose output
specweave cleanup-plugins --verbose
```

**Location**: `src/cli/commands/cleanup-plugins.ts`

---

## Consequences

### Positive

✅ **Zero manual intervention** - Users never see stale plugin errors
✅ **Automatic cleanup** - Runs during `specweave init`
✅ **Safe operation** - Only removes non-existent plugins
✅ **Manual control** - `cleanup-plugins` command for troubleshooting
✅ **Clear feedback** - Shows what was removed and why
✅ **Future-proof** - `REMOVED_PLUGINS` list for known migrations

### Negative

⚠️ **Settings modification** - Edits user's `~/.claude/settings.json`
⚠️ **No undo** - Once removed, plugin must be re-enabled manually
⚠️ **Race condition** - If user has multiple terminals, settings may conflict

### Mitigations

- **Read marketplace first** - Only remove truly non-existent plugins
- **Verbose logging** - Show exactly what's being removed
- **Dry-run mode** - Preview changes before applying
- **Error handling** - Graceful failure if settings.json locked

---

## Alternatives Considered

### 1. Manual Documentation

**Rejected** because:
- Users unlikely to find documentation
- Requires technical knowledge to edit JSON
- High friction, poor UX

### 2. Claude Code Built-in Cleanup

**Rejected** because:
- We don't control Claude Code codebase
- May never be implemented upstream
- SpecWeave can solve this now

### 3. Warning Instead of Removal

**Rejected** because:
- Still shows confusing errors
- Doesn't fix the problem
- Requires user action anyway

---

## Implementation Details

### Files Modified

**New files**:
- `src/utils/cleanup-stale-plugins.ts` - Core cleanup logic
- `src/cli/commands/cleanup-plugins.ts` - CLI command
- `.specweave/docs/internal/troubleshooting/stale-plugin-references.md` - User docs

**Modified files**:
- `src/cli/helpers/init/plugin-installer.ts` - Added automatic cleanup

### Cleanup Logic

```typescript
// 1. Load valid plugins from marketplace
const marketplace = JSON.parse(fs.readFileSync(marketplaceJsonPath));
const validPlugins = new Set(marketplace.plugins.map(p => p.name));

// 2. Find stale plugins in settings
for (const [pluginKey, enabled] of Object.entries(settings.enabledPlugins)) {
  const pluginName = pluginKey.split('@')[0];
  const marketplace = pluginKey.split('@')[1];

  if (marketplace === 'specweave' && !validPlugins.has(pluginName)) {
    stalePlugins.push(pluginKey);
  }
}

// 3. Remove stale plugins
stalePlugins.forEach(key => delete settings.enabledPlugins[key]);

// 4. Write back
fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
```

### Safety Checks

- ✅ Only modifies `specweave` marketplace plugins
- ✅ Preserves other marketplace plugins
- ✅ Preserves disabled plugin entries
- ✅ Validates marketplace.json exists
- ✅ Handles missing settings.json gracefully

---

## Testing Strategy

### Unit Tests

```bash
npm test -- cleanup-stale-plugins.test.ts
```

**Test cases**:
- ✅ Removes plugins not in marketplace
- ✅ Keeps valid plugins
- ✅ Keeps other marketplace plugins
- ✅ Handles missing settings.json
- ✅ Handles malformed JSON

### Integration Tests

```bash
# 1. Enable sw-tooling manually
echo '{"enabledPlugins":{"sw-tooling@specweave":true}}' > ~/.claude/settings.json

# 2. Run cleanup
specweave cleanup-plugins

# 3. Verify removed
grep "sw-tooling" ~/.claude/settings.json  # Should fail
```

### End-to-End Test

```bash
# 1. Fresh init with stale plugin in settings
specweave init .

# 2. Should auto-cleanup during init
# 3. No "Plugin not found" errors in /plugin UI
```

---

## Migration Guide

### For Users

**No action required!** Cleanup happens automatically during:
- `specweave init .` (automatic)
- `specweave cleanup-plugins` (manual)

### For Contributors

**When removing a plugin**:

1. **Remove from `marketplace.json`**:
   ```diff
   -  {
   -    "name": "sw-old-plugin",
   -    "description": "...",
   -    ...
   -  }
   ```

2. **Add to `REMOVED_PLUGINS` list**:
   ```typescript
   // src/utils/cleanup-stale-plugins.ts
   const REMOVED_PLUGINS = new Set([
     'sw-old-plugin', // Removed YYYY-MM-DD (reason)
   ]);
   ```

3. **Document in ADR**:
   - Why plugin was removed
   - Migration path (if applicable)
   - Replacement plugin (if any)

---

## Monitoring

### Success Metrics

- **Zero stale plugin errors** reported by users
- **Cleanup runs successfully** in init flow
- **Settings.json corruption**: 0 incidents

### Failure Scenarios

**If cleanup fails**:
1. **Log error** but don't block init
2. **Show manual fix** in error message
3. **Report to telemetry** (if enabled)

**Manual fallback**:
```bash
# Edit settings manually
vim ~/.claude/settings.json

# Remove stale plugin entries
# Delete lines like: "sw-old-plugin@specweave": true
```

---

## Related Decisions

- **ADR-0032**: Plugin Installation and Validation
- **ADR-0060**: Marketplace Registration (GitHub Mode)
- **ADR-0129**: Multi-Plugin Installation Strategy

---

## References

- **Issue**: Recurring `sw-tooling@specweave` error in `/plugin` UI
- **Fix**: Automatic cleanup in `specweave init` (v0.35.2+)
- **User Impact**: Eliminates confusing errors, improves first-run UX
- **Code**: `src/utils/cleanup-stale-plugins.ts`, `src/cli/commands/cleanup-plugins.ts`
