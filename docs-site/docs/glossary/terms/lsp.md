---
title: LSP (Language Server Protocol)
description: Protocol for semantic code understanding - ENABLED BY DEFAULT in SpecWeave
---

# LSP (Language Server Protocol)

**Language Server Protocol (LSP)** is an open standard that enables code editors and IDEs to provide language-specific features like auto-completion, go-to-definition, and find-references without implementing language-specific logic.

## Enabled by Default in SpecWeave

**LSP is ENABLED BY DEFAULT** for all SpecWeave operations including `specweave init` and `/sw:living-docs`. Just install language servers for your stack.

## In Claude Code

Claude Code 2.0.74+ includes native LSP support, providing:

| Operation | Description |
|-----------|-------------|
| `goToDefinition` | Jump to where a symbol is defined |
| `findReferences` | Find all usages of a symbol |
| `documentSymbol` | View file structure and hierarchy |
| `hover` | Display type information and docs |
| `getDiagnostics` | Get errors, warnings, hints |

## Performance Impact

- **Without LSP**: Grep-based search ~45 seconds for large codebases
- **With LSP**: Semantic resolution ~50 milliseconds

**Result**: ~100x faster with semantic accuracy.

## SpecWeave Integration

LSP runs automatically for all SpecWeave operations:

```bash
# Full scan (LSP enabled by default)
/sw:living-docs --full-scan

# Init also uses LSP automatically
specweave init

# Disable only if needed (not recommended):
/sw:living-docs --no-lsp
```

LSP provides:
- Accurate API surface extraction
- Semantic dependency graphs
- Dead code detection
- Type hierarchy maps
- Cross-module relationships

## Supported Languages

Pre-built support for: TypeScript, JavaScript, Python, Go, Rust, C/C++, Java, Kotlin, C#, PHP, Ruby, Lua, Swift, and more.

## Setup

Install language servers for your project:

```bash
# TypeScript/JavaScript
npm install -g typescript-language-server typescript

# Python
pip install pyright

# Go
go install golang.org/x/tools/gopls@latest
```

## Related

- [LSP Integration Guide](/docs/guides/lsp-integration)
- [Living Docs](/docs/glossary/terms/living-docs)
