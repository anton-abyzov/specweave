---
name: lsp
description: >
  MANDATORY: When user says "LSP", "findReferences", "find references", "go to definition",
  "where defined", "show type", "list symbols", "what uses", or "who calls" - YOU MUST use
  specweave lsp commands via Bash (NOT grep). This skill provides the commands to use.
---

# LSP Code Intelligence

Use SpecWeave's LSP CLI for semantic code navigation and analysis.

## IMPORTANT: File Path Required

**If the user does NOT specify a file path, you MUST first find the file:**

```bash
# Step 1: Find which file(s) contain the symbol
grep -rn --include="*.ts" "function symbolName\|class symbolName" .

# Step 2: Then use LSP on the found file
specweave lsp refs <found-file> <symbol>
```

**Example:**
User says: "Find references to sayHello"
1. First: `grep -rn --include="*.ts" "function sayHello" .` → finds `src/utils.ts`
2. Then: `specweave lsp refs src/utils.ts sayHello`

## How to Use

**Use Bash tool with `specweave lsp` commands:**

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

## Command Reference

| Command | Purpose | Example |
|---------|---------|---------|
| `lsp refs` | Find all usages of a symbol | `specweave lsp refs src/api.ts handleRequest` |
| `lsp def` | Navigate to symbol definition | `specweave lsp def src/utils.ts formatDate` |
| `lsp hover` | Get type signature and docs | `specweave lsp hover src/models.ts User` |
| `lsp symbols` | List all symbols in file | `specweave lsp symbols src/index.ts` |
| `lsp search` | Find symbols across workspace | `specweave lsp search Controller` |

## When to Use LSP vs Grep

| Task | Use LSP | Use Grep |
|------|---------|----------|
| Find function usages | ✅ `lsp refs` | ❌ |
| Navigate to definition | ✅ `lsp def` | ❌ |
| Get type information | ✅ `lsp hover` | ❌ |
| Search text patterns | ❌ | ✅ `Grep tool` |
| Find in comments | ❌ | ✅ `Grep tool` |
| Case-insensitive search | ❌ | ✅ `Grep -i` |

**Rule of thumb**: Use LSP for symbols, Grep for text patterns.

## Examples

### Example 1: Find All References Before Refactoring

User: "Find all references to handleAutoCommand"

```bash
specweave lsp refs src/cli/commands/auto.ts handleAutoCommand
```

Output:
```
References to 'handleAutoCommand':

  bin/specweave.js:473:1
  bin/specweave.js:474:1
  src/cli/commands/auto.ts:82:5
  src/cli/commands/auto.ts:96:24

Total: 4 references
```

### Example 2: Go to Definition

User: "Where is processArgs defined?"

```bash
specweave lsp def src/cli/commands/auto.ts processArgs
```

### Example 3: Get Type Information

User: "What's the type signature of handleAutoCommand?"

```bash
specweave lsp hover src/cli/commands/auto.ts handleAutoCommand
```

### Example 4: List All Exports

User: "What functions are exported from lsp.ts?"

```bash
specweave lsp symbols src/cli/commands/lsp.ts
```

### Example 5: Search Workspace

User: "Find all Command classes"

```bash
specweave lsp search Command
```

## Supported Languages

| Language | Server Required | Auto-detected by |
|----------|-----------------|------------------|
| TypeScript/JS | `typescript-language-server` | `tsconfig.json`, `package.json` |
| Python | `pyright` or `pylsp` | `requirements.txt`, `pyproject.toml` |
| C#/.NET | `csharp-ls` | `*.csproj`, `*.sln` |
| Go | `gopls` | `go.mod` |
| Rust | `rust-analyzer` | `Cargo.toml` |

## Fallback Behavior

If LSP is unavailable (server not installed, timeout, etc.):
1. Commands automatically fall back to grep-based search
2. Results show "(grep fallback)" in output
3. Still functional, but less precise for symbol resolution

## Requirements

Language servers must be installed globally:

```bash
# TypeScript (most common)
npm install -g typescript-language-server typescript

# Python
pip install pyright

# Go
go install golang.org/x/tools/gopls@latest

# Rust
rustup component add rust-analyzer
```

## Decision Tree for Claude

```
User asks about code navigation?
│
├─ "Find references to X" or "What uses X" or "Who calls X"
│   └─ Use: specweave lsp refs <file> <symbol>
│
├─ "Go to definition" or "Where is X defined"
│   └─ Use: specweave lsp def <file> <symbol>
│
├─ "What type is X" or "Show signature of X"
│   └─ Use: specweave lsp hover <file> <symbol>
│
├─ "List symbols in file" or "What's exported"
│   └─ Use: specweave lsp symbols <file>
│
├─ "Find symbol X in workspace" or "Search for X"
│   └─ Use: specweave lsp search <query>
│
└─ Text search, patterns, comments
    └─ Use: Grep tool (not LSP)
```

## Why This Exists

Claude Code's built-in LSP has known bugs (GitHub Issues #15148, #16291, #20050).
This skill provides direct access to language servers via SpecWeave's CLI,
bypassing the broken infrastructure.
