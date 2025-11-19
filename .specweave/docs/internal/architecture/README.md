# Architecture Documentation - The "How"

**Purpose**: Define the system design, technical decisions, and data models.

**Last Updated**: 2025-11-13

---

## Folder Structure

```
architecture/
├── hld/                    ← High-Level Designs (C4 L1-L2)
├── guides/                 ← Implementation guides
├── concepts/               ← Conceptual documentation
├── specs-architecture/     ← Meta-architecture about specs
├── adr/                    ← Architecture Decision Records
└── diagrams/               ← Shared diagrams
```

## What Goes Here

- **HLD (High-Level Design)** - System overview, component diagrams, data flow (C4 Levels 1-2)
- **Implementation Guides** - Step-by-step implementation instructions
- **Conceptual Docs** - Core principles and patterns
- **Specs Architecture** - Meta-architecture about how specs are organized
- **ADR (Architecture Decision Records)** - Technical decisions with rationale
- **Diagrams** - Shared/cross-cutting Mermaid diagrams

**Note**: Feature specs are in a separate folder: `../specs/`

## C4 Model Adoption

SpecWeave uses the **C4 model** for architecture documentation:

| C4 Level | Document Type | Purpose | Example |
|----------|---------------|---------|---------|
| **Level 1: Context** | HLD | System in its environment | System → External APIs |
| **Level 2: Container** | HLD | Applications, services, databases | Web App → API → Database |
| **Level 3: Component** | LLD | Internal service structure | Controller → Service → Repository |
| **Level 4: Code** | Source | Implementation details | Class diagrams, inline docs |

**See**: [Diagram Conventions](../delivery/guides/diagram-conventions.md) for complete C4 mapping and diagram naming conventions.

## Subdirectories

### `/hld/` - High-Level Designs
**C4 Levels**: 1 (Context), 2 (Container)

**Purpose**: System-level architecture showing external boundaries and internal services

**See**: [hld/README.md](hld/README.md)

### `/guides/` - Implementation Guides
**Purpose**: Step-by-step instructions for implementing architectural patterns

**See**: [guides/README.md](guides/README.md)

### `/concepts/` - Conceptual Documentation
**Purpose**: Core architectural principles and mental models

**See**: [concepts/README.md](concepts/README.md)

### `/specs-architecture/` - Specs Architecture
**Purpose**: Meta-architecture about how specs are organized and managed

**See**: [specs-architecture/README.md](specs-architecture/README.md)

### `/adr/` - Architecture Decision Records
**Format**: `0001-decision-title.md`, `0003-007-subtopic.md` (increment-scoped)

**Purpose**: Document architectural decisions with context, options considered, and rationale

**See**: [adr/README.md](adr/README.md)

### `/diagrams/` - Shared Diagrams
**Format**: `{page}.{type}.mmd` (Mermaid source), `{page}.{type}.svg` (rendered)

**Purpose**: Cross-cutting diagrams used by multiple documents

**Note**: Most diagrams should be co-located with their parent document

**See**: [diagrams/README.md](diagrams/README.md)

---

## Specs (Specifications)

**Note**: Specs are organized in a separate top-level folder for better organization.

**Location**: `../specs/`

**Purpose**: Detailed feature specifications with user stories, acceptance criteria, and implementation plans

**When to Reference**: Link to specs from HLD/LLD when implementing features described in specs

**See**: [Specs README](../specs/README.md)

## Diagram Conventions ✨

**Default**: Use **Mermaid diagrams-as-code** for all architecture diagrams.

### Co-locate diagrams with documents (PREFERRED)

Keep each diagram next to the markdown page that explains it:

```
/architecture
  hld-system-overview.md
  hld-system-overview.context.mmd         # Mermaid source
  hld-system-overview.context.svg         # Rendered (optional, for social previews)
  hld-system-overview.sequence-auth.mmd   # Another diagram
  /adr
    0007-event-streaming.md
    0007-event-streaming.context.mmd
    0007-event-streaming.context.svg
```

### File Naming Pattern

