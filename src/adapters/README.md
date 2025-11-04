# SpecWeave Adapters

**Version**: 0.2.0 (Multi-Tool Support)

## Overview

SpecWeave adapters enable the framework to work with **ANY AI coding tool**, not just Claude Code. This directory contains all adapter implementations that provide tool-specific enhancements while maintaining a tool-agnostic core.

## Architecture

```
SpecWeave
├── Core (Tool-Agnostic)
│   └── .specweave/              # Plain Markdown + YAML
│       ├── increments/
│       └── docs/
│
└── Adapters (Optional)
    ├── Claude                    # Full automation (native)
    │   ├── .claude/skills/
    │   ├── .claude/agents/
    │   └── .claude/hooks/
    │
    ├── Cursor                    # Partial automation
    │   ├── .cursorrules (legacy)
    │   └── AGENTS.md
    │
    └── Generic                   # Limited features
        └── AGENTS.md             # Works with Copilot, ChatGPT, Gemini
```

## Available Adapters

| Adapter | Automation | Tools | Status |
|---------|------------|-------|--------|
| **Claude** | Full (skills, agents, hooks) | Claude Code | ✅ Active |
| **Cursor** | Partial (AGENTS.md, team commands, less reliable) | Cursor | ✅ Active |
| **Generic** | Limited (AGENTS.md, no hooks, manual workflow) | Copilot, ChatGPT, Gemini, etc. | ✅ Active |

**Total Market Coverage**: 100% (works with ANY AI tool)

**Note**: Claude Code is the only fully reliable option. Others have reduced features and reliability.

## Adapter Interface

All adapters implement the `IAdapter` interface defined in `adapter-interface.ts`:

```typescript
interface IAdapter {
  name: string;
  description: string;
  automationLevel: 'full' | 'semi' | 'basic' | 'manual';

  detect(): Promise<boolean>;
  checkRequirements(): Promise<RequirementsResult>;
  getFiles(): AdapterFile[];
  install(options: AdapterOptions): Promise<void>;
  postInstall(options: AdapterOptions): Promise<void>;
  getInstructions(): string;
}
```

## How Adapters Work

### 1. Claude Adapter (Full Automation)

**Files Installed**:
- `.claude/skills/` - Auto-activating skills (specweave-detector, skill-router, etc.)
- `.claude/agents/` - Specialized agents (PM, Architect, DevOps, QA, Security)
- `.claude/commands/` - Slash commands (/create-increment, /sync-docs, etc.)
- `.claude/hooks/` - Auto-update hooks (post-task-completion, etc.)

**Features**:
- Skills auto-activate based on user requests
- Agents coordinate complex workflows
- Hooks auto-update documentation
- Slash commands for quick actions
- Best-in-class experience

**Detection**: Checks for Claude Code CLI

---

### 2. Cursor Adapter (Semi-Automation)

**Files Installed**:
- `.cursorrules` - Workflow instructions for Cursor AI
- `.cursor/context/` - Context shortcut files

**Features**:
- @ shortcuts: `@increments`, `@docs`, `@strategy`
- Composer multi-file editing guided by .cursorrules
- Context manifests work via manual reference

**Workflow Instructions** (in .cursorrules):
```markdown
# SpecWeave Configuration for Cursor

## When user requests a feature:
1. Check if increment exists in `.specweave/increments/####-name/`
2. If not, create: spec.md, plan.md, tasks.md

## Context Loading (70%+ Token Reduction)
**CRITICAL**: Always read `context-manifest.yaml` first!
Only load files listed in manifest.
```

**Detection**: Checks for Cursor editor process or .cursor/ directory

---

### 3. Generic Adapter (Limited Features)

**Files Installed**:
- `AGENTS.md` - Universal instruction file for all AI tools

**Features**:
- Works with Copilot, ChatGPT, Gemini, and ANY AI tool
- AGENTS.md format (https://agents.md/)
- No automation (manual workflow)
- No hooks (manual living docs sync)
- High context usage

**Manual Guide** (SPECWEAVE.md):
```markdown
# SpecWeave Manual Workflow

