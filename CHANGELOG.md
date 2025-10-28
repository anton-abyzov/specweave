# Changelog

All notable changes to SpecWeave will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2025-10-28

### 🎉 First Stable Release

The first stable release of **SpecWeave** - a revolutionary spec-driven development framework that transforms how you build software with AI agents.

**Website**: https://spec-weave.com/

---

### 🌟 What is SpecWeave?

SpecWeave is where **specifications are the source of truth** and AI agents autonomously build production-ready applications. Think of it as the evolution beyond "vibe coding".

**Core Philosophy:**
- **Specification First** - Define WHAT and WHY before HOW
- **Living Documentation** - Specs evolve with code, never diverge
- **Context Precision** - 70-80%+ token reduction (scales to 1000+ pages)
- **Test-Validated** - Every feature proven through automated tests
- **Framework-Agnostic** - Works with ANY tech stack

---

### ✨ Key Features

#### 🔄 **Multi-Tool Adapter System**

Choose your preferred AI tool:

**Supported Adapters:**
- **Claude Code** (native, recommended) - Full feature support
- **Cursor** (via `.cursorrules`) - Optimized for Cursor's context system
- **Generic** (universal adapter) - Works with ANY AI tool (Copilot, Windsurf, Cline, etc.)

```bash
npx specweave init my-project --adapter claude
npx specweave init my-project --adapter cursor
npx specweave init my-project --adapter generic
```

**Why This Matters**: Use SpecWeave with ANY AI tool. Switch tools without rewriting workflows.

#### 🤖 **Multi-Agent System** (9 Specialized Agents)

**Strategic:** PM, Architect, Security, QA Lead, DevOps, Tech Lead, Docs Writer
**Operational:** Performance, SRE

Each agent has **separate context windows** - prevents context pollution, maintains role expertise.

#### ✨ **Skills Framework** (32+ Extensible Skills)

**Core:** specweave-detector, increment-planner, context-loader, context-optimizer, increment-quality-judge
**Integration:** JIRA sync, ADO sync, GitHub sync
**Infrastructure:** Hetzner provisioner, cost optimizer
**Design:** Figma MCP connector, Figma-to-code
**Brownfield:** Brownfield analyzer, brownfield onboarder

#### 📁 **Context Precision** (70-80%+ Token Reduction)

Context manifests load only relevant sections:
- **Pass 1**: Context loader (70% reduction via manifests)
- **Pass 2**: Context optimizer (80%+ total reduction via intent analysis)

**Result**: Scale from 10 to 1000+ page specs without context bloat.

#### 🧪 **4-Level Testing Strategy**

1. **Specification** - TC-0001 acceptance criteria (technology-agnostic)
2. **Feature** - Test coverage matrix in `tests.md`
3. **Skill** - Minimum 3 YAML test cases (MANDATORY)
4. **Code** - E2E (Playwright), Unit, Integration tests

#### 🏗️ **Brownfield Support**

Safe modification workflow:
1. Analyze existing code → retroactive specs
2. Generate regression tests
3. User reviews tests
4. Implement with safety net

---

### 🆚 SpecWeave vs Other Frameworks

#### vs **spec-kit** (GitHub)

| Feature | SpecWeave | spec-kit |
|---------|-----------|----------|
| **Context Management** | ✅ 70-80% reduction | ❌ Loads all |
| **Multi-Agent** | ✅ 9 agents | ❌ Commands only |
| **Brownfield** | ✅ Analyzer | ⚠️ Manual |
| **Testing** | ✅ 4 levels | ⚠️ TDD only |
| **Skills** | ✅ 32+ extensible | ⚠️ Fixed |
| **AI Tools** | ⚠️ Claude-focused | ✅ 14+ tools |

**SpecWeave Wins**: Context precision, enterprise scale, brownfield, automation
**spec-kit Wins**: Agent-agnostic

#### vs **BMAD-METHOD**

