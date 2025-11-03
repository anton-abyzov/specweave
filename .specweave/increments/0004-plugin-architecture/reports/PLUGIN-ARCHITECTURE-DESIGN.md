# SpecWeave Plugin Architecture - Complete Design

**Date**: 2025-11-02
**Status**: Design Complete - Ready for Implementation
**Philosophy**: Modular, Context-Efficient, Marketplace-Ready

---

## Executive Summary

Design for SpecWeave's plugin ecosystem using **Claude Code's native plugin system**. Combines related skills/agents into cohesive plugins, enables marketplace distribution, and supports both SpecWeave-provided and community plugins.

**Key Decisions**:
1. ✅ Use `.claude-plugin/` structure (native Claude Code format)
2. ✅ Dual installation: Project (`.claude/plugins/`) + Global (`~/.claude/plugins/`)
3. ✅ Combine related skills into **themed plugins** (UI, Backend, DevOps, etc.)
4. ✅ Integrate MCP servers where available (Browserbase, Puppeteer)
5. ✅ Marketplace-ready (Anthropic Plugin Marketplace + NPM)

---

## Plugin Installation Locations

### Option 1: Project-Level (Recommended for SpecWeave)
```
.claude/plugins/
├── specweave-core/           # Always loaded (increment lifecycle)
├── specweave-github/         # GitHub integration (priority #1)
├── specweave-ui/             # UI/UX comprehensive plugin
├── specweave-backend-node/   # Node.js backend stack
└── specweave-devops/         # Kubernetes, observability
```

**Pros**:
- ✅ Version controlled (committed to repo)
- ✅ Team-shared (everyone gets same plugins)
- ✅ Project-specific (different projects, different plugins)

**Cons**:
- ⚠️ Duplicated across projects

**Use When**: Working on SpecWeave itself or SpecWeave-managed projects

---

### Option 2: Global Installation
```
~/.claude/plugins/
├── specweave-core/
├── specweave-github/
└── specweave-ui/
```

**Pros**:
- ✅ Shared across all projects
- ✅ Single installation
- ✅ Always available

**Cons**:
- ⚠️ Not version controlled
- ⚠️ Not team-shared

**Use When**: Personal SpecWeave usage across multiple projects

---

### Hybrid Approach (SpecWeave Strategy)

**SpecWeave Source** (for contributors):
```
src/plugins/                  # Source of truth (version controlled)
├── specweave-core/
├── specweave-github/
├── specweave-ui/
└── ...

.claude/plugins/              # Installed (gitignored)
├── specweave-core/           # ← Installed from src/plugins/
├── specweave-github/
└── ...
```

**User Projects** (via `specweave init`):
```
.claude/plugins/              # Installed by SpecWeave CLI
├── specweave-core/           # ← Copied from NPM package
├── specweave-github/
└── ...
```

**Installation Script**:
```bash
# For SpecWeave contributors
npm run install:plugins       # Copies src/plugins/ → .claude/plugins/

# For SpecWeave users
specweave init                # Installs plugins from NPM package
```

---

## Plugin Structure (Claude Code Native)

### Anatomy of a SpecWeave Plugin

```
src/plugins/specweave-ui/
├── .claude-plugin/
│   ├── plugin.json           # Metadata (name, version, author)
│   └── README.md             # Installation & usage guide
├── skills/
│   ├── e2e-playwright/       # Playwright E2E testing
│   │   ├── SKILL.md
│   │   └── test-cases/
│   ├── figma-designer/       # Figma design integration
│   │   └── SKILL.md
│   ├── design-system-architect/
│   │   └── SKILL.md
│   └── frontend/             # React/Vue/Angular development
│       └── SKILL.md
├── agents/
│   └── ui-ux-specialist/     # Combined UI/UX agent
│       └── AGENT.md
├── commands/
│   ├── ui-test.md            # Run Playwright tests
│   └── ui-design.md          # Generate Figma designs
├── hooks/
│   └── hooks.json            # Post-test hooks
├── lib/                      # TypeScript utilities (optional)
│   ├── playwright-runner.ts
│   └── figma-api.ts
├── .mcp.json                 # MCP server integration (optional)
└── README.md                 # Plugin documentation
```

---

## Plugin Catalog

### Core Plugin (Always Loaded)

