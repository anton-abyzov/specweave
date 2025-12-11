---
increment: 0116-livingspec-universal-standard
status: completed
project: specweave
type: feature
priority: P1
started: 2025-12-06
completed: 2025-12-06
---

# Increment 0116: LivingSpec Universal Standard

## Executive Summary

Define and publish **LivingSpec** - an open, vendor-neutral standard for synchronized living documentation. This standard extracts proven patterns from SpecWeave into a universal specification any tool can implement.

**Documentation Platform**: **Docusaurus** (primary) with MkDocs as fallback for simpler use cases.

## Problem Statement

### The Documentation Crisis

1. **Documentation Drift** - Docs become stale within days
2. **Fragmented Knowledge** - Info scattered across wikis, tickets, repos
3. **Context Loss** - Why decisions were made gets lost
4. **Onboarding Friction** - New engineers take months to be productive
5. **Tool Lock-in** - Docs trapped in proprietary systems
6. **AI Incompatibility** - Unstructured docs unusable by LLMs

### Existing Solutions Fall Short

| Solution | Limitation |
|----------|------------|
| Docs-as-Code (MkDocs, Docusaurus) | Static snapshots, no sync |
| Wikis (Confluence, Notion) | Proprietary, no version control |
| ADRs | Decisions only, not full docs |
| arc42/C4 | Architecture only, not requirements |
| OpenAPI | APIs only, not system docs |

## Solution: LivingSpec Standard

### Core Principles

1. **Specification-Driven** - Specs drive implementation
2. **Hierarchical Traceability** - Every item links to parent/children
3. **Sync-Native** - Built for bidirectional sync
4. **AI-Optimized** - Structured for LLM context loading
5. **Progressive Adoption** - Simple to start, powerful when scaled
6. **Vendor Neutral** - Implementable by any tool
7. **External Origin Tracking** - E-suffix for ALL imported items

### Directory Structure

```
.livingspec/
├── manifest.yaml                 # Project metadata
├── specs/                        # Feature specifications
│   └── {feature-id}/
│       ├── FEATURE.md
│       └── {story-id}.md
├── architecture/
│   ├── adr/                      # Decision records
│   ├── diagrams/                 # C4, sequence, ERD
│   └── modules/                  # Component docs
├── teams/                        # Ownership
├── operations/                   # Runbooks
├── governance/                   # Standards
├── delivery/                     # Release, deployment strategy
├── strategy/                     # Product vision, roadmap
├── work/                         # Active work units
│   └── {work-id}/
│       ├── spec.md
│       ├── tasks.md
│       └── metadata.json
└── sync/                         # Sync state
```

### Identifier System with External Origin (E-Suffix)

**ALL external items** (imported from GitHub/JIRA/ADO) MUST use E-suffix to distinguish from internally-created items. This provides:
- **Clear provenance** - instantly know if item originated externally
- **Deduplication** - prevent ID collisions between internal and external items
- **Sync safety** - external items have different lifecycle rules

| Level | Internal Pattern | External Pattern | Example |
|-------|-----------------|------------------|---------|
| Epic | EP-{NNN} | EP-{NNN}E | EP-001, EP-001E |
| Feature | FS-{NNN} | FS-{NNN}E | FS-042, FS-042E |
| User Story | US-{NNN} | US-{NNN}E | US-001, US-001E |
| Acceptance Criterion | AC-{parent}-{NN} | AC-{parent}-{NN}E | AC-US1-01, AC-US1E-01E |
| Task | T-{NNN} | T-{NNN}E | T-001, T-001E |
| ADR | ADR-{NNNN} | N/A (always internal) | ADR-0042 |
| Increment | {NNNN}-name | {NNNN}E-name | 0042-auth, 0042E-auth |

**E-Suffix Rules:**
1. **Propagation**: If parent has E-suffix, children MUST also have E-suffix
2. **Immutability**: Once assigned, E-suffix cannot be removed (origin is permanent)
3. **Validation**: Sync operations validate E-suffix consistency
4. **Display**: UI should show origin badge (🔗 External) for E-suffixed items

### Document Schemas

#### Epic (EPIC.md) - Internal vs External
```yaml
# Internal Epic (created locally)
---
id: "EP-001"
title: "Platform Authentication"
status: "in-progress"
owner: "platform-team"
---

# External Epic (imported from JIRA/ADO)
---
id: "EP-001E"
title: "Platform Authentication"
status: "in-progress"
origin: "external"
source: "jira"
external_id: "PROJ-100"
external_url: "https://jira.company.com/browse/PROJ-100"
---
```

#### Feature (FEATURE.md)
```yaml
# Internal Feature
---
id: "FS-042"
title: "User Authentication"
status: "approved"
owner: "platform-team"
epic: "EP-001"
tags: ["security"]
---

# External Feature (imported)
---
id: "FS-042E"
title: "User Authentication"
status: "approved"
origin: "external"
source: "ado"
external_id: "12345"
epic: "EP-001E"
---
```