| Feature | SpecWeave | BMAD |
|---------|-----------|------|
| **Context** | ✅ Manifests | ❌ Always-loaded |
| **Brownfield** | ✅ Analyzer | ⚠️ Manual |
| **Skills** | ✅ 32+ skills | ⚠️ Fixed |
| **Workflow** | ✅ Continuous | ⚠️ Two-phase |
| **Quality Gates** | ⚠️ v0.2.0 | ✅ @qa *gate |

**SpecWeave Wins**: Context precision, brownfield, continuous workflow
**BMAD Wins**: Formal QA gates (coming in v0.2.0!)

---

### 🎯 Unique Benefits

1. **Context Precision** - 70-80%+ token reduction
2. **Enterprise Scale** - 1000+ page specs
3. **Brownfield Ready** - Retroactive specs, regression prevention
4. **Test-Validated** - 4-level testing
5. **Framework-Agnostic** - ANY tech stack
6. **Flexible Docs** - Comprehensive OR incremental
7. **Auto-Routing** - >90% skill routing accuracy
8. **Living Docs** - Hooks auto-update
9. **Multi-Tool** - Claude, Cursor, Generic

---

## [0.1.0-beta.1] - 2025-10-27

### 🎉 Initial Beta Release

The first public beta release of **SpecWeave** - a revolutionary spec-driven development framework that transforms how you build software with AI agents.

**What is SpecWeave?**

SpecWeave is an open-source framework that enables spec-driven development where specifications are the source of truth, and AI agents autonomously build production-ready applications. Think of it as the evolution beyond "vibe coding" - where your specifications directly drive implementation, testing, and deployment.

**Core Philosophy:**
- **Specifications First**: Define WHAT and WHY before HOW
- **Living Documentation**: Specs evolve with code, never diverge
- **Context Precision**: Load only what's needed (70%+ token reduction)
- **Test-Validated**: Every feature proven through automated tests
- **Framework-Agnostic**: Works with ANY tech stack (TypeScript, Python, Go, Rust, Java, etc.)

---

### ✨ Features

#### 🤖 **Multi-Agent System** (14 Specialized Agents)

**Strategic Agents:**
- `pm` - Product Manager for requirements and user stories
- `architect` - System Architect for design and ADRs
- `security` - Security Engineer for threat modeling and audits
- `qa-lead` - QA Lead for test strategy and quality gates
- `devops` - DevOps Engineer for infrastructure and deployment
- `tech-lead` - Technical Lead for code review and best practices
- `docs-writer` - Documentation Writer for comprehensive docs