**specweave-core** - Increment lifecycle management
```json
{
  "name": "specweave-core",
  "description": "Core SpecWeave framework - increment lifecycle, PM, context loading",
  "version": "0.4.0",
  "required": true,
  "provides": {
    "skills": [
      "increment-planner",
      "context-loader",
      "context-optimizer",
      "project-kickstarter",
      "brownfield-analyzer",
      "increment-quality-judge"
    ],
    "agents": ["pm", "architect", "tech-lead"],
    "commands": [
      "specweave.inc",
      "specweave.do",
      "specweave.next",
      "specweave.done",
      "specweave.progress",
      "specweave.validate"
    ]
  }
}
```

**Auto-Detection**: Always enabled (core framework)

---

### UI/UX Plugin (Comprehensive)

**specweave-ui** - Complete UI/UX development & testing
```json
{
  "name": "specweave-ui",
  "description": "Complete UI/UX plugin - Playwright E2E, Figma design, React/Vue/Angular, design systems, Storybook",
  "version": "1.0.0",
  "provides": {
    "skills": [
      "e2e-playwright",          // Playwright E2E testing
      "figma-designer",          // Figma design integration
      "figma-implementer",       // Figma to code
      "design-system-architect", // Atomic design, design tokens
      "frontend",                // React/Vue/Angular
      "nextjs",                  // Next.js 14+ App Router
      "storybook"                // Component library testing
    ],
    "agents": ["ui-ux-specialist"],
    "commands": [
      "ui.test",                 // Run Playwright tests
      "ui.design",               // Generate Figma designs
      "ui.implement"             // Convert Figma to code
    ]
  },
  "mcp": {
    "browserbase": {            // Cloud browser automation
      "enabled": false,
      "apiKey": "${BROWSERBASE_API_KEY}"
    }
  },
  "auto_detect": {
    "packages": [
      "@playwright/test",
      "figma",
      "react",
      "next",
      "@storybook/react"
    ],
    "files": [
      "playwright.config.ts",
      "figma.config.json",
      ".storybook/"
    ]
  }
}
```

**Why Combine?**
- ✅ **Cohesive workflow**: Design (Figma) → Implement (React) → Test (Playwright) → Document (Storybook)
- ✅ **Reduced context**: 1 plugin vs 7 separate skills
- ✅ **Shared knowledge**: UI/UX agent knows all tools
- ✅ **Better DX**: Install once, get complete UI toolkit

---

### Backend Plugins (Tech Stack Specific)

#### specweave-backend-node
```json
{
  "name": "specweave-backend-node",
  "description": "Node.js backend development - Express, Fastify, NestJS, Prisma",
  "provides": {
    "skills": ["nodejs-backend"],
    "agents": ["backend-node-specialist"]
  },
  "auto_detect": {
    "packages": ["express", "fastify", "@nestjs/core", "prisma"]
  }
}
```

#### specweave-backend-python
```json
{
  "name": "specweave-backend-python",
  "description": "Python backend - FastAPI, Django, Flask, SQLAlchemy",
  "provides": {
    "skills": ["python-backend"],
    "agents": ["backend-python-specialist"]
  },
  "auto_detect": {
    "packages": ["fastapi", "django", "flask"]
  }
}
```

#### specweave-backend-dotnet
```json
{
  "name": "specweave-backend-dotnet",
  "description": ".NET backend - ASP.NET Core, Entity Framework Core",
  "provides": {
    "skills": ["dotnet-backend"],
    "agents": ["backend-dotnet-specialist"]
  },
  "auto_detect": {
    "packages": ["Microsoft.AspNetCore", "Microsoft.EntityFrameworkCore"]
  }
}
```

---

### DevOps/Infrastructure Plugin

**specweave-devops** - Complete DevOps toolkit
```json
{
  "name": "specweave-devops",
  "description": "DevOps toolkit - Kubernetes, Helm, observability, performance, CI/CD",
  "provides": {
    "skills": [
      "kubernetes-architect",    // K8s deployment, GitOps
      "observability-engineer",  // Prometheus, Grafana, tracing
      "performance-engineer",    // Profiling, optimization
      "database-optimizer",      // Query optimization, indexing
      "network-engineer"         // Cloud networking, CDN
    ],
    "agents": ["devops-specialist", "sre"],
    "commands": [
      "devops.deploy",
      "devops.monitor",
      "devops.optimize"
    ]
  },
  "auto_detect": {
    "files": [
      "kubernetes/",
      "k8s/",
      "helm/",
      "terraform/",
      "pulumi/",
      "Dockerfile"
    ],
    "packages": [
      "@kubernetes/client-node",
      "prometheus-client",
      "grafana"
    ]
  }
}
```

---

### Integration Plugins

