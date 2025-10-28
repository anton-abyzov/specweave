# Key Features

SpecWeave provides a comprehensive suite of tools and workflows for building production-grade software with AI assistance.

## 🎯 Specification-First Development

### Append-Only Snapshots + Living Documentation

**SpecWeave's Core Power**: Maintains both historical audit trails and current documentation simultaneously.

**The Innovation**: Unlike traditional documentation that gets outdated or loses historical context, SpecWeave gives you BOTH:

#### 📸 Append-Only Increment Snapshots (Historical Context)
```
.specweave/increments/
├── 0001-user-authentication/
│   ├── spec.md              # What was planned
│   ├── plan.md              # How it was built
│   ├── tasks.md             # What was done
│   ├── tests.md             # How it was validated
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
| **"What changed in this feature?"** | Git commits only | Complete increment snapshot with spec, plan, tests |
| **"Prove compliance"** | Reconstruct from memory | Complete audit trail in increments |
| **"Onboard new developer"** | Days of reading code | Read current docs + historical increments |

### Real-World Benefits

- **Compliance-Ready**: SOC 2, HIPAA, FDA audits have complete paper trail
- **Context Recovery**: Understand decisions made 6 months ago
- **Impact Analysis**: See all related changes by searching increments
- **Rollback Intelligence**: Know exactly what to revert
- **Knowledge Transfer**: No tribal knowledge silos
- **Debugging**: Trace feature evolution across increments

**Think of it as "Git for Specifications"**:
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

### 14 Core Agents

| Agent | Role | Expertise |
|-------|------|-----------|
| **PM** | Product Manager | Requirements, user stories, roadmap |
| **Architect** | System Architect | Design, ADRs, component architecture |
| **DevOps** | DevOps Engineer | Infrastructure, deployment, CI/CD |
| **SRE** | Site Reliability Engineer | Monitoring, incidents, reliability |
| **QA Lead** | Quality Assurance | Test strategy, test cases |
| **Security** | Security Engineer | Threat modeling, penetration testing |
| **Tech Lead** | Technical Lead | Code review, best practices |
| **Frontend** | Frontend Developer | React, UI/UX implementation |
| **Next.js** | Next.js Specialist | Next.js app development |
| **Node.js Backend** | Backend Developer | API, services, backend logic |
| **Python Backend** | Python Developer | FastAPI, Django, data services |
| **.NET Backend** | .NET Developer | C#, ASP.NET Core, enterprise apps |
| **Docs Writer** | Documentation Writer | Guides, references, tutorials |
| **Performance** | Performance Engineer | Optimization, profiling, scaling |

### Auto-Role Routing

Skills automatically detect expertise and route requests:

\`\`\`
User: "Create authentication system"
→ specweave-detector activates
→ Routes to increment-planner
→ Invokes PM, Architect, DevOps agents
→ Generates complete spec + architecture + plan
\`\`\`

## 🧪 Test-Validated Development

### 4-Level Testing Strategy

1. **Specification Acceptance Criteria** (TC-0001 format)
   - Business-level test cases in specifications
   - Technology-agnostic validation

2. **Feature Test Strategy** (tests.md)
   - Maps TC-0001 to implementations
   - Defines test types (E2E, Unit, Integration)

3. **Skill Test Cases** (YAML-based)
   - Minimum 3 tests per skill
   - Structured validation

4. **Code Tests** (Automated)
   - E2E with Playwright (MANDATORY for UI)
   - Unit and integration tests
   - >80% coverage for critical paths

### Truth-Telling Requirement

E2E tests MUST tell the truth:
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
    System_Ext(github, "GitHub", "Version control and CI/CD")

    Rel(user, specweave, "Uses")
    Rel(specweave, claude, "Invokes agents")
    Rel(specweave, github, "Syncs increments")
\`\`\`

## 🌐 Framework-Agnostic

### Supports ANY Tech Stack

- **TypeScript/JavaScript**: Next.js, NestJS, Express, React
- **Python**: FastAPI, Django, Flask
- **Go**: Gin, Echo, Fiber
- **Rust**: Actix, Rocket, Axum
- **Java**: Spring Boot, Quarkus
- **C#/.NET**: ASP.NET Core, Blazor

### Auto-Detection

SpecWeave detects your tech stack from:
- `package.json` → TypeScript/JavaScript
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
│   ├── spec.md              # What and Why
│   ├── plan.md              # How
│   ├── tasks.md             # Checklist
│   ├── tests.md             # Test strategy
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

## 🛡️ Regression Prevention

### Brownfield Safety

Before modifying existing code:
1. ✅ Analyze current implementation
2. ✅ Generate retroactive documentation
3. ✅ Create baseline tests
4. ✅ User reviews and approves
5. ✅ Implement modifications safely

### Impact Analysis

- Dependency graph generation
- Affected modules identification
- Regression risk assessment
- User approval required

## 🎨 Documentation Approaches

### Comprehensive Upfront (Enterprise)
- 500-600+ page specifications before coding
- Full architecture and ADRs upfront
- Complete API contracts
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
- Updates API/CLI reference
- Updates changelog
- Commits doc changes

### Pre-Implementation Hook

Checks regression risk before modifying existing code.

### Human-Input-Required Hook

Logs and notifies when AI needs clarification.

## 📦 Slash Commands

Framework-agnostic commands:

- `specweave init` - Initialize new SpecWeave project
- `/create-increment` - Create new feature/increment
- `/sync-docs` - Review specs vs implementation
- `/sync-github` - Sync to GitHub issues

All commands adapt to detected tech stack.

## 🚀 Coming Soon

- **Vector search**: Semantic spec search (v2.0)
- **Multi-language support**: i18n for docs
- **Figma integration**: Design → Code
- **Cost optimization**: Infrastructure cost analysis
- **Enterprise features**: Compliance tracking, advanced analytics

---

**Ready to get started?**

- [Quickstart Guide](/docs/guides/getting-started/quickstart) - Get up and running in 5 minutes
- [Installation](/docs/guides/getting-started/installation) - Detailed installation instructions

**Previous**: [What is SpecWeave?](/docs/overview/introduction) | **Next**: [Philosophy](/docs/overview/philosophy) →
