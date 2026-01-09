# SpecWeave Internal Documentation

**Last Updated**: 2026-01-08
**Version**: 1.0.109

Welcome to the SpecWeave internal documentation! This is your comprehensive guide to understanding the SpecWeave framework from a technical perspective.

**This documentation is NOT published publicly.** It contains the internal Product & Engineering Playbook.

---

## 🚀 NEW: Technical Documentation

### Quick Start for Learning SpecWeave

**New to SpecWeave?** Start with our comprehensive technical guides:

1. **[LEARNING-GUIDE.md](LEARNING-GUIDE.md)** - 4-week structured learning path
   - Phase 1: Foundation (Week 1) - Core concepts and basic workflow
   - Phase 2: Core Components (Week 2) - Increment management, specs, hooks
   - Phase 3: Advanced Features (Week 3) - Sync, plugins, auto mode
   - Phase 4: Expert Topics (Week 4) - Living docs, multi-agent system

2. **[architecture/TECHNICAL-OVERVIEW.md](architecture/TECHNICAL-OVERVIEW.md)** - High-level architecture
   - System context and container diagrams
   - Core components overview (215K+ lines of code)
   - Key design patterns and data structures
   - Performance, security, and scalability model

3. **[architecture/COMPONENT-CATALOG.md](architecture/COMPONENT-CATALOG.md)** - Component reference
   - All modules, classes, and methods documented
   - Type definitions and interfaces
   - Plugin components (25+ specialized plugins)
   - Utility modules and common patterns

4. **[architecture/diagrams/](architecture/diagrams/)** - Visual architecture diagrams
   - 9 comprehensive Mermaid diagrams following C4 Model
   - System context, containers, components
   - Sequence flows for key operations
   - State machines and deployment views

---

## Six Core Folders

### 1. Strategy - The "Why"
**Location**: `strategy/`

**Purpose**: Business rationale, vision, and success metrics

**What Goes Here**:
- Vision, Business Case, OKRs
- PRD (Problem, Outcomes, Scope)
- Stakeholder mapping
- Market analysis

**Document Types**:
- PRD (Product Requirements Document)
- Vision documents
- OKR documents
- Business case analyses

**When to Use**: When defining the business case for a new product, feature, or initiative

**See**: [strategy/README](strategy/README)

---

### 2. Specs - The "What" (Detailed Requirements)
**Location**: `specs/`

**Purpose**: Detailed technical specifications for features, integrations, and architectural changes

**What Goes Here**:
- Feature specifications (detailed user stories, acceptance criteria)
- Integration proposals (GitHub, JIRA, Azure DevOps, etc.)
- Breaking changes and migrations
- Cross-cutting concerns

**Document Types**:
- SPEC-XXXX: Feature specifications
- Must reference ADRs and diagrams when applicable

**When to Use**: When planning complex features requiring team alignment

**IMPORTANT**: Specs serve as the project's historical record. Reading all specs should give a complete understanding of how the project evolved and its current scope.

**Terminology Note**: Renamed to "Specs" in v0.8.0 to align with SpecWeave brand and industry standard.

**See**: [specs/README](specs/README)

---

### 3. Architecture - The "How" (Technical Design)
**Location**: `architecture/`

**Purpose**: System architecture, technical decisions, and data models

**SpecWeave adopts the C4 model** for architecture documentation:

| Document Type | C4 Levels | Purpose | Audience |
|---------------|-----------|---------|----------|
| **HLD** | Levels 1-2 | System context, containers (apps, services, DBs) | All technical stakeholders |
| **LLD** | Level 3 | Component internals (controllers, services, repos) | Developers, tech leads |
| **ADR** | Any | Architecture decisions with rationale | All stakeholders |

**What Goes Here**:
- **HLD (High-Level Design)** - System-level design (C4 Levels 1-2)
  - Context diagrams: System → External systems
  - Container diagrams: Web App → API → Database
- **LLD (Low-Level Design)** - Component-level design (C4 Level 3)
  - Component diagrams: Controller → Service → Repository
  - Sequence diagrams: Method-level flows
- **ADR (Architecture Decision Records)** - Technical decisions
- **Data model documentation** - ERDs, schemas
- **Security architecture** - Security model, auth flows

**Subdirectories**:
- `adr/` - Architecture Decision Records (0001-xxx.md)
- `diagrams/` - Mermaid diagrams, SVGs

**When to Use**:
- **HLD**: System has external boundaries, multiple services/components
- **LLD**: Service has complex internal structure, needs design before implementation
- **Not needed**: Simple CRUD services, thin API wrappers

**See**: [architecture/README](architecture/README)

---

### 4. Delivery - The "How We Build"
**Location**: `delivery/`

**Purpose**: How we plan, build, and release features

**What Goes Here**:
- Roadmap (feature timeline, priorities)
- Release plans (version planning, release notes)
- Test strategy (testing approach, coverage goals)
- CI/CD documentation (build pipelines, deployment processes)
- Branching strategy (Git workflow, branch policies)
- Code review standards (PR review guidelines)
- DORA metrics (deployment frequency, lead time, etc.)

**Document Types**:
- `roadmap.md` - Feature timeline
- `release-vX.X.md` - Release plans
- `test-strategy.md` - Testing approach
- `branch-strategy.md` - Git workflow
- `code-review-standards.md` - PR guidelines
- `dora-metrics.md` - Engineering performance tracking
- CI/CD runbooks

**When to Use**: When planning releases, defining workflows, or tracking engineering performance

**See**: [delivery/README](delivery/README)

---

### 5. Operations - The "How We Run"
**Location**: `operations/`

**Purpose**: How we operate, monitor, and maintain the system in production

