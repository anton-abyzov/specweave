---
increment: 0116-livingspec-universal-standard
status: planning
project: specweave
type: feature
priority: P1
---

# Increment 0116: LivingSpec Universal Standard

## Executive Summary

Define and publish **LivingSpec** - an open, vendor-neutral standard for synchronized living documentation. This standard extracts proven patterns from SpecWeave into a universal specification any tool can implement.

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
├── work/                         # Active work units
│   └── {work-id}/
│       ├── spec.md
│       ├── tasks.md
│       └── metadata.json
└── sync/                         # Sync state
```

### Identifier System

| Level | Pattern | Example |
|-------|---------|---------|
| Epic | EP-{NNN} | EP-001 |
| Feature | FS-{NNN}[E] | FS-042, FS-042E |
| User Story | US-{NNN} | US-001 |
| Acceptance Criterion | AC-{parent}-{NN} | AC-US1-01 |
| Task | T-{NNN} | T-001 |
| ADR | ADR-{NNNN} | ADR-0042 |

### Document Schemas

#### Feature (FEATURE.md)
```yaml
---
id: "FS-042"
title: "User Authentication"
status: "approved"
owner: "platform-team"
epic: "EP-001"
tags: ["security"]
---
```

#### User Story
```yaml
---
id: "US-001"
feature: "FS-042"
title: "User Registration"
status: "in-progress"
---

## Acceptance Criteria
- [ ] **AC-US1-01**: Given valid email, when submit, then account created
```

#### ADR
```yaml
---
id: "ADR-0042"
title: "Use PostgreSQL"
status: "accepted"
date: "2025-01-10"
deciders: ["@alice", "@bob"]
---
```

### Sync Protocol

```yaml
# sync/config.yaml
providers:
  github:
    enabled: true
    sync_direction: "bidirectional"
  jira:
    enabled: false
conflict_resolution:
  default: "external-wins"
```

### AI Context Protocol

```yaml
ai_context:
  summary: "One-line for context window"
  importance: "high"
  related: ["FS-041", "ADR-0023"]
```

### Implementation Levels

| Level | Name | Features |
|-------|------|----------|
| 1 | Basic | Directory structure, frontmatter |
| 2 | Structured | Full schemas, ID conventions |
| 3 | Integrated | External sync, AI context |
| 4 | Automated | CI/CD, real-time sync |

## Acceptance Criteria

- [ ] **AC-001**: Specification document complete
- [ ] **AC-002**: JSON schemas for all document types
- [ ] **AC-003**: Quick-start guide (< 30 min adoption)
- [ ] **AC-004**: CLI validator for compliance
- [ ] **AC-005**: Published to dedicated repository
- [ ] **AC-006**: Migration guide from Confluence/Notion

## References

- [Docs-as-Code](https://www.writethedocs.org/guide/docs-as-code/)
- [arc42](https://arc42.org/)
- [C4 Model](https://c4model.com/)
- [ADR](https://adr.github.io/)
- [Diataxis](https://diataxis.fr/)
