# Key Features

SpecWeave provides a comprehensive suite of tools and workflows for building production-grade software with AI assistance.

## 🚀 Two Ways to Work (Flexibility for All Project Sizes)

### Interactive Quick Build

**Perfect for:** Small projects, prototypes, learning

Simply describe what you want - SpecWeave guides you through interactive prompts:

1. **Approach** - Quick build or spec-first planning
2. **Features** - Multi-select checkboxes for capabilities
3. **Tech Stack** - Choose your tools
4. **Review & Submit** - Confirm and start building

**Result:** 2 minutes from idea to working code

**Example:**
```
"build a very simple web calculator app"
→ Select features: ☑ Basic ops ☑ Keyboard ☑ History
→ Choose stack: React
→ Build! 🚀
```

### Specification-First Workflow

**Perfect for:** Production features, team projects, complex systems

Professional planning with slash commands and multi-agent coordination:

```bash
/specweave:increment "user authentication"
# PM, Architect, QA agents create:
# ✅ spec.md (requirements with AC-IDs)
# ✅ plan.md (architecture + test strategy)
# ✅ tasks.md with embedded tests (v0.7.0+)

/specweave:do
# Implement with hooks auto-updating docs
```

**Both approaches** use the same powerful plugin system and multi-agent architecture under the hood!

---

## 🎯 Specification-First Development

### Append-Only Snapshots + Living Documentation

**SpecWeave's Core Power**: Maintains both historical audit trails and current documentation simultaneously.

**The Innovation**: Unlike traditional documentation that gets outdated or loses historical context, SpecWeave gives you BOTH:

#### 📸 Append-Only Increment Snapshots (Historical Context)
```
.specweave/increments/
├── 0001-user-authentication/
│   ├── spec.md              # What was planned (AC-IDs)
│   ├── plan.md              # How it was built + test strategy
│   ├── tasks.md             # What was done + embedded tests (v0.7.0+)
│   └── logs/                # Execution history
├── 0002-oauth-integration/  # Extends/modifies 0001
└── 0003-password-reset/     # Related feature
```

**Never modified after completion** - Complete audit trail of every feature built.

#### 📄 Living Up-to-Date Documentation (Current State)
```
.specweave/docs/
├── internal/
│   ├── strategy/      # WHAT and WHY (PRDs, user stories)
│   ├── architecture/  # HOW (system design, ADRs, RFCs)
│   ├── delivery/      # Roadmap, release plans
│   ├── operations/    # Runbooks, SLOs, monitoring
│   └── governance/    # Security, compliance
└── public/            # Customer-facing documentation
```

**Auto-updated after each task** - Always reflects current code state.

### Why This Matters

| Problem | Traditional Approach | SpecWeave Solution |
|---------|---------------------|-------------------|
| **"Why did we do it this way?"** | Context lost, tribal knowledge | Read historical increment snapshots |
| **"What's the current architecture?"** | Docs outdated | Living docs auto-updated |
| **"What changed in this feature?"** | [Git](/docs/glossary/terms/git) commits only | Complete increment snapshot with spec, plan, tests |
| **"Prove compliance"** | Reconstruct from memory | Complete audit trail in increments |
| **"Onboard new developer"** | Days of reading code | Read current docs + historical increments |

### Real-World Benefits

- **Compliance-Ready**: [SOC 2](/docs/glossary/terms/soc2), [HIPAA](/docs/glossary/terms/hipaa), [FDA](/docs/glossary/terms/fda) audits have complete paper trail
- **Context Recovery**: Understand decisions made 6 months ago
- **Impact Analysis**: See all related changes by searching increments
- **Rollback Intelligence**: Know exactly what to revert
- **Knowledge Transfer**: No tribal knowledge silos
- **Debugging**: Trace feature evolution across increments

**Think of it as "[Git](/docs/glossary/terms/git) for Specifications"**:
- Increments = commits (immutable snapshots)
- Living docs = working directory (current state)
- Both essential, both version controlled

### 5-Pillar Documentation Structure

Living documentation organized by purpose:

## 🧠 Context Precision (70%+ Token Reduction)

### Selective Loading
- **Context Manifests**: Each increment declares what it needs
- **Section Anchors**: Load specific sections, not entire files
- **Glob Patterns**: Match multiple related files
- **Cache-Friendly**: Reuse frequently-loaded context

### Example Manifest

