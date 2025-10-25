# SpecWeave

> Intent-Driven Development Framework - Where specifications are the source of truth

[![Tests](https://github.com/yourusername/specweave/workflows/Test%20&%20Validate/badge.svg)](https://github.com/yourusername/specweave/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0--alpha-orange.svg)](https://github.com/yourusername/specweave/releases)
[![Documentation](https://img.shields.io/badge/docs-live-brightgreen.svg)](https://yourusername.github.io/specweave)

## Overview

**SpecWeave** is a next-generation AI development framework that replaces "vibe coding" with precision, validation, and scalability. Built on the principle that **documentation and specifications are the source of truth**, SpecWeave enables building software from solo projects to enterprise systems with confidence.

### 🚀 Key Features

- **🎯 Auto-Activation** - Detects `.specweave/` and activates automatically (no manual setup)
- **🤖 Intent Parsing** - Understands what you want, routes to appropriate skills
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

- [Getting Started](docs/getting-started/installation.md)
- [Writing Specifications](docs/guides/writing-specs.md)
- [Creating Skills](docs/guides/creating-skills.md)
- [Brownfield Onboarding](docs/guides/brownfield-onboarding.md)
- [Architecture](docs/architecture/overview.md)
- [CLI Reference](docs/reference/cli-commands.md)

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

See [Principles](docs/principles.md) for complete guidelines (configurable per project).

## Project Structure

```
project/
├── specs/              # Specifications (SOURCE OF TRUTH)
│   ├── constitution.md
│   └── modules/        # Modular specs
├── architecture/       # System architecture
├── adrs/               # Architecture Decision Records
├── features/           # Auto-numbered implementation plans
├── work/               # Active work items
├── docs/               # Living documentation
├── ai-temp-files/      # Supporting files (scripts, examples)
└── src/                # Source code
```

See [CLAUDE.md](CLAUDE.md) for detailed structure and organization rules.

## ⚡ Quick Example

**No manual commands needed - just describe what you want:**

```
# SpecWeave auto-detects .specweave/ and activates

You: "I want to add Stripe payment integration"
    ↓
SpecWeave: (auto-routes to feature-planner)
✅ Feature created: 002-stripe-payment-integration

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
✅ 001-context-loader: In Progress (30%)
⏳ 002-stripe-payment: Planned
⏳ 003-docs-updater: Planned
```

**How it works**:
1. `.specweave/` detected → specweave-detector activates
2. Your intent parsed → routed to appropriate skills
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

## Skills

SpecWeave includes essential skills:

- **skill-router** - Auto-detect role and route to appropriate skill
- **context-loader** - Selective spec loading based on manifests
- **docs-updater** - Auto-update living documentation
- **feature-planner** - Create implementation plans
- **brownfield-documenter** - Generate specs from existing code
- **spec-author** - Create and update specifications
- **architect** - System design and architecture
- **developer** - Implementation with context awareness
- **qa-engineer** - E2E tests and validation
- **iac-provisioner** - Infrastructure as Code

Each skill has 3+ validated test cases in `test-cases/` directory.

## Claude Hooks

SpecWeave leverages Claude Code hooks for automation:

- **post-task-completion** - Auto-update documentation
- **pre-implementation** - Check regression risk
- **human-input-required** - Notify and log when input needed

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

- [Documentation](docs/README.md)
- [Constitution](specs/constitution.md)
- [Architecture](docs/architecture/overview.md)
- [Changelog](docs/changelog/releases.md)
- [GitHub](https://github.com/yourusername/specweave)

---

**SpecWeave** - Replace vibe coding with intent-driven development.
