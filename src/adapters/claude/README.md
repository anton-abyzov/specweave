# Claude Code Adapter

**Automation Level**: Full (Best-in-class experience)

## Overview

The Claude Code adapter provides **full automation** for SpecWeave, leveraging Claude Code's native capabilities for skills, agents, hooks, and slash commands.

This adapter represents the **gold standard** - all other adapters attempt to approximate this experience within their tool's capabilities.

## Why Claude Code Provides Superior Results

**Anthropic Defines Industry Standards:**

### 1. MCP (Model Context Protocol)
- **What**: Standardized protocol for context management
- **Why**: Efficient, tool-integrated, proven pattern
- **Benefit**: Native context loading, 70%+ token reduction

### 2. Skills + Agents Architecture
- **What**: Proven pattern for AI capabilities and roles
- **Skills**: Auto-activating capabilities (specweave-detector, skill-router)
- **Agents**: Specialized roles with separate context windows (PM, Architect, DevOps)
- **Why**: Context isolation, role-based expertise, automatic activation
- **Benefit**: More accurate, faster, better UX

### 3. Native Tool Integration
- **What**: Direct access to Read, Write, Edit, Bash, Grep, Glob
- **Why**: Real-time file system access, command execution
- **Benefit**: Seamless development workflow

## What This Adapter Provides

### Skills (Auto-Activating)
| Skill | Purpose | Activation |
|-------|---------|------------|
| `specweave-detector` | Detect SpecWeave projects | Always (proactive) |
| `skill-router` | Route requests to appropriate skills/agents | Automatic |
| `context-loader` | Load context manifests (70%+ token savings) | When loading context |
| `increment-planner` | Plan features with context awareness | When creating features |
| `role-orchestrator` | Coordinate multi-agent workflows | Complex tasks |
| `brownfield-analyzer` | Analyze existing codebases | Brownfield projects |

**Plus 18+ more skills** (see `src/skills/`)

### Agents (Specialized Roles)
| Agent | Role | When Used |
|-------|------|-----------|
| `pm` | Product Manager | Requirements, user stories |
| `architect` | System Architect | Design, ADRs, architecture |
| `devops` | DevOps Engineer | Infrastructure, deployment |
| `qa-lead` | QA Lead | Test strategy, test cases |
| `security` | Security Engineer | Threat modeling, audits |
| `tech-lead` | Technical Lead | Code review, best practices |
| `frontend` | Frontend Developer | UI implementation |
| `python-backend` | Python Backend Dev | FastAPI, Django APIs |
| `nodejs-backend` | Node.js Backend Dev | Express, NestJS APIs |
| `nextjs` | Next.js Specialist | Next.js apps |

**Plus 10+ more agents** (see `src/agents/`)

### Slash Commands
| Command | Purpose |
|---------|---------|
| `/create-increment` | Create new feature increment |
| `/review-docs` | Review strategic documentation |
| `/sync-github` | Sync to GitHub issues |
| `/create-project` | Bootstrap new project |

**Plus more commands** (see `.claude/commands/`)

### Hooks (Auto-Update)
| Hook | Purpose |
|------|---------|
| `post-task-completion` | Auto-update docs after tasks |
| `pre-implementation` | Check regression risk |
| `docs-changed` | Validate documentation |

## Installation

```bash
# Install SpecWeave with Claude adapter (default)
npx specweave init my-project

# Or explicitly specify Claude adapter
npx specweave init my-project --adapter claude

# Install skills and agents
cd my-project
npm run install:skills
npm run install:agents
```

## Directory Structure

```
.claude/
├── skills/                 # Auto-activating capabilities
│   ├── specweave-detector/
│   ├── skill-router/
│   ├── context-loader/
│   └── ...
├── agents/                 # Specialized roles
│   ├── pm/
│   ├── architect/
│   ├── devops/
│   └── ...
├── commands/               # Slash commands
│   ├── create-increment.md
│   ├── review-docs.md
│   └── ...
└── hooks/                  # Auto-update mechanisms
    ├── post-task-completion.sh
    ├── pre-implementation.sh
    └── ...
```

