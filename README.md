# SpecWeave

> **Spec-Driven Development Framework** - Where specifications and documentation are the source of truth

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-0.1.0--beta.1-blue.svg)](https://github.com/specweave/specweave/releases/tag/v0.1.0-beta.1)
[![Status](https://img.shields.io/badge/status-beta-blue.svg)]()

---

## Overview

**SpecWeave** is an AI development framework that replaces "vibe coding" with **specification-first development**. Built on the principle that **specifications are the source of truth**, SpecWeave enables building software from solo projects to enterprise systems with confidence, precision, and 70%+ context reduction.

### 🎯 Core Philosophy

1. **Specification Before Implementation** - Define WHAT and WHY before HOW
2. **Living Documentation** - Specs evolve with code, never diverge
3. **Regression Prevention** - Document before modifying existing code
4. **Test-Validated Features** - Every feature proven through automated tests
5. **Context Precision** - Load only relevant specs (70%+ token reduction)
6. **Auto-Role Routing** - Skills detect and delegate automatically

---

## ✨ Key Features

- 🤖 **19 Specialized Agents** - PM, Architect, DevOps, QA, Security, Backend, Frontend, and more
- 🎯 **24 AI Skills** - Auto-detection, routing, context loading, orchestration
- 📊 **Context Manifests** - 70%+ token reduction by loading only relevant specs
- 🧪 **4-Level Testing** - Specification → Feature → Component → Automated tests
- 📝 **Living Documentation** - Auto-updates via Claude Code hooks
- 🎨 **Diagram Generation** - C4 Model diagrams (Context, Container, Component)
- 🔄 **Tool Integration** - Sync with JIRA, Azure DevOps, GitHub
- 🏢 **Brownfield Ready** - Analyze and document existing codebases
- 🌐 **Framework Agnostic** - Works with TypeScript, Python, Go, Rust, Java, C#

---

## 📦 Installation

### Prerequisites

- **Node.js 18+** (`node --version`)
- **npm 9+** (`npm --version`)
- **Claude Code** (Claude Sonnet 4.5 recommended)

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
specweave init [project]           # Create new project
specweave install [component]      # Install agents/skills (--local or --global)
specweave list                     # List all available components
specweave list --installed         # Show installed components
specweave --version                # Show version
specweave --help                   # Show help
```

**Detailed installation**: See [INSTALL.md](INSTALL.md)

---

## 🚀 Quick Example

```bash
# SpecWeave auto-activates when .specweave/ detected

User: "Create authentication feature with email and OAuth"
    ↓
SpecWeave: (auto-routes to feature-planner)
✅ Increment created: .specweave/increments/0001-user-authentication/
✅ Files: spec.md, plan.md, tasks.md, tests.md

User: "Create C4 context diagram for authentication"
    ↓
SpecWeave: (coordinates diagrams-generator → diagrams-architect)
✅ Diagram saved: .specweave/docs/internal/architecture/diagrams/auth.c4-context.mmd

User: "Implement authentication"
    ↓
SpecWeave: (orchestrates PM → Architect → Backend → QA → Docs)
✅ Code: src/auth/
✅ Tests: tests/auth/
✅ Docs: Updated automatically
```

**How it works**:
1. `.specweave/` detected → `specweave-detector` activates automatically
2. Request parsed → routed to appropriate skills
3. Skills coordinate agents → artifacts generated
4. Context loaded precisely → only relevant specs (70%+ reduction)

---

## 🤖 Agents (19 Total)

SpecWeave includes **19 specialized AI agents** that provide domain expertise:

### Strategic Layer
| Agent | Role | Status |
|-------|------|--------|
| **pm** | Product Manager - requirements, user stories, roadmap | ✅ Implemented |
| **architect** | System Architect - design, ADRs, technology decisions | ✅ Implemented |
| **tech-lead** | Technical Lead - code review, best practices | ✅ Implemented |

### Implementation Layer
| Agent | Role | Status |
|-------|------|--------|
| **nodejs-backend** | Node.js/TypeScript backend development | ✅ Implemented |
| **python-backend** | Python/FastAPI backend development | ✅ Implemented |
| **dotnet-backend** | C#/.NET/ASP.NET Core development | ✅ Implemented |
| **frontend** | React/Vue frontend development | ✅ Implemented |
| **nextjs** | Next.js App Router specialist | ✅ Implemented |

### Quality & Operations
| Agent | Role | Status |
|-------|------|--------|
| **qa-lead** | QA Lead - test strategy, test cases, quality gates | ✅ Implemented |
| **security** | Security Engineer - threat modeling, OWASP, compliance | ✅ Implemented |
| **devops** | DevOps - CI/CD, infrastructure, deployment | ✅ Implemented |
| **sre** | SRE - monitoring, incidents, reliability | ✅ Implemented |
| **performance** | Performance Engineer - profiling, optimization | ✅ Implemented |

### Documentation & Design
| Agent | Role | Status |
|-------|------|--------|
| **docs-writer** | Technical Writer - API docs, guides, tutorials | ✅ Implemented |
| **diagrams-architect** | Diagram generation - C4 Model, Mermaid, architecture | ✅ Implemented |
| **figma-designer** | Figma designer - design systems, UI/UX | ✅ Implemented |
| **figma-implementer** | Figma to code - React/Angular components | ✅ Implemented |

### Integration
| Agent | Role | Status |
|-------|------|--------|
| **specweave-jira-mapper** | JIRA ↔ SpecWeave bidirectional sync | ✅ Implemented |
| **specweave-ado-mapper** | Azure DevOps ↔ SpecWeave bidirectional sync | ✅ Implemented |

**All agents** have AGENT.md with YAML frontmatter and 3+ test cases.

---

## 🎯 Skills (24 Total)

SpecWeave includes **24 AI skills** that coordinate agents and provide specialized capabilities:

### Core Orchestration
| Skill | Purpose | Status |
|-------|---------|--------|
| **specweave-detector** | Auto-detect SpecWeave projects (proactive entry point) | ✅ Implemented |
| **skill-router** | Route requests to appropriate skills/agents (>90% accuracy) | ✅ Implemented |
| **context-loader** | Load specs selectively (70%+ token reduction) | ✅ Implemented |
| **role-orchestrator** | Multi-agent coordinator (factory of agents) | ✅ Implemented |

### Feature Planning
| Skill | Purpose | Status |
|-------|---------|--------|
| **feature-planner** | Plan features with context awareness | ✅ Implemented |
| **task-builder** | Break features into executable tasks | ✅ Implemented |
| **docs-updater** | Auto-update documentation via hooks | ✅ Implemented |

### Brownfield Tools
| Skill | Purpose | Status |
|-------|---------|--------|
| **brownfield-analyzer** | Analyze existing codebases | ✅ Implemented |
| **brownfield-onboarder** | Merge existing CLAUDE.md intelligently | ✅ Implemented |

### Integration
| Skill | Purpose | Status |
|-------|---------|--------|
| **jira-sync** | Sync with JIRA (coordinates with specweave-jira-mapper) | ✅ Implemented |
| **ado-sync** | Sync with Azure DevOps (coordinates with specweave-ado-mapper) | ✅ Implemented |
| **github-sync** | Sync with GitHub issues | ✅ Implemented |

### Infrastructure
| Skill | Purpose | Status |
|-------|---------|--------|
| **hetzner-provisioner** | Provision Hetzner Cloud infrastructure | ✅ Implemented |
| **cost-optimizer** | Optimize cloud infrastructure costs | ✅ Implemented |

### Diagram & Design
| Skill | Purpose | Status |
|-------|---------|--------|
| **diagrams-generator** | Generate C4 diagrams (coordinates with diagrams-architect) | ✅ Implemented |
| **design-system-architect** | Design system creation (Atomic Design) | ✅ Implemented |
| **figma-mcp-connector** | Connect to Figma MCP servers | ✅ Implemented |
| **figma-to-code** | Convert Figma designs to code | ✅ Implemented |

### Product Features
| Skill | Purpose | Status |
|-------|---------|--------|
| **calendar-system** | Calendar and scheduling features | ✅ Implemented |
| **notification-system** | Email, push, SMS, in-app notifications | ✅ Implemented |
| **stripe-integrator** | Stripe payment integration | ✅ Implemented |

### Framework Comparison
| Skill | Purpose | Status |
|-------|---------|--------|
| **bmad-method-expert** | BMAD-METHOD comparison and gap analysis | ✅ Implemented |
| **spec-kit-expert** | spec-kit comparison and gap analysis | ✅ Implemented |

### Meta
| Skill | Purpose | Status |
|-------|---------|--------|
| **skill-creator** | Guide for creating new skills | ✅ Implemented |

**All skills** have SKILL.md with YAML frontmatter and 3+ test cases.

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
├── .claude/                     # Installed components (gitignored)
│   ├── agents/                  # Installed from src/agents/
│   ├── skills/                  # Installed from src/skills/
│   ├── commands/                # Installed from src/commands/
│   └── hooks/                   # Symlinks to src/hooks/
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

```bash
# 1. Create specifications (optional: comprehensive upfront or incremental)
# Option A: Comprehensive (Enterprise) - 500-600+ pages upfront
# Option B: Incremental (Startup) - Build as you go

# 2. Create increment
/create-increment "user authentication"

# 3. Implement with auto-role routing
"Implement user authentication"
# SpecWeave orchestrates: PM → Architect → Backend → QA → Docs

# 4. Generate diagrams
"Create C4 context diagram for authentication"

# 5. Sync with tools (optional)
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

## 📊 Context Precision (70%+ Reduction)

SpecWeave uses **context manifests** to load only relevant specifications:

**Without context manifests** (traditional):
- Load entire spec/ folder
- 100,000+ tokens
- Slow, expensive, context pollution

**With context manifests** (SpecWeave):
- Load only relevant sections
- 10,000-30,000 tokens
- **70%+ reduction**
- Fast, efficient, focused

**Example**:
```yaml
# .specweave/increments/0001-auth/context-manifest.yaml
spec_sections:
  - .specweave/docs/internal/strategy/auth/authentication-spec.md
  - .specweave/docs/internal/strategy/auth/authorization-spec.md

documentation:
  - .specweave/docs/internal/architecture/auth-hld.md
  - CLAUDE.md#authentication

max_context_tokens: 10000
```

**See [CLAUDE.md#context-precision](CLAUDE.md#scalable-directory-structure)** for details.

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

- **[CLAUDE.md](CLAUDE.md)** - **START HERE** - Complete development guide (source of truth)
- **[INSTALLATION.md](INSTALLATION.md)** - Detailed installation instructions
- **[.specweave/docs/README.md](.specweave/docs/README.md)** - Documentation structure
- **[Diagram Conventions](.specweave/docs/internal/delivery/guides/diagram-conventions.md)** - C4 Model conventions
- **[Tool Concept Mapping](.specweave/docs/internal/delivery/guides/tool-concept-mapping.md)** - Tool mappings
- **[.specweave/increments/README.md](.specweave/increments/README.md)** - Increments guide

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Clone repository
git clone https://github.com/specweave/specweave.git
cd specweave

# Install dependencies
npm install

# Build TypeScript
npm run build

# Install components
npm run install:all

# Run tests
npm test

# Restart Claude Code
```

**To contribute**:
1. Fork repository
2. Create feature branch: `git checkout -b features/001-new-feature`
3. Follow [CLAUDE.md](CLAUDE.md) conventions
4. Add 3+ test cases (MANDATORY)
5. Create PR to `develop` branch

---

## 🏷️ Project Status

**Version**: 0.1.0-beta.1
**Status**: Public Beta
**License**: MIT
**Release Date**: 2025-10-27

### ✅ What Works (v0.1.0-beta.1)

- ✅ **19 Agents** fully implemented with test cases
- ✅ **24 Skills** fully implemented with test cases
- ✅ **CLI Tool** - `specweave` command (`init`, `install`, `list`)
- ✅ **Auto-detection** and intelligent routing (>90% accuracy)
- ✅ **Context manifests** (70%+ token reduction)
- ✅ **Diagram generation** (C4 Model with validation)
- ✅ **Install scripts** (selective installation based on tech stack)
- ✅ **4-level testing framework** (spec → feature → component → automated)
- ✅ **JIRA/ADO/GitHub sync** agents
- ✅ **Brownfield analyzer** (retroactive specs, regression prevention)
- ✅ **Increment lifecycle** (5 stages, WIP limits, leftover transfer)
- ✅ **Increment validation** (120 rules, auto-validation on save)
- ✅ **Hooks system** (auto-update docs, validations)
- ✅ **Documentation** (CHANGELOG.md, INSTALL.md, comprehensive guides)

### ⏳ In Progress (v0.1.0-beta.2)

- ⏳ NPM package publishing (beta.1 installable via GitHub only)
- ⏳ Additional CLI commands (`audit`, `cleanup`)
- ⏳ More project templates (currently: saas, api, fullstack)
- ⏳ GitHub Actions CI/CD integration
- ⏳ MkDocs documentation site deployment

### 📅 Planned (v0.2.0+)

- 📅 Quality gates (inspired by BMAD `@qa *gate`)
- 📅 Risk scoring (inspired by BMAD `@qa *risk`)
- 📅 Clarification workflow (inspired by spec-kit `/speckit.clarify`)
- 📅 Dependency tracking in tasks (inspired by spec-kit)
- 📅 Agent-agnostic support (Copilot, Cursor, Gemini, etc.)
- 📅 Web UI for planning phase
- 📅 VS Code extension
- 📅 Homebrew formula
- 📅 Test importer (import existing tests)

---

## 📖 Example Projects

### SaaS Application

```bash
git clone https://github.com/specweave/specweave.git my-saas
cd my-saas
npm install && npm run install:all

# Create features
/create-increment "user authentication"
/create-increment "subscription billing"
/create-increment "admin dashboard"

# Implement
"Implement all increments"
```

### API Service

```bash
# Similar setup, different increments
/create-increment "REST API with OpenAPI"
/create-increment "GraphQL endpoint"
/create-increment "WebSocket real-time features"
```

---

## 🌟 Why SpecWeave?

### vs Traditional Development

| Aspect | Traditional | SpecWeave |
|--------|-------------|-----------|
| **Documentation** | Outdated, ignored | Living, auto-updated |
| **Specifications** | Optional, vague | Source of truth, precise |
| **Testing** | Manual, incomplete | 4-level, validated |
| **Context** | Full codebase loaded | 70%+ reduction |
| **Regression** | Frequent breaks | Prevention-first |
| **Onboarding** | Weeks | Hours (specs explain everything) |
| **Brownfield** | Risky | Safe (document first) |

### vs Other Frameworks

**vs spec-kit** (GitHub):
- ✅ SpecWeave: Auto-role routing, context precision
- ✅ SpecWeave: Living documentation via hooks
- ✅ SpecWeave: Brownfield analysis
- ✅ SpecWeave: 19 agents + 24 skills

**vs BMAD-METHOD**:
- ✅ SpecWeave: Context manifests (70%+ reduction)
- ✅ SpecWeave: 5-pillar documentation
- ✅ SpecWeave: Tool integration (JIRA/ADO/GitHub)
- ✅ SpecWeave: Diagram generation

**See skills**:
- `bmad-method-expert` - Dynamic gap analysis vs BMAD
- `spec-kit-expert` - Dynamic gap analysis vs spec-kit

---

## 📞 Support & Community

- **GitHub**: [github.com/specweave/specweave](https://github.com/specweave/specweave)
- **Issues**: [github.com/specweave/specweave/issues](https://github.com/specweave/specweave/issues)
- **Discussions**: [github.com/specweave/specweave/discussions](https://github.com/specweave/specweave/discussions)
- **Documentation**: [CLAUDE.md](CLAUDE.md)

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

**Get started**: See [INSTALLATION.md](INSTALLATION.md) | [CLAUDE.md](CLAUDE.md)
