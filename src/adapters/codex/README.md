# OpenAI Codex Adapter

**Automation Level**: Semi (Good experience with GPT-5-Codex and multiple access points)

## Overview

The Codex adapter provides **semi-automation** for SpecWeave using OpenAI's Codex (ChatGPT Code Interpreter/Codex CLI) with **AGENTS.md** as the universal instruction file.

## Key Features

- **GPT-5-Codex Model**: Optimized for engineering tasks
- **Multiple Access Points**: CLI, Web, IDE, GitHub, iOS app
- **Task-Based Execution**: Isolated environments per task
- **File Operations**: Read, write, execute commands
- **Test Execution**: Run tests and validate implementations
- **Real-Time Progress**: Monitor task execution (1-30 min/task)

## Installation

```bash
# Install Codex CLI (requires ChatGPT Plus/Pro/Business/Enterprise)
npm install -g openai-codex-cli

# Initialize SpecWeave project with Codex adapter
npx specweave init my-project --adapter codex
```

## How It Works

### Option 1: Codex CLI (Fastest)
```bash
codex "Read AGENTS.md and create increment for user authentication"
```

### Option 2: ChatGPT Web (Most Accessible)
1. Upload AGENTS.md file
2. Say: "Create increment for user authentication following SpecWeave"
3. Copy generated content to files

### Option 3: IDE Integration
Use Codex in your IDE (VS Code, JetBrains) with AGENTS.md reference

## Universal AGENTS.md

Instead of tool-specific files, SpecWeave uses **AGENTS.md** that works with ALL tools:

- ✅ Codex (OpenAI)
- ✅ Gemini CLI
- ✅ Cursor
- ✅ GitHub Copilot
- ✅ ANY AI tool

**Single source of truth** = easier maintenance!

## Example Workflows

### Create Feature (CLI)
```bash
codex "Read AGENTS.md. Create increment 0002 for payment processing with Stripe."
```

### Create Feature (Web)
1. Upload AGENTS.md to ChatGPT
2. Say: "Create increment for payment processing"
3. Download generated files

### Implement Task
```bash
codex "Read increment 0002, implement task T001"
```

### Fix Bug with Tests
```bash
codex "Read AGENTS.md and increment 0001. Fix auth bug. Run tests."
```

## Comparison with Claude Code

| Feature | Claude Code | Codex |
|---------|-------------|-------|
| **Automation** | Full | Semi |
| **Skills** | Native | Via AGENTS.md |
| **Agents** | Native | Via AGENTS.md |
| **Access Points** | CLI only | CLI + Web + IDE + GitHub + iOS |
| **Model** | Sonnet 4.5 | GPT-5-Codex |
| **Task Isolation** | No | Yes (isolated per task) |
| **Hooks** | Yes | No |

## Plans & Pricing

- **ChatGPT Plus**: $20/month (Codex included)
- **ChatGPT Pro**: $200/month (unlimited, faster)
- **Business/Enterprise**: Custom pricing

## Links

- [OpenAI Codex](https://openai.com/codex/)
- [ChatGPT Features](https://chatgpt.com/features/codex)
- [SpecWeave Website](https://spec-weave.com)

---

**Status**: Active (v0.2.0+)
**Market Share**: ~20% (OpenAI users)
**Priority**: P1 (high impact - most accessible AI tool)
