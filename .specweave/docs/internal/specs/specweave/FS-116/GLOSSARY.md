# LivingSpec Terminology Glossary

This glossary defines key terms used in the LivingSpec Universal Standard.

---

## Core Concepts

### Living Documentation

Documentation that automatically stays synchronized with the systems it describes. Unlike static documentation that becomes stale, living documentation is continuously updated through automated sync with source code, work tracking systems, and architectural decisions.

**Characteristics**:
- Bidirectional sync with external tools (GitHub, JIRA, ADO)
- Version-controlled alongside code
- Structured for machine parsing (YAML frontmatter, schemas)
- AI-optimized for LLM context loading

### Work Unit

A discrete piece of work with defined scope, acceptance criteria, and lifecycle. Work units follow a hierarchical structure from high-level strategy to implementation tasks.

**Hierarchy**:
```
Epic → Feature → User Story → Task → Subtask
```

**Example**: A "User Authentication" feature (FS-042) contains multiple user stories (US-001: Registration, US-002: Login), each with tasks (T-001: Create user model).

### Sync Provider

An external system that exchanges work items and status with LivingSpec. Providers implement the sync protocol for bidirectional synchronization.

**Supported Providers**:
| Provider | Sync Direction | External ID Format |
|----------|---------------|-------------------|
| GitHub Issues | Bidirectional | `#123` |
| JIRA | Bidirectional | `PROJ-123` |
| Azure DevOps | Bidirectional | Work Item ID |

### Context Manifest

A machine-readable summary that enables efficient loading of documentation context. Used by AI systems to quickly understand project structure without reading full documents.

**Format** (`manifest.yaml`):
```yaml
project:
  name: "my-project"
  version: "1.0.0"
specs:
  - id: "FS-042"
    summary: "User authentication feature"
    importance: "high"
    status: "in-progress"
```

---

## E-Suffix System

### E-Suffix (External Origin)

A naming convention suffix (`E`) that indicates an item was imported from an external source rather than created internally. The E-suffix is immutable once assigned.

**Pattern**: `{type}-{number}E`

**Examples**:
| Internal | External (Imported) |
|----------|-------------------|
| FS-042 | FS-042E |
| US-001 | US-001E |
| T-001 | T-001E |

### Origin Badge

A visual indicator (🔗) displayed in documentation UIs to distinguish externally-originated items. Helps users understand item provenance at a glance.

**Display**: "🔗 External (GitHub #123)"

### Provenance Tracking

The system for recording and maintaining the origin history of documentation items. Includes:

- **Source System**: Where the item originated (GitHub, JIRA, ADO, or internal)
- **External ID**: Original identifier in the source system
- **External URL**: Link back to the source item
- **Import Timestamp**: When the item was imported
- **Last Sync**: Most recent synchronization

---

## Document Types

### Epic (EP)

The highest-level work container representing a major business initiative or strategic goal. Epics contain multiple features and typically span multiple quarters.

**Schema ID**: `EP-{NNN}` (internal) or `EP-{NNN}E` (external)

**Example**: "EP-001: Platform Modernization"

### Feature (FS)

A functional capability delivered to users. Features belong to an epic and contain multiple user stories. Represents a shippable unit of value.

**Schema ID**: `FS-{NNN}` (internal) or `FS-{NNN}E` (external)

**Example**: "FS-042: User Authentication"

### User Story (US)

A requirement written from the user's perspective. Follows the format: "As a [role], I want [goal] so that [benefit]". Contains acceptance criteria.

**Schema ID**: `US-{NNN}` (internal) or `US-{NNN}E` (external)

**Example**: "US-001: As a new user, I want to register an account so that I can access the platform."

### Acceptance Criterion (AC)

A specific, testable condition that must be satisfied for a user story to be considered complete. Written in Given-When-Then format.

**Schema ID**: `AC-{parent}-{NN}` (internal) or `AC-{parent}E-{NN}E` (external)

**Example**: "AC-US1-01: Given valid email, when I submit registration, then my account is created."

### Task (T)

An implementation unit that satisfies one or more acceptance criteria. Tasks are assigned to developers and tracked to completion.

**Schema ID**: `T-{NNN}` (internal) or `T-{NNN}E` (external)

**Example**: "T-001: Implement user registration endpoint"

### Architecture Decision Record (ADR)

A document capturing an important architectural decision, its context, and consequences. ADRs are always internal (never imported).

**Schema ID**: `ADR-{NNNN}`

**Example**: "ADR-0042: Use PostgreSQL for user data"

---

## Sync Concepts

### Sync Direction

The flow of data between LivingSpec and external providers:

| Direction | Description |
|-----------|-------------|
| **Export-Only** | LivingSpec → External (push only) |
| **Import-Only** | External → LivingSpec (pull only) |
| **Bidirectional** | Two-way sync (recommended) |
| **Manual** | No automatic sync |

### Conflict Resolution

Strategy for handling conflicting changes when the same item is modified in both LivingSpec and the external system:

| Strategy | Behavior |
|----------|----------|
| **External-Wins** | External system is source of truth (default for E-suffix items) |
| **Local-Wins** | LivingSpec version takes precedence |
| **Newest-Wins** | Most recent change wins (based on timestamp) |
| **Manual** | Prompt user to resolve conflicts |

### Sync State

The current synchronization status of an item:

| State | Description |
|-------|-------------|
| `synced` | Local and external are in agreement |
| `local-ahead` | Local changes not yet pushed |
| `external-ahead` | External changes not yet pulled |
| `conflict` | Both sides have conflicting changes |
| `orphaned` | External item deleted but local exists |

---

## Implementation Levels

### Level 1: Basic

Minimal adoption with directory structure and YAML frontmatter. No automated sync.

**Requirements**:
- `.livingspec/` directory structure
- YAML frontmatter in all documents
- Manual ID assignment

### Level 2: Structured

Full schema compliance with ID conventions and E-suffix support.

**Requirements**:
- JSON schema validation
- E-suffix for all imports
- Hierarchical ID relationships

### Level 3: Integrated

External sync and AI context optimization enabled.

**Requirements**:
- Sync provider configuration
- Context manifest generation
- Origin tracking

### Level 4: Automated

CI/CD integration with real-time sync and conflict resolution.

**Requirements**:
- Automated validation pipeline
- Real-time bidirectional sync
- Conflict resolution policies
- Sync monitoring dashboards

---

## AI Context Concepts

### Context Window

The limited amount of text an AI model can process at once. LivingSpec optimizes documentation structure to maximize relevant context within this constraint.

### Importance Scoring

A rating system (high/medium/low) that helps AI systems prioritize which documents to include in their context window:

| Score | Meaning |
|-------|---------|
| `high` | Critical for understanding system |
| `medium` | Useful but not essential |
| `low` | Reference material |

### Related Items

Cross-references between documents that help AI systems understand relationships:

```yaml
ai_context:
  related: ["FS-041", "ADR-0023", "US-001E"]
```

---

## See Also

- [LivingSpec Specification](./SPECIFICATION.md)
- [JSON Schemas](./schemas/)
- [Quick-Start Guide](./guides/quick-start.md)
