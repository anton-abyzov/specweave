# SpecWeave

> Spec-Driven Development Framework - Where specifications are the source of truth

[![Tests](https://github.com/yourusername/specweave/workflows/Test%20&%20Validate/badge.svg)](https://github.com/yourusername/specweave/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0--alpha-orange.svg)](https://github.com/yourusername/specweave/releases)
[![Documentation](https://img.shields.io/badge/docs-live-brightgreen.svg)](https://yourusername.github.io/specweave)

## Overview

**SpecWeave** is a next-generation AI development framework that replaces "vibe coding" with precision, validation, and scalability. Built on the principle that **documentation and specifications are the source of truth**, SpecWeave enables building software from solo projects to enterprise systems with confidence.

### 🚀 Key Features

- **🎯 Auto-Activation** - Detects `.specweave/` and activates automatically (no manual setup)
- **🤖 Request Parsing** - Understands what you want, routes to appropriate skills
- **📊 Context Precision** - Load only relevant specs, reducing tokens by 70%+
- **🧪 Test-Validated** - Every skill has 3+ tests, every feature proven
- **📝 Living Documentation** - Docs update automatically via Claude hooks
- **🏢 Enterprise-Ready** - Solo to 100+ developers, scales seamlessly
- **🔌 Extensible** - Create custom skills (New Relic, CQRS, EDA, etc.)
- **🌐 Project Tracking** - Roadmap syncs with JIRA/GitHub/ADO/Trello

## Quick Start

### Installation

```bash
# macOS
brew install specweave

# Windows
choco install specweave
# or
scoop install specweave

# Universal (npm)
npm install -g specweave

# Or use npx
npx specweave init my-project
```

### Initialize Project

```bash
# Create new project
specweave init my-project
cd my-project

# Or initialize in existing project
cd existing-project
specweave init
```

### Basic Workflow

```bash
# Create a specification
specweave spec create payments

# Plan a feature
specweave feature plan stripe-integration

# Implement with auto-role routing
# Just describe what you want - SpecWeave routes to the right skill
"I need to integrate Stripe payments"

# Run tests
specweave test

# Validate structure
specweave validate
```

## Documentation

- [Getting Started](.specweave/docs/getting-started/installation.md)
- [Writing Specifications](.specweave/docs/guides/writing-specs.md)
- [Creating Skills](.specweave/docs/guides/creating-skills.md)
- [Brownfield Onboarding](.specweave/docs/guides/brownfield-onboarding.md)
- [Architecture](.specweave/docs/architecture/overview.md)
- [CLI Reference](.specweave/docs/reference/cli-commands.md)

## 🎓 Core Principles

SpecWeave is guided by **flexible best practices** (not rigid rules):

1. **Specifications as Source of Truth** - Code expresses specs
2. **Regression Prevention** - Document before modifying
3. **Test-First Development** - Tests written before implementation
4. **Context Precision** - Load only what's needed
5. **Modular Scalability** - Solo to enterprise without restructuring
6. **Auto-Role Routing** - No manual @role selection needed
7. **Living Documentation** - Auto-updated via hooks
8. **Extensibility First** - Create unlimited custom skills

See [CLAUDE.md](CLAUDE.md) for complete development guide and framework principles.

## Project Structure

```
project/
├── .specweave/            # Configuration and cache
├── specifications/        # Business Requirements (WHAT, WHY)
│   ├── overview.md
│   └── modules/           # Modular specs
├── .specweave/docs/         # All Knowledge (HOW - built gradually)
│   ├── README.md
│   ├── architecture/      # System design
│   ├── decisions/         # Architecture Decision Records (ADRs)
│   ├── getting-started/
│   ├── guides/
│   ├── reference/
│   └── changelog/
├── features/              # Auto-numbered implementation plans
│   ├── roadmap.md
│   └── 0001-feature-name/
├── src/                   # Source code
│   └── skills/            # Skills (SOURCE OF TRUTH)
├── tests/                 # Test organization
│   ├── unit/              # Unit tests (or co-located with code)
│   ├── integration/       # Integration tests
│   ├── e2e/               # E2E tests (on-demand, with UI)
│   └── skills/            # Skill validation results
├── work/                  # Active work items
│   └── issues/
└── ai-temp-files/         # Supporting files (scripts, examples)
```

See [CLAUDE.md](CLAUDE.md) for detailed structure and organization rules.

## ⚡ Quick Example

**No manual commands needed - just describe what you want:**

```
# SpecWeave auto-detects .specweave/ and activates

You: "I want to add Stripe payment integration"
    ↓
SpecWeave: (auto-routes to feature-planner)
✅ Feature created: 0002-stripe-payment-integration

You: "Implement it"
    ↓
SpecWeave: (orchestrates context-loader → developer → qa-engineer → docs-updater)
✅ Code implemented: src/payments/stripe-service.ts
✅ Tests generated: tests/payments/stripe.test.ts
✅ Docs updated: docs/reference/api.md

You: "Show me the roadmap"
    ↓
SpecWeave:
📊 Roadmap (v0.2.0 target: Feb 15)
✅ 0001-context-loader: In Progress (30%)
⏳ 0002-stripe-payment: Planned
⏳ 0003-docs-updater: Planned
```

**How it works**:
1. `.specweave/` detected → specweave-detector activates
2. Your request parsed → routed to appropriate skills
3. Multiple skills orchestrated automatically
4. Context loaded precisely (only what's needed)

## Brownfield Projects

SpecWeave excels at existing codebases:

```bash
# 1. Analyze existing code
specweave analyze src/payments

# 2. Generate specifications from code
specweave generate-specs src/payments

# 3. Create tests for current behavior
specweave test generate --mode=existing

# 4. User reviews tests
specweave test review

# 5. Now safe to modify
specweave feature plan improve-payment-flow
```

## Why Claude Skills (Not Context7 MCP)?

**SpecWeave uses Claude Skills as its orchestration layer** - we don't need Context7 MCP. Here's why:

### Claude Skills Advantages for SpecWeave

✅ **Proactive Activation**
- Skills activate automatically based on their description
- `specweave-detector` has `proactive: true` - activates when `.specweave/` exists
- No user configuration needed

✅ **Lightweight (30-50 tokens)**
- Each skill uses minimal tokens until actually loaded
- Scales to 20+ skills without bloating context
- Fast response times

✅ **Skills Can Invoke Skills**
- `role-orchestrator` calls `pm-agent`, `architect-agent`, etc.
- Creates factory-of-agents pattern
- Unlimited nested orchestration

✅ **Version Controlled & Testable**
- Skills are part of the SpecWeave framework (`src/skills/`)
- Each skill has test cases (`test-cases/*.yaml`)
- Users get tested, validated skills

✅ **Self-Contained**
- Skills include SKILL.md, scripts, references, tests
- Everything needed in one folder
- Easy to install: `npx specweave install`

### Context7 MCP Limitations

❌ **Designed for external tools** (databases, APIs, system commands)
- MCP is for integrations, not AI agent orchestration
- Requires explicit user invocation
- Cannot proactively activate

❌ **No skill-to-skill invocation**
- MCP tools can't call other MCP tools
- No orchestration built-in

❌ **Complex setup for users**
- Requires separate MCP server configuration
- Not version-controlled with framework

### Conclusion

**Claude Skills = Perfect for AI Agent Orchestration**
**Context7 MCP = Perfect for External Tool Integration**

SpecWeave needs agent orchestration, not tool integration. Claude Skills are the right choice.

---

## Skills

SpecWeave includes 27 specialized AI agents:

### Core Orchestration (Critical)
- **specweave-detector** - Auto-detect SpecWeave projects (proactive entry point)
- **skill-router** - Intent classification with >90% accuracy
- **context-loader** - Selective spec loading (70%+ token reduction)
- **role-orchestrator** - Multi-agent coordinator (factory of agents)

### Strategic Layer
- **pm-agent** - Product strategy, user stories, prioritization (RICE, MoSCoW)
- **architect-agent** - System design, ADRs, technology decisions
- **tech-lead-agent** - Code review, refactoring, best practices

### Execution Layer
- **nodejs-backend** - Node.js/TypeScript development
- **python-backend** - Python/FastAPI development
- **dotnet-backend** - C#/.NET/ASP.NET Core development
- **frontend-agent** - React/Next.js frontend development
- **nextjs-agent** - Next.js specialist (App Router, Server Components)

### Quality & Operations
- **qa-lead-agent** - Test strategy, E2E testing, quality gates
- **security-agent** - Threat modeling, OWASP, compliance
- **devops-agent** - CI/CD, infrastructure, deployment
- **performance-agent** - Profiling, optimization, load testing

### Documentation & Support
- **docs-updater** - Auto-update docs via hooks
- **docs-writer-agent** - API docs, guides, tutorials
- **feature-planner** - Implementation plans with auto-numbering
- **task-builder** - Break features into executable tasks

### Integrations
- **jira-sync** - Sync with JIRA issues/epics
- **ado-sync** - Azure DevOps integration
- **stripe-integrator** - Stripe payment integration
- **hetzner-provisioner** - Hetzner Cloud infrastructure
- **cost-optimizer** - Cloud cost optimization

### Utilities
- **calendar-system** - Calendar and scheduling features
- **notification-system** - Email, push, SMS, in-app notifications

Each skill has 3+ validated test cases in `test-cases/` directory.

## Claude Hooks

SpecWeave leverages Claude Code hooks for automation:

- **post-task-completion** - Auto-update documentation
- **pre-implementation** - Check regression risk
- **human-input-required** - Notify and log when input needed

## GitHub Actions Integration

**NEW**: SpecWeave now integrates with [claude-code-action](https://github.com/anthropics/claude-code-action) for automated spec-driven CI/CD.

### ✨ Features

When enabled, SpecWeave automates your entire development workflow:

- 🤖 **Auto Increment Planning** - Issues labeled `feature` → Complete increment structure generated
- ✅ **Spec-Aware PR Reviews** - Validates PRs against specs, checks test coverage
- 🛡️ **Brownfield Protection** - Blocks modifications without docs/tests
- 📊 **Test Coverage Validation** - Enforces TC-0001 traceability, ≥3 skill tests
- 📝 **Auto-Documentation** - Updates docs on every merge
- 🔒 **Security Scanning** - Detects vulnerabilities (enterprise)
- ⚡ **Performance Regression** - Detects slowdowns (enterprise)

### 🚀 Quick Setup

```bash
# Option 1: During installation
./install.sh --enable-github-actions --tier starter /path/to/project

# Option 2: Manual setup
# 1. Copy workflow
cp .github/workflows/specweave-starter.yml /path/to/project/.github/workflows/

# 2. Add API key to GitHub secrets
# Settings → Secrets → New repository secret
# Name: ANTHROPIC_API_KEY
# Value: sk-ant-...

# 3. Enable in config
# .specweave/config.yaml:
# github_actions:
#   enabled: true
#   tier: starter
```

### 📦 Workflow Tiers

| Tier | Features | Cost/PR | Best For |
|------|----------|---------|----------|
| **Starter** | Feature planning, PR validation, auto-docs | ~$0.50 | Solo developers, small teams |
| **Standard** | + Brownfield protection, test coverage, issue triage | ~$1.50 | Production teams |
| **Enterprise** | + Security, performance, compliance, analytics | ~$3.00 | Large organizations |

### 🎯 Example Workflow

```markdown
1. Create issue with label 'feature'
   → SpecWeave auto-generates .specweave/increments/00001-feature-name/
   → Branch created, draft PR opened
   → ~5 minutes (was 2 hours)

2. Open PR
   → Validates against spec
   → Checks test coverage (TC-0001 traceability)
   → Verifies brownfield protection
   → Posts review comment
   → ~2 minutes (was 30 minutes)

3. Merge to main
   → Updates CLAUDE.md, API docs, changelog
   → Syncs with JIRA/Slack (if configured)
   → ~0 minutes (was 1 hour)

**Time Savings**: 93% (3.5 hours → 7 minutes)
```

### 📚 Documentation

- [Setup Guide](.specweave/docs/guides/github-action-setup.md) - Complete installation and configuration
- [Integration Analysis](ai-logs/reports/CLAUDE-CODE-ACTION-INTEGRATION.md) - Technical deep-dive
- [Troubleshooting](.specweave/docs/guides/github-action-troubleshooting.md) - Common issues

### 💰 Cost Estimate

- **Starter**: $50-100/month (1000 PRs)
- **Standard**: $150-200/month (1000 PRs)
- **Enterprise**: $300-400/month (1000 PRs)

70%+ token reduction via context manifests significantly reduces costs.

## Integrations

Sync with project management tools:

```bash
# JIRA
specweave sync jira --export

# GitHub Issues
specweave sync github --bidirectional

# Azure DevOps
specweave sync ado --import
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md).

### Development Setup

```bash
# Clone repository
git clone https://github.com/yourusername/specweave.git
cd specweave

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

SpecWeave is inspired by and learns from:
- [spec-kit](https://github.com/github/spec-kit) - GitHub's specification-driven development toolkit
- [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) - Agentic agile development framework
- [Claude Code Skills](https://www.anthropic.com/news/skills) - Anthropic's skill system

## Status

**Version**: 0.1.0 (Alpha)
**Status**: Active Development

## Links

- [Development Guide](CLAUDE.md) - **Start here** for complete framework guide
- [Documentation](.specweave/docs/README.md)
- [Architecture](.specweave/docs/architecture/overview.md)
- [Changelog](.specweave/docs/changelog/releases.md)
- [GitHub](https://github.com/anton-abyzov/specweave)

---

**SpecWeave** - Replace vibe coding with spec-driven development.
