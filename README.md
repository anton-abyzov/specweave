# SpecWeave

> **Spec-Driven Development Framework** - Where specifications and documentation are the source of truth

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-0.4.0-blue.svg)](https://github.com/anton-abyzov/specweave/releases/tag/v0.4.0)
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
- 🔌 **Plugin Architecture** (NEW in v0.4.0) - Modular design with 75%+ context reduction! Core framework (12K tokens) + opt-in plugins only when needed
  - Core: 3 agents + 8 skills (always loaded)
  - Plugins: GitHub sync, tech stacks, domain expertise (load on demand)
  - **Context efficiency**: 50K → 12K tokens for basic projects!
- 🎯 **Extensible & Scalable** - 10+ agents and 40+ skills via plugins. PM, Architect, DevOps, QA, Security work in parallel
- 🔧 **Universal Support** - Works with Claude Code (default), Cursor, Gemini CLI, Codex, Copilot, and ANY AI tool (100% market coverage)
  - **Claude Code** (default): Native plugin support with auto-activation - best experience!
  - **Cursor/Copilot**: Plugin compilation to AGENTS.md - semi-automation
  - **Other tools**: AGENTS.md for manual workflows - full capability access!
- 🧪 **Complete Test Coverage** - 4-level strategy from specs to integration tests (APIs, UIs, CLIs, libraries)
- 📚 **Living Documentation** - Specs auto-update after every operation and test—always in sync with code
- 🎨 **Visual Architecture** - C4 Model diagrams (Context, Container, Component)
- 🔄 **Tool Integration** - GitHub, JIRA, Azure DevOps sync (via plugins)
- 🏢 **Brownfield Excellence** - The hardest problem solved: merge with existing docs, create complex architecture (ADRs, HLDs, RFCs), maintain living documentation, safe regression prevention
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
git clone https://github.com/anton-abyzov/specweave.git
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
specweave init [project]           # Create new project in subdirectory
specweave init .                   # Initialize in current directory (brownfield)
specweave --version                # Show version
specweave --help                   # Show help
```

**Note**:
- **Claude Code**: Core framework (3 agents + 8 skills) installed natively in `.claude/` + plugins auto-detected and suggested!
- **Other tools**: Universal AGENTS.md adapter generated - works with Cursor, Gemini CLI, Codex, Copilot, and ANY AI!
- **Plugins**: Auto-detected based on your project (GitHub, tech stacks, domain expertise) - enable as needed!

---

## 🚀 Quick Example

**CRITICAL**: SpecWeave uses **EXPLICIT SLASH COMMANDS** - type them to activate the framework!

```bash
# Initialize project (Claude Code native installation)
npx specweave init my-app
cd my-app

# For Claude Code - core framework native and ready immediately:
# ✅ 3 core agents in .claude/agents/ (PM, Architect, Tech Lead)
# ✅ 8 core skills in .claude/skills/ (increment lifecycle, living docs)
# ✅ 7 slash commands in .claude/commands/
# ✅ Plugins auto-detected and suggested based on project
# (Other tools get AGENTS.md adapter instead)

# Open Claude Code and use slash commands:

User: /specweave inc "Next.js authentication with email and OAuth"
    ↓
SpecWeave: 🔷 SpecWeave Active (/specweave.increment)

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

User: /specweave done 0001  # Close increment with slash command
✅ Increment 0001 closed successfully
```

**How it works** (smart append-only workflow: 0001 → 0002 → 0003):
1. `specweave init` → Detects your AI tool and configures appropriately
   - **Claude Code**: Core framework installed + plugins auto-detected and suggested
   - **Other tools**: Universal AGENTS.md adapter generated with enabled plugins
2. **Use `/specweave inc "feature"`** (Claude) or "Read AGENTS.md and create increment" (other tools)
   - PM creates specs + plan + auto-generates tasks
   - **Smart**: Auto-detects needed plugins from feature description
   - **Smart**: Auto-closes previous increment if PM gates pass
3. **Use `/specweave do` or `/specweave do 0001`** → Execute implementation (hooks after EVERY task in Claude)
   - **Smart**: Auto-resumes from next incomplete task
4. **Use `/specweave progress`** → Check status, task completion %, next action
5. **Use `/specweave validate 0001`** → Optional quality check (LLM-as-judge)
6. Repeat: `/specweave inc "next"` → Auto-closes if ready, creates next increment

**Why smart workflow?**
- ✅ No manual `/specweave done` needed (auto-closes on next `/specweave inc`)
- ✅ No task tracking needed (`/specweave do` auto-resumes)
- ✅ `/specweave progress` shows exactly where you are
- ✅ Natural flow: finish → start next
- ✅ Namespaced commands avoid collisions in brownfield projects

---

## 🤖 Agents

SpecWeave uses a **modular agent system** - core agents (always available) + plugin agents (opt-in):

### Core Agents (Always Available)

| Agent | Role | When It Activates |
|-------|------|-------------------|
| **pm** | Product Manager - requirements, user stories | Planning features, creating increments |
| **architect** | System Architect - design, ADRs, decisions | Technical design, architecture |
| **tech-lead** | Technical Lead - code review, best practices | Code review, refactoring |

### Plugin Agents (Available via Plugins)

| Agent | Plugin | Role | When It Activates |
|-------|--------|------|-------------------|
| **github-manager** | specweave-github | GitHub CLI specialist | GitHub operations, issue sync |
| **security** | specweave-security | Security Engineer - threat modeling | Security review, vulnerabilities |
| **qa-lead** | specweave-qa | QA Lead - test strategy | Testing, quality assurance |
| **devops** | specweave-kubernetes | DevOps Engineer - K8s, infrastructure | Deployment, infrastructure |
| **sre** | specweave-observability | SRE - incident response, monitoring | Production incidents |
| **docs-writer** | specweave-docs | Technical Writer - documentation | Writing docs, API docs |
| **performance** | specweave-performance | Performance Engineer - optimization | Performance issues |
| **diagrams-architect** | specweave-diagrams | Diagram Expert - C4 Model, Mermaid | Creating diagrams |

**Agent Access**:
- **Claude Code**: Core agents pre-installed in `.claude/agents/`, plugin agents load on demand!
- **Other tools**: Agents compiled to AGENTS.md - reference roles manually

---

## 🎯 Skills

SpecWeave uses a **modular skill system** - core skills (always available) + plugin skills (opt-in):

### Core Skills (Always Available)

**Increment Lifecycle:**
- **increment-planner** - Plan features via `/specweave inc` command
- **rfc-generator** - Generate RFCs and technical proposals
- **context-loader** - Explains progressive disclosure and context efficiency
- **context-optimizer** - Second-pass context optimization (80%+ token reduction)

**Project Management:**
- **project-kickstarter** - Initialize new projects from descriptions
- **increment-quality-judge** - AI-powered quality assessment

**Brownfield Support:**
- **brownfield-analyzer** - Analyze existing codebases
- **brownfield-onboarder** - Merge existing documentation

### Plugin Skills (40+ Available via Plugins)

**GitHub Integration (specweave-github):**
- **github-sync** - Bidirectional increment ↔ issue sync
- **github-issue-tracker** - Task-level progress tracking

**Technology Stacks:**
- **nextjs** - Next.js App Router, Server Components (specweave-frontend-stack)
- **nodejs-backend** - Node.js, Express, NestJS APIs (specweave-backend-stack)
- **python-backend** - FastAPI, Django APIs (specweave-backend-stack)
- **dotnet-backend** - ASP.NET Core APIs (specweave-backend-stack)
- **frontend** - React, Vue, Angular components (specweave-frontend-stack)

**Infrastructure:**
- **hetzner-provisioner** - Deploy to Hetzner Cloud (specweave-cloud)
- **cost-optimizer** - Optimize cloud costs (specweave-cloud)
- **k8s-deployer** - Kubernetes deployment (specweave-kubernetes)

**Integrations:**
- **jira-sync** - Sync with JIRA issues (specweave-jira)
- **ado-sync** - Sync with Azure DevOps (specweave-ado)

**Design & Diagrams:**
- **diagrams-generator** - Generate C4 diagrams (specweave-diagrams)
- **figma-designer** - Create Figma designs (specweave-figma)
- **figma-implementer** - Convert Figma to code (specweave-figma)

**And 30+ more specialized skills!**

### 🔌 Plugin System (NEW in v0.4.0)

SpecWeave v0.4.0 introduces **intelligent plugin detection**:

1. **Auto-Detection** - Plugins suggested based on:
   - Package.json dependencies (React → frontend-stack)
   - Directory structure (kubernetes/ → kubernetes)
   - Git remote (github.com → github)
   - Environment variables (GITHUB_TOKEN → github)

2. **Context Efficiency** - Load only what you need:
   - Basic project: **12K tokens** (core only)
   - React app: **16K tokens** (core + frontend-stack + github)
   - Backend API: **15K tokens** (core + backend-stack + github)

3. **Multi-Tool Support** - Works across all platforms:
   - **Claude Code**: Native plugin loading
   - **Cursor/Copilot**: AGENTS.md compilation
   - **Generic**: Manual workflows

**How it works**:
1. **Discovery**: Read `.claude/skills/SKILLS-INDEX.md` (1 file vs 35 files = 97% faster)
2. **Matching**: Find skills by activation keywords (e.g., "feature planning" → increment-planner)
3. **Loading**: Load full SKILL.md only when relevant
4. **Execution**: Follow proven workflows

**Benefits**:
- ✅ **90% token savings** - Load only what you need (5k vs 50k tokens)
- ✅ **Universal compatibility** - Works with ALL AI tools (Copilot, Cursor, etc.)
- ✅ **Consistent output** - Follow SpecWeave best practices every time

**Skill Access**:
- **Claude Code**: All skills pre-installed natively in `.claude/skills/` + SKILLS-INDEX.md - ready to use immediately!
- **Other tools**: Progressive disclosure via SKILLS-INDEX.md in AGENTS.md - universal compatibility!

**See**: [Complete skill list](https://spec-weave.com/docs/skills) on spec-weave.com

---

## 📁 Project Structure

```
specweave/
├── .specweave/                  # Framework configuration
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
│   │   └── public/              # Published docs (Docusaurus)
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
/specweave inc "user authentication"
# Alias: /specweave increment
# PM-led: Market research → spec.md → plan.md → auto-generate tasks.md
# Smart: Auto-closes previous increment if PM gates pass

# 3. Execute implementation (smart resume, hooks after EVERY task)
/specweave do
# Or: /specweave do 0001
# Smart: Auto-resumes from next incomplete task
# Hooks automatically update CLAUDE.md, README.md, CHANGELOG.md

# 4. Check progress anytime
/specweave progress
# Shows: task completion %, PM gates status, next action
# No increment ID needed - finds active increment automatically

# 5. Validate quality (optional)
/specweave validate 0001 --quality
# LLM-as-judge quality assessment

# 6. Start next feature (auto-closes previous)
/specweave inc "payment processing"
# Auto-closes 0001 if gates pass, creates 0002
# No manual /done needed!

# 7. Sync with tools (optional)
/specweave sync-github  # Sync to GitHub issues
```

### For Brownfield Projects (The Hardest Challenge)

**Why brownfield is the most complicated:**

- ❌ Existing codebase with no documentation

- ❌ Tribal knowledge scattered across the team

- ❌ Risk of breaking production systems

- ❌ Need to merge with existing docs/wikis

- ❌ Complex architecture that needs retroactive documentation

**SpecWeave solves all of this:**

```bash
# 1. Initialize in existing project
cd my-existing-project
npx specweave init .

# 2. Merge existing documentation
"Read brownfield-onboarder skill and merge my existing docs/"

# SpecWeave intelligently merges existing documentation:
#   ✅ Extracts project-specific knowledge from docs, wikis, CLAUDE.md backups
#   ✅ Distributes content to appropriate SpecWeave folders
#   ✅ Preserves historical context and team conventions
#   ✅ No bloat - smart content organization

# 3. Analyze and document existing code
"Analyze my authentication module and create comprehensive documentation"

# SpecWeave creates retroactive specifications:
#   ✅ Generates specs (WHAT/WHY) from existing code
#   ✅ Creates architecture diagrams (HLDs, C4 Context/Container/Component)
#   ✅ Documents decision rationale (ADRs)
#   ✅ Maps dependencies and integration points
#   ✅ Creates RFCs for understood patterns

# 4. Create complex architecture documentation
"Create complete architecture documentation for the auth system"

# SpecWeave generates:
#   📋 High-Level Design (HLD) documents
#   📋 Architecture Decision Records (ADRs) for key choices
#   📋 C4 Context diagrams (system boundaries)
#   📋 C4 Container diagrams (services, databases)
#   📋 C4 Component diagrams (internal structure)
#   📋 Sequence diagrams (flows)
#   📋 ER diagrams (data models)

# 5. Establish baseline tests (regression prevention)
"Create comprehensive tests for current auth behavior"

#   🧪 Creates baseline test suite to prevent regression

# 6. Set up living documentation

# From now on, all changes auto-update documentation:
#   📚 Specs stay in sync with code
#   📚 ADRs updated from Proposed → Accepted
#   📚 Architecture diagrams reflect current state
#   📚 No documentation drift ever again

# 7. Now safe to modify and evolve
"Add OAuth 2.0 to authentication system"

# SpecWeave automatically:
#   🚀 Updates existing specs with new requirements
#   🚀 Extends architecture docs (ADRs, HLDs)
#   🚀 Updates diagrams automatically
#   🚀 Maintains living documentation
#   🚀 Prevents regression with baseline tests
```

**The SpecWeave Brownfield Advantage:**

- ✅ **Merge existing docs** - Intelligently consolidates wikis, docs, legacy CLAUDE.md files

- ✅ **Create complex architecture** - HLDs, ADRs, RFCs, C4 diagrams for existing systems

- ✅ **Living documentation** - Auto-updates after every change (via hooks)

- ✅ **Structure evolution** - Documentation grows with your codebase

- ✅ **Regression prevention** - Baseline tests before any modifications

- ✅ **Compliance-ready** - Complete audit trail for regulated industries

- ✅ **Knowledge preservation** - No more tribal knowledge or context loss

**See [CLAUDE.md#development-workflow](CLAUDE.md#development-workflow)** for complete guide.

---

## 🏗️ Multi-Repo & Microservices Support

**CRITICAL**: SpecWeave supports ONLY **root-level** `.specweave/` folders. Nested folders are NOT supported.

### For Huge Projects with Multiple Repos

**Problem**: "I have 10+ repos (microservices, monorepo, polyrepo)"

**Solution**: Create a **parent folder** with one `.specweave/` at the root

```bash
# 1. Create parent folder
mkdir my-big-project
cd my-big-project

# 2. Initialize SpecWeave at root
npx specweave init .

# 3. Clone your repos as subdirectories
git clone https://github.com/myorg/auth-service.git
git clone https://github.com/myorg/payment-service.git
git clone https://github.com/myorg/frontend.git
git clone https://github.com/myorg/infrastructure.git
```

**Result**:
```
my-big-project/              ← Parent folder
├── .specweave/              ← ONE source of truth
│   ├── increments/
│   │   ├── 0001-auth-service/
│   │   ├── 0002-payment-service/
│   │   ├── 0003-unified-auth/       ← Cross-repo increment!
│   │   └── 0004-frontend-redesign/
│   ├── docs/
│   │   ├── internal/
│   │   │   ├── strategy/            ← System-wide strategy
│   │   │   ├── architecture/        ← Cross-service architecture
│   │   │   └── ...
│   │   └── public/
│   └── logs/
│
├── auth-service/            ← Separate git repo
│   ├── .git/
│   └── src/
│
├── payment-service/         ← Separate git repo
│   ├── .git/
│   └── src/
│
├── frontend/                ← Separate git repo
│   ├── .git/
│   └── src/
│
└── infrastructure/          ← Separate git repo
    ├── .git/
    └── terraform/
```

### Why Root-Level Only?

**Single Source of Truth**:
- ✅ One central location for all specs and increments
- ✅ No duplication or fragmentation
- ✅ Cross-cutting features span multiple repos naturally
- ✅ System-wide architecture in one place

**Prevents Chaos**:
- ❌ No nested `.specweave/` folders (causes conflicts)
- ❌ No ambiguity about where specs live
- ❌ No duplicate increment numbers across modules

### Enforcement

SpecWeave **prevents** nested initialization:

```bash
# ❌ This will FAIL if parent has .specweave/
cd my-big-project/backend
npx specweave init .

# Error: Nested .specweave/ folders are NOT supported!
#        Found parent .specweave/ at: /path/to/my-big-project
#        Use the parent folder for all increments.
```

**Correct Approach**:
```bash
# ✅ Use parent folder
cd my-big-project
/specweave.inc "0001-backend-api-v2"
# Creates: .specweave/increments/0001-backend-api-v2/
# Can reference: backend/, frontend/, etc.
```

### Benefits

- ✅ **One `.specweave/` for entire system** - Single source of truth
- ✅ **Each repo maintains its own git history** - No monorepo migration needed
- ✅ **Cross-service increments are natural** - Auth spans auth-service + frontend + API
- ✅ **System-wide architecture** - ADRs, HLDs apply to all services
- ✅ **Living docs cover all repos** - Documentation spans the entire system

**See [CLAUDE.md#root-level-specweave-folder-mandatory](CLAUDE.md#root-level-specweave-folder-mandatory)** for complete architectural details.

---

## 🧪 Testing Strategy

SpecWeave implements **4 Levels of Testing**:

1. **Level 1: Specification** (spec.md)
   - Acceptance criteria with TC-0001 format
   - Business-level validation

2. **Level 2: Feature Tests** (tests.md)
   - Test coverage matrix
   - Maps TC-0001 to implementations

3. **Level 3: Component Tests** (tests/)
   - Integration tests: `tests/integration/{integration-name}/`
   - Skill tests: `tests/specs/{skill-name}/`
   - **Minimum 3 tests per component** (MANDATORY)
   - **Centralized location** for better organization and CI/CD

4. **Level 4: Automated Tests** (tests/)
   - Unit tests (Jest)
   - Integration tests (Jira, GitHub, ADO sync)
   - E2E tests (Playwright) for UI/CLI validation

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

```bash
# Sync increment to JIRA
/sync-jira --increment 0001

# Maps: Increment → Epic, Tasks → Stories
# Configuration auto-detected from environment or prompts
```

### Azure DevOps Integration

```bash
# Sync increment to Azure DevOps
/sync-ado --increment 0001

# Configuration auto-detected from environment or prompts
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
/specweave inc "User authentication with JWT"
/specweave do
/specweave progress
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
# Add SpecWeave to existing project (brownfield)
cd my-existing-project
npx specweave init .

# SpecWeave initializes in current directory:
# ✅ Detects existing files and prompts for confirmation
# ✅ Preserves your existing code and git history
# ✅ Adds .specweave/ and .claude/ directories
# ✅ Uses directory name as project name (or prompts if invalid)

# Now analyze existing code
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
| **Brownfield** | Risky, undocumented | Safe, documented, living architecture (most complicated solved) |
| **Architecture** | Scattered tribal knowledge | HLDs, ADRs, C4 diagrams auto-updated |
| **Doc Maintenance** | Manual, becomes stale | Auto-updated via hooks, always current |

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