#### specweave-github (Priority #1)
```json
{
  "name": "specweave-github",
  "description": "GitHub integration - task-level sync, issue tracking, PRs",
  "provides": {
    "skills": ["github-sync", "github-issue-tracker"],
    "agents": ["github-manager"],
    "commands": [
      "github.sync-tasks",
      "github.create-issue",
      "github.close-issue",
      "github.status"
    ]
  },
  "auto_detect": {
    "files": [".git/"],
    "git_remote": "github.com"
  }
}
```

#### specweave-jira
```json
{
  "name": "specweave-jira",
  "description": "JIRA integration - epic/story sync, sprint planning",
  "provides": {
    "skills": ["jira-sync"],
    "agents": ["jira-manager"],
    "commands": ["jira.sync", "jira.sprint"]
  },
  "auto_detect": {
    "env_vars": ["JIRA_API_TOKEN"]
  }
}
```

---

### Domain Plugins

#### specweave-ml
```json
{
  "name": "specweave-ml",
  "description": "Machine learning - MLOps, experiment tracking, model deployment",
  "provides": {
    "skills": [
      "ml-engineer",
      "mlops-engineer",
      "data-scientist"
    ],
    "agents": ["ml-specialist"],
    "commands": ["ml.train", "ml.deploy"]
  },
  "auto_detect": {
    "packages": ["tensorflow", "pytorch", "mlflow", "kubeflow"]
  }
}
```

#### specweave-payments
```json
{
  "name": "specweave-payments",
  "description": "Payment processing - Stripe, PayPal, subscriptions, billing",
  "provides": {
    "skills": ["payment-integration", "billing-automation"],
    "agents": ["payment-specialist"]
  },
  "auto_detect": {
    "packages": ["stripe", "paypal", "@stripe/stripe-js"]
  }
}
```

#### specweave-security
```json
{
  "name": "specweave-security",
  "description": "Security - threat modeling, pentesting, OWASP, compliance",
  "provides": {
    "skills": ["security"],
    "agents": ["security-specialist"]
  },
  "auto_detect": {
    "files": ["security.md", "SECURITY.md"]
  }
}
```

---

## Plugin Organization Strategy

### Source Directory (`src/plugins/`)

```
src/plugins/
├── specweave-core/           # Core framework (always loaded)
│   ├── .claude-plugin/
│   │   ├── plugin.json
│   │   └── README.md
│   ├── skills/
│   │   ├── increment-planner/
│   │   ├── context-loader/
│   │   └── context-optimizer/
│   ├── agents/
│   │   ├── pm/
│   │   ├── architect/
│   │   └── tech-lead/
│   └── commands/
│       ├── specweave-inc.md
│       ├── specweave-do.md
│       └── ...
│
├── specweave-ui/             # UI/UX comprehensive plugin
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── skills/
│   │   ├── e2e-playwright/
│   │   ├── figma-designer/
│   │   ├── design-system-architect/
│   │   └── frontend/
│   ├── agents/
│   │   └── ui-ux-specialist/
│   ├── commands/
│   │   ├── ui-test.md
│   │   └── ui-design.md
│   ├── lib/                  # TypeScript utilities
│   │   ├── playwright-runner.ts
│   │   └── figma-api.ts
│   └── .mcp.json            # Optional MCP integration
│
├── specweave-backend-node/   # Node.js backend
├── specweave-backend-python/ # Python backend
├── specweave-devops/         # DevOps toolkit
├── specweave-github/         # GitHub integration ✅ (exists)
├── specweave-jira/           # JIRA integration
├── specweave-ml/             # ML/MLOps
├── specweave-payments/       # Payment processing
└── specweave-security/       # Security testing
```

---

## MCP Server Integration

### Available MCP Servers (for SpecWeave plugins)

| MCP Server | Plugin | Purpose | Status |
|------------|--------|---------|--------|
| **Browserbase** | specweave-ui | Cloud browser automation | ✅ Available |
| **Puppeteer** | specweave-ui | Browser automation (archived) | 🟡 Archived |
| **Figma** | specweave-ui | Figma API integration | 🔍 Check availability |
| **GitHub** | specweave-github | GitHub API (official) | ✅ Available |

### MCP Configuration Example

**File**: `src/plugins/specweave-ui/.mcp.json`
```json
{
  "mcpServers": {
    "browserbase": {
      "command": "npx",
      "args": ["-y", "@browserbasehq/mcp-server-browserbase"],
      "env": {
        "BROWSERBASE_API_KEY": "${BROWSERBASE_API_KEY}",
        "BROWSERBASE_PROJECT_ID": "${BROWSERBASE_PROJECT_ID}"
      }
    }
  }
}
```

