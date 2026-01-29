# ADR-0231: LSP Integration Architecture Reality Check

**Status**: Accepted
**Date**: 2026-01-29
**Category**: Integration
**Increment**: 0177-lsp-integration-fixes

## Context

Investigation revealed significant gaps between documented LSP capabilities and actual behavior:

1. **TypeScript LSP not in OFFICIAL_PLUGIN_MAP** - The most common language had no keyword mappings (FIXED)
2. **LSP tools require explicit enablement** - `ENABLE_LSP_TOOL=1` environment variable is required
3. **Binary ≠ Plugin** - lsp-check.sh only verifies binaries, not plugin registration

## Investigation Findings

### ENABLE_LSP_TOOL Environment Variable (CONFIRMED)

**LSP tools require explicit enablement:**

```bash
# Enable for single session
ENABLE_LSP_TOOL=1 claude

# Enable permanently (add to shell profile)
export ENABLE_LSP_TOOL=1
```

- **Added in**: Claude Code 2.0.74 (December 2025)
- **Current version**: 2.1.23
- **Status**: Still requires manual enablement (not default)

### LSP Capabilities When Enabled

When `ENABLE_LSP_TOOL=1` is set, Claude gets access to:

| Operation | Purpose | Performance |
|-----------|---------|-------------|
| `goToDefinition` | Jump to symbol definition | ~50ms |
| `findReferences` | Find all usages | ~50ms vs 45s grep |
| `hover` | Type info and documentation | ~50ms |
| `documentSymbol` | List symbols in file | ~50ms |
| `findImplementations` | Find interface implementations | ~50ms |
| `callHierarchy` | Trace call paths | ~50ms |

**Performance gain**: ~900x faster than grep-based search.

### LSP Plugin Architecture (Two Separate Systems)

| System | Protocol | Configuration | How It Works |
|--------|----------|---------------|--------------|
| MCP plugins | MCP (tools/resources) | `.mcp.json` | Claude calls MCP server |
| LSP plugins | LSP (textDocument/*) | `lspServers` in manifest | Claude Code's native LSP client |

**Key Insight**: LSP plugins do NOT use MCP. They're handled by Claude Code's built-in LSP infrastructure.

### Plugin Registration vs Functionality

```
Plugin installed → Shows "enabled" in /plugin list
Binary missing → Plugin appears "enabled" but does nothing
Binary present + Plugin missing → No LSP functionality
ENABLE_LSP_TOOL not set → Tools not exposed to Claude
```

### Supported Languages (11 official)

Python, TypeScript, Go, Rust, Java, C/C++, C#, PHP, Kotlin, Ruby, HTML/CSS

## Decision

1. **Add TypeScript mappings to OFFICIAL_PLUGIN_MAP** ✅ DONE
2. **Document ENABLE_LSP_TOOL requirement** in documentation
3. **Update SpecWeave docs** to reflect actual capabilities
4. **Enhance lsp-check.sh** to verify plugin installation (not just binaries)

## TypeScript Mappings Added

```typescript
// Added to OFFICIAL_PLUGIN_MAP in official-plugin-manager.ts
'typescript': 'typescript-lsp',
'ts': 'typescript-lsp',
'javascript': 'typescript-lsp',
'js': 'typescript-lsp',
'react': 'typescript-lsp',
'nextjs': 'typescript-lsp',
'next.js': 'typescript-lsp',
'vue': 'typescript-lsp',
'angular': 'typescript-lsp',
'svelte': 'typescript-lsp',
'node': 'typescript-lsp',
'nodejs': 'typescript-lsp',
'express': 'typescript-lsp',
'nestjs': 'typescript-lsp',
```

## Consequences

### Positive
- TypeScript projects get LSP suggestions automatically
- Documentation accurately reflects reality
- Users understand LSP requires explicit enablement

### Negative
- Users must manually enable ENABLE_LSP_TOOL
- Documentation needs significant updates

### Neutral
- LSP provides explicit tools (not just background enhancement)
- Plugin architecture remains the same

## References

- [Claude Code LSP Hacker News Discussion](https://news.ycombinator.com/item?id=46355165)
- [Claude Code Plugin Docs](https://code.claude.com/docs/en/discover-plugins)
- [cclsp MCP Server](https://github.com/ktnyt/cclsp)
- ADR-0226: Claude Code Official Plugin Integration Strategy
- `src/core/lazy-loading/official-plugin-manager.ts`
- `plugins/specweave/scripts/lsp-check.sh`
