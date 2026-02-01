---
name: lsp
description: >
  Code navigation with LSP. When user says "find references", "go to definition",
  "where defined", "show type", "list symbols", "what uses", or "who calls" -
  use native LSP tools if available, otherwise fall back to specweave lsp commands.
---

# LSP Code Intelligence

Semantic code navigation and analysis.

## Priority Order

**1. Native LSP (if plugins installed via hooks)**

If you have native LSP tools available (goToDefinition, findReferences, hover, etc.),
use those directly - they're faster and more integrated.

Check: Native LSP requires `ENABLE_LSP_TOOL=1` and LSP plugins installed by hooks.

**2. SpecWeave CLI (fallback)**

If native LSP is unavailable or not working, use `specweave lsp` commands:

```bash
# Find all references to a symbol
specweave lsp refs <file> <symbol>

# Go to definition
specweave lsp def <file> <symbol>

# Get type information (hover)
specweave lsp hover <file> <symbol>

# List all symbols in a file
specweave lsp symbols <file>

# Search workspace for symbols
specweave lsp search <query>
```

## When to Use Which

| Situation | Use |
|-----------|-----|
| Native LSP tools available | Native tools (faster) |
| Native LSP unavailable | `specweave lsp` commands |
| CI/CD or scripts | `specweave lsp` commands |
| User explicitly asks for specweave | `specweave lsp` commands |

## File Path Required (for CLI fallback)

If using `specweave lsp` and user doesn't specify a file path, find it first:

```bash
# Step 1: Find which file(s) contain the symbol
grep -rn --include="*.ts" "function symbolName\|class symbolName" .

# Step 2: Then use LSP on the found file
specweave lsp refs <found-file> <symbol>
```

## How Plugin Installation Works

SpecWeave hooks auto-install LSP plugins per project:
- `vtsls@claude-code-lsps` for TypeScript/JavaScript
- `pyright@claude-code-lsps` for Python
- `rust-analyzer@claude-code-lsps` for Rust

These require `ENABLE_LSP_TOOL=1` in the environment.

## Why SpecWeave CLI Still Exists

1. **Fallback** when plugins unavailable or broken
2. **CI/CD** environments without Claude Code
3. **Direct user access** to LSP functionality
4. **Living docs generation** uses it internally

## Performance

SpecWeave's TsServerClient (used by both systems) is **52x faster** than grep:
- Uses direct tsserver protocol (not typescript-language-server)
- Semantic analysis vs text matching
- 226 fewer false positives in typical searches
