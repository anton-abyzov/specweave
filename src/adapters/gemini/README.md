# Gemini CLI Adapter

**Automation Level**: Semi (Good experience with 1M context window and agent mode)

## Overview

The Gemini CLI adapter provides **semi-automation** for SpecWeave using Google's open-source Gemini CLI tool with **AGENTS.md** as the universal instruction file.

## Key Features

- **1M Token Context Window**: Handle massive specifications
- **Agent Mode**: Multi-file task completion with approval workflow
- **MCP Support**: Model Context Protocol for extensibility
- **Built-in Tools**: File operations, shell commands, Google Search, web fetching
- **Free Tier**: Gemini 2.5 Pro included (60 req/min, 1K req/day)
- **Open Source**: Apache 2.0 license

## Installation

```bash
# Install Gemini CLI
npm install -g @google-cloud/gemini-cli

# Authenticate
gemini auth

# Initialize SpecWeave project with Gemini adapter
npx specweave init my-project --adapter gemini
```

## How It Works

Gemini CLI reads **AGENTS.md** (universal instruction file) for SpecWeave context:

```bash
gemini "Read AGENTS.md and create increment for user authentication"
```

Gemini will:
1. Read AGENTS.md for project structure and roles
2. Adopt PM role: Create spec.md (WHAT/WHY)
3. Adopt Architect role: Create plan.md (HOW)
4. Create tasks.md (implementation checklist)
5. Use agent mode for multi-file operations

## Universal AGENTS.md

Instead of tool-specific files (.cursorrules, copilot instructions), SpecWeave uses **AGENTS.md** that works with ALL tools:

- ✅ Gemini CLI
- ✅ Codex (OpenAI)
- ✅ Cursor
- ✅ GitHub Copilot
- ✅ ANY AI tool

**Single source of truth** = easier maintenance!

## Example Workflows

### Create Feature
```bash
gemini "Read AGENTS.md. Create increment 0002 for payment processing with Stripe."
```

### Implement Task
```bash
gemini "Read increment 0002, implement task T001"
```

### Context Loading (70%+ Token Savings)
```bash
gemini "Read context-manifest.yaml from increment 0001, load only those files, then implement T001"
```

## Comparison with Claude Code

| Feature | Claude Code | Gemini CLI |
|---------|-------------|------------|
| **Automation** | Full | Semi |
| **Context** | 200k tokens | 1M tokens (5x!) |
| **Skills** | Native | Via AGENTS.md |
| **Agents** | Native (separate contexts) | Via AGENTS.md (manual adoption) |
| **Hooks** | Yes (auto-update) | No (manual) |
| **Cost** | Paid | Free tier available |
| **Open Source** | No | Yes (Apache 2.0) |

## Links

- [Gemini CLI Documentation](https://developers.google.com/gemini-code-assist/docs/gemini-cli)
- [GitHub Repository](https://github.com/google-gemini/gemini-cli)
- [SpecWeave Website](https://spec-weave.com)

---

**Status**: Active (v0.2.0+)
**Market Share**: Growing (Google's AI coding tool)
**Priority**: P1 (high impact - 1M context window!)