## Usage Examples

### Example 1: Create Feature (Full Automation)

**User**: "Create increment for user authentication"

**What Happens** (Automatic):
1. ✅ `specweave-detector` skill activates (detects SpecWeave project)
2. ✅ `skill-router` routes to `increment-planner`
3. ✅ `increment-planner` invokes `pm` agent
4. ✅ `pm` agent creates `spec.md` (WHAT/WHY)
5. ✅ `increment-planner` invokes `architect` agent
6. ✅ `architect` agent creates `plan.md` (HOW)
7. ✅ `increment-planner` creates `tasks.md` (implementation steps)
8. ✅ `context-loader` creates `context-manifest.yaml` (70%+ token savings)

**Result**: Complete increment ready for implementation!

### Example 2: Review Documentation

**User**: `/review-docs`

**What Happens** (Automatic):
1. ✅ Slash command loads `.claude/commands/review-docs.md`
2. ✅ Reviews strategic docs (.specweave/docs/internal/strategy/)
3. ✅ Compares against actual implementation
4. ✅ Identifies gaps (undocumented features, outdated docs, tech debt)
5. ✅ Generates report

### Example 3: Sync to GitHub

**User**: `/sync-github`

**What Happens** (Automatic):
1. ✅ Reads increment spec.md and tasks.md
2. ✅ Creates/updates GitHub issue
3. ✅ Adds user stories as description
4. ✅ Adds tasks as checkable checklist
5. ✅ Stores issue number for bidirectional sync

## Comparison with Other Adapters

| Feature | Claude | Cursor | Copilot | Generic |
|---------|--------|--------|---------|---------|
| **Automation** | Full | Semi | Basic | Manual |
| **Skills** | Native | Simulated | N/A | N/A |
| **Agents** | Native | Manual invoke | Manual invoke | Copy-paste |
| **Hooks** | Native | N/A | N/A | N/A |
| **Commands** | Slash commands | Instructions | Instructions | Copy-paste |
| **Context Loading** | Auto | Manual ref | Manual ref | Copy-paste |
| **File Access** | Native | Native | Native | Manual |

**Claude Code = Gold Standard**

## Technical Details

### Skills Activation

Skills activate automatically based on:
- Description matching user's request
- Keywords in skill YAML frontmatter
- Context (SpecWeave project detected)

**Example**:
```yaml
---
name: increment-planner
description: Plan features with context awareness. Activates for: create feature, plan increment, new feature.
---
```

When user says "create feature", Claude Code automatically activates `increment-planner` skill.

### Agents Invocation

Agents are invoked explicitly via Task tool:

```typescript
await Task({
  subagent_type: "pm",
  prompt: "Create product requirements for user authentication",
  description: "Product requirements analysis"
});
```

Agents have separate context windows to prevent pollution of main conversation.

### Hooks Execution

Hooks run automatically on events:

```yaml
# .specweave/config.yaml
hooks:
  post_task_completion:
    enabled: true
    actions:
      - update_documentation
      - update_claude_md
```

When task completes → hook fires → docs auto-update.

## Why Other Tools Can't Fully Replicate This

1. **No native skills/agents support** - Must simulate via instruction files
2. **No separate context windows** - All context shared (can cause pollution)
3. **No hooks** - Can't auto-update on events
4. **No native MCP** - Context loading less efficient

**But they can get close!** See Cursor, Copilot, and Generic adapters for approximations.

## Related Documentation

- [SPECWEAVE.md](../../SPECWEAVE.md) - Complete development guide
- [src/skills/](../../skills/) - All available skills
- [src/agents/](../../agents/) - All available agents
- [Adapter Architecture](../README.md) - Multi-tool design philosophy

---

**Status**: Active (v0.1.0-beta.1+)
**Market Share**: ~10% (Claude Code users)
**Priority**: P1 (baseline/reference adapter)