**What Goes Here**:
- SLOs/SLIs (Service Level Objectives and Indicators)
- Runbooks (step-by-step operational procedures)
- Monitoring & Alerting (what to monitor, alert thresholds)
- Incident response (how to handle incidents)
- On-call procedures (rotation, escalation)
- Capacity planning (resource forecasting, scaling)
- DR/BCP (Disaster Recovery & Business Continuity Plans)
- Performance tuning (optimization guides)

**Document Types**:
- `runbook-{service}.md` - Operational procedures
- `slo-{service}.md` - SLO definitions
- `incident-response.md` - Incident handling
- `disaster-recovery.md` - DR/BCP plans
- `performance-tuning.md` - Optimization guide

**When to Use**: When operating production systems, responding to incidents, or planning capacity

**See**: [operations/README](operations/README)

---

### 6. Governance - The "Guardrails"
**Location**: `governance/`

**Purpose**: Security, compliance, and change management policies

**What Goes Here**:
- Security policies (security model, authentication, authorization)
- Privacy policies (data privacy, GDPR, user consent)
- Compliance documentation (HIPAA, SOC 2, PCI-DSS)
- Data retention policies (how long data is kept, deletion procedures)
- Vendor risk management (third-party security assessments)
- Approval processes (who approves what)
- Audit trails (what's logged, retention)
- Change management (how changes are approved and deployed)
- Coding standards (style guide, best practices)

**Document Types**:
- `security-policy.md` - Security standards
- `compliance-{regulation}.md` - Compliance docs
- `data-retention.md` - Retention policies
- `change-control.md` - Change management
- `coding-standards.md` - Style guide
- `vendor-risk-management.md` - Third-party security

**When to Use**: When defining security policies, ensuring compliance, or establishing coding standards

**See**: [governance/README](governance/README)

## Document Lifecycle

All documents follow this lifecycle:

1. **Draft** - Document is being written
2. **Review** - Document is under review (PR created)
3. **Approved** - Document is approved and merged
4. **Deprecated** - Document is no longer relevant

Status is indicated in the document's front-matter:

```yaml
---
status: approved
reviewers:
  - @architect
  - @tech-lead
last_reviewed: 2025-01-15
---
```

## Creating New Documents

1. Choose the appropriate pillar (Strategy, Specs, Architecture, Delivery, Operations, Governance)
2. Use the appropriate template from `templates/docs/`
3. Follow naming conventions:
   - ADR: `0001-decision-title.md`
   - Spec: `spec-0001-feature-title.md`
   - Others: `descriptive-name.md`
4. Create PR for review
5. Tag appropriate reviewers (see CODEOWNERS)

---

## Folder Hierarchy Summary

```
.specweave/docs/internal/
├── strategy/           # Business rationale, PRDs, vision
├── specs/              # Feature specifications (detailed requirements)
├── architecture/       # Technical design (HLD, LLD, ADR, diagrams)
│   ├── adr/            # Architecture Decision Records
│   └── diagrams/       # Mermaid diagrams, SVGs
├── delivery/           # Build & release processes (roadmap, DORA, branching)
├── operations/         # Production operations (runbooks, SLOs, incidents)
└── governance/         # Policies (security, compliance, coding standards)
```

---

## Quick Reference: Which Folder?

| What are you documenting? | Folder | Example |
|---------------------------|--------|---------|
| Business case for new feature | `strategy/` | `prd-user-authentication.md` |
| Detailed feature spec with user stories | `specs/` | `spec-0007-smart-discipline.md` |
| System architecture diagram | `architecture/` | `hld-system-overview.md` |
| Technical decision (why we chose X over Y) | `architecture/adr/` | `0001-use-postgres.md` |
| Git workflow and branching rules | `delivery/` | `branch-strategy.md` |
| Engineering metrics | `delivery/` | `dora-metrics.md` |
| How to handle production incidents | `operations/` | `incident-response.md` |
| How to optimize performance | `operations/` | `performance-tuning.md` |
| Security best practices | `governance/` | `security-policy.md` |
| Code style guide | `governance/` | `coding-standards.md` |

---

## Cross-References and Relationships

### Document Flow

```
PRD → Spec → Architecture → Delivery → Operations
 ↓      ↓         ↓            ↓          ↓
Why  → What →    How   →     Build  →   Run
```

**Example Flow**:
1. **Strategy**: `prd-user-auth.md` - Why do we need authentication?
2. **Specs**: `spec-0005-authentication.md` - What exactly will we build? (user stories, acceptance criteria)
3. **Architecture**: `hld-auth-system.md` - How will it be designed?
4. **Architecture/ADR**: `0012-use-oauth2.md` - Why OAuth2 over other methods?
5. **Delivery**: `test-strategy-auth.md` - How will we test it?
6. **Operations**: `runbook-auth-service.md` - How do we operate it?
7. **Governance**: `security-policy.md` - Security requirements

### Cross-Linking Rules

- ✅ **Spec → ADR**: Link to relevant architecture decisions
- ✅ **Spec → Diagrams**: Reference architecture diagrams
- ✅ **HLD → ADR**: Link to decisions that shaped the design
- ✅ **Runbook → HLD**: Link to system architecture
- ✅ **Test Strategy → Spec**: Link to feature specs being tested

**Example (in Spec)**:
```markdown
## Architecture

See [ADR-0012: Use OAuth2](../architecture/adr/0012-use-oauth2) for authentication method decision.

![Auth Flow](../architecture/diagrams/auth-flow.sequence.svg)
```

---

## Related Documentation

- [Strategy README](strategy/README) - Business case documentation
- [Specs README](specs/README) - Feature specifications
- [Architecture README](architecture/README) - Technical design
- [Delivery README](delivery/README) - Build & release processes
- [Operations README](operations/README) - Production operations
- [Governance README](governance/README) - Policies and standards
