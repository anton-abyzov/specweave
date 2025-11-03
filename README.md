# SpecWeave

> **Spec-Driven Development Framework for Claude Code** - Replace "vibe coding" with specifications as the source of truth

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## What is SpecWeave?

**SpecWeave** is an AI development framework that makes specifications your source of truth. Built specifically for **Claude Code**, it replaces guesswork with precision through automated planning, living documentation, and regression prevention.

**Define WHAT and WHY before HOW. Specifications evolve with code, never diverge.**

---

## Why SpecWeave?

Traditional development:
- ❌ Documentation becomes outdated and ignored
- ❌ "Vibe coding" - making it up as you go
- ❌ Breaking existing code during changes
- ❌ Tribal knowledge scattered across team
- ❌ Weeks of onboarding new developers

SpecWeave solves this:
- ✅ **Living Documentation** - Auto-updates after every task via Claude Code hooks
- ✅ **Specification-First** - Define requirements before implementation
- ✅ **Regression Prevention** - Document existing code before modifications
- ✅ **Intelligent Automation** - PM, Architect, and QA agents work autonomously
- ✅ **Zero Setup** - Works out of the box with Claude Code's native plugin system

---

## Installation

**Prerequisites**: Node.js 18+, Claude Code

```bash
# Install SpecWeave CLI
npm install -g specweave

# Initialize your project (auto-installs plugins!)
specweave init my-project
cd my-project

# Done! Slash commands ready immediately
```

**What just happened?**
1. ✅ Created `.specweave/` structure (increments, docs, logs)
2. ✅ Auto-installed `specweave` plugin globally via `/plugin install`
3. ✅ Slash commands like `/specweave:inc` immediately available
4. ✅ Skills and agents ready to use

---

## Quick Start

**Open Claude Code in your project and use slash commands:**

```bash
# 1. Plan your first feature (PM-led workflow)
/specweave:inc "User authentication with JWT"

# SpecWeave creates:
# ✅ spec.md (WHAT & WHY)
# ✅ plan.md (HOW - architecture)
# ✅ tasks.md (auto-generated from plan!)
# ✅ tests.md (test strategy)

# 2. Implement (auto-resumes from last task)
/specweave:do

# Hooks run after EVERY task:
# ✅ Updates living docs automatically
# ✅ Syncs architectural decisions
# ✅ Maintains test coverage

# 3. Check progress anytime
/specweave:progress
# Shows: 73% complete (11/15 tasks), next action: "Implement login API"

# 4. Start next feature (auto-closes previous)
/specweave:inc "Payment processing with Stripe"
# ✅ Auto-closes 0001 if complete
# ✅ Creates 0002-payment-processing
# ✅ Detects Stripe keyword → suggests specweave-payments plugin
```

**That's it.** No manual documentation updates. No outdated specs. No regression.

---

## How It Works

### Claude Code Native Architecture

SpecWeave is built **100% on Claude Code's native plugin system**:

```
Core Plugin (always loaded):
├── Skills (9)     → Auto-activate based on context
├── Agents (22)    → PM, Architect, QA work autonomously
├── Commands (22)  → /specweave:inc, /specweave:do, etc.
└── Hooks (8)      → Auto-update docs after every task

Optional Plugins (install on demand):
├── specweave-github   → GitHub Issues sync
├── specweave-figma    → Design integration
├── specweave-frontend → React, Next.js expertise
└── 15+ more plugins   → Load only what you need
```

**Result**: 75%+ context reduction (12K tokens vs 50K in older approaches)

### The Workflow

**1. Specification Phase** (`/specweave:inc`)
- PM agent does market research
- Creates `spec.md` (requirements)
- Architect creates `plan.md` (design)
- Auto-generates `tasks.md` from plan
- QA creates test strategy

**2. Implementation Phase** (`/specweave:do`)
- Auto-resumes from next incomplete task
- Hooks run after EVERY task completion:
  - Syncs living docs
  - Updates architectural decisions
  - Maintains test coverage

**3. Validation Phase** (`/specweave:progress`)
- Shows task completion percentage
- Identifies next action
- Optional quality gates via LLM-as-judge

**4. Repeat** - Start next increment (auto-closes previous)

---

## For Brownfield Projects

**The hardest challenge in software development**: adding structure to existing codebases.