**Usage in Plugin**:
- User sets `BROWSERBASE_API_KEY` in `.env`
- SpecWeave detects `.mcp.json` during plugin installation
- Claude Code automatically loads MCP server
- Skills can use browser automation via MCP

---

## Installation & Distribution

### For SpecWeave Contributors

```bash
# 1. Edit plugin source
vim src/plugins/specweave-ui/skills/e2e-playwright/SKILL.md

# 2. Install to .claude/
npm run install:plugins

# 3. Test
# Skills auto-activate, no manual invocation

# 4. Commit source (not .claude/)
git add src/plugins/
git commit -m "feat(ui): Add Playwright skill"
```

### For SpecWeave Users

**Method 1: SpecWeave CLI** (Recommended)
```bash
# Initialize SpecWeave (auto-detects and installs plugins)
specweave init

# Detected: React project
# Installing: specweave-core, specweave-ui, specweave-github

# Manual enable/disable
specweave plugin enable specweave-ml
specweave plugin disable specweave-payments
```

**Method 2: Claude Code Plugin Commands**
```bash
# Install from NPM
/plugin install specweave-ui

# Install from marketplace
/plugin marketplace add specweave
/plugin install specweave/ui
```

**Method 3: Manual Copy**
```bash
# Copy from SpecWeave source
cp -r node_modules/specweave/plugins/specweave-ui .claude/plugins/
```

---

## Marketplace Distribution

### NPM Package Structure

```
specweave/                    # NPM package root
├── plugins/                  # Pre-built plugins
│   ├── specweave-core/
│   ├── specweave-ui/
│   └── ...
├── bin/
│   └── specweave.js          # CLI
└── package.json
```

**User Installation**:
```bash
npm install -g specweave
specweave init                # Auto-installs plugins
```

---

### Anthropic Plugin Marketplace

**Submission Process**:

1. **Prepare Plugin**:
   ```bash
   cd src/plugins/specweave-ui
   # Ensure .claude-plugin/plugin.json is complete
   # Add README.md with usage examples
   ```

2. **Publish to Marketplace**:
   ```bash
   /plugin marketplace submit specweave-ui
   ```

3. **User Discovery**:
   ```bash
   /plugin marketplace search ui testing
   # → specweave-ui: Complete UI/UX toolkit (⭐⭐⭐⭐⭐ 1.2k installs)

   /plugin install specweave-ui
   ```

---

### Community Plugins

**Enable Third-Party Plugins**:

```bash
# Add community marketplace
/plugin marketplace add https://github.com/community/specweave-plugins

# Install community plugin
/plugin install community/specweave-mobile-testing
```

**Community Plugin Structure** (same as SpecWeave):
```
community-plugin/
├── .claude-plugin/
│   └── plugin.json
├── skills/
├── agents/
└── commands/
```

**Integration with SpecWeave**:
- ✅ Uses same auto-detection (packages, files, env vars)
- ✅ Works with `/specweave:do` workflow
- ✅ Integrates with increment lifecycle
- ✅ Follows same conventions

---

## Auto-Detection System

### Four-Phase Detection (from ADR-0006)

**Phase 1: Init-Time**
```bash
specweave init

# Scanning package.json...
# ✅ Found: @playwright/test → Enabling specweave-ui
# ✅ Found: fastapi → Enabling specweave-backend-python
# ✅ Found: kubernetes/ → Enabling specweave-devops

# Install plugins? (Y/n): _
```

**Phase 2: First Increment**
```bash
/specweave:inc "Add E2E tests with Playwright"

# Analyzing description...
# 🔍 Keywords: "E2E", "Playwright"
# 💡 Suggestion: Enable specweave-ui plugin?
# This provides: Playwright skill, UI testing agent
# Enable? (Y/n): _
```

**Phase 3: Pre-Task**
```bash
/specweave:do

# Reading task T-005: "Create Playwright test suite"
# 🔍 Detected: Playwright mentioned
# 💡 Suggestion: specweave-ui plugin recommended
# (Non-blocking, informational only)
```

**Phase 4: Post-Increment**
```bash
# After increment completion, scan git diff

# ✅ Detected new dependency: @stripe/stripe-js
# 💡 Recommendation: Enable specweave-payments for next increment?
```

---

## Migration Strategy (v0.3.7 → v0.4.0)