## Step 1: Create Feature
```bash
mkdir -p .specweave/increments/0001-feature-name
```

## Step 2: Create spec.md
[Detailed template and instructions]

## Step 3: Load Context
Copy files listed in `context-manifest.yaml` to your AI chat.
```

**Detection**: Always returns `true` (universal fallback)

---

## Command Mechanism

**Critical Insight**: Commands work differently across tools.

### Claude Code (Native Slash Commands)
- User types `/create-increment "user auth"` in Claude chat
- Command file in `.claude/commands/create-increment.md` is loaded
- Command executes with full context

### Cursor (Instruction-Based)
- User types: "create increment for user auth"
- Cursor reads `.cursorrules` which contains workflow instructions
- AI follows instructions step-by-step

### Generic / Copilot / ChatGPT (AGENTS.md)
- All tools read `AGENTS.md` (universal standard)
- Copilot reads it automatically in VS Code
- ChatGPT/Gemini: User copies sections to chat
- Manual workflow with AI assistance

**Pattern**: AGENTS.md is the universal instruction format. Only Claude Code uses native plugins (.claude/).

## Installation

### For Users (Select Adapter)

```bash
# Auto-detect tool and install appropriate adapter
npx specweave init my-project

# Or specify adapter explicitly
npx specweave init my-project --adapter claude
npx specweave init my-project --adapter cursor
npx specweave init my-project --adapter generic  # For Copilot, ChatGPT, Gemini
```

### For Developers (Install All Adapters)

```bash
# Install all adapters to SpecWeave framework
npm run install:adapters
```

## Adding New Adapters

To add support for a new tool:

1. **Create adapter directory**: `src/adapters/your-tool/`
2. **Create adapter class**: `src/adapters/your-tool/adapter.ts`
3. **Implement IAdapter interface**
4. **Add template files**: Tool-specific instruction files
5. **Add to registry**: Update `registry.yaml`
6. **Add test cases**: Minimum 3 test cases
7. **Update CLI**: Add detection logic

**Example**:
```typescript
// src/adapters/windsurf/adapter.ts
import { AdapterBase } from '../adapter-base';

export class WindsurfAdapter extends AdapterBase {
  name = 'windsurf';
  description = 'Windsurf adapter with semi-automation';
  automationLevel = 'semi' as const;

  async detect(): Promise<boolean> {
    // Check if Windsurf is installed
    return this.commandExists('windsurf');
  }

  getFiles(): AdapterFile[] {
    return [
      {
        sourcePath: '.windsurfrules',
        targetPath: '.windsurfrules',
        description: 'Windsurf workflow instructions'
      }
    ];
  }

  getInstructions(): string {
    return `
# Windsurf Adapter Installed

Your project is now configured for Windsurf.
...
    `;
  }
}
```

## Testing Adapters

Each adapter MUST have minimum 3 test cases in `test-cases/`:

```
src/adapters/cursor/
├── adapter.ts
├── .cursorrules (template)
└── test-cases/
    ├── test-1-install.yaml
    ├── test-2-detection.yaml
    └── test-3-workflow.yaml
```

## Related Documentation

- [adapter-interface.ts](./adapter-interface.ts) - Complete interface definition
- [adapter-base.ts](./adapter-base.ts) - Base class implementation
- [registry.yaml](./registry.yaml) - List of all adapters
- [.specweave/increments/0002-multi-tool-support/](../../.specweave/increments/0002-multi-tool-support/) - Implementation plan

## Design Philosophy

**Core Principle**: Separate tool-agnostic core from tool-specific enhancements.

**Benefits**:
1. ✅ Users can switch AI tools without losing SpecWeave benefits
2. ✅ 100% market coverage (works with ANY AI)
3. ✅ No tool lock-in
4. ✅ Best experience with supported tools, functional experience with any tool
5. ✅ Easy to add support for new tools

**Inspiration**:
- **spec-kit** (GitHub): Agent-agnostic approach, plain text commands
- **BMAD-METHOD**: Portable prompt bundles work across multiple AIs

---

**Status**: Implementation in progress (Increment 0002)
**Branch**: features/002-multi-tool-support
**Target**: v0.2.0-beta.1
