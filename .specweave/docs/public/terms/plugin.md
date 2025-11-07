---
sidebar_position: 10
---

# Plugin

**Category**: Plugin Architecture

## Definition

A **plugin** in SpecWeave is a modular package that adds capabilities to the framework. Plugins follow [Claude Code's native plugin system](https://docs.claude.com/en/docs/claude-code/plugins) and can contain:
- **Skills**: Auto-activating AI capabilities
- **Agents**: Specialized AI roles
- **Commands**: Slash commands (e.g., `/specweave:increment`)
- **Hooks**: Lifecycle automation scripts

**Key Insight**: In SpecWeave, **everything is a plugin** - even the core framework is implemented as the `specweave` plugin.

## What Problem Does It Solve?

**The Monolithic Problem**:
- ❌ Loading all capabilities for every project (context bloat)
- ❌ React skills loaded for backend API project
- ❌ Kubernetes skills loaded for simple CLI tool
- ❌ 50K+ tokens of unused context

**Plugin Solution**:
- ✅ Modular architecture (load only what you need)
- ✅ 70%+ context reduction
- ✅ Tech stack-specific capabilities (React, K8s, etc.)
- ✅ Domain expertise (ML/AI, payments, security)

## Plugin Types

SpecWeave has three types of plugins:

### 1. **Core Plugin** (`specweave`)
Always auto-loaded, contains framework essentials:
- **Skills** (9): increment-planner, spec-generator, tdd-workflow, etc.
- **Agents** (22): PM, Architect, Tech Lead, + 19 specialized
- **Commands** (22): /specweave:increment, /specweave:do, /specweave:done, etc.
- **Hooks** (8): post-task-completion, pre-implementation, etc.
- **Size**: ~12K tokens

### 2. **Integration Plugins** (opt-in)
External tool integrations:
- `specweave-github`: GitHub Issues sync
- `specweave-jira`: Jira sync
- `specweave-ado`: Azure DevOps sync
- `specweave-figma`: Figma design integration

### 3. **Tech Stack Plugins** (opt-in)
Technology-specific capabilities:
- `specweave-frontend`: React, Next.js, design systems
- `specweave-kubernetes`: K8s, Helm charts
- `specweave-ml`: TensorFlow, PyTorch, ML ops
- `specweave-payments`: Stripe, billing, subscriptions

## Plugin Structure

```
plugins/specweave-{name}/
├── .claude-plugin/
│   └── plugin.json          # Claude native manifest
├── skills/
│   └── my-skill/
│       └── SKILL.md         # Auto-activating capability
├── agents/
│   └── my-agent/
│       └── AGENT.md         # Specialized AI role
├── commands/
│   └── my-command.md        # Slash command
├── hooks/
│   └── post-*.sh            # Lifecycle automation
└── lib/                     # TypeScript utilities (optional)
```

## Plugin Manifest (plugin.json)

**Location**: `.claude-plugin/plugin.json`

```json
{
  "name": "specweave-github",
  "description": "GitHub Issues integration for SpecWeave increments",
  "version": "1.0.0",
  "author": {
    "name": "Anton Abyzov",
    "url": "https://github.com/anton-abyzov"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/anton-abyzov/specweave"
  },
  "keywords": ["specweave", "github", "integration", "issue-tracking"],
  "dependencies": {
    "specweave": ">=0.8.0"
  }
}
```

## Context Efficiency Examples

**Before** - Monolithic approach (v0.3.7):
- Simple React app: Loads ALL 44 skills + 20 agents ≈ **50K tokens**
- Backend API: Loads ALL 44 skills + 20 agents ≈ **50K tokens**
- ML pipeline: Loads ALL 44 skills + 20 agents ≈ **50K tokens**

**After** - Modular plugin architecture (v0.8.0+):
- Simple React app: Core + frontend + github ≈ **16K tokens** (68% reduction!)
- Backend API: Core + backend + github ≈ **15K tokens** (70% reduction!)
- ML pipeline: Core + ml-ops + github ≈ **18K tokens** (64% reduction!)
- SpecWeave itself: Core + github + diagrams ≈ **15K tokens** (70% reduction!)

## How Plugins Are Loaded

### Phase 1: Initialize (Automatic)

```bash
# When you run `specweave init`:
npx specweave init

# Automatically:
# 1. Creates .claude/settings.json with GitHub marketplace reference
# 2. Registers SpecWeave marketplace (no local copying!)
# 3. Auto-installs core plugin (specweave)
# 4. Auto-detects and installs issue tracker plugins (GitHub/Jira/ADO)
# 5. Suggests optional plugins (frontend, backend, etc.)
```

**Result**: Core plugin available immediately, optional plugins suggested

### Phase 2: Increment Planning (Smart Detection)

```bash
# When creating increments:
/specweave:increment "Add Stripe billing integration"

# PM agent:
# 1. Scans spec.md for keywords ("Stripe", "billing", "subscription")
# 2. Maps keywords → required plugins (specweave-payments)
# 3. Recommends plugins with clear benefits
# 4. User installs: /plugin install specweave-payments
# 5. Skills auto-activate during implementation
```

### Phase 3: Implementation (Auto-Activation)

```bash
# During implementation:
/specweave:do

# Skills auto-activate based on context:
# - Mention "GitHub" → github-sync skill activates
# - Mention "Stripe" → stripe-integration skill activates
# - Mention "Kubernetes" → k8s-deployment skill activates
# No manual @ mentions needed!
```

## Installing Plugins

**Via CLI** (recommended):
```bash
# List available plugins
/plugin list specweave

# Install plugin
/plugin install specweave-github
/plugin install specweave-frontend
/plugin install specweave-kubernetes

# List installed plugins
/plugin list --installed

# Uninstall plugin
/plugin uninstall specweave-kubernetes
```

**Via Init** (automatic):
```bash
# Core plugin auto-installs during init
npx specweave init

# Issue tracker plugins auto-install with credentials
# Frontend/backend plugins suggested based on project type
```

## Plugin Marketplace

**Location**: `.claude-plugin/marketplace.json` (in SpecWeave repo)

**Registration** (automatic during `specweave init`):
```json
{
  "extraKnownMarketplaces": {
    "specweave": {
      "source": {
        "source": "github",
        "repo": "anton-abyzov/specweave",
        "path": ".claude-plugin"
      }
    }
  }
}
```

**No Local Copying**: Plugins fetched from GitHub on-demand (always up-to-date)

## Creating a Plugin

**For Contributors**:

```bash
# 1. Create plugin structure
mkdir -p plugins/specweave-myplugin/{.claude-plugin,skills,agents,commands,lib}

# 2. Create plugin.json
cat > plugins/specweave-myplugin/.claude-plugin/plugin.json << 'EOF'
{
  "name": "specweave-myplugin",
  "description": "What it does and when to use it",
  "version": "1.0.0",
  "author": {"name": "Your Name"}
}
EOF

# 3. Add components:
# - skills/my-skill/SKILL.md (auto-activating capabilities)
# - agents/my-agent/AGENT.md (specialized AI roles)
# - commands/my-command.md (slash commands)
# - lib/my-utility.ts (TypeScript helpers)

# 4. Add to marketplace
vim .claude-plugin/marketplace.json
# Add entry:
# {
#   "name": "specweave-myplugin",
#   "description": "What it does and when to use it",
#   "source": "../plugins/specweave-myplugin"
# }

# 5. Test locally
/plugin marketplace add ./.claude-plugin
/plugin install specweave-myplugin
```

## Available Plugins

| Plugin | Purpose | Size | Status |
|--------|---------|------|--------|
| **specweave** | Core framework | ~12K tokens | ✅ Auto-loaded |
| **specweave-github** | GitHub Issues sync | ~3K tokens | ✅ Complete |
| **specweave-jira** | Jira integration | ~3K tokens | 🚧 Planned |
| **specweave-ado** | Azure DevOps sync | ~3K tokens | 🚧 Planned |
| **specweave-frontend** | React, Next.js | ~5K tokens | 🚧 Planned |
| **specweave-kubernetes** | K8s, Helm | ~4K tokens | 🚧 Planned |
| **specweave-ml** | TensorFlow, PyTorch | ~5K tokens | 🚧 Planned |
| **specweave-payments** | Stripe, billing | ~4K tokens | 🚧 Planned |

## Plugin Decision Tree

**Which plugin should contain this feature?**

```
Is this feature...
├─ Used by EVERY project? → specweave (core)
│  Examples: increment-planner, spec-generator, tdd-workflow
│
├─ Part of increment lifecycle? → specweave (core)
│  Examples: /specweave:increment, /specweave:do, living docs hooks
│
├─ Tech stack specific? → specweave-{stack}
│  Examples: specweave-frontend (React), specweave-kubernetes
│
├─ Domain expertise? → specweave-{domain}
│  Examples: specweave-ml (TensorFlow), specweave-payments (Stripe)
│
├─ External integration? → specweave-{tool}
│  Examples: specweave-github, specweave-jira, specweave-figma
│
└─ Optional enhancement? → specweave-{feature}
   Examples: specweave-diagrams, specweave-cost-optimizer
```

## Best Practices

### 1. **Install Only What You Need**
```bash
✅ CORRECT:
# Backend API project
/plugin install specweave-backend
/plugin install specweave-github

❌ WRONG:
# Backend API project (don't install frontend!)
/plugin install specweave-frontend  # Not needed!
```

### 2. **Let PM Agent Recommend Plugins**
```bash
✅ CORRECT:
/specweave:increment "Add Stripe billing"
# PM agent suggests specweave-payments plugin
# Install when recommended

❌ WRONG:
# Pre-install all plugins "just in case"
# Wastes context, slows down AI
```

### 3. **Keep Plugins Updated**
```bash
# Check for updates
/plugin list --installed

# Update plugins (future feature)
/plugin update specweave-github
```

## Related Terms

- [Skill](./skill.md) - Auto-activating AI capability
- [Agent](./agent.md) - Specialized AI role
- [Command](./command.md) - Slash command
- [Hook](./hook.md) - Lifecycle automation

## Learn More

- [Plugin Architecture](/docs/guides/architecture/plugin-system)
- [Creating Plugins](/docs/guides/advanced/creating-plugins)
- [Claude Code Plugin Docs](https://docs.claude.com/en/docs/claude-code/plugins)
