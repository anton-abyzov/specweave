---
sidebar_position: 5
title: LSP Integration
description: LSP is enabled by default for enterprise documentation and codebase analysis
---

# LSP Integration Guide

Claude Code 2.0.74+ includes native **Language Server Protocol (LSP)** support. **USE LSP ACTIVELY** - it's 100x faster and more accurate than grep for semantic code understanding.

## Understanding the LSP Ecosystem

**Two components work together:**

| Component | What It Is | How It Works |
|-----------|------------|--------------|
| **LSP Tool** | Claude Code's built-in operations (`goToDefinition`, `findReferences`, etc.) | Always available when language server is installed |
| **LSP Plugins** | Configuration for language servers from [official marketplace](https://github.com/anthropics/claude-plugins-official) | Work **AUTOMATICALLY** when editing code files |

### How LSP Plugins Work (AUTOMATIC)

LSP plugins (e.g., `csharp-lsp`, `typescript-lsp`) activate **automatically** based on file extension:

```
Edit .cs file → csharp-lsp activates → Type info, references, diagnostics available
Edit .ts file → typescript-lsp activates → TypeScript intelligence available
Edit .py file → pyright-lsp activates → Python type hints available
```

**You don't invoke LSP plugins** - they work transparently in the background.

## Why LSP is a Key SpecWeave Feature

### Token & Cost Efficiency (100x savings)

```
SCENARIO: "Find all usages of calculateTax() across codebase"

WITHOUT LSP:                          WITH LSP:
├── Grep for pattern (~45s)           ├── findReferences (~50ms)
├── Read 10-15 files (~10K tokens)    ├── Returns exact locations (~500 bytes)
├── Parse context manually            ├── Includes types & signatures
├── May miss aliased imports          ├── Catches ALL usages semantically
└── Total: ~45s, 10K+ tokens          └── Total: ~50ms, ~500 tokens
```

**Result**: 100x faster, 20x fewer tokens, semantically accurate.

### When LSP Saves You Money

| Operation | Without LSP | With LSP | Savings |
|-----------|-------------|----------|---------|
| Find all references | Read ~15 files (15K tokens) | LSP query (500 tokens) | 30x |
| Check type errors | Build + parse output (5K) | getDiagnostics (1K) | 5x |
| Navigate to definition | Grep + verify (8K) | goToDefinition (200) | 40x |
| Map module structure | Read entire file (10K) | documentSymbol (1K) | 10x |

## Smart LSP Integration (ADR-0222)

**LSP is EXEMPT from the "Code First, Tools Second" rule** (ADR-0140) because:
- LSP responses are small (~100-5000 bytes) - no context bloat
- LSP provides semantic precision that regex cannot match
- LSP is built into Claude Code - zero tool definition overhead

**Use LSP for precision, code execution for bulk processing.**

| Without LSP (--no-lsp) | With LSP (DEFAULT) |
|------------------------|-------------------|
| Grep-based symbol search (~45s) | Semantic symbol resolution (~50ms) |
| Text-based import parsing | Accurate dependency graphs |
| Limited type inference | Full type hierarchy |
| May miss indirect references | Complete reference tracking |
| Pattern matching for APIs | Precise API surface extraction |

**Performance gain**: ~100x faster symbol resolution with semantic accuracy.

## When to Use LSP (PROACTIVE)

**Don't wait for LSP to "activate automatically" - USE IT ACTIVELY:**

| Scenario | LSP Operation | Command Example |
|----------|---------------|-----------------|
| Before refactoring | `findReferences` | "Use LSP findReferences to find all usages of calculateTax" |
| Navigate to source | `goToDefinition` | "Use goToDefinition to find where PaymentService is defined" |
| Understand module | `documentSymbol` | "Use documentSymbol to map the API surface of auth.ts" |
| Check types | `hover` | "Use hover to check the type of processOrder function" |
| Code quality | `getDiagnostics` | "Use getDiagnostics on this file to check for issues" |

**ALWAYS use findReferences before any refactoring operation.**

## Real-World Scenarios: When LSP Gets Used

### During SpecWeave Increment Implementation

| Phase | What Happens | LSP Involvement |
|-------|--------------|-----------------|
| **Planning** (`/sw:pm`, `/sw:architect`) | Analyzing existing codebase | LSP maps dependencies, types |
| **Implementation** (`/sw:do`) | Writing code | LSP provides diagnostics automatically |
| **Refactoring** | Changing existing code | `findReferences` before ANY change |
| **Code Review** | Verifying changes | `getDiagnostics` to catch errors |
| **Living Docs** (`/sw:living-docs`) | Generating documentation | LSP extracts accurate API signatures |

### Scenario 1: Renaming a Function

```
User: "Rename calculateTax to computeTax"

WITHOUT LSP:
1. Grep for "calculateTax" (finds text matches)
2. Read each file to verify it's the right function
3. May miss: re-exports, dynamic imports, interface implementations
4. Risk: Breaking changes not caught

WITH LSP:
1. findReferences("calculateTax") → Exact list of ALL usages
2. Rename with confidence
3. getDiagnostics() → Verify no type errors
4. Zero risk of missing usages
```

### Scenario 2: Understanding Unfamiliar Code

```
User: "How does the PaymentService work?"

WITHOUT LSP:
1. Grep for "PaymentService"
2. Read the class file (~500 lines)
3. Grep for imports to find dependencies
4. Read dependency files
5. Total: ~15K tokens, ~2 minutes

WITH LSP:
1. documentSymbol(PaymentService) → All methods, properties
2. hover(processPayment) → Type signature + JSDoc
3. findReferences(PaymentService) → Where it's used
4. Total: ~2K tokens, ~5 seconds
```

### Scenario 3: Adding a Feature to Existing Code

```
User: "Add logging to all database operations"

WITHOUT LSP:
1. Grep for "database" patterns
2. Read each file to understand context
3. Manually identify all DB operations
4. Risk: Missing some operations

WITH LSP:
1. findReferences(DatabaseService) → All usages
2. documentSymbol(DatabaseService) → All methods
3. getDiagnostics() after changes → Catch type errors
4. Complete coverage, type-safe changes
```

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
- [Getting Started](/docs/quick-start)
- [Command Reference](/docs/guides/command-reference-by-priority)