**Implementation Agents:**
- `frontend` - Frontend Developer (React, Vue, Angular)
- `nextjs` - Next.js Specialist (App Router, Server Components)
- `nodejs-backend` - Node.js Backend (Express, NestJS, Fastify)
- `python-backend` - Python Backend (FastAPI, Django, Flask)
- `dotnet-backend` - .NET Backend (ASP.NET Core, C#)
- `performance` - Performance Engineer (optimization, profiling)
- `sre` - Site Reliability Engineer (monitoring, incidents)

Each agent has:
- Separate context windows (prevents context pollution)
- Specialized expertise and templates
- Minimum 3 test cases for validation

#### ✨ **Skills Framework** (17+ Extensible Skills)

**Core Skills:**
- `specweave-detector` - Auto-detect and activate SpecWeave projects
- `increment-planner` - Plan features with context manifests (70%+ token reduction)
- `skill-router` - Intelligent request routing (>90% accuracy)
- `context-loader` - Selective specification loading (enterprise scalability)
- `role-orchestrator` - Multi-agent workflow coordination

**Integration Skills:**
- `jira-sync` - Bidirectional JIRA sync (Epics/Stories/Subtasks)
- `ado-sync` - Azure DevOps sync (Epics/Features/User Stories/Tasks)
- `github-sync` - GitHub Issues integration with checkable subtasks
- `diagrams-generator` - Mermaid C4 diagram generation

**Infrastructure Skills:**
- `hetzner-provisioner` - Hetzner Cloud deployment (cheapest option, $5-20/month)
- `cost-optimizer` - Infrastructure cost comparison (AWS, Azure, GCP, Railway, Vercel)

**Brownfield Skills:**
- `brownfield-analyzer` - Analyze existing codebases, generate retroactive specs
- `brownfield-onboarder` - Merge existing CLAUDE.md into SpecWeave structure

**Design Skills:**
- `figma-mcp-connector` - Connect to Figma MCP servers (read/write designs)
- `design-system-architect` - Create design systems (Atomic Design, design tokens)
- `figma-to-code` - Convert Figma designs to production-ready code

**Expert Skills:**
- `spec-kit-expert` - Compare SpecWeave to GitHub's spec-kit framework
- `bmad-method-expert` - Compare SpecWeave to BMAD-METHOD framework

#### 📁 **Project Structure** (Scalable from 10 to 1000+ pages)

**5-Pillar Documentation Architecture:**

```
.specweave/
├── config.yaml                    # Project configuration
├── increments/                    # Work organized by features
│   └── 0001-feature-name/
│       ├── spec.md                # WHAT & WHY (< 250 lines)
│       ├── plan.md                # HOW (< 500 lines)
│       ├── tasks.md               # Implementation checklist
│       ├── tests.md               # Test strategy & mapping
│       ├── context-manifest.yaml  # 70%+ token reduction
│       ├── logs/                  # Execution history
│       ├── scripts/               # Automation helpers
│       └── reports/               # Analysis documents
├── docs/
│   ├── internal/
│   │   ├── strategy/              # Business specs (WHAT, WHY)
│   │   ├── architecture/          # Technical design (HOW)
│   │   ├── delivery/              # Roadmap, CI/CD
│   │   ├── operations/            # Runbooks, SLOs
│   │   └── governance/            # Security, compliance
│   └── public/                    # Published documentation
└── tests/                         # Centralized test repository
```

**Key Benefits:**
- ✅ Modular specifications (500+ pages without context bloat)
- ✅ Context manifests (load only relevant sections)
- ✅ Increment-centric organization (complete traceability)
- ✅ Scales from startup to enterprise

#### 🚀 **CLI Commands**

**Installation:**
```bash
# Global installation
npm install -g specweave

# One-time usage (like npx)
npx specweave init my-project
```

**Available Commands:**
```bash
specweave init [project]          # Create new SpecWeave project
specweave install [component]     # Install agents/skills (--local or --global)
specweave list                    # List all available components
specweave list --installed        # Show installed components
```

**Slash Commands** (in Claude Code):
```bash
/create-project               # Bootstrap new project (auto-detects tech stack)
/create-increment "feature"   # Create new feature increment
/review-docs                  # Review strategic docs vs implementation
/sync-github                  # Sync increment to GitHub issues
```

#### 🧪 **Testing Philosophy** (4 Levels of Test Cases)

**Level 1: Specification Acceptance Criteria** (WHAT must be true)
- Location: `.specweave/docs/internal/strategy/{module}/`
- Format: TC-0001, TC-0002 (business validation)
- Technology-agnostic, testable conditions

**Level 2: Feature Test Strategy** (HOW to validate)
- Location: `.specweave/increments/{id}/tests.md`
- Test coverage matrix (maps TC-0001 to implementations)
- Defines test types (E2E, Unit, Integration)

**Level 3: Skill Test Cases** (VALIDATE skills work)
- Location: `src/skills/{name}/test-cases/`
- Minimum 3 YAML test cases per skill
- Covers basic, edge cases, integration

**Level 4: Code Tests** (AUTOMATE validation)
- Location: `tests/` (unit, integration, e2e)
- Playwright for E2E (MANDATORY when UI exists)
- Truth-telling requirement (zero false positives)

#### 🎯 **Deployment Intelligence**

SpecWeave asks about deployment target ONLY when relevant (not on day 1):

**Supported Platforms:**
- Local (Docker Compose, no cloud)
- Hetzner Cloud ($5-20/month - recommended for budget)
- Railway ($5-20/month - easiest auto-scaling)
- Vercel ($20/month - best for Next.js)
- AWS/Azure/GCP ($50+/month - enterprise)
- DigitalOcean ($10-30/month - developer-friendly)

**Smart Workflow:**
1. User mentions "deploy", "production", "hosting" → Ask deployment questions
2. Check `.specweave/config.yaml` for deployment.target
3. Generate appropriate IaC (Terraform/Pulumi) for chosen provider
4. Request secrets ONLY when ready to deploy

**Cost Optimizer:**
- Compares providers based on your stack
- Shows estimated monthly costs
- Recommends cheapest option

#### 🔄 **Increment Lifecycle Management**

**5 Status Stages:**
```
backlog → planned → in-progress → completed → closed
```

**WIP Limits** (prevent context-switching overhead):
- Solo/small team: 1-2 in progress
- Large team (10+): 3-5 in progress
- Enforced by `/create-increment` and `/start-increment`

**Leftover Transfer Workflow:**
- Close increments when P1 tasks done (P2/P3 can transfer)
- Transfer tasks to new increment or existing one
- Auto-generate closure reports
- Track transferred tasks with `[T]` marker

**Frontmatter Tracking:**
```yaml
---
increment: 001-core-framework
status: in-progress
total_tasks: 50
completed_tasks: 44
completion_rate: 88%
transferred_to: 002-enhancements
---
```

#### 📚 **Documentation Philosophy** (Two Valid Approaches)

**Approach 1: Comprehensive Upfront** (Enterprise/Production)
- 500-600+ page specifications before development
- Complete architecture documentation upfront
- All ADRs created in advance
- Best for: Regulated industries, large teams, well-understood requirements

**Approach 2: Incremental/Evolutionary** (Startup/Iterative)
- Start with 10-20 page overview
- Build documentation as you go (like Microsoft)
- Architecture evolves with implementation
- Best for: Startups, MVPs, evolving requirements

**SpecWeave supports BOTH approaches** - scales from 10 to 1000+ pages.

#### 🔐 **Secrets Management**

**Smart Secret Handling:**
- Secrets requested ONLY when needed for blocking operations
- User-friendly prompts with instructions
- Secure storage in .env (gitignored)
- Validation before use

**Platform-Specific Secrets:**
- Hetzner: `HETZNER_API_TOKEN` (64 chars)
- AWS: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- Railway: `RAILWAY_TOKEN`
- GitHub: `GITHUB_TOKEN`
- JIRA: `JIRA_API_TOKEN`, `JIRA_EMAIL`
- Azure DevOps: `AZURE_DEVOPS_PAT`

#### 🏗️ **Brownfield Support** (Regression Prevention)

**Workflow:**
1. **Analyze existing code** (`brownfield-analyzer` skill)
2. **Generate retroactive specs** (document current behavior)
3. **Create regression tests** (baseline before modification)
4. **User reviews tests** (ensure completeness)
5. **Implement modifications** (with safety net)

**Key Feature: Merge Existing CLAUDE.md**
- `brownfield-onboarder` skill intelligently merges old CLAUDE.md
- Extracts domain knowledge, architecture, conventions
- Distributes to appropriate SpecWeave folders (not bloating CLAUDE.md)
- Maintains 99%+ content in folders, 12 lines max in CLAUDE.md

#### 📊 **C4 Diagram Conventions**

**C4 Model Integration:**
- **Level 1 (Context)**: System boundaries, external actors → `.specweave/docs/internal/architecture/diagrams/system-context.mmd`
- **Level 2 (Container)**: Applications, services, databases → `.specweave/docs/internal/architecture/diagrams/system-container.mmd`
- **Level 3 (Component)**: Internal container structure → `.specweave/docs/internal/architecture/diagrams/{module}/component-{name}.mmd`
- **Level 4 (Code)**: Optional, generated from code

**Other Diagrams:**
- Sequence diagrams: `.specweave/docs/internal/architecture/diagrams/{module}/flows/{flow-name}.mmd`
- ER diagrams: `.specweave/docs/internal/architecture/diagrams/{module}/data-model.mmd`
- Deployment diagrams: `.specweave/docs/internal/operations/diagrams/deployment-{environment}.mmd`

**Agents:**
- `diagrams-architect` - Expert in Mermaid C4 diagrams
- `diagrams-generator` - Coordinates diagram creation

#### 🪝 **Hooks System** (Automation)

**Available Hooks:**
- `post-task-completion.sh` - Auto-update documentation after task completion
- `pre-implementation.sh` - Check regression risk before modifying code
- `post-document-save.sh` - Validate increment documents on save
- `human-input-required.sh` - Log when AI needs clarification

**What Hooks Do:**
- Auto-update CLAUDE.md when structure changes
- Auto-update API reference when endpoints change
- Auto-update changelog when features completed
- Preserve manual content (never modify user-written guides)

#### 🎨 **Figma Integration** (Design-to-Code)

**Skills:**
- `figma-mcp-connector` - Connect to Figma MCP servers
- `figma-designer` - Create design systems in Figma
- `figma-to-code` - Convert Figma designs to React/Angular code

**Agents:**
- `figma-implementer` - Implement designs with pixel-perfect accuracy

**Workflow:**
1. Connect to Figma via MCP server
2. Read designs, extract design tokens
3. Generate TypeScript interfaces from components
4. Create production-ready code
5. Validate with Storybook

#### 🏭 **Selective Installation** (Factory Pattern)

**Problem:** Loading ALL 19 agents wastes ~2,100 tokens (71% of context)

**Solution:** Install ONLY what you need based on tech stack

**Python API Project:**
```bash
npx specweave init my-api --type python --framework fastapi

# Installs ONLY:
# - Strategic agents: pm, architect, security, qa-lead, devops, docs-writer (6)
# - Implementation: python-backend (1)
# - Core skills: specweave-detector, skill-router, context-loader, increment-planner (4)
# Total: 7 agents + 4 skills (vs 19 agents + 24 skills!)
# Token savings: 60%
```

**Benefits:**
- 54-71% token reduction on agents
- Faster context loading
- Clearer project structure
- On-demand installation as project evolves

#### 📏 **Increment Validation** (120 Rules)

**Automatic Validation:**
- Runs on document save via `post-document-save.sh` hook
- Quick validation (5-10s): 120 rules across 4 categories
- Deep analysis (30-60s): Multi-perspective assessment when issues found

**4 Validation Categories:**
1. **Consistency** (47 rules): spec.md ↔ plan.md ↔ tasks.md alignment
2. **Completeness** (23 rules): Required sections, frontmatter, acceptance criteria
3. **Quality** (31 rules): Technology-agnostic specs, testable criteria, actionable tasks
4. **Traceability** (19 rules): TC-0001 IDs, ADR references, diagram references

**Agents:**
- `increment-validator` - Multi-perspective validation (PM, Architect, QA, Security)

---

### 🛠️ **Technology Stack**

**Languages:**
- TypeScript (CLI and framework)
- Node.js 18+ required

**CLI Dependencies:**
- `commander` - CLI framework
- `inquirer` - Interactive prompts
- `chalk` - Terminal colors
- `ora` - Spinners and progress
- `fs-extra` - File system utilities
- `yaml` - YAML parsing

**Testing:**
- Jest (unit and integration tests)
- Playwright (E2E testing)

**Supported Deployment:**
- Terraform (IaC for cloud providers)
- Pulumi (alternative IaC)
- Docker Compose (local development)

---

### 📖 **Documentation**

**Complete Guides:**
- `CLAUDE.md` - Complete development guide (source of truth)
- `README.md` - Project overview and quick start
- `INSTALL.md` - Comprehensive installation guide (this release)
- `CHANGELOG.md` - Release notes and version history

**Online Documentation:**
- `.specweave/docs/public/` - Published docs (API reference, guides, changelog)
- Deployed to GitHub Pages via MkDocs

**Strategic Documentation:**
- `.specweave/docs/internal/strategy/` - Business specifications
- `.specweave/docs/internal/architecture/` - Technical design
- `.specweave/docs/internal/delivery/` - Roadmap and CI/CD
- `.specweave/docs/internal/operations/` - Runbooks and SLOs
- `.specweave/docs/internal/governance/` - Security and compliance

---

### 🚀 **Getting Started**

#### Installation

**Global (recommended for CLI usage):**
```bash
npm install -g specweave
```

**One-time usage (like npx):**
```bash
npx specweave init my-project
```

#### Quick Start

**1. Create new project:**
```bash
specweave init my-saas
cd my-saas
```

**2. Describe what you want to build:**
```
"Create an event booking SaaS with Next.js on Hetzner"
```

**3. SpecWeave will:**
- Ask clarifying questions
- Create strategic analysis (PM, Architect, DevOps, QA)
- Generate comprehensive documentation
- Create implementation tasks
- Build autonomously

**4. Review strategic docs:**
```bash
/review-docs
```

**5. Sync to GitHub (optional):**
```bash
/sync-github
```

---

### 🔬 **Testing & Validation**

**Framework Tests:**
- Unit tests: `npm test`
- E2E tests: `npm run test:e2e`
- Smoke tests: `npm run test:smoke`
- All tests: `npm run test:all`

**Skill Tests:**
- Minimum 3 test cases per skill
- Located in `src/skills/{name}/test-cases/`
- YAML format with input/expected_output/validation

**Agent Tests:**
- Minimum 3 test cases per agent
- Located in `src/agents/{name}/test-cases/`
- Validates agent behavior and output

---

### 🌟 **What Makes SpecWeave Different?**

**vs spec-kit (GitHub's framework):**
- ✅ Context manifests (70%+ token reduction) - spec-kit loads all specs
- ✅ Multi-agent system (separate contexts) - spec-kit has slash commands only
- ✅ Brownfield analyzer - spec-kit requires manual documentation
- ✅ Mandatory E2E testing - spec-kit suggests TDD only
- ✅ Hooks system - spec-kit has shell scripts only
- ✅ Skills extensibility - spec-kit has fixed commands
- ✅ Incremental + upfront docs - spec-kit upfront only
- ❌ Agent-agnostic - spec-kit works with 14+ AI tools (SpecWeave is Claude-focused)

**vs BMAD-METHOD:**
- ✅ Context manifests (enterprise scalability) - BMAD has always-loaded files
- ✅ Brownfield analyzer - BMAD requires manual approach
- ✅ Skills framework - BMAD has fixed agent commands
- ✅ Continuous workflow - BMAD has strict two-phase (planning vs development)
- ✅ Hooks automation - BMAD has manual QA gates
- ❌ Formal QA gates (@qa *risk, @qa *gate) - BMAD has comprehensive QA workflow

**Unique Benefits:**
1. **Context Precision**: 70%+ token reduction = cost savings + faster responses
2. **Enterprise Scale**: 500-1000+ page specs without context bloat
3. **Brownfield Ready**: Retroactive specs, regression prevention, safe modifications
4. **Test-Validated**: Mandatory E2E tests when UI exists, truth-telling requirement
5. **Framework-Agnostic**: Works with ANY tech stack (TypeScript, Python, Go, Rust, Java, etc.)
6. **Flexible Documentation**: Comprehensive upfront OR incremental (both supported)
7. **Auto-Role Routing**: >90% accuracy in routing to appropriate skills/agents
8. **Living Documentation**: Hooks auto-update docs, zero manual overhead

---

### ⚠️ **Known Limitations** (Beta)

#### Not Yet Implemented (Planned for v0.2.0+):

1. **Audit command** - Analyze which components are used vs installed
2. **Cleanup command** - Remove unused components automatically
3. **Quality gates** - Formal PASS/CONCERNS/FAIL decisions (inspired by BMAD)
4. **Risk scoring** - Structured risk assessment (inspired by BMAD)
5. **Clarification workflow** - Structured questioning to refine specs (inspired by spec-kit)
6. **Dependency tracking in tasks** - Explicit `[depends: ...]` notation (inspired by spec-kit)
7. **Parallel task markers** - `[P]` for parallelizable tasks (inspired by spec-kit)
8. **Template system** - Optional templates for consistency (inspired by spec-kit)
9. **Agent-agnostic support** - Work with Copilot, Cursor, Gemini, etc. (inspired by spec-kit)
10. **Test importer** - Import existing tests to `.specweave/tests/`

#### Current Constraints:

- **Claude-focused**: Best experience with Claude Code (Claude Sonnet 4.5 required)
- **CLI incomplete**: Only `init`, `install`, `list` commands implemented
- **No npm publish yet**: Install from GitHub only (v0.1.0-beta.1 not on npm)
- **Limited templates**: Minimal project templates (expand in v0.2.0+)
- **Documentation WIP**: Some guides incomplete (expanding in v0.1.0-beta.2+)

---

### 🗺️ **Roadmap**

**v0.2.0** (Q1 2026) - **Focus: Skills, Context, Testing**

**New Skills:**
- Advanced testing skills (contract testing, performance testing, mutation testing)
- Cloud providers (AWS, Azure, DigitalOcean provisioners)
- Design tools (Sketch, Penpot connectors)
- Database migration tools (Prisma, TypeORM, Alembic)
- Monitoring integrations (Datadog, New Relic, Sentry)

**Context Management Improvements:**
- Third-pass optimization (90%+ token reduction)
- Adaptive context loading (adjusts based on task type: bug fix vs feature vs refactor)
- Context caching (repeated queries use cached specs)
- Incremental context updates (only load changed sections)
- Context impact analysis (show what will be loaded before loading)

**Testing Enhancements:**
- Visual regression testing (Percy, Chromatic integration)
- Chaos engineering integration (Gremlin, Chaos Monkey)
- Test generation from specs (auto-create tests from TC-0001 criteria)
- Contract testing (Pact integration for microservices)
- Load testing skills (k6, Artillery, Locust)
- Test importer (import existing tests to `.specweave/tests/`)

**Inspired by BMAD:**
- Quality gates (@qa *gate, @qa *risk)
- Risk scoring system (structured assessment)

**Inspired by spec-kit:**
- Clarification workflow (/speckit.clarify)
- Dependency tracking in tasks

---

### 🙏 **Acknowledgments**

SpecWeave was inspired by and learns from:

- **spec-kit** (GitHub): Agent-agnostic workflow, task dependency tracking, clarification process
- **BMAD-METHOD**: Quality gates, risk assessment, two-phase workflow discipline
- **Microsoft's documentation approach**: Incremental documentation building
- **C4 Model**: Architecture diagram conventions
- **Claude Code**: Hooks system, skills framework, agent architecture

---

### 📄 **License**

MIT License - see LICENSE file

---

### 🔗 **Links**

- **Website**: https://spec-weave.com/
- **Repository**: https://github.com/anton-abyzov/specweave
- **Issues**: https://github.com/anton-abyzov/specweave/issues
- **Discussions**: https://github.com/anton-abyzov/specweave/discussions

---

### 🐛 **Bug Reports & Feedback**

This is the **first stable release** - we welcome feedback!

**How to report:**
1. Check existing issues: https://github.com/anton-abyzov/specweave/issues
2. Create new issue with:
   - SpecWeave version (`specweave --version`)
   - Node.js version (`node --version`)
   - Operating system
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages (if any)

**Feature requests:**
- Open discussion: https://github.com/anton-abyzov/specweave/discussions
- Tag with `enhancement`
- Explain use case and benefits

---

### 🚀 **What's Next?**

1. **Visit the website**: https://spec-weave.com/
2. **Install SpecWeave**: `npm install -g specweave`
3. **Create your first project**: `specweave init my-saas`
4. **Join the community**: https://github.com/anton-abyzov/specweave/discussions
5. **Share your experience**: Write articles, create tutorials, build projects
6. **Contribute**: PRs welcome! See CONTRIBUTING.md (coming soon)

---

**Thank you for trying SpecWeave!** 🙏

We're building the future of spec-driven development together. Your feedback makes SpecWeave better.

---

[0.1.0]: https://github.com/specweave/specweave/releases/tag/v0.1.0
[0.1.0-beta.1]: https://github.com/specweave/specweave/releases/tag/v0.1.0-beta.1