\`\`\`yaml
spec_sections:
  - .specweave/docs/internal/strategy/auth/login-spec.md
  - .specweave/docs/internal/strategy/auth/oauth.md#token-flow
documentation:
  - .specweave/docs/internal/architecture/adr/0001-auth-method.md
max_context_tokens: 10000
\`\`\`

**Result**: Load exactly what's needed, save 70%+ on AI costs.

## 🤖 AI Agents & Skills

### 11 Core Agents

| Agent | Role | Expertise |
|-------|------|-----------|
| **PM** | Product Manager AI | Requirements, user stories, market research, roadmaps |
| **Architect** | System Architect | Design, ADRs, component architecture, C4 diagrams |
| **Tech Lead** | Technical Lead | Code review, best practices, technical guidance |
| **QA Lead** | Quality Assurance | Test strategy, test cases, coverage validation |
| **Security** | Security Engineer | Threat modeling, security scanning, vulnerability analysis |
| **Performance** | Performance Engineer | Optimization, profiling, scalability analysis |
| **Docs Writer** | Technical Writer | Documentation creation, guides, API references |
| **TDD Orchestrator** | TDD Master | Red-Green-Refactor workflow, test-first development |
| **Test-Aware Planner** | Test Planning Specialist | Test case generation, AC-ID mapping, coverage targets |
| **Translator** | Multilingual Support | Content translation, i18n workflows |
| **Code Reviewer** | Code Review Specialist | Quality gates, code analysis, review automation |

### Auto-Role Routing

Skills automatically detect expertise and route requests:

\`\`\`
User: "Create authentication system"
→ specweave-detector activates
→ Routes to increment-planner
→ Invokes PM, Architect, Tech Lead agents
→ Generates complete spec + architecture + plan
\`\`\`

## 🧪 Test-Validated Development

### Test-Aware Planning (v0.7.0+)

1. **Specification Acceptance Criteria** (AC-ID format: AC-US1-01)
   - Business-level acceptance criteria in spec.md
   - Technology-agnostic validation
   - Linked to user stories

2. **Embedded Test Plans** (tasks)
   - [BDD](/docs/glossary/terms/bdd) format (Given/When/Then) per task
   - Maps AC-IDs to test implementations
   - Coverage targets (80-90% per task)

3. **Skill Test Cases** (YAML-based)
   - Minimum 3 tests per skill
   - Structured validation

4. **Code Tests** (Automated)
   - [E2E](/docs/glossary/terms/e2e) with Playwright (MANDATORY for UI)
   - Unit and integration tests
   - >80% coverage for critical paths

### Truth-Telling Requirement

[E2E](/docs/glossary/terms/e2e) tests MUST tell the truth:
- ✅ If test passes → feature actually works
- ✅ If test fails → exactly what failed
- ❌ No false positives
- ❌ No masking failures

## 📊 Mermaid Diagrams (C4 Model)

### Architecture Visualization

SpecWeave uses the **C4 Model** for architecture diagrams:

- **C4-1: Context** - System boundaries, external actors
- **C4-2: Container** - Applications, services, databases
- **C4-3: Component** - Internal structure
- **C4-4: Code** - Class diagrams (optional)

### Example Diagram

\`\`\`mermaid
C4Context
    title System Context Diagram for SpecWeave

    Person(user, "Developer", "Uses SpecWeave to build software")
    System(specweave, "SpecWeave", "Spec-Driven Development Framework")
    System_Ext(claude, "Claude Code", "AI coding assistant")
    System_Ext(github, "GitHub", "Version control and [CI/CD](/docs/glossary/terms/ci-cd)")

    Rel(user, specweave, "Uses")
    Rel(specweave, claude, "Invokes agents")
    Rel(specweave, github, "Syncs increments")
\`\`\`

## 🌐 Framework-Agnostic

### Supports ANY Tech Stack

- **[TypeScript](/docs/glossary/terms/typescript)/JavaScript**: [Next.js](/docs/glossary/terms/nextjs), NestJS, Express, [React](/docs/glossary/terms/react)
- **Python**: FastAPI, Django, Flask
- **Go**: Gin, Echo, Fiber
- **Rust**: Actix, Rocket, Axum
- **Java**: Spring Boot, Quarkus
- **C#/.NET**: ASP.NET Core, Blazor

### Auto-Detection

SpecWeave detects your tech stack from:
- `package.json` → [TypeScript](/docs/glossary/terms/typescript)/JavaScript
- `requirements.txt` / `pyproject.toml` → Python
- `go.mod` → Go
- `Cargo.toml` → Rust
- `pom.xml` / `build.gradle` → Java
- `*.csproj` → C#/.NET

## 🔄 Incremental Development

### Auto-Numbered Increments

\`\`\`
.specweave/increments/
├── 0001-user-authentication/
│   ├── spec.md              # What and Why (with AC-IDs)
│   ├── plan.md              # How (architecture + test strategy)
│   ├── tasks.md             # Checklist + embedded tests (v0.7.0+)
│   ├── logs/                # Execution logs
│   ├── scripts/             # Helper scripts
│   └── reports/             # Completion reports
└── 0002-payment-processing/
    └── ...
\`\`\`

### WIP Limits

Prevent context-switching:
- **Solo/small teams**: 1-2 in progress
- **Large teams**: 3-5 in progress
- **Force override**: Available but discouraged

## 🔗 External Integrations

### JIRA Sync
- Bidirectional conversion
- Epics ↔ Increments
- Stories ↔ PRDs/RFCs
- Tasks ↔ Tasks

### Azure DevOps Sync
- 4-level hierarchy support
- Epics → Features → User Stories → Tasks
- Area Paths and Iterations
- Work item synchronization

### GitHub Sync
- Milestones ↔ Release Plans
- Issues ↔ RFCs/Tasks
- Checkable subtasks

### Cross-Platform Migration (GitHub ↔ JIRA ↔ Azure DevOps)

SpecWeave's **universal mapping template** enables seamless migration between external tools:

**How it works:**
1. **Import from Source** - Pull issues from GitHub/JIRA/ADO into `.specweave/`
2. **Universal Format** - Convert to SpecWeave's canonical structure
3. **Export to Target** - Push to different tool (GitHub → JIRA, JIRA → ADO, etc.)

**Example: GitHub to JIRA Migration**
```bash
# Migration happens automatically via living docs sync
# Complete your increment:
/specweave:done 0001

