# SpecWeave - Spec-Driven Development Framework

**THIS FILE IS YOUR QUICK REFERENCE GUIDE**

**Note**: `CLAUDE.md` symlink exists for backward compatibility and points to this file.

This file contains quick reference for developing with SpecWeave:
- Core principles and project structure
- Quick reference tables (agents, skills, commands)
- Links to detailed guides (loaded on-demand by agents)

**For detailed workflows**: See `.specweave/docs/internal/delivery/guides/`

---

## SpecWeave Auto-Routing (CRITICAL)

**MANDATORY BEHAVIOR**: This project has SpecWeave installed (`.specweave/` directory exists).

### Auto-Detection & Routing Rules

1. **ALWAYS check for SpecWeave FIRST** before responding to ANY user request
2. **ROUTE ALL development-related questions** through `specweave-detector` skill
3. **EVEN GENERIC questions** may need SpecWeave context (e.g., "Analyze BTC/USD" → suggest creating trading analysis feature)

### Detection Logic

```javascript
if (directoryExists('.specweave/config.yaml')) {
  // SpecWeave is installed
  // Route through specweave-detector for ALL development requests
  activateSpecWeaveMode();
}
```

### Routing Examples

| User Request | Detection | Action |
|-------------|-----------|--------|
| "Create authentication" | Development request | ✅ Route to `specweave-detector` → `feature-planner` |
| "Analyze BTC/USD prices" | Could be feature request | ✅ Route to `specweave-detector` → Suggest: "Create BTC analysis feature?" |
| "Add payment processing" | Development request | ✅ Route to `specweave-detector` → `feature-planner` |
| "Fix bug in login" | Development request | ✅ Route to `specweave-detector` → Load context → Implement |
| "What's for lunch?" | Non-development | ❌ Respond normally (out of domain) |

### Activation Behavior

**When SpecWeave is detected**:
- ✅ Show indicator: `🔷 SpecWeave Active`
- ✅ Route development requests automatically
- ✅ Load context via `context-loader` when needed
- ✅ Use appropriate agents (PM, Architect, DevOps, etc.)
- ✅ Adapt to detected tech stack (TypeScript, Python, Go, etc.)

**Rule**: When in doubt, route through SpecWeave. Let `specweave-detector` decide if it's a valid development request.

---

## Project Philosophy

**SpecWeave** is a specification-first AI development framework where **specifications and documentation are the SOURCE OF TRUTH**. Code is the expression of these specifications in a particular language.

### Core Principles

1. **Specification Before Implementation** - Define WHAT and WHY before HOW
2. **Living Documentation** - Specs evolve with code, never diverge
3. **Regression Prevention** - Document existing code before modification
4. **Test-Validated Features** - Every feature proven through automated tests
5. **Scalable from Solo to Enterprise** - Modular structure that grows with project size
6. **Context Precision** - Load only relevant specs (70%+ token reduction)
7. **Auto-Role Routing** - Skills detect and route to appropriate expertise automatically
8. **Closed-Loop Validation** - E2E tests must tell the truth (no false positives)
9. **🔄 Meta-Capability** - Agents build agents, skills build skills, SpecWeave builds SpecWeave

**See**: [.specweave/docs/internal/architecture/meta-capability.md](.specweave/docs/internal/architecture/meta-capability.md) for complete meta-capability documentation

---

## Documentation Approaches

**SpecWeave supports TWO approaches**:

1. **Comprehensive Upfront** (Enterprise/Production) - 500-600+ page specifications before coding
2. **Incremental/Evolutionary** (Startup/Iterative) - Build documentation as you go

Both approaches use the same framework, tools, and 5-pillar documentation structure.

**See**: [.specweave/docs/internal/strategy/README.md](.specweave/docs/internal/strategy/README.md) for choosing your approach

---

## Quick Reference: Directory Structure

```
your-project/
├── .specweave/                     # Framework internals
│   ├── config.yaml                 # Project configuration
│   ├── docs/                       # 5-pillar documentation
│   │   ├── internal/
│   │   │   ├── strategy/           # Business specs (WHAT, WHY)
│   │   │   ├── architecture/       # Technical design (HOW)
│   │   │   ├── delivery/           # Roadmap, CI/CD, guides
│   │   │   ├── operations/         # Runbooks, SLOs
│   │   │   └── governance/         # Security, compliance
│   │   └── public/                 # Published docs
│   ├── increments/                 # Features (auto-numbered)
│   │   └── 0001-feature-name/
│   │       ├── spec.md             # WHAT & WHY (< 250 lines)
│   │       ├── plan.md             # HOW (< 500 lines)
│   │       ├── tasks.md            # Implementation checklist
│   │       ├── tests.md            # Test strategy
│   │       ├── context-manifest.yaml  # What to load (70%+ token reduction)
│   │       ├── logs/               # Execution history
│   │       ├── scripts/            # Automation helpers
│   │       └── reports/            # Analysis documents
│   └── tests/                      # Centralized test repository
│
├── .claude/                        # Installed components
│   ├── agents/                     # Installed agents (selective)
│   ├── skills/                     # Installed skills (selective)
│   └── commands/                   # Slash commands
│
├── CLAUDE.md                       # This file
└── src/                            # Your source code
```

