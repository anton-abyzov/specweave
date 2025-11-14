# Delivery Documentation - The "How We Build"

**Purpose**: Define how we plan, build, and release features.

## 🔑 Start Here (Brownfield Projects)

If you're integrating SpecWeave into an **existing project**, start with:

📘 **[Brownfield Integration Strategy](brownfield-integration-strategy.md)** - How to adopt SpecWeave in existing codebases

Then review the key guides below ↓

## What Goes Here

- **Brownfield Integration** - How to adopt SpecWeave in existing projects ← **Start here!**
- **Branching Strategy** - Git workflow, trunk-based development
- **Code Review Standards** - PR guidelines, review process
- **DORA Metrics** - Engineering performance tracking
- **Delivery Plans** - **NEW!** Quarter/sprint planning, epic timeline coordination
- **Release Management** - Release tooling, automation, multi-repo coordination
- **Roadmap** - Feature timeline, priorities
- **Release Process** - Version planning, release notes
- **Guides** - Detailed how-to documentation

## Document Types

### Roadmap
**Purpose**: Long-term feature planning, priorities, dependencies

**Sections**:
- **Now** - Current quarter
- **Next** - Next quarter
- **Later** - Future quarters
- **Parked** - Deferred features

**File**: `roadmap.md`

### Release Plan
**Purpose**: Plan for specific release versions

**Sections**:
- **Version** - Release version number
- **Features** - What's included (link to PRDs)
- **Timeline** - Key dates (code freeze, QA, release)
- **Dependencies** - Blockers, external dependencies
- **Rollout Strategy** - Phased rollout, feature flags
- **Rollback Plan** - How to revert if needed

**Naming**: `release-v1.0.md`, `release-v2.0.md`

### Test Strategy
**Purpose**: Define testing approach for features or releases

**Sections**:
- **Scope** - What's being tested
- **Test Types** - Unit, integration, E2E, performance
- **Coverage Goals** - % coverage targets
- **Test Environments** - Where tests run
- **Automation** - CI/CD integration
- **Manual Testing** - Smoke tests, exploratory testing

**File**: `test-strategy.md` or `test-strategy-{feature}.md`

### CI/CD Runbooks
**Purpose**: Document build and deployment processes

**Sections**:
- **Pipeline Overview** - Build → Test → Deploy flow
- **Environments** - Dev, staging, prod
- **Deployment Steps** - How to deploy
- **Rollback Steps** - How to revert
- **Monitoring** - What to watch after deployment

**Naming**: `ci-cd-{system}.md`

## Creating New Delivery Documents

### Roadmap:
```bash
# Create or update roadmap
touch docs/internal/delivery/roadmap.md
```

### Release Plan:
```bash
cp templates/docs/release-plan-template.md docs/internal/delivery/release-v1.0.md
```

### Test Strategy:
```bash
cp templates/docs/test-strategy-template.md docs/internal/delivery/test-strategy-{feature}.md
```

## Index of Delivery Documents

### 🔑 Brownfield & Integration
- **[Brownfield Integration Strategy](brownfield-integration-strategy.md)** - Adopting SpecWeave in existing projects
  - ↔️ Related: [Architecture ADR-0008](../architecture/adr/0008-brownfield-support.md)

### 🌿 Branching & Git
- **[Branch Strategy](branch-strategy.md)** - Trunk-based development, Git workflow
  - ↔️ Related: [Code Review Standards](code-review-standards.md), [Roadmap](roadmap.md)

### ✅ Code Review & Quality
- **[Code Review Standards](code-review-standards.md)** - PR guidelines, review checklist
  - ↔️ Related: [Branch Strategy](branch-strategy.md), [DORA Metrics](dora-metrics.md)

### 📊 Metrics & Performance
- **[DORA Metrics](dora-metrics.md)** - Engineering performance tracking (Deployment Frequency, Lead Time, etc.)
  - ↔️ Related: [Branch Strategy](branch-strategy.md), [Operations](../operations/README.md)

### 📅 Delivery Planning (NEW!)
- **[Delivery Plans](plans/README.md)** - Quarter/sprint planning, epic timeline coordination
  - When epics ship, dependencies, team allocation
  - Links to ADO Delivery Plans, JIRA Roadmaps, GitHub Projects
  - ↔️ Related: [Specs (Epics)](../specs/README.md), [Roadmap](roadmap.md)

### 🚀 Release Management
- **[Release Management](release-management/README.md)** - Release tooling & automation
  - Multi-repo coordination, version synchronization
  - DORA metrics tracking, GitFlow automation
  - ↔️ Related: [Release Process](release-process.md), [DORA Metrics](dora-metrics.md)

### 🗺️ Planning & Roadmap
- **[Product Roadmap](roadmap.md)** - Feature planning, prioritization
  - ↔️ Related: [Strategy PRDs](../strategy/README.md), [Release Process](release-process.md)

### 🚀 Release Process
- **[Release Process](release-process.md)** - How we ship versions
  - ↔️ Related: [Branch Strategy](branch-strategy.md), [Roadmap](roadmap.md)

### 📚 Detailed Guides (guides/)
- **[Deployment Intelligence](guides/deployment-intelligence.md)** - Smart deployment target detection
- **[Development Workflow](guides/development-workflow.md)** - Day-to-day development process
- **[Diagram Conventions](guides/diagram-conventions.md)** - C4 diagram standards
- **[Diagram SVG Generation](guides/diagram-svg-generation.md)** - Generating diagrams from Mermaid
- **[Increment Lifecycle](guides/increment-lifecycle.md)** - How increments flow through the system
- **[Increment Validation](guides/increment-validation.md)** - Validating increment completeness
- **[Testing Strategy](guides/testing-strategy.md)** - Testing approach, coverage goals
- **[Tool Concept Mapping](guides/tool-concept-mapping.md)** - Mapping tools to SpecWeave concepts

## Related Documentation (Bidirectional Links)

### 📋 From Strategy
- [Strategy Documentation](../strategy/README.md) - Links roadmap to PRDs and business goals
- Flow: PRD → Roadmap → Release Plans

### 🏗️ From Architecture
- [Architecture Documentation](../architecture/README.md) - Links releases to ADRs/Specs
- Flow: ADRs → Branching Strategy → Code Review

### ⚙️ From Operations
- [Operations Documentation](../operations/README.md) - Links to operational runbooks
- Flow: Release Process → Deployment → Runbooks

### 📜 From Governance
- [Governance Documentation](../governance/README.md) - Links to coding standards, security
- Flow: Coding Standards → Code Review → Deployment
