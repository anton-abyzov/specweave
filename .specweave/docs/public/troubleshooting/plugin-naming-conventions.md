# Plugin Naming Conventions

SpecWeave plugins use two naming systems that must be used correctly in different contexts.

## The Two Naming Systems

| System | Format | Examples |
|--------|--------|----------|
| **Marketplace names** | `sw`, `sw-*` | `sw`, `sw-frontend`, `sw-github`, `sw-router` |
| **Directory names** | `specweave`, `specweave-*` | `specweave`, `specweave-frontend`, `specweave-github` |

## When to Use Each Format

### Use Marketplace Names (`sw-*`) For:

1. **Claude CLI commands**:
   ```bash
   claude plugin install sw@specweave
   claude plugin install sw-frontend@specweave
   ```

2. **API inputs** (function parameters):
   ```typescript
   await cacheManager.installPlugins({ plugins: ['sw', 'sw-github'] });
   ```

3. **LLM responses** (detectPluginsViaLLM returns these):
   ```typescript
   const result = await detectPluginsViaLLM(prompt);
   // result.plugins = ['sw-frontend', 'sw-backend']
   ```

4. **Registry keys** in `~/.claude/plugins/installed_plugins.json`:
   ```json
   {
     "plugins": {
       "sw-router@specweave": [{ "scope": "user", ... }],
       "sw-github@specweave": [{ "scope": "user", ... }]
     }
   }
   ```

5. **State files** (`loadedPlugins` array):
   ```json
   {
     "loadedPlugins": ["sw", "sw-github", "sw-frontend"]
   }
   ```

6. **Keyword detector constants**:
   ```typescript
   // keyword-detector.ts
   PLUGIN_GROUPS = { frontend: 'sw-frontend', ... }
   KEYWORD_PLUGIN_MAP = { react: 'sw-frontend', ... }
   ```

### Use Directory Names (`specweave-*`) For:

1. **Filesystem paths** (marketplace directories):
   ```
   ~/.claude/plugins/marketplaces/specweave/plugins/specweave-frontend/
   ~/.claude/plugins/marketplaces/specweave/plugins/specweave-github/
   ```

2. **Test mocks for directories**:
   ```typescript
   createMockPlugin(path, 'specweave');
   createMockPlugin(path, 'specweave-frontend');
   ```

## Conversion Functions

The `cache-manager.ts` module provides conversion functions:

```typescript
import {
  marketplaceNameToDirectory,
  directoryToMarketplaceName
} from './cache-manager.js';

// Convert marketplace name to directory name
marketplaceNameToDirectory('sw')          // → 'specweave'
marketplaceNameToDirectory('sw-frontend') // → 'specweave-frontend'

// Convert directory name to marketplace name
directoryToMarketplaceName('specweave')          // → 'sw'
directoryToMarketplaceName('specweave-frontend') // → 'sw-frontend'
```

## Common Issues

### 1. Wrong Format in Registry Check

```typescript
// ❌ WRONG - using directory name for registry check
isPluginRegistered('specweave-router');  // Registry uses 'sw-router@specweave'

// ✅ CORRECT - using marketplace name
isPluginRegistered('sw-router');
```

### 2. Wrong Format in Plugin Map

```typescript
// ❌ WRONG - using directory names in keyword map
const KEYWORD_PLUGIN_MAP = {
  react: 'specweave-frontend',  // Should be 'sw-frontend'
};

// ✅ CORRECT - using marketplace names
const KEYWORD_PLUGIN_MAP = {
  react: 'sw-frontend',
  nodejs: 'sw-backend',
};
```

### 3. Mixed Formats in Tests

When testing, always use the appropriate format:

```typescript
// For CLI commands (marketplace names)
execFileNoThrowSync('claude', ['plugin', 'install', 'sw-frontend@specweave']);

// For checking filesystem (directory names)
fs.existsSync(path.join(marketplacePath, 'specweave-frontend'));

// Both can be checked with fallback mapping
const PLUGIN_FOLDER_TO_SHORT = {
  specweave: 'sw',
  'specweave-frontend': 'sw-frontend',
  'specweave-router': 'sw-router',
  // ...
};
```

## Cache Directory Structure

The installed plugin cache uses marketplace names in registry but stores files with specific paths:

```
~/.claude/plugins/
├── installed_plugins.json           # Uses: sw-frontend@specweave
└── cache/
    └── specweave/                   # Marketplace name
        └── sw-frontend/             # Plugin short name (not specweave-frontend!)
            └── 1.0.0/               # Version
                └── hooks/           # Plugin files
```

**Important**: The cache directory uses `sw-frontend`, not `specweave-frontend`. This is different from the marketplace source directory.

| Location | Name Format | Example |
|----------|-------------|---------|
| Registry key | `sw-*@specweave` | `sw-frontend@specweave` |
| Cache path | `specweave/sw-*/version/` | `cache/specweave/sw-frontend/1.0.0/` |
| Marketplace source | `specweave-*` | `marketplaces/specweave/plugins/specweave-frontend/` |

## Key Rules

1. **Registry keys**: Always use `sw-*@specweave` format
2. **Cache paths**: Use `sw-*` (short name) under `specweave/` directory
3. **Marketplace source**: Use `specweave-*` format
4. **API calls**: Always use `sw-*` format
5. **Use conversion functions** when crossing between contexts

## Related

- [Plugin Management Guide](../guides/plugin-management.md)
- [Plugin Auto-Reinstall Issues](./plugin-auto-reinstall.md)
- [VSCode Debug Child Processes](./vscode-debug-child-processes.md)