# Living docs sync automatically:
# - Syncs to GitHub (Milestone + Issues)
# - Syncs to JIRA (Epic + Stories)
# Result: Both tools synchronized automatically!
```

**What gets migrated:**
- ✅ **Hierarchy** - Epics → User Stories → Tasks (preserves structure)
- ✅ **Status mapping** - In Progress → In Development (configurable)
- ✅ **Metadata** - Priority, labels, assignees, due dates
- ✅ **Comments** - Full discussion history preserved
- ✅ **Attachments** - Files and screenshots migrated
- ✅ **Relationships** - Links between issues maintained

**Use cases:**
- **Switching tools** - Move entire project from GitHub to JIRA
- **Multi-tool teams** - Sync GitHub (dev) with JIRA (product/PM)
- **Client requirements** - Export internal work to client's tool
- **Compliance** - Migrate to enterprise-approved platform
- **Vendor change** - Switch from one tool to another seamlessly

**Configuration** - Map statuses, priorities, and custom fields:
```json
{
  "sync": {
    "statusMapping": {
      "github": {
        "open": "To Do",
        "in_progress": "In Development",
        "done": "Closed"
      },
      "jira": {
        "To Do": "Open",
        "In Development": "In Progress",
        "Closed": "Done"
      }
    }
  }
}
```

**See**: [Multi-Project Sync](/docs/integrations/multi-project-sync#cross-platform-migration) for complete migration guide

## 🏢 [Brownfield](/docs/glossary/terms/brownfield) Excellence (The Hardest Problem Solved)

### Why [Brownfield](/docs/glossary/terms/brownfield) is Most Complicated

Brownfield projects are the **ultimate challenge** in software development:

- ❌ Existing codebase with **zero or outdated documentation**

- ❌ **Tribal knowledge** scattered across team members

- ❌ **Risk of breaking production** with every change

- ❌ Need to **merge with existing docs, wikis, Confluence pages**

- ❌ **Complex architecture** that was never properly documented

- ❌ **Living documentation** that stays current as code evolves

**Most frameworks give up here. SpecWeave excels.**

### Intelligent Documentation Merging

SpecWeave's **[brownfield](/docs/glossary/terms/brownfield)-onboarder** skill intelligently consolidates existing documentation:

```bash
"Read brownfield-onboarder skill and merge my existing docs/"
```

**What it does:**

- 📄 **Extracts knowledge** from existing docs, wikis, Confluence, legacy CLAUDE.md

- 🧠 **Preserves context** - historical decisions, team conventions, domain knowledge

- 📁 **Distributes intelligently** - routes content to appropriate SpecWeave folders
  - Strategy docs → `.specweave/docs/internal/strategy/`
  - Architecture → `.specweave/docs/internal/architecture/`
  - Operations → `.specweave/docs/internal/operations/`

- 🎯 **No bloat** - smart organization without polluting CLAUDE.md

### Retroactive Architecture Documentation

Create comprehensive architecture for **existing systems** without disrupting production:

```bash
"Analyze authentication module and create complete architecture docs"
```

**SpecWeave generates:**

#### High-Level Design (HLD)

- System architecture overview

- Component relationships

- Data flow diagrams

- Integration points

#### Architecture Decision Records (ADRs)

- **[ADR](/docs/glossary/terms/adr)-0001**: Why we chose JWT over sessions

- **ADR-0002**: OAuth 2.0 provider selection rationale

- **ADR-0003**: Token refresh strategy

- Status: Accepted (for existing patterns) or Proposed (for changes)

#### C4 Model Diagrams

- **C4-1 Context**: System boundaries, external actors

- **C4-2 Container**: Services, databases, APIs

- **C4-3 Component**: Internal module structure

- **Sequence Diagrams**: Login flow, token refresh, logout

- **ER Diagrams**: User, Session, Token data models

**Example:**
```bash
"Create complete architecture documentation for auth system"
# Generates:
# - .specweave/docs/internal/architecture/hld-authentication.md
# - .specweave/docs/internal/architecture/adr/0001-jwt-tokens.md
# - .specweave/docs/internal/architecture/adr/0002-oauth-provider.md
# - .specweave/docs/internal/architecture/diagrams/auth-context.c4.mmd
# - .specweave/docs/internal/architecture/diagrams/auth-container.c4.mmd
# - .specweave/docs/internal/architecture/diagrams/auth-component.c4.mmd
# - .specweave/docs/internal/architecture/diagrams/login-sequence.mmd
```

### Living Documentation That Never Gets Stale

The **killer feature** for [brownfield](/docs/glossary/terms/brownfield): documentation that **auto-updates** as code evolves.

**How it works:**

1. **Initial Documentation** - SpecWeave creates complete specs, HLDs, ADRs, diagrams

2. **Code Changes** - You modify code using `/specweave:do`

3. **Auto-Update** - Hooks automatically update:
   - Specifications reflect new requirements
   - ADRs move from Proposed → Accepted
   - Architecture diagrams update with new components
   - HLDs reflect current system state
   - RFCs document new patterns

4. **Always Current** - Documentation never drifts from code

**Technologies:**

- **Claude Hooks** - Post-task-completion hook runs after every task

- **Living Docs Sync** - `/specweave:sync-docs update` propagates changes

- **Version Control** - All docs in [Git](/docs/glossary/terms/git), full history preserved

### Structure Evolution and Maintenance

As your [brownfield](/docs/glossary/terms/brownfield) project grows, SpecWeave **grows the documentation structure**:

**Scenario: Adding new payment module**
```bash
/specweave:increment "payment processing module"
```

**SpecWeave automatically:**

1. Creates new strategy docs: `.specweave/docs/internal/strategy/payments/`

2. Generates architecture docs with ADRs

3. Links to existing auth system (dependency tracking)

4. Updates system-level HLD to include payment module

5. Adds payment module to C4 Container diagram

6. Creates RFCs for new patterns

7. Maintains incremental history in `.specweave/increments/`

**Result:** Your documentation structure **organically evolves** with your codebase.

### Regression Prevention (Safety First)

Before modifying **any existing code**, SpecWeave enforces safety:

1. ✅ **Analyze current implementation**
   - Reads existing code
   - Maps dependencies
   - Identifies integration points

2. ✅ **Generate retroactive specifications**
   - Documents current behavior (WHAT/WHY)
   - Creates architecture docs (HOW)
   - Maps data flows

3. ✅ **Create baseline tests**
   - Captures current behavior in tests
   - Prevents accidental regression
   - Serves as living documentation

4. ✅ **Impact analysis**
   - Dependency graph generation
   - Affected modules identification
   - Risk assessment

5. ✅ **User review and approval**
   - You review generated docs
   - Approve changes before implementation

6. ✅ **Safe implementation**
   - Modify code with confidence
   - Baseline tests catch regressions
   - Living docs stay current

### Real-World [Brownfield](/docs/glossary/terms/brownfield) Scenario

**Before SpecWeave:**
```
Existing Project Problems:
❌ 50K+ lines of code, zero documentation
❌ Original developers left, tribal knowledge lost
❌ Need to add OAuth, terrified of breaking login
❌ Scattered docs in Confluence, wikis, old READMEs
❌ Architecture decisions unknown
❌ Every change risks production
```

**After SpecWeave:**
```bash
# Day 1: Initialize and merge
npx specweave init .
"Merge existing Confluence docs and wiki pages"
# ✅ All knowledge consolidated in SpecWeave structure

