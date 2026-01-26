# ADR-0225: Plugin Cache Architecture

**Date**: 2026-01-14
**Status**: Accepted

## Context

SpecWeave users reported that skills weren't activating in their projects. Investigation revealed that the Claude Code plugin cache was stale - source files had been updated but the cached copies weren't refreshed.

Understanding the cache architecture is critical for:
1. **Users**: Knowing when to refresh plugins
2. **Contributors**: Understanding how changes propagate
3. **Debugging**: Diagnosing skill activation issues

## Decision

### Cache Architecture Overview

```
Source (GitHub)                     Cache (~/.claude/plugins/cache/)
─────────────────                   ─────────────────────────────────
plugins/specweave/                  specweave/
├── .claude-plugin/                 └── 1.0.114/
│   └── plugin.json                     ├── .claude-plugin/
├── skills/                             │   └── plugin.json
│   ├── architect/SKILL.md              ├── skills/
│   └── pm/SKILL.md                     │   ├── architect/SKILL.md
├── hooks/                              │   └── pm/SKILL.md
│   └── hooks.json                      └── hooks/
└── agents/                                 └── hooks.json
```

### Key Insight: Cache Copies Are Used at Runtime

**Claude Code DOES NOT read from source directories.** When you run a skill, Claude Code reads from:

```
~/.claude/plugins/cache/specweave/{plugin-name}/{version}/
```

NOT from:
```
{project}/plugins/{plugin-name}/
```

### Why This Matters

1. **Editing source doesn't affect runtime** - Changes to `plugins/specweave/skills/architect/SKILL.md` won't be used until cache is updated
2. **Version mismatch causes staleness** - If cache version differs from source version, old code runs
3. **`claude plugin install` skips existing** - If plugin is already installed, it doesn't update

### Staleness Detection

Cache staleness can be detected by comparing:
- **Timestamps**: Source file mtime vs cache file mtime
- **Content hash**: SHA-256 of source vs cached content
- **Version numbers**: plugin.json version field

Use `specweave cache-status` to check health.

## Cache Lifecycle

### 1. Installation

When `claude plugin install specweave` runs:

```
Source plugin directory
        ↓
    Copy to cache
        ↓
~/.claude/plugins/cache/specweave/{plugin}/{version}/
```

### 2. At Runtime

When Claude Code activates a skill:

```
User prompt contains skill keywords
        ↓
Claude Code matches against skill descriptions in cache
        ↓
Loads SKILL.md from cache (NOT source)
        ↓
Skill content injected into conversation
```

### 3. Updates (The Problem)

```bash
# This does NOT update cache if plugin exists:
claude plugin install specweave  # "Already installed, skipping"

# This DOES update cache:
claude plugin uninstall specweave && claude plugin install specweave
# OR
specweave refresh-marketplace --force
```

## Solution: Force Reinstall

Added `--force` flag to `specweave refresh-marketplace`:

```bash
# Force fresh cache for all plugins
specweave refresh-marketplace --force
```

Implementation:
1. Uninstall plugin first (`claude plugin uninstall`)
2. Delete cache directory (`rm -rf ~/.claude/plugins/cache/specweave/{plugin}`)
3. Install fresh copy (`claude plugin install`)

## Consequences

### Positive

- **Clear mental model**: Users understand cache vs source
- **Diagnostic tool**: `specweave cache-status` shows health
- **Reliable updates**: `--force` guarantees fresh cache
- **Cross-platform skills**: `specweave export-skills` converts to Agent Skills format

### Negative

- **Extra step required**: Users must run `refresh-marketplace --force` after updates
- **Cache invalidation complexity**: Multiple plugins with different versions
- **Disk space**: Cache duplicates source files

## Cache Health Commands

```bash
# Check all plugin cache health
specweave cache-status

# Check specific plugin
specweave cache-status sw

# Check if GitHub has newer version
specweave cache-status --check-github

# Force refresh all plugins
specweave refresh-marketplace --force

# Verbose mode to see what's happening
specweave refresh-marketplace --force --verbose
```

## Troubleshooting Guide

### Symptom: Skills Not Activating

**Cause**: Cache is stale, skills have outdated descriptions

**Fix**:
```bash
specweave refresh-marketplace --force
# Restart Claude Code
```

### Symptom: Old Behavior Despite Code Changes

**Cause**: Changes are in source but not cache

**Fix**:
```bash
specweave cache-status --check-github  # Verify staleness
specweave refresh-marketplace --force   # Update cache
```

### Symptom: Hooks Not Running

**Cause**: hooks.json not updated in cache

**Fix**:
```bash
specweave refresh-marketplace --force
```

## Related Documentation

- [PLUGINS-INDEX.md](../../../../plugins/PLUGINS-INDEX.md) - Plugin catalog
- [Troubleshooting](../../../troubleshooting/README.md) - Common issues