### Old Structure (Monolithic)
```
src/
├── skills/                   # 44 skills (all loaded always!)
│   ├── e2e-playwright/
│   ├── figma-designer/
│   ├── kubernetes-architect/
│   └── ... (41 more)
└── agents/                   # 20 agents (all loaded always!)
    ├── pm/
    ├── devops/
    └── ... (18 more)
```

**Problem**: 50K+ tokens loaded for EVERY project (even simple ones)

---

### New Structure (Modular)
```
src/plugins/
├── specweave-core/           # 12K tokens (always loaded)
│   ├── increment-planner
│   ├── pm, architect, tech-lead
│   └── 7 core commands
│
├── specweave-ui/             # 8K tokens (load if UI project)
│   ├── e2e-playwright
│   ├── figma-designer
│   └── frontend
│
├── specweave-devops/         # 6K tokens (load if DevOps)
│   ├── kubernetes-architect
│   └── observability-engineer
│
└── ... (15 more plugins)
```

**Result**:
- Simple project: 12K tokens (core only) → **76% reduction**
- React project: 20K tokens (core + UI) → **60% reduction**
- Full-stack: 30K tokens (core + UI + backend) → **40% reduction**

---

## Implementation Roadmap

### Phase 1: Core Plugin ✅ (DONE)
- [x] Create `src/plugins/specweave-core/`
- [x] Move increment lifecycle skills
- [x] Move PM, Architect, Tech Lead agents
- [x] Create plugin.json manifest

### Phase 2: GitHub Plugin ✅ (DONE)
- [x] Create `src/plugins/specweave-github/`
- [x] Implement task-level sync
- [x] Test with real GitHub issues (#3)

### Phase 3: UI Plugin (NEXT)
- [ ] Create `src/plugins/specweave-ui/`
- [ ] Combine: Playwright, Figma, Frontend, Design System, Storybook
- [ ] Add MCP integration (Browserbase)
- [ ] Create unified UI/UX agent
- [ ] Test with real UI project

### Phase 4: Backend Plugins
- [ ] `specweave-backend-node`
- [ ] `specweave-backend-python`
- [ ] `specweave-backend-dotnet`

### Phase 5: DevOps Plugin
- [ ] `specweave-devops` (Kubernetes, observability, performance)

### Phase 6: Domain Plugins
- [ ] `specweave-ml`
- [ ] `specweave-payments`
- [ ] `specweave-security`

### Phase 7: Marketplace
- [ ] Publish to Anthropic Marketplace
- [ ] Enable community plugins
- [ ] Create plugin discovery UI

---

## Success Metrics

### Context Efficiency
- ✅ **76%+ reduction** for simple projects (12K vs 50K tokens)
- ✅ **60%+ reduction** for UI projects (20K vs 50K tokens)
- ✅ **40%+ reduction** for full-stack (30K vs 50K tokens)

### Plugin Ecosystem
- 🎯 **15 official plugins** (SpecWeave-provided)
- 🎯 **50+ community plugins** (marketplace, 1 year)
- 🎯 **90%+ auto-detection accuracy** (4-phase system)

### Developer Experience
- 🎯 **Zero manual configuration** (`specweave init` detects all)
- 🎯 **1-command install** (`specweave plugin enable X`)
- 🎯 **Marketplace discoverability** (search, ratings, installs)

---

## Next Steps

1. **Create UI Plugin** (T-025)
   - Combine Playwright, Figma, Frontend, Design System
   - Add MCP integration (Browserbase)
   - Test with real UI project
   - Estimated: 4-6 hours

2. **Backend Plugins** (T-026, T-027, T-028)
   - Node.js, Python, .NET
   - Estimated: 2 hours each

3. **DevOps Plugin** (T-029)
   - Kubernetes, observability, performance
   - Estimated: 4 hours

4. **Marketplace Submission** (T-030)
   - Prepare plugin.json manifests
   - Write README.md for each plugin
   - Submit to Anthropic Marketplace
   - Estimated: 2-3 hours

---

## Conclusion

SpecWeave's plugin architecture using Claude Code's native system provides:
- ✅ **Modularity**: Load only what you need (60-76% context reduction)
- ✅ **Discoverability**: Marketplace + auto-detection
- ✅ **Extensibility**: Community plugins welcome
- ✅ **Native Integration**: MCP servers, hooks, commands
- ✅ **Best DX**: Zero config, one-command install

**Philosophy**: Combine related skills into **themed plugins** (UI, Backend, DevOps) rather than atomic skills. This creates cohesive workflows and reduces context overhead.

**Next**: Implement UI plugin to prove the architecture works end-to-end.
