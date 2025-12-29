---
sidebar_position: 5
title: LSP Integration
description: LSP is enabled by default for enterprise documentation and codebase analysis
---

# LSP Integration Guide

Claude Code 2.0.74+ includes native **Language Server Protocol (LSP)** support, which is **ENABLED BY DEFAULT** in SpecWeave for all operations including `specweave init` and `/sw:living-docs`.

## LSP is the Default

**You don't need to enable LSP** - it runs automatically. Just install the language servers for your stack.

| Without LSP (--no-lsp) | With LSP (DEFAULT) |
|------------------------|-------------------|
| Grep-based symbol search (~45s) | Semantic symbol resolution (~50ms) |
| Text-based import parsing | Accurate dependency graphs |
| Limited type inference | Full type hierarchy |
| May miss indirect references | Complete reference tracking |
| Pattern matching for APIs | Precise API surface extraction |

**Performance gain**: ~100x faster symbol resolution with semantic accuracy.

## LSP Operations

Claude Code provides five core LSP operations:

| Operation | Purpose | SpecWeave Use Case |
|-----------|---------|-------------------|
| `goToDefinition` | Jump to symbol definition | Navigate to function/class implementations |
| `findReferences` | Find all usages | Impact analysis for refactoring |
| `documentSymbol` | File structure/hierarchy | Module organization mapping |
| `hover` | Type info & documentation | Extract JSDoc, type signatures |
| `getDiagnostics` | Errors, warnings, hints | Code quality assessment |

## Setup

### 1. Install Language Servers

Install the language server(s) for your project's languages:

```bash
# TypeScript/JavaScript (most common)
npm install -g typescript-language-server typescript

# Python
pip install pyright
# OR
pip install python-lsp-server

# Go
go install golang.org/x/tools/gopls@latest

# Rust
rustup component add rust-analyzer

# C/C++
brew install llvm  # macOS
# OR
apt install clangd  # Ubuntu/Debian

# Java
brew install jdtls  # macOS

# Ruby
gem install solargraph

# PHP
npm install -g intelephense
```

### 2. Configure LSP (Optional)

Create `.lsp.json` in your project root for custom configuration:

```json
{
  "vtsls": {
    "command": "typescript-language-server",
    "args": ["--stdio"],
    "extensionToLanguage": {
      ".ts": "typescript",
      ".tsx": "typescriptreact",
      ".js": "javascript",
      ".jsx": "javascriptreact"
    }
  },
  "pyright": {
    "command": "pyright-langserver",
    "args": ["--stdio"],
    "extensionToLanguage": {
      ".py": "python",
      ".pyi": "python"
    }
  }
}
```

### 3. Enable LSP in Claude Code

LSP is enabled by default in Claude Code 2.0.74+. You may need to set the environment variable:

```bash
export ENABLE_LSP_TOOL=true
```

## Using LSP with SpecWeave

### Living Docs Generation (LSP Automatic)

LSP runs automatically for all living docs operations:

```bash
# Full enterprise scan (LSP enabled by default)
/sw:living-docs --full-scan

# Init also uses LSP automatically
specweave init

# LSP provides automatically:
# - Accurate API surface extraction (all exports, types, signatures)
# - Semantic dependency graphs (not just import text parsing)
# - Dead code detection (unreferenced symbols)
# - Type hierarchy maps (inheritance, implementations)
# - Cross-module relationship mapping

# Disable only if language servers unavailable (not recommended):
/sw:living-docs --full-scan --no-lsp
```

### Codebase Exploration

LSP enhances the Explore agent:

```bash
# Ask about code with semantic understanding
"Where is the UserService class defined?"
"Find all usages of the authenticateUser function"
"What's the type signature of processPayment?"
```

### Refactoring Support

Before making changes, use LSP to understand impact:

```bash
# Find all references before renaming
"Use LSP findReferences to find all usages of calculateTax"

# Check type hierarchy before modifying interfaces
"Show the type hierarchy for PaymentProvider"
```

## Supported Languages

Pre-built LSP plugins are available for:

| Language | Server | Install Command |
|----------|--------|-----------------|
| TypeScript/JavaScript | vtsls | `npm i -g typescript-language-server` |
| Python | pyright | `pip install pyright` |
| Go | gopls | `go install golang.org/x/tools/gopls@latest` |
| Rust | rust-analyzer | `rustup component add rust-analyzer` |
| C/C++ | clangd | `brew install llvm` |
| Java | jdtls | `brew install jdtls` |
| Kotlin | kotlin-language-server | `brew install kotlin-language-server` |
| C# | omnisharp | `brew install omnisharp` |
| PHP | intelephense | `npm i -g intelephense` |
| Ruby | solargraph | `gem install solargraph` |
| Lua | lua-language-server | `brew install lua-language-server` |
| Swift | sourcekit-lsp | Included with Xcode |

## Best Practices

### For Enterprise Documentation

1. **Install language servers** before running `specweave init` or `/sw:living-docs`
2. **LSP runs automatically** - no flags needed (use `--no-lsp` only if unavailable)
3. **Use LSP hover** to extract accurate type signatures for API docs
4. **Combine with Explore agent** for comprehensive codebase understanding

### For Development

1. **Use `findReferences`** before any refactoring
2. **Check `getDiagnostics`** after code changes
3. **Use `goToDefinition`** for navigation instead of grep
4. **Leverage `documentSymbol`** for understanding module structure

### For Multi-Language Projects

1. **Install all relevant language servers**
2. **Configure `.lsp.json`** for custom paths or arguments
3. **LSP works across languages** - one analysis covers entire codebase

## Troubleshooting

### LSP Not Working

```bash
# Check if language server is installed
which typescript-language-server
which pyright-langserver
which gopls

# Verify Claude Code version
claude --version  # Should be 2.0.74+

# Enable LSP tool
export ENABLE_LSP_TOOL=true
```

### Slow LSP Response

Large codebases may need initial indexing. Wait for the language server to complete indexing before running full scans.

### Missing Types

Ensure your project has proper configuration:
- TypeScript: `tsconfig.json`
- Python: `pyproject.toml` or `pyrightconfig.json`
- Go: `go.mod`

## Advanced: cclsp MCP Server

For enhanced LSP capabilities, consider the [cclsp](https://github.com/ktnyt/cclsp) MCP server:

```bash
npx cclsp@latest setup
```

cclsp provides:
- **Smart position resolution** - Handles LLM position estimation challenges
- **Robust symbol lookup** - Tries multiple position combinations
- **Safe refactoring** - Backup and rename with validation

## Related

- [Living Docs Guide](/docs/guides/intelligent-living-docs-sync)
- [Getting Started](/docs/guides/getting-started)
- [Command Reference](/docs/guides/command-reference-by-priority)
