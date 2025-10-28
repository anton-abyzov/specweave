# SpecWeave

> **Spec-Driven Development Framework** - Where specifications and documentation are the source of truth

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-0.1.9-blue.svg)](https://github.com/anton-abyzov/specweave/releases/tag/v0.1.9)
[![Status](https://img.shields.io/badge/status-beta-blue.svg)]()
[![Website](https://img.shields.io/badge/website-spec--weave.com-green.svg)](https://spec-weave.com)

---

## Overview

**SpecWeave** is an AI development framework that replaces "vibe coding" with **specification-first development**. Built on the principle that **specifications are the source of truth**, SpecWeave enables building software from solo projects to enterprise systems with confidence and precision.

**🌐 Website**: [spec-weave.com](https://spec-weave.com)
**📦 npm**: [npmjs.com/package/specweave](https://www.npmjs.com/package/specweave)

### 🎯 Core Philosophy

1. **Specification Before Implementation** - Define WHAT and WHY before HOW
2. **Living Documentation** - Specs evolve with code, never diverge
3. **Regression Prevention** - Document before modifying existing code
4. **Test-Validated Features** - Every feature proven through automated tests
5. **Ready Out of the Box** - All components pre-installed, no setup needed

---

## ✨ Key Features

- 🤖 **Autonomous & Smart** - Just works! Agents ask clarifying questions, review output, validate quality—minimal interaction required
- ⚡ **Seamless Workflow** - Auto-resume, auto-close, progress tracking—natural flow without overhead
- 🎯 **10 Agents + 35+ Skills** - PM, Architect, DevOps, QA, Security work in parallel (minimizes context usage). Easily extensible!
- 🔧 **Universal Support** - Works with Claude (native), Cursor, Gemini CLI, Codex, Copilot, and ANY AI tool (100% market coverage)
  - **Claude Code**: Native agents/skills pre-installed in `.claude/`
  - **Other tools**: Accessible via universal AGENTS.md adapter
- 🧪 **Complete Test Coverage** - 4-level strategy from specs to integration tests (APIs, UIs, CLIs, libraries)
- 📚 **Living Documentation** - Specs auto-update after every operation and test—always in sync with code
- 🎨 **Visual Architecture** - C4 Model diagrams (Context, Container, Component)
- 🔄 **Tool Integration** - Sync with JIRA, Azure DevOps, GitHub
- 🏢 **Brownfield Ready** - Analyze and document existing codebases
- 🌐 **Framework Agnostic** - Works with TypeScript, Python, Go, Rust, Java, C#—any tech stack

---

## 📦 Installation

### Prerequisites

- **Node.js 18+** (`node --version`)
- **npm 9+** (`npm --version`)
- **Any AI coding tool**:
  - Claude Code (Claude Sonnet 4.5 - full automation)
  - Cursor (Claude Sonnet 3.7 / GPT-4 - semi-automation)
  - Gemini CLI (Gemini 2.5 Pro, 1M context - semi-automation)
  - Codex (GPT-5-Codex - semi-automation)
  - GitHub Copilot (OpenAI models - basic automation)
  - Or ANY AI (ChatGPT web, Gemini web, Claude web, etc. - manual workflow)

### Quick Install

**Global installation (recommended):**

```bash
# Install via npm (when published)
npm install -g specweave

# Create your first project
specweave init my-saas
cd my-saas
```

**One-time usage (like npx):**

```bash
# No installation required
npx specweave init my-saas
cd my-saas
```

**Install from GitHub (current beta.1):**

```bash
# Clone repository
git clone https://github.com/specweave/specweave.git
cd specweave

# Install dependencies and build
npm install
npm run build

# Link globally (makes 'specweave' command available)
npm link

# Create project
specweave init my-saas
```

### Available Commands

```bash
specweave init [project]           # Create new project with ALL components
specweave --version                # Show version
specweave --help                   # Show help
```

**Note**:
- **Claude Code**: All 10 agents and 35+ skills installed natively in `.claude/` - ready to use immediately!
- **Other tools**: Universal AGENTS.md adapter generated - works with Cursor, Gemini CLI, Codex, Copilot, and ANY AI!

---

## 🚀 Quick Example

**CRITICAL**: SpecWeave uses **EXPLICIT SLASH COMMANDS** - type them to activate the framework!

```bash
# Initialize project (Claude Code native installation)
npx specweave init my-app
cd my-app

# For Claude Code - everything native and ready immediately:
# ✅ 10 agents in .claude/agents/
# ✅ 35+ skills in .claude/skills/
# ✅ 10 slash commands in .claude/commands/
# (Other tools get AGENTS.md adapter instead)

# Open Claude Code and use slash commands:

User: /inc "Next.js authentication with email and OAuth"
    ↓
SpecWeave: 🔷 SpecWeave Active (/increment)

           🚀 Creating increment 0001-user-authentication...
           📝 Using nextjs skill (already installed!)
           🤖 PM agent creating requirements...
           🏗️  Architect agent designing system...
           📋 Auto-generating tasks from plan...

✅ Increment created: .specweave/increments/0001-user-authentication/
✅ Files: spec.md, plan.md, tasks.md (auto-generated!), tests.md

User: "Create C4 context diagram for authentication"  # Regular conversation for implementation
    ↓
SpecWeave: 🎨 Using diagrams-generator skill
           🤖 Coordinating with diagrams-architect agent

✅ Diagram saved: .specweave/docs/internal/architecture/diagrams/auth.c4-context.mmd

User: "Implement authentication based on plan.md"  # Regular conversation
    ↓
SpecWeave: 🤖 Implementing based on specifications

✅ Code: src/auth/
✅ Tests: tests/auth/
✅ Docs: Updated automatically

User: /done 0001  # Close increment with slash command
✅ Increment 0001 closed successfully
```

**How it works** (smart append-only workflow: 0001 → 0002 → 0003):
1. `specweave init` → Detects your AI tool and configures appropriately
   - **Claude Code**: Native components installed (10 agents + 35+ skills)
   - **Other tools**: Universal AGENTS.md adapter generated
2. **Use `/inc "feature"`** (Claude) or "Read AGENTS.md and create increment" (other tools)
   - PM creates specs + plan + auto-generates tasks
   - **Smart**: Auto-closes previous increment if PM gates pass
3. **Use `/build` or `/build 0001`** → Execute implementation (hooks after EVERY task in Claude)
   - **Smart**: Auto-resumes from next incomplete task
4. **Use `/progress`** → Check status, task completion %, next action
5. **Use `/validate 0001`** → Optional quality check (LLM-as-judge)
6. Repeat: `/inc "next feature"` → Auto-closes if ready, creates next increment

**Why smart workflow?**
- ✅ No manual `/done` needed (auto-closes on next `/inc`)
- ✅ No task tracking needed (`/build` auto-resumes)
- ✅ `/progress` shows exactly where you are
- ✅ Natural flow: finish → start next

---

## 🤖 Agents (10 Total)

SpecWeave includes **10 specialized AI agents** that work with slash commands and during implementation:

| Agent | Role | When It Activates |
|-------|------|-------------------|
| **pm** | Product Manager - requirements, user stories | Planning features, creating increments |
| **architect** | System Architect - design, ADRs, decisions | Technical design, architecture |
| **security** | Security Engineer - threat modeling, OWASP | Security review, vulnerability assessment |
| **qa-lead** | QA Lead - test strategy, quality gates | Testing, quality assurance |
| **devops** | DevOps Engineer - CI/CD, infrastructure | Deployment, infrastructure needs |
| **tech-lead** | Technical Lead - code review, best practices | Code review, refactoring |
| **sre** | SRE - incident response, monitoring | Production incidents, troubleshooting |
| **docs-writer** | Technical Writer - documentation | Writing docs, API documentation |
| **performance** | Performance Engineer - optimization | Performance issues, profiling |
| **diagrams-architect** | Diagram Expert - C4 Model, Mermaid | Creating diagrams (via diagrams-generator skill) |

**Agent Access**:
- **Claude Code**: All agents pre-installed natively in `.claude/agents/` - ready to use immediately!
- **Other tools**: Agents documented in universal AGENTS.md - reference roles manually

---

## 🎯 Skills (35+ Total)

SpecWeave includes **35+ AI skills** that work with slash commands:

### Core Framework Skills
- **specweave-detector** - Slash command documentation
- **increment-planner** - Plan features via `/inc` or `/increment` command
- **skill-router** - Route requests to appropriate skills
- **context-loader** - Load relevant specifications
- **role-orchestrator** - Coordinate multiple agents

### Technology Stack Skills
- **nextjs** - Next.js App Router, Server Components
- **nodejs-backend** - Node.js, Express, NestJS APIs
- **python-backend** - FastAPI, Django APIs
- **dotnet-backend** - ASP.NET Core APIs
- **frontend** - React, Vue, Angular components

### Integration Skills
- **jira-sync** - Sync with JIRA issues
- **ado-sync** - Sync with Azure DevOps
- **github-sync** - Sync with GitHub issues

### Design & Diagram Skills
- **diagrams-generator** - Generate C4 diagrams
- **figma-designer** - Create Figma designs
- **figma-implementer** - Convert Figma to code

### Infrastructure Skills
- **hetzner-provisioner** - Deploy to Hetzner Cloud
- **cost-optimizer** - Optimize cloud costs

### Brownfield Skills
- **brownfield-analyzer** - Analyze existing codebases
- **brownfield-onboarder** - Merge existing documentation

**And many more!**

**Skill Access**:
- **Claude Code**: All skills pre-installed natively in `.claude/skills/` - ready to use immediately!
- **Other tools**: Skills documented in universal AGENTS.md - reference capabilities manually

**See**: [Complete skill list](https://spec-weave.com/docs/skills) on spec-weave.com

---

## 📁 Project Structure

```
specweave/
├── .specweave/                  # Framework configuration
│   ├── config.yaml              # Project configuration
│   ├── cache/                   # Performance cache
│   ├── docs/                    # 5-pillar documentation structure
│   │   ├── README.md
│   │   ├── DIAGRAM-CONVENTIONS.md    # C4 Model conventions
│   │   ├── TOOL-CONCEPT-MAPPING.md   # JIRA/ADO/GitHub mappings
│   │   ├── internal/            # Internal docs (NOT published)
│   │   │   ├── strategy/        # PRDs, vision, OKRs (WHAT/WHY)
│   │   │   ├── architecture/    # HLDs, ADRs, RFCs (HOW)
│   │   │   ├── delivery/        # Roadmap, release plans
│   │   │   ├── operations/      # Runbooks, SLOs, monitoring
│   │   │   └── governance/      # Security, compliance
│   │   └── public/              # Published docs (MkDocs)
│   │       ├── overview/
│   │       ├── guides/
│   │       ├── api/
│   │       └── changelog/
│   ├── increments/              # Auto-numbered features
│   │   ├── README.md
│   │   ├── roadmap.md
│   │   └── 0001-feature-name/
│   │       ├── spec.md          # WHAT & WHY
│   │       ├── plan.md          # HOW (architecture)
│   │       ├── tasks.md         # Executable steps
│   │       ├── tests.md         # Test strategy
│   │       ├── context-manifest.yaml  # Context loading
│   │       ├── logs/            # Execution logs
│   │       ├── scripts/         # Helper scripts
│   │       └── reports/         # Analysis reports
│   └── tests/                   # Centralized test repository
│
├── src/                         # Source code (framework)
│   ├── agents/                  # 19 agents (SOURCE OF TRUTH)
│   ├── skills/                  # 24 skills (SOURCE OF TRUTH)
│   ├── commands/                # Slash commands
│   ├── hooks/                   # Claude Code hooks
│   └── templates/               # Project templates
│
├── .claude/                     # Pre-installed components (user projects)
│   ├── agents/                  # 10 agents (copied during init)
│   ├── skills/                  # 35+ skills (copied during init)
│   └── commands/                # 10 slash commands (copied during init)
│
├── tests/                       # Framework tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── CLAUDE.md                    # Complete development guide (source of truth)
├── README.md                    # This file
├── INSTALLATION.md              # Detailed installation guide
├── package.json                 # npm package definition
└── tsconfig.json                # TypeScript configuration
```

**See [CLAUDE.md](CLAUDE.md)** for complete documentation structure details.

---

## 🛠️ Development Workflow

### For Greenfield Projects

**IMPORTANT**: Use slash commands to activate SpecWeave!

```bash
# 1. Create specifications (optional: comprehensive upfront or incremental)
# Option A: Comprehensive (Enterprise) - 500-600+ pages upfront
# Option B: Incremental (Startup) - Build as you go

# 2. Plan increment (PM-led, auto-closes previous if ready)
/inc "user authentication"
# Alias for /increment
# PM-led: Market research → spec.md → plan.md → auto-generate tasks.md
# Smart: Auto-closes previous increment if PM gates pass

# 3. Build it (smart resume, hooks after EVERY task)
/build
# Or: /build 0001
# Smart: Auto-resumes from next incomplete task
# Hooks automatically update CLAUDE.md, README.md, CHANGELOG.md

# 4. Check progress anytime
/progress
# Shows: task completion %, PM gates status, next action
# No increment ID needed - finds active increment automatically

# 5. Validate quality (optional)
/validate 0001 --quality
# LLM-as-judge quality assessment

# 6. Start next feature (auto-closes previous)
/inc "payment processing"
# Auto-closes 0001 if gates pass, creates 0002
# No manual /done needed!

# 7. Sync with tools (optional)
/sync-github  # Sync to GitHub issues
```

### For Brownfield Projects

```bash
# 1. Analyze existing code
"Analyze my authentication module"

# 2. Generate specs from code
# SpecWeave creates retroactive specifications

# 3. Create baseline tests
"Create tests for current behavior"

# 4. Now safe to modify
"Add OAuth to authentication"
```

**See [CLAUDE.md#development-workflow](CLAUDE.md#development-workflow)** for complete guide.

---

## 🧪 Testing Strategy

SpecWeave implements **4 Levels of Testing**:

1. **Level 1: Specification** (spec.md)
   - Acceptance criteria with TC-0001 format
   - Business-level validation

2. **Level 2: Feature Tests** (tests.md)
   - Test coverage matrix
   - Maps TC-0001 to implementations

3. **Level 3: Component Tests** (src/)
   - Agent test cases: `src/agents/{name}/test-cases/`
   - Skill test cases: `src/skills/{name}/test-cases/`
   - **Minimum 3 tests per component** (MANDATORY)

4. **Level 4: Automated Tests** (tests/)
   - Unit tests (Jest)
   - Integration tests
   - E2E tests (Playwright) when UI exists

**See [CLAUDE.md#testing-philosophy](CLAUDE.md#testing-philosophy)** for complete testing guide.

---


## 🎨 Diagram Generation

SpecWeave includes **automated C4 diagram generation**:

```bash
# C4 Context (Level 1)
"Create C4 context diagram for authentication"

# C4 Container (Level 2)
"Create container diagram showing services and databases"

# C4 Component (Level 3)
"Create component diagram for Auth Service"

# Sequence diagrams
"Create sequence diagram for login flow"

# ER diagrams
"Create ER diagram for user and order entities"

# Deployment diagrams
"Create deployment diagram for AWS infrastructure"
```

**How it works**:
1. `diagrams-generator` skill detects request
2. Invokes `diagrams-architect` agent
3. Agent generates Mermaid diagram following C4 Model
4. Saves to correct location with proper naming

**See [Diagram Conventions](.specweave/docs/internal/delivery/guides/diagram-conventions.md)** for conventions.

---

## 🔄 Tool Integration

### JIRA Integration

```yaml
# .specweave/config.yaml
sync:
  jira:
    enabled: true
    url: "https://company.atlassian.net"
    project: "PROJ"
```

```bash
# Sync increment to JIRA
/sync-jira --increment 0001

# Maps: Increment → Epic, Tasks → Stories
```

### Azure DevOps Integration

```yaml
sync:
  ado:
    enabled: true
    url: "https://dev.azure.com/company/MyProject"
```

### GitHub Integration

```bash
/sync-github --increment 0001

# Creates GitHub issue with:
# - User stories as description
# - Tasks as checkable checklist
```

**See [Tool Concept Mapping](.specweave/docs/internal/delivery/guides/tool-concept-mapping.md)** for complete mappings.

---

## 📚 Documentation

- **[spec-weave.com](https://spec-weave.com)** - **START HERE** - Complete documentation website
- **[npm Package](https://www.npmjs.com/package/specweave)** - Installation and quick start
- **[GitHub](https://github.com/anton-abyzov/specweave)** - Source code and examples
- **[CLAUDE.md](CLAUDE.md)** - Complete development guide (created after `specweave init`)

---

## 🤝 Contributing

We welcome contributions!

### Development Setup

```bash
# Clone repository
git clone https://github.com/anton-abyzov/specweave.git
cd specweave

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test
```

**To contribute**:
1. Fork repository
2. Create feature branch: `git checkout -b features/002-new-feature`
3. Follow SpecWeave conventions (see CLAUDE.md after init)
4. Add 3+ test cases (MANDATORY)
5. Create PR to `develop` branch

---

## 🏷️ Project Status

**Version**: 0.1.8
**Status**: Public Beta
**License**: MIT
**Release Date**: 2025-10-28
**Website**: [spec-weave.com](https://spec-weave.com)

### ✅ What Works (v0.1.8)

- ✅ **10 Agents** fully implemented and pre-installed
- ✅ **35+ Skills** fully implemented and pre-installed
- ✅ **CLI Tool** - `specweave init` with complete component copying
- ✅ **Ready Out of the Box** - All components installed during init
- ✅ **Command simplification** - 4-command workflow (0.1.8)
- ✅ **Diagram generation** (C4 Model with validation)
- ✅ **4-level testing framework** (spec → feature → component → automated)
- ✅ **JIRA/ADO/GitHub sync** integration
- ✅ **Brownfield analyzer** (retroactive specs, regression prevention)
- ✅ **Increment lifecycle** (5 stages, WIP limits, leftover transfer)
- ✅ **Increment validation** (120 rules, auto-validation on save)
- ✅ **Hooks system** (auto-update docs, validations)
- ✅ **Living Documentation** - Auto-updated via Claude Code hooks
- ✅ **npm Package** - Published and ready to use

### 📅 Planned (v0.2.0+)

- 📅 Quality gates and risk scoring
- 📅 Web UI for planning phase
- 📅 VS Code extension
- 📅 Homebrew formula
- 📅 Additional project templates

---

## 📖 Quick Start

### 🎯 NEW: Multi-Tool Support!

**SpecWeave now works with ANY AI coding tool!** Auto-detects Claude, Cursor, Gemini CLI, Codex, Copilot, or Generic.

**Architecture**:
- **Claude Code** = Native/Baseline (no adapter needed - full automation)
- **All other tools** = Adapters that approximate Claude's native capabilities

```bash
# List available adapters
npx specweave adapters

# Auto-detect your AI tool
npx specweave init my-saas           # Automatically detects and configures

# Or explicitly choose:
npx specweave init my-saas --adapter claude    # Native (no adapter!)
npx specweave init my-saas --adapter cursor    # Adapter (semi-automation)
npx specweave init my-saas --adapter gemini    # Adapter (semi-automation, 1M context!)
npx specweave init my-saas --adapter codex     # Adapter (semi-automation, GPT-5-Codex)
npx specweave init my-saas --adapter copilot   # Adapter (basic automation)
npx specweave init my-saas --adapter generic   # Adapter (manual, ANY AI)
```

### For Claude Code (Native - Full Automation)

**Claude is the BASELINE** - no adapter needed! Native skills, agents, hooks work out of the box.

```bash
npx specweave init my-saas
cd my-saas

# Native components installed:
# ✅ 10 agents in .claude/agents/
# ✅ 35+ skills in .claude/skills/
# ✅ 10 slash commands in .claude/commands/
# ✅ Hooks for auto-updates

# Open Claude Code and type slash commands:
/inc "User authentication with JWT"
/build
/progress
```

### For Gemini CLI / Codex / Cursor (Adapter - Semi-Automation)

**Uses universal AGENTS.md** that works across all tools (follows [agents.md](https://agents.md/) standard).

```bash
npx specweave init my-project --adapter gemini  # or codex, cursor
cd my-project

# Adapter creates:
# ✅ AGENTS.md (universal instructions - works with ALL tools!)
# ✅ Tool-specific folder (.gemini/, .codex/, .cursor/)

# Example with Gemini CLI:
gemini "Read AGENTS.md and create increment for user authentication"

# Example with Codex:
codex "Read AGENTS.md and create increment for payments"

# Example with Cursor:
# Open in Cursor, say: "Read AGENTS.md and create increment for auth"
```

### For GitHub Copilot (Adapter - Basic Automation)

**Uses universal AGENTS.md** for workspace instructions.

```bash
npx specweave init my-project --adapter copilot
cd my-project

# Adapter creates:
# ✅ AGENTS.md (universal instructions)
# ✅ .github/copilot/ (Copilot-specific config)

# Open in VS Code with Copilot:
# Copilot reads AGENTS.md automatically
# Start creating increment folders and files
```

### For ANY Other AI (Adapter - Manual)

**Uses universal AGENTS.md** that works with ChatGPT, Claude web, Gemini web, etc.

```bash
npx specweave init my-project --adapter generic
cd my-project

# Adapter creates:
# ✅ AGENTS.md (universal instructions)
# ✅ SPECWEAVE.md (detailed manual workflow)

# Follow manual workflow:
# 1. Read AGENTS.md in your AI tool (ChatGPT, Claude web, etc.)
# 2. Say: "Create increment for user authentication following SpecWeave"
# 3. Copy generated content to files
```

### For Existing Projects

```bash
# Add SpecWeave to existing project
cd my-existing-project
npx specweave init .

# Analyze existing code
# "Analyze my authentication module"
# SpecWeave creates retroactive specifications

# Safe to modify
# "Add OAuth to authentication"
```

---

## 🌟 Why SpecWeave?

### vs Traditional Development

| Aspect | Traditional | SpecWeave |
|--------|-------------|-----------|
| **Documentation** | Outdated, ignored | Living, auto-updated |
| **Specifications** | Optional, vague | Source of truth, precise |
| **Testing** | Manual, incomplete | 4-level, validated |
| **Components** | Manual setup | Pre-installed (10 agents + 35+ skills) |
| **Regression** | Frequent breaks | Prevention-first |
| **Onboarding** | Weeks | Hours (specs explain everything) |
| **Brownfield** | Risky | Safe (document first) |

### vs Other Frameworks

**vs spec-kit** (GitHub):
- ✅ SpecWeave: **Pre-installed agents** (10) and skills (35+) - spec-kit requires manual setup
- ✅ SpecWeave: **Living documentation** via Claude Code hooks - auto-updates on changes
- ✅ SpecWeave: **Brownfield analysis** - retroactive spec generation for existing code
- ✅ SpecWeave: **Tool integration** - JIRA, ADO, GitHub bidirectional sync

**vs BMAD-METHOD**:
- ✅ SpecWeave: **5-pillar documentation** - strategy, architecture, delivery, operations, governance
- ✅ SpecWeave: **Pre-installed components** - 10 agents + 35+ skills ready immediately
- ✅ SpecWeave: **Framework agnostic** - TypeScript, Python, Go, Rust, Java, C#
- ✅ SpecWeave: **Diagram generation** - C4 Model diagrams with validation
- ✅ SpecWeave: **Tool integration** - JIRA/ADO/GitHub sync built-in

**Both frameworks**:
- ✅ Specification-first development
- ✅ Automated testing
- ✅ Quality gates and validation

**Learn more**: See `bmad-method-expert` and `spec-kit-expert` skills for detailed comparisons

---

## 📞 Support & Community

- **Website**: [spec-weave.com](https://spec-weave.com)
- **npm Package**: [npmjs.com/package/specweave](https://www.npmjs.com/package/specweave)
- **GitHub**: [github.com/anton-abyzov/specweave](https://github.com/anton-abyzov/specweave)
- **Issues**: [github.com/anton-abyzov/specweave/issues](https://github.com/anton-abyzov/specweave/issues)
- **Documentation**: See [CLAUDE.md](CLAUDE.md) after running `specweave init`

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

SpecWeave is inspired by and learns from:
- [spec-kit](https://github.com/github/spec-kit) - GitHub's specification toolkit
- [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) - Agentic agile framework
- [Claude Code Skills](https://www.anthropic.com/news/skills) - Anthropic's skill system
- [C4 Model](https://c4model.com/) - Software architecture diagrams

---

**SpecWeave** - Replace vibe coding with spec-driven development.

**Get started**: [spec-weave.com](https://spec-weave.com) | [npm install](https://www.npmjs.com/package/specweave) | [GitHub](https://github.com/anton-abyzov/specweave)
