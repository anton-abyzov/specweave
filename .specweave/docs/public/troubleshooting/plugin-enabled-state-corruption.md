# Plugin Enabled State Corruption

**Issue Class**: Settings Corruption via CLI Side Effects
**Severity**: CRITICAL
**Affected Components**: All code using `claude plugin uninstall`

## Problem Statement

The `claude plugin uninstall` command has a dangerous side effect: it can **corrupt or reset the entire `enabledPlugins` object** in `~/.claude/settings.json`, disabling plugins that weren't targeted for uninstallation.

### Root Cause

When `claude plugin uninstall <plugin>` executes, it:
1. Removes the plugin from disk
2. **Modifies `~/.claude/settings.json`** to remove the plugin from `enabledPlugins`
3. **MAY corrupt or reset other entries** in the `enabledPlugins` object as a side effect

This means uninstalling `sw-frontend@specweave` can accidentally disable `sw@specweave`.

## Evidence

### Case 1: User-Prompt-Submit Hook (FIXED in v1.0.250)

**Location**: `plugins/specweave/hooks/user-prompt-submit.sh` (lines 244-250)

```bash
# Scope guard migrates domain plugins from user → project scope
for plugin_key in $POLLUTED_PLUGINS; do
  if timeout 5 claude plugin uninstall "$plugin_key" >/dev/null 2>&1; then
    # ⚠️ This can corrupt enabledPlugins and disable sw@specweave!
    if timeout 10 claude plugin install "$plugin_key" --scope project >/dev/null 2>&1; then
      MIGRATED="${MIGRATED}${plugin_key}"
    fi
  fi
done
```

**Symptom**: `sw@specweave` shows as disabled less than a minute after init
**Timeline**: Hook runs on first user prompt → `claude plugin uninstall sw-frontend@specweave` → `sw@specweave` disabled
**Log Evidence**:
```
[2026-02-11T20:35:04] scope-guard | migrated user→project: sw-frontend@specweave
[2026-02-11T20:35:06] scope-guard | migrated user→project: sw-testing@specweave
```
Immediately after these migrations, `sw@specweave` was disabled.

**Fix**: Restore `sw@specweave` enabled state after uninstall operations (lines 259-268)

### Case 2: Cleanup Stale Plugins (POTENTIALLY VULNERABLE)

**Location**: `src/utils/cleanup-stale-plugins.ts` (line 244)

```typescript
export async function migrateUserLevelPlugins(...) {
  for (const pluginKey of toMigrate) {
    // Uninstall from user scope
    const uninstallResult = execFileNoThrowSync('claude', ['plugin', 'uninstall', pluginKey]);
    // ⚠️ This can corrupt enabledPlugins!

    // Reinstall at project scope
    const installResult = execFileNoThrowSync('claude', ['plugin', 'install', pluginKey, '--scope', 'project']);
  }
}
```

**Risk**: If this function runs when `sw@specweave` is enabled, it may disable it as collateral damage.

**Mitigation**: The function filters out `sw@specweave` via regex (line 214), so it shouldn't uninstall it. **However**, the side effect could still occur.

### Case 3: Refresh Marketplace (POTENTIALLY VULNERABLE)

**Location**: `src/cli/commands/refresh-marketplace.ts` (multiple locations)

```typescript
// Line 531: Minimal mode cleanup
for (const plugin of installedPlugins) {
  const result = uninstallPlugin(plugin);
  // ⚠️ Can corrupt enabledPlugins
}

// Line 838: Lazy mode cleanup
for (const plugin of pluginsToUninstall) {
  const uninstallResult = uninstallPlugin(plugin);
  // ⚠️ Can corrupt enabledPlugins
}
```

**Risk**: During marketplace refresh, multiple plugins are uninstalled sequentially. Each uninstall can corrupt `enabledPlugins`.

**Partial Mitigation**: Lines 913-952 clean up `enabledPlugins` manually:
```typescript
// This is SAFE - it only manipulates specific keys
for (const pluginKey of Object.keys(settings.enabledPlugins)) {
  if (pluginKey.endsWith('@specweave') && !coreEnabledPlugins.includes(pluginKey)) {
    delete settings.enabledPlugins[pluginKey];
  }
}
fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
```

**Gap**: No protection for `sw@specweave` after uninstall operations.

## General Pattern: All `claude plugin uninstall` Calls