```
<page>.<type>.mmd   → source (Mermaid source file)
<page>.<type>.svg   → rendered (optional, for public sites)
```

**Types**: `context`, `sequence`, `flow`, `entity`, `deployment`

**Examples**:
- `hld-system-overview.context.mmd`
- `hld-system-overview.sequence-auth.mmd`
- `0007-event-streaming.context.mmd` (for ADR 0007)

### Embedding in Markdown

**Directly in markdown** (MkDocs renders automatically):
```markdown
## Architecture Overview

![architecture-readme-0](diagrams/architecture-readme-0.svg)
```

**Or reference SVG** (if pre-rendered):
```markdown
![System Context](./hld-system-overview.context.svg)
```

**See**: [Diagram Conventions](../delivery/guides/diagram-conventions.md) for complete guide.

## Document Structures

### HLD (High-Level Design) - C4 Levels 1-2

**Template**: See `src/templates/` (project root)

**Purpose**: System-level design showing external boundaries (Level 1) and internal containers (Level 2)

**Sections**:
- **Context** - Why does this system exist? (link to PRD)
- **Requirements** - Functional and non-functional
- **Architecture Overview** - C4 Level 1 (Context) and Level 2 (Container) diagrams
- **Data Model** - Entities, relationships
- **Integrations** - External systems, APIs
- **Security & Privacy** - Auth, encryption, compliance
- **Scaling & Capacity** - Performance, load handling
- **Trade-offs** - Design compromises
- **Open Questions** - Unresolved issues

**Diagrams**:
- `hld-{system}.c4-context.mmd` - C4 Level 1: System context
- `hld-{system}.c4-container.mmd` - C4 Level 2: Applications, services, databases
- `hld-{system}.sequence-{flow}.mmd` - Sequence diagrams for key flows
- `hld-{system}.entity.mmd` - Data model

**Naming Convention**: `hld-{system-name}.md`

**Example**: `hld-booking-system.md`, `hld-payment-processing.md`

**When to create**: For every major system or subsystem that has external boundaries and multiple internal services/components.

---

### LLD (Low-Level Design) - C4 Level 3

**Template**: See `src/templates/` (project root)

**Purpose**: Component-level design showing internal structure of a service (Level 3)

**Sections**:
- **Context** - Why does this component exist? (link to HLD)
- **Component Overview** - C4 Level 3 diagram showing internal structure
- **API / Interface Specification** - Public and internal interfaces
- **Detailed Flow Diagrams** - Sequence diagrams for key operations
- **Data Models** - Component-specific entities, DTOs, database schema
- **Implementation Details** - Tech stack, algorithms, configuration
- **Security Considerations** - Input validation, token handling, secrets
- **Performance Considerations** - Caching, optimization, monitoring
- **Error Handling** - Error types, retry strategies
- **Testing Strategy** - Unit, integration, component tests
- **Dependencies** - External and internal dependencies
- **Deployment Considerations** - Environment variables, health checks

**Diagrams**:
- `lld-{service}.c4-component.mmd` - C4 Level 3: Internal component structure
- `lld-{service}.sequence-{operation}.mmd` - Sequence diagrams for key operations
- `lld-{service}.class.mmd` - Class diagram (optional)
- `lld-{service}.state.mmd` - State diagram (if applicable)

**Naming Convention**: `lld-{service-name}.md`

**Example**: `lld-auth-service.md`, `lld-payment-processor.md`, `lld-order-manager.md`

**When to create**:
- For complex services with multiple internal components
- When implementation details need to be communicated to team
- Before coding a new service (design-first approach)
- When refactoring an existing service

**Not needed when**:
- Simple CRUD services with minimal logic
- Thin wrappers around external APIs
- Single-responsibility components with fewer than 3 internal classes

### ADR (Architecture Decision Record)

**Template**: See `src/templates/` (project root)

**Sections**:
- **Status** - draft | review | approved | deprecated
- **Context** - What's the situation?
- **Decision** - What did we decide?
- **Consequences** - What's the impact?
- **Alternatives** - What else did we consider?

**Format**: `0001-decision-title.md` (sequential numbering)