**See**: [.specweave/docs/internal/delivery/guides/development-workflow.md](.specweave/docs/internal/delivery/guides/development-workflow.md) for complete development workflow

---

## Installation

**Initialize New Project**:
```bash
npx specweave init                  # Auto-detects tech stack
npx specweave init --type python    # Specify tech stack
```

**Selective Installation** (Recommended for user projects):
```bash
npx specweave install --detect      # Install only relevant agents/skills
npx specweave install pm --local    # Install specific component
npx specweave list --installed      # See what's installed
```

**Token Savings**: 60-71% reduction vs installing all components!

**Required Model**: Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)

**See**: [Installation Guide](#) for complete installation instructions

---

## Quick Reference: Slash Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `/create-project` | Bootstrap new SpecWeave project | `/create-project --type python` |
| `/create-increment` | Create new feature/increment | `/create-increment "user auth"` |
| `/review-docs` | Review strategic docs vs code | `/review-docs --increment=003` |
| `/sync-github` | Sync increment to GitHub issues | `/sync-github` |

**All commands are framework-agnostic** (adapt to detected tech stack)

**See**: [Command Reference](.claude/commands/) for all available commands

---

## Quick Reference: Core Agents

**Strategic Agents** (Always installed):

| Agent | Purpose | Activates When |
|-------|---------|----------------|
| `pm` | Product requirements, user stories | Planning features, requirements analysis |
| `architect` | System design, ADRs, architecture | Technical design, architecture decisions |
| `security` | Threat modeling, security review | Security concerns, vulnerability assessment |
| `qa-lead` | Test strategy, test cases | Testing, quality assurance |
| `devops` | Infrastructure, deployment | Deployment, CI/CD, infrastructure |
| `docs-writer` | Documentation creation | Writing docs, API documentation |

**Implementation Agents** (Selective installation based on tech stack):

| Agent | Purpose | Tech Stack |
|-------|---------|------------|
| `python-backend` | Python APIs (FastAPI, Django) | Python projects |
| `nodejs-backend` | Node.js APIs (Express, NestJS) | Node.js projects |
| `dotnet-backend` | .NET APIs (ASP.NET Core) | .NET projects |
| `nextjs` | Next.js applications | Next.js projects |
| `frontend` | React/Vue/Angular frontend | Frontend projects |
| `figma-implementer` | Figma to code conversion | Design implementation |

**Invoke via**: `Task` tool with `subagent_type` parameter

**See**: [src/agents/](src/agents/) for all available agents

---

## Quick Reference: Core Skills

**Framework Skills** (Always installed):

| Skill | Purpose | Activates When |
|-------|---------|----------------|
| `specweave-detector` | Auto-detect SpecWeave projects | Any request in SpecWeave project |
| `feature-planner` | Plan features with context | Creating/planning features |
| `skill-router` | Route to appropriate skills | Ambiguous requests |
| `context-loader` | Load context selectively | Working on increments |

**Integration Skills** (Optional):

| Skill | Purpose | Activates When |
|-------|---------|----------------|
| `jira-sync` | Sync with JIRA | JIRA integration |
| `ado-sync` | Sync with Azure DevOps | ADO integration |
| `github-sync` | Sync with GitHub | GitHub integration |
| `hetzner-provisioner` | Hetzner deployment | Deploying to Hetzner |
| `cost-optimizer` | Infrastructure cost analysis | Cloud provider selection |

**Skills activate automatically** based on description matching

**See**: [src/skills/](src/skills/) for all available skills

---

## Quick Reference: Increment Lifecycle

**Status Progression**:
```
backlog → planned → in-progress → completed → closed
```

**WIP Limits**:
- Framework development: 2-3 in progress
- User projects (solo): 1-2 in progress
- User projects (team): 3-5 in progress

**Commands**:
```bash
/create-increment "feature name"    # Create new increment
/add-tasks 001 "task description"   # Add tasks to existing
/close-increment 001                # Close with leftover transfer
```

**See**: [Increment Lifecycle Guide](.specweave/docs/internal/delivery/guides/increment-lifecycle.md) for complete lifecycle management

---

## Quick Reference: Testing

**Four Levels of Test Cases**:

1. **Specification** (`.specweave/docs/internal/strategy/`) - TC-0001 acceptance criteria
2. **Feature** (`.specweave/increments/####/tests.md`) - Test coverage matrix
3. **Skill** (`src/skills/{name}/test-cases/`) - 3+ YAML test cases (MANDATORY)
4. **Code** (`tests/`) - Automated tests (Unit, Integration, E2E)

**Requirements**:
- ✅ Minimum 3 test cases per skill
- ✅ E2E tests (Playwright) when UI exists
- ✅ >80% coverage for critical paths
- ✅ Tests MUST tell the truth (no false positives)

**See**: [Testing Strategy Guide](.specweave/docs/internal/delivery/guides/testing-strategy.md) for complete testing philosophy

---

## Quick Reference: Deployment

**Deployment Target Detection**:

Agents ask about deployment ONLY when:
- User mentions "deploy", "production", "hosting"
- DevOps agent is invoked
- Infrastructure code is needed

**Supported Targets**:
- Local (Docker Compose)
- Hetzner Cloud (cheapest)
- Railway (easiest)
- Vercel (best for Next.js)
- AWS/Azure/GCP (enterprise)

**Configuration**: `.specweave/config.yaml`

**See**: [Deployment Intelligence Guide](.specweave/docs/internal/delivery/guides/deployment-intelligence.md) for complete deployment workflow

---

## Quick Reference: C4 Diagrams

**C4 Model Levels**:

| Level | SpecWeave Equivalent | Location |
|-------|----------------------|----------|
| C4-1: Context | HLD Context Diagram | `.specweave/docs/internal/architecture/diagrams/` |
| C4-2: Container | HLD Component Diagram | `.specweave/docs/internal/architecture/diagrams/` |
| C4-3: Component | LLD Component Diagram | `.specweave/docs/internal/architecture/diagrams/{module}/` |
| C4-4: Code | Source code + UML | Code comments or separate docs |

**CRITICAL**: C4 diagrams start DIRECTLY with `C4Context` (NO `mermaid` keyword!)

**See**: [Diagram Conventions Guide](.specweave/docs/internal/delivery/guides/diagram-conventions.md) for complete diagram rules

---

## Quick Reference: Validation

**Increment Validation** runs automatically on document save:

**120 validation rules** across 4 categories:
1. **Consistency** (47 rules) - Spec ↔ Plan ↔ Tasks alignment
2. **Completeness** (23 rules) - All required sections present
3. **Quality** (31 rules) - Technology-agnostic, testable criteria
4. **Traceability** (19 rules) - TC-0001 → tests.md coverage

**Manual validation**: `/validate-increment ####`

**See**: [Increment Validation Guide](.specweave/docs/internal/delivery/guides/increment-validation.md) for complete validation workflow

---

## Detailed Guides (On-Demand Loading)

**For complete details, agents load guides from** `.specweave/docs/internal/delivery/guides/`:

| Guide | Purpose | Loaded By |
|-------|---------|-----------|
| [increment-lifecycle.md](. specweave/docs/internal/delivery/guides/increment-lifecycle.md) | Complete increment lifecycle management | `feature-planner` |
| [increment-validation.md](.specweave/docs/internal/delivery/guides/increment-validation.md) | Validation workflow and rules | `increment-validator` |
| [development-workflow.md](.specweave/docs/internal/delivery/guides/development-workflow.md) | Greenfield and brownfield workflows | When starting development |
| [deployment-intelligence.md](.specweave/docs/internal/delivery/guides/deployment-intelligence.md) | Deployment target detection and infrastructure | `devops` agent |
| [testing-strategy.md](.specweave/docs/internal/delivery/guides/testing-strategy.md) | Complete testing philosophy (4 levels) | `qa-lead` agent |
| [test-import.md](.specweave/docs/internal/delivery/guides/test-import.md) | Importing existing tests | `test-importer` skill |
| [diagram-conventions.md](.specweave/docs/internal/delivery/guides/diagram-conventions.md) | C4 diagrams and Mermaid syntax | `diagrams-architect` agent |
| [diagram-svg-generation.md](.specweave/docs/internal/delivery/guides/diagram-svg-generation.md) | SVG generation for production docs | When building docs site |

**Agents automatically load relevant guides when activated** - you don't need to manage this manually.

---

## Agents vs Skills: When to Use Which

| Create Agent When | Create Skill When |
|-------------------|-------------------|
| Complex, multi-step workflows | Simple, focused tasks |
| Needs separate context window | Can share main context |
| Distinct personality/role needed | Capability extension |
| Tool restrictions by role | All tools acceptable |
| Long-running tasks | Quick operations |
| **Example**: Security audit | **Example**: Code formatter |

**Agents**: Invoked via `Task` tool with `subagent_type`
**Skills**: Activate automatically based on description

---

## Source of Truth: src/ Folder

**CRITICAL RULE**: All SpecWeave framework components (agents, skills, commands, hooks) MUST be created in `src/` folder first, then installed to `.claude/` via install script.

```
src/
├── agents/                    # ✅ Source of truth for ALL agents
├── skills/                    # ✅ Source of truth for ALL skills
├── commands/                  # ✅ Source of truth for ALL slash commands
├── hooks/                     # ✅ Source of truth for ALL hooks
└── templates/                 # ✅ ONLY files for user's project root
```

**Installation Flow**:
1. Create in `src/agents/{name}/` or `src/skills/{name}/`
2. Run `npm run install:agents` or `npm run install:skills`
3. Components copied to `.claude/`

**User Projects**: Can create custom agents/skills in `.claude/` or `~/.claude/`

---

## Naming Conventions

**Features**: `####-short-descriptive-name` (e.g., `0001-skills-framework`)
**Modules**: `lowercase-kebab-case` (e.g., `payments/stripe/`)
**ADRs**: `####-decision-title.md` (e.g., `0001-tech-stack.md`)
**Test Cases**: `TC-0001`, `TC-0002` format for traceability

---

## Development Workflow Summary

### Greenfield Projects

**Option A: Comprehensive Upfront** (Enterprise)
1. Create 500-600+ page specifications (`.specweave/docs/internal/strategy/`)
2. Design architecture (`.specweave/docs/internal/architecture/`)
3. Plan features in increments
4. Implement with context manifests

**Option B: Incremental** (Startup)
1. Start with overview (10-20 pages)
2. Build documentation as you go
3. Add modules/specs as features are planned

**See**: [Development Workflow Guide](.specweave/docs/internal/delivery/guides/development-workflow.md) for complete workflow

### Brownfield Projects

1. **Analyze** existing code (`brownfield-analyzer` skill)
2. **Document** current behavior (retroactive specs + ADRs)
3. **Create tests** for current functionality (user reviews)
4. **Plan modifications** (new increment)
5. **Implement** with regression monitoring

**See**: [Development Workflow Guide](.specweave/docs/internal/delivery/guides/development-workflow.md) for brownfield details

---

## Git Workflow

**Branch naming**: `features/{increment-id}-{short-name}`

**Workflow**:
1. Create increment folder (`.specweave/increments/0002-name/`)
2. Create feature branch (`git checkout -b features/002-name`)
3. Implement in src/ (agents, skills, etc.)
4. Commit regularly
5. Create PR when complete
6. Merge to develop

**NEVER commit directly to `develop` or `main`**

---

## Context Precision (70%+ Token Reduction)

**Context Manifests** (`.specweave/increments/####/context-manifest.yaml`):

```yaml
spec_sections:
  - .specweave/docs/internal/strategy/auth/spec.md
documentation:
  - .specweave/docs/internal/architecture/auth-design.md
  - .specweave/docs/internal/architecture/adr/0003-auth-method.md
max_context_tokens: 10000
```

**Benefits**:
- Precision loading (load exactly what's needed)
- 70%+ token reduction vs loading full specs
- Scales to enterprise (500+ page specs)

**Loaded by**: `context-loader` skill when working on increment

---

## Summary

**SpecWeave** replaces vibe coding with **Spec-Driven Development**:

1. ✅ **Specifications are SOURCE OF TRUTH** - Code expresses specs
2. ✅ **Framework-agnostic** - Works with ANY language/framework
3. ✅ **Flexible documentation** - Comprehensive upfront OR incremental
4. ✅ **Context precision** - 70%+ token reduction, scales 10-1000+ pages
5. ✅ **Auto-role routing** - Skills detect expertise automatically
6. ✅ **Deployment intelligence** - Asks about target before infrastructure
7. ✅ **Test-validated** - 3+ tests per skill, E2E when UI exists
8. ✅ **Living documentation** - Auto-update via Claude hooks
9. ✅ **Brownfield-ready** - Analyze, document, then modify safely
10. ✅ **Production-ready** - Supports enterprise scale

**This framework enables building software at ANY scale, with ANY tech stack, with confidence, clarity, and minimal context usage.**

---

**Quick Start**: Run `/create-project` to initialize a new SpecWeave project

**Need help?**: Ask Claude to load the relevant guide from `.specweave/docs/internal/delivery/guides/`

**Last Updated**: Auto-updated via `post-task-completion` hook