**Search Pattern**:
```bash
grep -r "claude plugin uninstall" --include="*.ts" --include="*.sh"
```

**Found**:
- `plugins/specweave/hooks/user-prompt-submit.sh` - ✅ FIXED
- `src/utils/cleanup-stale-plugins.ts` - ⚠️ VULNERABLE
- `src/cli/commands/refresh-marketplace.ts` - ⚠️ VULNERABLE
- Tests (not production risk)

## Recommended Fixes

### Pattern 1: Restore Core Plugin After Uninstall (Shell)

**When**: Bash scripts that uninstall plugins

```bash
# After any claude plugin uninstall operations
if [[ -f "$USER_SETTINGS" ]]; then
  SW_ENABLED=$(jq -r '.enabledPlugins."sw@specweave" // "not_set"' "$USER_SETTINGS" 2>/dev/null)
  if [[ "$SW_ENABLED" != "true" ]]; then
    # Re-enable core plugin
    jq '.enabledPlugins."sw@specweave" = true' "$USER_SETTINGS" > "${USER_SETTINGS}.tmp" && \
      mv "${USER_SETTINGS}.tmp" "$USER_SETTINGS"
  fi
fi
```

### Pattern 2: Restore Core Plugin After Uninstall (TypeScript)

**When**: TypeScript code that calls `claude plugin uninstall`

```typescript
import { enablePlugin } from '../helpers/init/claude-plugin-enabler.js';

// After claude plugin uninstall operations
try {
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
  enablePlugin('sw', 'specweave', settingsPath);
} catch {
  // Non-critical - user can enable manually
}
```

### Pattern 3: Atomic Settings Update (Preferred)

**When**: You control the settings.json update

```typescript
// Don't rely on claude CLI - manipulate settings.json directly
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

// Remove specific plugins
delete settings.enabledPlugins['sw-frontend@specweave'];
delete settings.enabledPlugins['sw-github@specweave'];

// Ensure core plugin stays enabled
settings.enabledPlugins['sw@specweave'] = true;

fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
```

## Testing Strategy

### Reproduce the Bug

```bash
# 1. Enable core plugin
jq '.enabledPlugins."sw@specweave" = true' ~/.claude/settings.json > /tmp/settings.json
mv /tmp/settings.json ~/.claude/settings.json

# 2. Verify it's enabled
jq '.enabledPlugins."sw@specweave"' ~/.claude/settings.json
# Expected: true

# 3. Uninstall a different plugin
claude plugin uninstall sw-frontend@specweave

# 4. Check if core plugin is still enabled
jq '.enabledPlugins."sw@specweave"' ~/.claude/settings.json
# BUG: Returns null or false!
```

### Verify the Fix

After implementing Pattern 1/2/3, repeat the above test and verify `sw@specweave` remains `true`.

## Prevention Guidelines

### DO ✅

1. **Always protect core plugins** after `claude plugin uninstall` operations
2. **Use atomic settings.json updates** when possible (Pattern 3)
3. **Test plugin enabled state** before and after uninstall operations
4. **Log all settings.json modifications** for debugging

### DON'T ❌

1. **Don't assume** `claude plugin uninstall` only affects the target plugin
2. **Don't trust** Claude CLI to preserve unrelated settings
3. **Don't batch** uninstall operations without protection
4. **Don't forget** to re-enable core plugins after migrations

## Related Issues

- **Settings Hierarchy**: Project settings (`.claude/settings.json`) override global settings (`~/.claude/settings.json`)
- **Scope Guard**: User-level plugins are migrated to project scope on first prompt
- **Lazy Loading**: Core plugin must stay enabled for framework to function

## Checklist for Code Review

When reviewing code that manipulates plugins:

- [ ] Does it call `claude plugin uninstall`?
- [ ] Does it protect `sw@specweave` enabled state afterward?
- [ ] Does it test with multiple sequential uninstalls?
- [ ] Does it handle both global AND project settings.json?
- [ ] Does it log operations for debugging?

## Version History

- **v1.0.250**: Fixed user-prompt-submit hook (Case 1)
- **Future**: Need to audit and fix Cases 2 and 3

## See Also

- [Plugin Management Guide](../guides/plugin-management.md)
- [Settings Hierarchy](../guides/settings-hierarchy.md)
- [Troubleshooting Plugin Issues](./plugin-issues.md)