# Day 2: Document existing auth
"Analyze authentication module and create full documentation"
# ✅ HLDs, ADRs, C4 diagrams generated
# ✅ Current implementation fully documented

# Day 3: Create baseline tests
"Create comprehensive tests for current auth behavior"
# ✅ Regression prevention in place

# Day 4: Add OAuth safely
/specweave:increment "Add OAuth 2.0 support"
/specweave:do
# ✅ OAuth added with:
#    - Updated specs and ADRs
#    - Extended architecture diagrams
#    - Baseline tests prevent regression
#    - Living docs auto-updated

# Day 5 onward: Maintain forever
# ✅ Every change auto-updates documentation
# ✅ Architecture diagrams always current
# ✅ ADRs reflect actual decisions
# ✅ No documentation drift ever
```

### Compliance and Audit Trail

[Brownfield](/docs/glossary/terms/brownfield) + SpecWeave = **Compliance-Ready**

**Perfect for regulated industries:**

- 🏥 **Healthcare ([HIPAA](/docs/glossary/terms/hipaa))** - Complete audit trail, document all changes

- 🏦 **Finance ([SOC 2](/docs/glossary/terms/soc2), PCI-DSS)** - Prove compliance with specifications

- 🏛️ **Government (FedRAMP)** - Architecture documentation required

- 💊 **Pharmaceutical ([FDA](/docs/glossary/terms/fda))** - Validation documentation mandatory

**What you get:**

- ✅ Complete change history (increments never deleted)

- ✅ Decision rationale (ADRs for all choices)

- ✅ Test validation (4-level testing strategy)

- ✅ Living documentation (always current)

- ✅ Traceability (specs → code → tests)

## 🎨 Documentation Approaches

### Comprehensive Upfront (Enterprise)
- 500-600+ page specifications before coding
- Full architecture and ADRs upfront
- Complete [API](/docs/glossary/terms/api) contracts
- Best for: Enterprise, regulated industries

### Incremental/Evolutionary (Startup)
- Start with overview (10-20 pages)
- Build documentation as you go
- Adapt to changing requirements
- Best for: Startups, MVPs, prototypes

**Both approaches fully supported!**

## ⚙️ Claude Hooks (Auto-Update)

### Post-Task-Completion Hook

Automatically:
- Updates CLAUDE.md when structure changes
- Updates [API](/docs/glossary/terms/api)/CLI reference
- Updates changelog
- Commits doc changes

### Pre-Implementation Hook

Checks regression risk before modifying existing code.

### Human-Input-Required Hook

Logs and notifies when AI needs clarification.

## 📦 Slash Commands

Framework-agnostic commands:

**Core Commands:**
- `/specweave:increment "feature"` - Plan new increment (PM-led)
- `/specweave:do` - Execute tasks (smart resume)
- `/specweave:progress` - Check status and completion
- `/specweave:validate 0001` - Optional quality assessment
- `/specweave:done 0001` - Manual close (rarely needed)

**Integration Commands:**
- `/specweave:sync-github` - Sync to GitHub issues
- `/specweave:sync-docs` - Review specs vs implementation

All commands adapt to detected tech stack.

## 🎯 Additional Capabilities

### ✅ Already Implemented

- **Multi-language support**: Work in 11 languages with FREE LLM-native translation (v0.6.0+)
  - Supports: English, Russian, Spanish, Chinese, German, French, Japanese, Korean, Portuguese
  - Auto-translates specs, plans, tasks, and living docs to English
  - Zero translation costs (uses same LLM session)

- **Cost optimization**: 75%+ context reduction through intelligent plugin architecture
  - Plugin-based system loads only what you need
  - MCP protocol for efficient context management
  - Typical savings: $60-120/month per developer

- **Figma integration**: Design sync capabilities via specweave-figma plugin
  - Import Figma designs into SpecWeave specs
  - Track design-to-code alignment

### 🔜 Roadmap

- **Vector search**: Semantic spec search across all increments (v2.0)
- **Enterprise analytics**: Advanced compliance tracking and team metrics

---

**Ready to get started?**

- [Quickstart Guide](/docs/guides/getting-started/quickstart) - Get up and running in 5 minutes
- [Installation](/docs/guides/getting-started/installation) - Detailed installation instructions

**Previous**: [What is SpecWeave?](/docs/overview/introduction) | **Next**: [Philosophy](/docs/overview/philosophy) →
