# Internal Documentation

**This documentation is NOT published publicly.** It contains the internal Product & Engineering Playbook.

## Five Pillars

### 1. Strategy - The "why"
**Location**: `strategy/`

- Vision, Business Case, OKRs
- PRD (Problem, Outcomes, Scope)
- Stakeholder mapping
- Market analysis

**Document Types**:
- PRD (Product Requirements Document)
- Vision documents
- OKR documents
- Business case analyses

### 2. Architecture - The "what"
**Location**: `architecture/`

**SpecWeave adopts the C4 model** for architecture documentation:

| Document Type | C4 Levels | Purpose | Audience |
|---------------|-----------|---------|----------|
| **HLD** | Levels 1-2 | System context, containers (apps, services, DBs) | All technical stakeholders |
| **LLD** | Level 3 | Component internals (controllers, services, repos) | Developers, tech leads |
| **ADR** | Any | Architecture decisions with rationale | All stakeholders |
| **RFC** | Any | API designs, schema proposals | Technical reviewers |

**Document Types**:
- **HLD (High-Level Design)** - System-level design (C4 Levels 1-2)
  - Context diagrams: System → External systems
  - Container diagrams: Web App → API → Database
- **LLD (Low-Level Design)** - Component-level design (C4 Level 3)
  - Component diagrams: Controller → Service → Repository
  - Sequence diagrams: Method-level flows
- **ADR (Architecture Decision Records)** - Technical decisions
- **RFC (Request for Comments)** - API/schema proposals
- **Data model documentation** - ERDs, schemas
- **Security architecture** - Security model, auth flows

**Subdirectories**:
- `adr/` - Architecture Decision Records (0001-xxx.md)
- `rfc/` - Request for Comments (0001-xxx.md)

**When to Use HLD vs LLD**:
- **HLD**: System has external boundaries, multiple services/components
- **LLD**: Service has complex internal structure, needs design before implementation
- **Not needed**: Simple CRUD services, thin API wrappers

**See**: [architecture/README.md](architecture/README.md) for complete guidance

### 3. Delivery - The "how we build"
**Location**: `delivery/`

- Roadmap
- Release plans
- Test strategy
- CI/CD documentation
- Branching strategy
- Environment setup

**Document Types**:
- Roadmap documents
- Release plans
- Sprint plans
- Test strategy
- CI/CD runbooks

### 4. Operations - The "how we run"
**Location**: `operations/`

- SLOs/SLIs
- Monitoring & Alerting
- Incident response
- On-call procedures
- Capacity planning
- DR/BCP (Disaster Recovery/Business Continuity)
- Operational runbooks

**Document Types**:
- Runbooks (operational procedures)
- SLO definitions
- Monitoring guides
- Incident response playbooks
- DR/BCP plans

### 5. Governance - The "guardrails"
**Location**: `governance/`

- Security policies
- Privacy policies
- Compliance documentation
- Data retention policies
- Vendor risk management
- Approval processes
- Audit trails
- Change management

**Document Types**:
- Security policies
- Compliance documentation
- Change control procedures
- Audit requirements

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

## Related Documentation

- [Strategy README](strategy/README.md)
- [Architecture README](architecture/README.md)
- [Delivery README](delivery/README.md)
- [Operations README](operations/README.md)
- [Governance README](governance/README.md)
