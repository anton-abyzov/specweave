---
sidebar_position: 5
title: LSP integration
description: Semantic code navigation for any agent with specweave lsp, and how to set up language servers.
---

# LSP integration

Agents often search code with `grep`, which cannot tell a definition from a comment or a call from a string. A language server can. `specweave lsp` gives any agent that can run a shell command references, definitions, type information and symbols from the project's language servers, so Codex or Cursor get the same answers as Claude Code.

When no language server is available for a file, each command falls back to a text search and says so in its output (for example "grep fallback"), so an agent always gets an answer and knows how much to trust it.

## Commands

```bash
specweave lsp refs src/cart.ts saveDraft       # every reference to a symbol
specweave lsp def src/cart.ts saveDraft        # where it is defined
specweave lsp hover src/cart.ts saveDraft      # its type and signature
specweave lsp symbols src/cart.ts              # every symbol in a file
specweave lsp search Draft                     # symbols across the workspace
```

The first call in a fresh process indexes the workspace, which can take 10 to 30 seconds on a large project. Two helper commands manage that:

```bash
specweave lsp warmup              # pre-index the workspace (optionally pass entry files)
specweave lsp warmup --quiet
specweave lsp status              # which language servers are available, and warm-up state
```

A good habit for agents: run `specweave lsp refs` before renaming or changing the signature of anything, and include the result when listing a task's `Files`.

## Set up language servers

`specweave lsp setup` scans the project for languages and offers to install the matching Claude Code LSP plugin for each one:

```bash
specweave lsp setup                   # interactive
specweave lsp setup --dry-run         # show what it would install
specweave lsp setup --max 3 --min-files 10 --scope user
```

| Option | Effect |
|---|---|
| `-n, --max <number>` | Suggest at most this many languages (default 5) |
| `--min-files <number>` | Ignore languages with fewer files than this (default 5) |
| `--dry-run` | Print the plan, install nothing |
| `--scope <scope>` | `user`, `project` (default) or `local` |

The plugins only configure which server to run; the server binary itself must be installed. Common ones:

| Language | Install |
|---|---|
| TypeScript, JavaScript | `npm install -g typescript-language-server typescript` |
| Python | `pip install pyright` |
| Go | `go install golang.org/x/tools/gopls@latest` |
| Rust | `rustup component add rust-analyzer` |
| C, C++ | install `clangd` from your package manager |

## Claude Code's built-in LSP tool

Claude Code has its own LSP tool, which it enables with an environment variable. `specweave lsp setup` and `specweave lsp status` warn when it is not set:

```bash
export ENABLE_LSP_TOOL=1
```

`specweave lsp` works with or without it, and in every tool.

## Troubleshooting

| Symptom | Check |
|---|---|
| Output says "grep fallback" or "regex fallback" | The language server binary is missing or not on `PATH`. Run `specweave lsp status` |
| First call is slow | Indexing. Run `specweave lsp warmup` at the start of a session |
| Types are missing or wrong | The project config the server needs: `tsconfig.json`, `pyproject.toml` or `pyrightconfig.json`, `go.mod` |

## See also

- [Commands reference](/docs/reference/commands)
- [Codex, Grok, Cursor and other tools](/docs/integrations/generic-ai-tools)
