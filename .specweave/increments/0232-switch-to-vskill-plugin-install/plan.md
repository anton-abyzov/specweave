# Implementation Plan: Switch Plugin Installation to vskill

## Overview

Replace Claude Code's native marketplace system (`claude plugin install/marketplace`) with vskill CLI across all SpecWeave installation paths. The vskill monorepo at `vskill/` provides the foundation (scanner, agent registry, CLI scaffolding); this increment completes the CLI and integrates it into SpecWeave's plugin lifecycle.

## Architecture

### Current Flow (to be replaced)
```
specweave init → claude plugin marketplace add → claude plugin install sw@specweave
lazy loading  → detect-intent → claude plugin install sw-X@specweave
refresh       → specweave refresh-marketplace → claude plugin install (per plugin)
```

### New Flow
```
specweave init → vskill add --plugin sw → Tier 1 scan → install to cache → enable in settings
lazy loading  → detect-intent → vskill add --plugin sw-X (fast-path: check vskill.lock first)
refresh       → specweave refresh-plugins → vskill update (per plugin from marketplace.json)
```

### Components
- **vskill CLI** (`vskill/packages/cli/`): Extended `add` command with `--plugin` flag for multi-plugin repos
- **vskill scanner** (`vskill/packages/scanner/`): Existing Tier 1 scanner + agent registry (no changes needed)
- **marketplace.ts** (new in vskill): Parses `.claude-plugin/marketplace.json` for plugin discovery
- **settings.ts** (new in vskill): Manages `~/.claude/settings.json` enablement
- **refresh-plugins.ts** (new in specweave): Replaces refresh-marketplace, delegates to vskill
- **migrate-to-vskill.ts** (new in specweave): One-time migration for existing users

## Architecture Decisions

### ADR-1: Keep marketplace.json as plugin registry
- vskill web registry not operational yet
- marketplace.json is version-controlled, proven, integrated into detection
- vskill reads it locally from the repo

### ADR-2: Rename refresh-marketplace -> refresh-plugins
- "marketplace" is Claude Code-specific; "plugins" is universal
- Deprecated alias with warning for backward compat

### ADR-3: Fast-path lockfile check for lazy loading
- Check vskill.lock (<1ms local read) before any vskill invocation
- Only scan/install truly new plugins

### ADR-4: Local vskill (no npm publish)
- Use local monorepo path during this increment
- npm publish deferred to 0225

### ADR-5: Full plugin directory support in vskill add
- Extend `add` command for Claude Code plugin structure
- Copy entire directory tree, fix permissions, scan all files

## Implementation Phases

### Phase 1: Foundation (vskill CLI)
Extend vskill CLI to handle full Claude Code plugins:
- `--plugin <name>` flag for multi-plugin repos
- marketplace.json parser
- lockfile extensions
- settings.json management
- Cache directory installation

### Phase 2: Integration (SpecWeave)
Wire SpecWeave to use vskill:
- New `refresh-plugins` command
- Deprecated `refresh-marketplace`
- Modified `plugin-installer.ts`
- Modified lazy loading hook
- Migration command

### Phase 3: Documentation & Testing
- Update CLAUDE.md, docs-site, 34 PLUGIN.md files
- Unit tests for vskill extensions
- Integration tests for full pipeline

## Technical Challenges

### Challenge 1: Claude Code Hot-Reload
**Problem**: Claude Code may require `claude plugin install` call for hot-reload
**Solution**: Test if filesystem changes in `~/.claude/plugins/cache/` trigger reload. If not, use lightweight `claude plugin install` as final registration step after vskill places files.
**Risk**: Medium - worst case is "install now, use on next session" for lazy loading

### Challenge 2: Hook Latency
**Problem**: vskill scan takes longer than cached `claude plugin install`
**Solution**: Fast-path lockfile check + local marketplace cache (no git clone needed)
**Risk**: Low - Tier 1 scan is pattern-matching, not LLM, should be <500ms

### Challenge 3: Scanner False Positives
**Problem**: SpecWeave hooks contain `rm -rf`, `chmod`, `curl` patterns
**Solution**: Trusted-publisher bypass for `anton-abyzov/specweave` in scanner
**Risk**: Low - can add safe-context rules
