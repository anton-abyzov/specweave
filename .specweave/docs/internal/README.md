# Internal Documentation

**This documentation is NOT published publicly.** It contains the internal Product & Engineering Playbook.

**Last Updated**: 2025-11-04

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

**See**: [strategy/README.md](strategy/README.md)

---

### 2. RFC - The "What" (Detailed Requirements)
**Location**: `rfc/`

**Purpose**: Detailed technical specifications for features, integrations, and architectural changes

**What Goes Here**:
- Feature specifications (detailed user stories, acceptance criteria)
- Integration proposals (GitHub, JIRA, etc.)
- Breaking changes and migrations
- Cross-cutting concerns

**Document Types**:
- RFC-XXXX: Feature specifications
- Must reference ADRs and diagrams when applicable

**When to Use**: When planning complex features requiring team alignment

**IMPORTANT**: RFCs serve as the project's historical record. Reading all RFCs should give a complete understanding of how the project evolved and its current scope.

**See**: [rfc/README.md](rfc/README.md)

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

**See**: [architecture/README.md](architecture/README.md)

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

**See**: [delivery/README.md](delivery/README.md)

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

**See**: [operations/README.md](operations/README.md)

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

**See**: [governance/README.md](governance/README.md)

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

1. Choose the appropriate pillar (Strategy, Architecture, Delivery, Operations, Governance)
2. Use the appropriate template from `templates/docs/`
3. Follow naming conventions:
   - ADR: `0001-decision-title.md`
   - RFC: `0001-feature-title.md`
   - Others: `descriptive-name.md`
4. Create PR for review
5. Tag appropriate reviewers (see CODEOWNERS)

---

## Folder Hierarchy Summary

```
.specweave/docs/internal/
├── strategy/           # Business rationale, PRDs, vision
├── rfc/                # Feature specifications (detailed requirements)
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
| Detailed feature spec with user stories | `rfc/` | `rfc-0007-smart-discipline.md` |
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
PRD → RFC → Architecture → Delivery → Operations
 ↓      ↓         ↓            ↓          ↓
Why  → What →    How   →     Build  →   Run
```

**Example Flow**:
1. **Strategy**: `prd-user-auth.md` - Why do we need authentication?
2. **RFC**: `rfc-0005-authentication.md` - What exactly will we build? (user stories, acceptance criteria)
3. **Architecture**: `hld-auth-system.md` - How will it be designed?
4. **Architecture/ADR**: `0012-use-oauth2.md` - Why OAuth2 over other methods?
5. **Delivery**: `test-strategy-auth.md` - How will we test it?
6. **Operations**: `runbook-auth-service.md` - How do we operate it?
7. **Governance**: `security-policy.md` - Security requirements

### Cross-Linking Rules

- ✅ **RFC → ADR**: Link to relevant architecture decisions
- ✅ **RFC → Diagrams**: Reference architecture diagrams
- ✅ **HLD → ADR**: Link to decisions that shaped the design
- ✅ **Runbook → HLD**: Link to system architecture
- ✅ **Test Strategy → RFC**: Link to feature specs being tested

**Example (in RFC)**:
```markdown
## Architecture

See [ADR-0012: Use OAuth2](../architecture/adr/0012-use-oauth2.md) for authentication method decision.

![Auth Flow](../architecture/diagrams/auth-flow.sequence.svg)
```

---

## Related Documentation

- [Strategy README](strategy/README.md) - Business case documentation
- [RFC README](rfc/README.md) - Feature specifications
- [Architecture README](architecture/README.md) - Technical design
- [Delivery README](delivery/README.md) - Build & release processes
- [Operations README](operations/README.md) - Production operations
- [Governance README](governance/README.md) - Policies and standards