```bash
# Initialize in existing project
cd my-existing-project
specweave init .

# Analyze and document existing code
"Analyze my authentication module and create comprehensive documentation"

# SpecWeave creates:
# ✅ Retroactive specifications (WHAT/WHY)
# ✅ Architecture diagrams (HLDs, C4 Model)
# ✅ Decision records (ADRs)
# ✅ Baseline tests (regression prevention)
# ✅ Living documentation (auto-updates from now on)

# Now safe to modify
/specweave:inc "Add OAuth to authentication"
# ✅ Updates existing specs
# ✅ Extends architecture docs
# ✅ Prevents regression with baseline tests
```

**Brownfield Excellence**:
- ✅ Merge existing docs (wikis, legacy CLAUDE.md files)
- ✅ Create complex architecture (ADRs, HLDs, RFCs, C4 diagrams)
- ✅ Living documentation from day one
- ✅ Regression prevention via baseline tests
- ✅ Knowledge preservation (no more tribal knowledge)

---

## Multi-Repo & Microservices

**SpecWeave enforces ONE root-level `.specweave/` folder** - nested folders are not supported.

For huge projects with multiple repos:

```bash
# Create parent folder
mkdir my-big-project
cd my-big-project
specweave init .

# Clone repos as subdirectories
git clone https://github.com/myorg/auth-service.git
git clone https://github.com/myorg/payment-service.git
git clone https://github.com/myorg/frontend.git

# Result: ONE .specweave/ for entire system
# ✅ Cross-service increments natural
# ✅ System-wide architecture in one place
# ✅ Each repo keeps its own git history
```

---

## Project Structure

```
my-project/
├── .specweave/              # Framework directory
│   ├── increments/          # Feature development
│   │   ├── 0001-feature-name/
│   │   │   ├── spec.md      # WHAT & WHY
│   │   │   ├── plan.md      # HOW (architecture)
│   │   │   ├── tasks.md     # Auto-generated tasks
│   │   │   ├── tests.md     # Test strategy
│   │   │   └── reports/     # Analysis, logs, scripts
│   │   └── 0002-next-feature/
│   ├── docs/
│   │   ├── internal/        # Strategy, architecture, ADRs, RFCs
│   │   └── public/          # User-facing docs
│   └── logs/
│
├── src/                     # Your code
└── tests/                   # Your tests
```

**Key Principle**: ALL AI-generated files go in increment folders, NOT in project root.

---

## Documentation

- 📖 **[spec-weave.com](https://spec-weave.com)** - Complete documentation
- 📦 **[npmjs.com/package/specweave](https://www.npmjs.com/package/specweave)** - npm package
- 🐙 **[GitHub](https://github.com/anton-abyzov/specweave)** - Source code
- 📋 **CLAUDE.md** - Auto-created in your project after `specweave init`

---

## Contributing

**Development Setup:**

```bash
# Clone and setup
git clone https://github.com/anton-abyzov/specweave.git
cd specweave
npm install
npm run build

# Run tests
npm test
```

**To Contribute:**
1. Fork repository
2. Create feature branch: `git checkout -b features/002-new-feature`
3. Follow SpecWeave conventions (see CLAUDE.md)
4. Add tests (minimum 3 test cases)
5. Create PR to `develop` branch

---

## Why Claude Code?

SpecWeave is designed **Claude Code-first** because Claude Code provides industry-leading capabilities:

- ✅ **Native Plugin Marketplace** - No compilation, instant installation
- ✅ **Auto-Activating Skills** - No manual @ mentions needed
- ✅ **Isolated Agent Contexts** - True role separation
- ✅ **Pre/Post Lifecycle Hooks** - Automated living docs sync
- ✅ **MCP Protocol** - Industry standard for context management

**Other tools** (Cursor, Copilot) have legacy adapter support but lack automation features.

---

## Status & License

**Status**: Beta - Ready for testing and contributions
**License**: MIT
**Repository**: [github.com/anton-abyzov/specweave](https://github.com/anton-abyzov/specweave)

---

## Acknowledgments

SpecWeave is inspired by:
- [spec-kit](https://github.com/github/spec-kit) - GitHub's specification toolkit
- [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) - Agentic agile framework
- [Claude Code](https://claude.com/claude-code) - Anthropic's native plugin system
- [C4 Model](https://c4model.com/) - Software architecture diagrams

---

**SpecWeave** - Replace vibe coding with spec-driven development.

**Get started**: `npm install -g specweave` → `specweave init my-project`
