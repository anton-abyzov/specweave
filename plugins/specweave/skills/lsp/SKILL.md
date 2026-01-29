---
name: lsp
description: Direct LSP (Language Server Protocol) code intelligence for any language. Use for findReferences, goToDefinition, hover, and symbol search. Works with TypeScript, Python, C#, Go, Rust. Bypasses Claude Code's built-in LSP (which has known bugs).
---

# SpecWeave LSP Skill

Direct access to Language Server Protocol features for code intelligence.

## When to Use This Skill

Use this skill when the user asks for:
- "Find all references to X"
- "Go to definition of X"
- "Where is X defined?"
- "Show me the type of X"
- "List symbols in file X"
- "Search for symbol X in workspace"

## Implementation

This skill uses the existing SpecWeave LSP infrastructure:
- `src/core/lsp/lsp-client.ts` - Low-level JSON-RPC client
- `src/core/lsp/lsp-manager.ts` - Multi-language manager

### Usage Pattern

```typescript
import { getGlobalLSPManager, shutdownGlobalLSPManager } from 'src/core/lsp/lsp-manager.js';

// Get the LSP manager (auto-initializes)
const lspManager = getGlobalLSPManager(projectRoot);

// Find references
const refs = await lspManager.findReferences('src/file.ts', line, character);

// Go to definition
const def = await lspManager.goToDefinition('src/file.ts', line, character);

// Get hover info (types, docs)
const hover = await lspManager.hover('src/file.ts', line, character);

// List symbols in file
const symbols = await lspManager.documentSymbols('src/file.ts');

// Search workspace for symbol
const wsSymbols = await lspManager.workspaceSymbols('MyClass');

// Cleanup when done
await shutdownGlobalLSPManager();
```

## Supported Languages

| Language | Server | Detection |
|----------|--------|-----------|
| TypeScript/JavaScript | `typescript-language-server` | `tsconfig.json`, `package.json` |
| Python | `pyright-langserver` or `pylsp` | `requirements.txt`, `pyproject.toml` |
| C#/.NET | `csharp-ls` | `*.csproj`, `*.sln` |
| Go | `gopls` | `go.mod` |
| Rust | `rust-analyzer` | `Cargo.toml` |

## Position Calculation

LSP positions are 0-indexed:
- `line`: 0-based line number (first line = 0)
- `character`: 0-based character offset

To find a symbol position:
1. Read the file
2. Count lines (0-indexed)
3. Find character offset within the line (0-indexed)

## Response Formats

### findReferences

```typescript
{
  locations: [
    {
      uri: 'file:///path/to/file.ts',
      range: {
        start: { line: 10, character: 5 },
        end: { line: 10, character: 15 }
      }
    }
  ],
  success: true
}
```

### goToDefinition

```typescript
{
  location: {
    uri: 'file:///path/to/definition.ts',
    range: {
      start: { line: 5, character: 0 },
      end: { line: 5, character: 20 }
    }
  },
  success: true
}
```

### hover

```typescript
{
  contents: '(method) MyClass.myMethod(): void',
  range: { start: {...}, end: {...} },
  success: true
}
```

### documentSymbols

```typescript
{
  symbols: [
    {
      name: 'MyClass',
      kind: 5, // Class
      location: {...},
      containerName: undefined
    },
    {
      name: 'myMethod',
      kind: 6, // Method
      location: {...},
      containerName: 'MyClass'
    }
  ],
  success: true
}
```

## Symbol Kinds

| Kind | Name |
|------|------|
| 1 | File |
| 2 | Module |
| 3 | Namespace |
| 4 | Package |
| 5 | Class |
| 6 | Method |
| 7 | Property |
| 8 | Field |
| 9 | Constructor |
| 10 | Enum |
| 11 | Interface |
| 12 | Function |
| 13 | Variable |
| 14 | Constant |
| 15 | String |
| 16 | Number |
| 17 | Boolean |
| 18 | Array |

## Requirements

Language servers must be installed globally:

```bash
# TypeScript
npm install -g typescript-language-server typescript

# Python
pip install pyright
# or
pip install python-lsp-server

# C#
dotnet tool install -g csharp-ls

# Go
go install golang.org/x/tools/gopls@latest

# Rust
rustup component add rust-analyzer
```

## Fallback Behavior

If LSP is not available for a file type:
1. The manager returns `null`
2. Fall back to grep-based search
3. Results are less precise but still useful

## Example: Find All References

User: "Find all references to handleAutoCommand in src/cli/commands/auto.ts"

Steps:
1. Identify file: `src/cli/commands/auto.ts`
2. Find symbol position (read file, locate `handleAutoCommand`)
3. Call `lspManager.findReferences('src/cli/commands/auto.ts', line, char)`
4. Format and display results

## Why This Skill Exists

Claude Code's built-in LSP has known bugs (GitHub Issues #15148, #16291, #20050). This skill provides direct access to language servers via JSON-RPC, bypassing Claude Code's broken infrastructure.
