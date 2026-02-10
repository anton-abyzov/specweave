# Plan: 0182-remove-custom-plugin-cache

## Architecture Decision

**Decision**: Remove SpecWeave's custom plugin cache management and rely on Claude Code's native plugin system.

**Rationale**:
1. **Duplication**: Claude Code already manages plugin installation, versioning, and scopes
2. **Bugs**: Custom cache deletion broke all commands (session-start.sh incident)
3. **Complexity**: 5+ files (~1500 LOC) duplicating native functionality
4. **State pollution**: Custom throttle files persist forever

## Files to Delete

```
src/core/plugin-cache/
├── cache-manager.ts        # DELETE - 300+ lines
├── cache-health-monitor.ts # DELETE - 200+ lines
├── cache-invalidator.ts    # DELETE - 150+ lines
├── cache-metadata.ts       # DELETE - 100+ lines
├── startup-checker.ts      # DELETE - 200+ lines (causes .cache-check-throttle)
├── types.ts                # KEEP (shared types may be used elsewhere)
└── index.ts                # UPDATE (remove deleted exports)
```

## Commands to Remove

```
src/cli/commands/
├── cache-status.ts   # DELETE
├── cache-refresh.ts  # DELETE (functionality merged into refresh-marketplace)
└── cache.ts          # DELETE (if exists)
```

## Files to Update

### 1. refresh-marketplace.ts
**Before**: Custom cache invalidation, metadata tracking
**After**: Simple loop over `claude plugin install --force`

```typescript
// NEW: Simplified implementation
async function refreshPlugin(pluginName: string): Promise<void> {
  const result = await execAsync(`claude plugin install ${pluginName}@specweave --force`);
  if (result.exitCode !== 0) {
    throw new Error(`Failed to refresh ${pluginName}`);
  }
}
```

### 2. CLI index (command registration)
Remove registration of `cache-status` and `cache-refresh` commands.

### 3. Lazy loading (if using custom state)
Update `src/core/lazy-loading/cache-manager.ts` to:
- Remove `plugins-loaded.json` usage
- Read from `~/.claude/plugins/installed_plugins.json` instead

### 4. Hooks
Verify hooks already use `installed_plugins.json` (they do from v1.0.175).

## Dependencies to Check

```bash
# Find all imports of cache modules
grep -r "from.*plugin-cache" src/
grep -r "cache-manager" src/
grep -r "cache-health-monitor" src/
grep -r "startup-checker" src/
```

## Testing Strategy (TDD)

1. **RED**: Write tests that verify deleted modules are gone
2. **GREEN**: Delete the modules, fix build errors
3. **REFACTOR**: Clean up any remaining references

## Migration for Users

No migration needed - this is internal refactoring. Users should:
1. Use `claude plugin install X@specweave` for fresh installs
2. Use `specweave refresh-marketplace` for bulk updates (still works)
3. Use `claude plugin list` to see installed plugins

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking refresh-marketplace | Test thoroughly before merging |
| Missing imports | Full grep scan before deletion |
| State file orphans | Add cleanup for existing files |

## Success Metrics

- Build passes
- All tests pass
- `refresh-marketplace` works
- No new state files created
- Reduced codebase by ~1000 LOC
