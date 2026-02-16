# Per-Project Plugin Configuration

**Status**: Proposed (v1.0.140+)
**Author**: SpecWeave Team
**Last Updated**: 2026-01-21
**Related**: [Issue #16458 Option 3](https://github.com/anthropics/claude-code/issues/16458)

## Problem Statement

Users install plugins globally but only need a subset per project:

| Scenario | Problem |
|----------|---------|
| 20 plugins installed globally | 60k tokens consumed at startup |
| Project A: React dashboard | Only needs: frontend, testing (~5k tokens) |
| Project B: K8s infrastructure | Only needs: k8s, infrastructure (~4k tokens) |
| Project C: ML pipeline | Only needs: ml, backend (~4k tokens) |

**Current state**: All 20 plugins load for ALL projects = wasted context.

## Proposed Solution

### Configuration Hierarchy

```
┌─────────────────────────────────────────────────┐
│  1. Global (~/.claude/plugins/)                  │
│     └── All installed plugins                    │
├─────────────────────────────────────────────────┤
│  2. Project (.specweave/config.json)             │
│     └── enabled/disabled overrides               │
├─────────────────────────────────────────────────┤
│  3. Session (CLI flags)                          │
│     └── --enable-plugin / --disable-plugin       │
├─────────────────────────────────────────────────┤
│  4. Auto-detect (LLM)                            │
│     └── Load on-demand based on prompt           │
└─────────────────────────────────────────────────┘

Priority: Session > Project > Auto-detect > Global
```

### Configuration Schema

```json
// .specweave/config.json
{
  "plugins": {
    // Explicit list of plugins to enable for this project
    "enabled": [
      "specweave-frontend",
      "specweave-testing"
    ],

    // Explicit list of plugins to disable (even if auto-detected)
    "disabled": [
      "specweave-ml",
      "specweave-kafka"
    ],

    // Whether to auto-detect unlisted plugins via LLM
    // Default: true
    "autoDetect": true,

    // Optional: Plugin-specific configuration
    "config": {
      "specweave-frontend": {
        "framework": "react",
        "cssFramework": "tailwind"
      }
    }
  }
}
```

### Behavior Matrix

| Plugin State | Auto-Detect | Result |
|--------------|-------------|--------|
| In `enabled` | N/A | Always loaded |
| In `disabled` | N/A | Never loaded |
| Not listed | `true` | Loaded if LLM detects need |
| Not listed | `false` | Not loaded |

### Example Configurations

#### Frontend Project
```json
{
  "plugins": {
    "enabled": ["specweave-frontend", "specweave-testing"],
    "disabled": ["specweave-ml", "specweave-kafka", "specweave-kubernetes"],
    "autoDetect": true
  }
}
```

#### Kubernetes/DevOps Project
```json
{
  "plugins": {
    "enabled": [
      "specweave-kubernetes",
      "specweave-infrastructure",
      "specweave-github"
    ],
    "disabled": ["specweave-frontend", "specweave-mobile"],
    "autoDetect": false
  }
}
```

#### ML Pipeline Project
```json
{
  "plugins": {
    "enabled": ["specweave-ml", "specweave-backend"],
    "autoDetect": true
  }
}
```

#### Minimal/Fast Mode
```json
{
  "plugins": {
    "enabled": ["specweave"],
    "disabled": [],
    "autoDetect": false
  }
}
```

## Implementation Plan

### Phase 1: Configuration Support (v1.0.140)

1. **Schema Definition**
   - Add `plugins` field to config schema
   - Validate enabled/disabled plugin names
   - Default `autoDetect: true`

2. **Config Reader Update**
   ```typescript
   // src/core/config/config-reader.ts
   interface PluginConfig {
     enabled?: string[];
     disabled?: string[];
     autoDetect?: boolean;
     config?: Record<string, unknown>;
   }
   ```

3. **Plugin Loader Integration**
   ```typescript
   // src/core/lazy-loading/plugin-loader.ts
   async function getPluginsToLoad(
     projectConfig: PluginConfig,
     detectedPlugins: string[]
   ): Promise<string[]> {
     const { enabled = [], disabled = [], autoDetect = true } = projectConfig;

     // Start with explicitly enabled
     const plugins = new Set(enabled);

     // Add auto-detected if enabled
     if (autoDetect) {
       for (const plugin of detectedPlugins) {
         if (!disabled.includes(plugin)) {
           plugins.add(plugin);
         }
       }
     }

     return Array.from(plugins);
   }
   ```

### Phase 2: Hook Integration (v1.0.141)

Update `user-prompt-submit` hook to respect project config:

```typescript
// In hook logic
const projectConfig = readProjectConfig();
const detectedPlugins = await detectPluginsViaLLM(userPrompt);

// Filter by project config
const pluginsToLoad = filterByProjectConfig(
  detectedPlugins,
  projectConfig.plugins
);

// Install only filtered plugins
await installPlugins(pluginsToLoad);
```

### Phase 3: CLI Support (v1.0.142)

Add CLI commands for project plugin management:

```bash
# Show project plugin config
specweave plugins status

# Enable a plugin for this project
specweave plugins enable frontend

# Disable a plugin for this project
specweave plugins disable ml

# List all available plugins
specweave plugins list --available

# Generate recommended config based on codebase analysis
specweave plugins detect --write
```

### Phase 4: UI Integration (v1.0.143)

VS Code extension sidebar:
- Toggle plugins on/off per project
- Show token cost per plugin
- Recommend plugins based on project type

## Token Budget Visualization

```
┌─────────────────────────────────────────────────────────────┐
│ Context Budget: 200k tokens                                  │
├─────────────────────────────────────────────────────────────┤
│ ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ 15k tokens used (7.5%)                                       │
│                                                              │
│ Plugins loaded:                                              │
│ • specweave-frontend     5k tokens  ████░░░░░░░░░░░░░░░░░░  │
│ • specweave-testing      4k tokens  ███░░░░░░░░░░░░░░░░░░░  │
│ • specweave (core)       3k tokens  ██░░░░░░░░░░░░░░░░░░░░  │
│ • CLAUDE.md              3k tokens  ██░░░░░░░░░░░░░░░░░░░░  │
│                                                              │
│ Plugins disabled (not loaded):                               │
│ • specweave-ml          [disabled by project config]         │
│ • specweave-kafka       [disabled by project config]         │
│ • specweave-kubernetes  [not detected, autoDetect: true]     │
└─────────────────────────────────────────────────────────────┘
```

## Migration Path

### Existing Projects

No migration needed. Default behavior:
- `enabled: []` (none explicit)
- `disabled: []` (none explicit)
- `autoDetect: true` (current LLM detection)

### New Projects

`specweave init` will:
1. Analyze codebase for technologies
2. Suggest initial plugin list
3. Write config with recommended settings

```bash
$ specweave init .
Analyzing codebase...
Detected: React, TypeScript, Playwright

Recommended plugins:
  ✓ specweave-frontend (React components found)
  ✓ specweave-testing (Playwright tests found)
  ✓ specweave-backend (API routes found)

Write to .specweave/config.json? [Y/n]
```

## Compatibility

### Claude Code Native

If Claude Code implements per-project configs natively (via `.claude/settings.local.json`), SpecWeave will:
1. Read Claude Code's config as fallback
2. Merge with SpecWeave's config (SpecWeave takes priority)
3. Allow migration command: `specweave plugins migrate-from-claude`

### Plugin Marketplace

Plugin authors can specify:
```json
// plugin.json
{
  "name": "specweave-frontend",
  "suggestFor": ["react", "vue", "angular", "svelte"],
  "conflictsWith": ["specweave-mobile"],
  "tokenCost": 5000
}
```

## Success Metrics

| Metric | Target |
|--------|--------|
| Context usage reduction | >80% for focused projects |
| Config adoption | >50% of projects have custom config |
| User satisfaction | Reduced "context full" errors |
| Startup time | <2s for configured projects |

## Related Work

- [Issue #16458](https://github.com/anthropics/claude-code/issues/16458): Per-project plugin configs
- [Issue #7336](https://github.com/anthropics/claude-code/issues/7336): Lazy loading for MCP
- Claude Code `.claude/settings.local.json` pattern
- VS Code workspace settings precedent