#### User Story (Internal vs External)
```yaml
# Internal User Story
---
id: "US-001"
feature: "FS-042"
title: "User Registration"
status: "in-progress"
---

## Acceptance Criteria
- [ ] **AC-US1-01**: Given valid email, when submit, then account created
- [ ] **AC-US1-02**: Given existing email, when submit, then error shown

# External User Story (imported)
---
id: "US-001E"
feature: "FS-042E"
title: "User Registration"
status: "in-progress"
origin: "external"
source: "github"
external_id: "#123"
external_url: "https://github.com/org/repo/issues/123"
---

## Acceptance Criteria
- [ ] **AC-US1E-01E**: Given valid email, when submit, then account created
- [ ] **AC-US1E-02E**: Given existing email, when submit, then error shown
```

#### Task Schema (Internal vs External)
```yaml
# Internal Task (in tasks.md)
### T-001: Implement login endpoint
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [ ] pending

# External Task (imported with parent US)
### T-001E: Implement login endpoint
**User Story**: US-001E
**Satisfies ACs**: AC-US1E-01E
**Status**: [ ] pending
**Origin**: External (GitHub #124)
**External URL**: https://github.com/org/repo/issues/124
```

#### ADR (Always Internal)
```yaml
---
id: "ADR-0042"
title: "Use PostgreSQL"
status: "accepted"
date: "2025-01-10"
deciders: ["@alice", "@bob"]
---
```

> **Note**: ADRs are always internal - architectural decisions are made locally, never imported.

### Sync Protocol

```yaml
# sync/config.yaml
providers:
  github:
    enabled: true
    sync_direction: "bidirectional"
    e_suffix_for_imports: true  # Enforce E-suffix for all imports
  jira:
    enabled: true
    sync_direction: "bidirectional"
    e_suffix_for_imports: true
  ado:
    enabled: false
conflict_resolution:
  default: "external-wins"
  e_suffix_items: "always-external-wins"  # External items: external tool is source of truth
```

### AI Context Protocol

```yaml
ai_context:
  summary: "One-line for context window"
  importance: "high"
  related: ["FS-041", "ADR-0023"]
  is_external: false  # or true for E-suffix items
  origin: "internal"  # or "github", "jira", "ado"
```

### Documentation Platform: Docusaurus

**Primary**: [Docusaurus](https://docusaurus.io/) - React-based, MDX support, versioning, i18n
**Fallback**: [MkDocs](https://www.mkdocs.org/) - Python-based, simpler setup, Material theme

```yaml
# docusaurus.config.js integration
{
  plugins: ['@specweave/docusaurus-plugin'],
  themeConfig: {
    livingspec: {
      specsDir: '.livingspec/specs',
      autoSidebar: true,
      showOriginBadges: true  # Show 🔗 External badge for E-suffix items
    }
  }
}
```

### Implementation Levels

| Level | Name | Features |
|-------|------|----------|
| 1 | Basic | Directory structure, frontmatter |
| 2 | Structured | Full schemas, ID conventions, E-suffix |
| 3 | Integrated | External sync, AI context, origin tracking |
| 4 | Automated | CI/CD, real-time sync, conflict resolution |

## Acceptance Criteria

### Core Specification
- [x] **AC-001**: Specification document complete with E-suffix rules
- [x] **AC-002**: JSON schemas for all document types (Epic, Feature, US, Task, AC)
- [x] **AC-003**: Quick-start guide (< 30 min adoption)
- [x] **AC-004**: CLI validator for compliance including E-suffix validation

### Publication
- [x] **AC-005**: Published to dedicated repository (github.com/livingspec/specification)
- [x] **AC-006**: Migration guide from Confluence/Notion

### E-Suffix Standard
- [x] **AC-007**: E-suffix validation in all ID generators (EP, FS, US, AC, T)
- [x] **AC-008**: Deduplication logic handles E-suffix correctly
- [x] **AC-009**: Sync operations propagate E-suffix to children
- [x] **AC-010**: Origin badge display in Docusaurus plugin

### Documentation Platform
- [x] **AC-011**: Docusaurus integration guide
- [x] **AC-012**: MkDocs fallback guide
- [x] **AC-013**: Architecture diagrams in Mermaid format
- [x] **AC-014**: Delivery/deployment documentation

## References

- [Docusaurus](https://docusaurus.io/) - Primary documentation platform
- [MkDocs](https://www.mkdocs.org/) - Fallback documentation platform
- [Docs-as-Code](https://www.writethedocs.org/guide/docs-as-code/)
- [arc42](https://arc42.org/)
- [C4 Model](https://c4model.com/)
- [ADR](https://adr.github.io/)
- [Diataxis](https://diataxis.fr/)