### Specs (Specifications)

**Template**: See `src/templates/` (project root)

**Sections**:
- **Summary** - One-sentence description
- **Motivation** - Why is this needed?
- **Proposal** - API schema, flow diagram
- **Backwards Compatibility** - Breaking changes?
- **Rollout Plan** - How to deploy?
- **Observability & SLO Impact** - Monitoring, SLOs
- **Security / Compliance Considerations** - Risks, mitigations
- **Alternatives** - Other approaches
- **Decision & Next Steps** - Outcome, action items

**Format**: `0001-feature-title.md` (sequential numbering)

## Creating New Architecture Documents

### To create an HLD:
```bash
# Templates are in src/templates/ at project root
cp src/templates/docs/hld-template.md .specweave/docs/internal/architecture/hld-{system}.md
```

**Then create diagrams**:
```bash
touch docs/internal/architecture/hld-{system}.c4-context.mmd
touch docs/internal/architecture/hld-{system}.c4-container.mmd
touch docs/internal/architecture/hld-{system}.sequence-{flow}.mmd
touch docs/internal/architecture/hld-{system}.entity.mmd
```

### To create an LLD:
```bash
cp src/templates/docs/lld-template.md .specweave/docs/internal/architecture/lld-{service}.md
```

**Then create diagrams**:
```bash
touch docs/internal/architecture/lld-{service}.c4-component.mmd
touch docs/internal/architecture/lld-{service}.sequence-{operation}.mmd
```

### To create an ADR:
```bash
# Find next number
ls docs/internal/architecture/adr/ | grep -E '^[0-9]+' | tail -1
# Create new ADR with next number
cp src/templates/docs/adr-template.md .specweave/docs/internal/architecture/adr/0001-decision-title.md
```

### To create a Spec:
**Note**: Specs are in `../specs/` (top-level folder)

```bash
# Find next number
ls docs/internal/specs/ | grep -E '^spec-[0-9]+' | tail -1
# Create new spec with next number
mkdir -p docs/internal/specs/spec-0001-feature-title
cp src/templates/docs/spec-template.md .specweave/docs/internal/specs/spec-0001-feature-title/spec.md
```

**See**: [Specs README](../specs/README.md) for complete spec creation guide

## Index of Architecture Documents

### HLDs (C4 Levels 1-2)
- (None yet - create your first HLD!)

### LLDs (C4 Level 3)
- (None yet - create your first LLD!)

### ADRs
- (None yet - create your first ADR!)

### Specs
**Note**: Specs are in `../specs/` folder

See [Specs Index](../specs/README.md)

## Cross-Links

**Document Hierarchy**:
```
PRD (Why/What) → HLD (How - System) → LLD (How - Component) → Code (Implementation)
                      ↓                     ↓
                   ADR/Spec             ADR/Spec
```

**Cross-linking Rules**:
- **PRD → HLD**: Every HLD should reference the PRD it implements
- **HLD → LLD**: Link to all LLDs for services within the system
- **LLD → HLD**: Every LLD should reference its parent HLD
- **HLD → ADR**: Link to all relevant ADRs
- **LLD → ADR**: Link to component-specific ADRs
- **Spec → HLD/LLD**: Specs should reference the HLD/LLD they modify
- **ADR → HLD/LLD/Spec**: ADRs should be referenced from relevant docs

## Related Documentation

- [Internal Docs Overview](../README.md) - Six core folders overview
- [Strategy Documentation](../strategy/README.md) - Business case, PRDs
- [Specs Documentation](../specs/README.md) - Feature specifications
- [Delivery Documentation](../delivery/README.md) - Build & release processes
- [Operations Documentation](../operations/README.md) - Production runbooks
- [Governance Documentation](../governance/README.md) - Security, compliance
- [Diagram Conventions](../delivery/guides/diagram-conventions.md) - C4 diagram conventions and naming
- [Diagram Conventions (Comprehensive)](../delivery/guides/diagram-conventions-comprehensive.md) - Complete diagram guide
- Templates: See `src/templates/` in project root (HLD, LLD, ADR templates)
