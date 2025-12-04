# SpecWeave Market Positioning

**Last Updated**: 2025-12-01

---

## Overview

**SpecKit is a particular case of SpecWeave** — mathematically equivalent to ONE SpecWeave increment with no lifecycle management afterward.

```
SpecKit output    ≡  ONE SpecWeave increment (spec.md + plan.md + tasks.md)
SpecWeave         =  N increments + lifecycle + external sync + living docs + hooks
```

In set theory: **SpecKit ⊂ SpecWeave**. SpecWeave is the superset that adds the enterprise layer managing what happens AFTER specification creation.

## The Spec-Driven Development Landscape

### 2025: The Year of Spec-Driven Development

- **GitHub SpecKit** (Sept 2025, 28k+ stars): Formalized the 4-phase workflow
- **BMAD**: Role-switching PM→Architect→Dev approach
- **Kiro, Tessl**: Various approaches to structured AI prompting
- **SpecWeave**: Enterprise PLM for spec-driven development

## SpecWeave's Unique Position

### Foundation Layer (Shared with SpecKit)

```
Specify → Plan → Tasks → Implement
```

Both SpecWeave and SpecKit use this 4-phase workflow. SpecWeave intentionally maintains compatibility.

### Enterprise Layer (SpecWeave Only)

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                  SPECWEAVE ENTERPRISE LAYER              │
                    │                                                         │
                    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
                    │  │   Hooks      │  │  Quality     │  │  External    │  │
                    │  │   System     │  │  Gates       │  │  Tool Sync   │  │
                    │  └──────────────┘  └──────────────┘  └──────────────┘  │
                    │                                                         │
                    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
                    │  │   Living     │  │  Multi-      │  │  Brownfield  │  │
                    │  │   Docs       │  │  Project     │  │  Support     │  │
                    │  └──────────────┘  └──────────────┘  └──────────────┘  │
                    │                                                         │
                    └─────────────────────────────────────────────────────────┘
                                               │
                                               ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │                  FOUNDATION LAYER                        │
                    │           (Compatible with SpecKit workflow)             │
                    │                                                         │
                    │      spec.md  ←→  plan.md  ←→  tasks.md                 │
                    │                                                         │
                    │      Specify  →  Plan  →  Tasks  →  Implement           │
                    │                                                         │
                    └─────────────────────────────────────────────────────────┘
```

## Key Differentiators

### 1. Living vs Snapshot Documentation

| SpecKit | SpecWeave |
|---------|-----------|
| Specs are snapshots | Specs evolve with implementation |
| Manual updates | Auto-sync via hooks |
| May become stale | Always current |
| Feature-level focus | Product lifecycle focus |

### 2. Scale and Complexity

| Dimension | SpecKit | SpecWeave |
|-----------|---------|-----------|
| Projects | 1 | Unlimited |
| Repos | 1 | Multi-repo, umbrella |
| Teams | Solo/small | 50+ teams |
| External tools | None | GitHub, JIRA, ADO |
| Codebase type | Greenfield | Any |

### 3. Quality Enforcement

| SpecKit | SpecWeave |
|---------|-----------|
| Honor-based completion | 3-gate validation |
| No test requirements | 60%+ coverage enforced |
| No doc requirements | Living docs mandatory |
| No external sync | Bidirectional sync |

## Target Audience Mapping

### SpecKit Target

- Weekend hackers
- Solo MVPs
- Greenfield learning projects
- Single-feature experiments
- Developers new to spec-driven development

### SpecWeave Target

- **Primary**: Enterprise teams with existing tools (JIRA, ADO, GitHub Projects)
- **Secondary**: Startups scaling from MVP to product
- **Tertiary**: Brownfield modernization projects
- **Aspirational**: Fortune 500 digital transformation

## Messaging Framework

### Elevator Pitch

> "SpecKit creates ONE spec. SpecWeave manages 60+ specs with JIRA sync, living docs, and quality gates. SpecKit ⊂ SpecWeave."

### Technical Positioning

> "SpecKit ≡ ONE SpecWeave increment. SpecWeave = N increments + lifecycle + sync + living docs."

### Value Proposition by Audience

| Audience | Pain Point | SpecWeave Value |
|----------|------------|-----------------|
| Enterprise PM | "My JIRA is never up to date" | Bidirectional auto-sync |
| Tech Lead | "Specs rot after sprint 1" | Living documentation |
| Architect | "Multi-repo is chaos" | Unified increment view |
| Developer | "What's the spec?" | Single source of truth |
| Executive | "Why does delivery take so long?" | 70% token reduction, quality gates |

## Competitive Response Matrix

### When Prospect Mentions SpecKit

✅ **Affirm**: "SpecKit is excellent — it's literally equivalent to ONE SpecWeave increment"
✅ **Bridge**: "SpecWeave manages N increments with lifecycle + sync + living docs on top"
✅ **Differentiate**: "SpecKit stops after spec creation. SpecWeave manages what happens next."

### When Prospect Mentions BMAD

✅ **Affirm**: "BMAD pioneered multi-role prompting"
✅ **Bridge**: "SpecWeave automates the role orchestration"
✅ **Differentiate**: "No manual role-switching, hooks handle it"

## Future Positioning Considerations

### Short-term (Q1 2026)

- Maintain SpecKit compatibility
- Emphasize enterprise differentiation
- Build case studies from enterprise deployments

### Medium-term (2026)

- Position as "spec-driven platform" vs "tool"
- Expand plugin ecosystem
- Add Linear, Notion, Asana integrations

### Long-term (2027+)

- Industry standard for spec-driven enterprise development
- AI agent orchestration platform
- Compliance and audit automation

## Related Documentation

- [ADR-0005: Documentation Philosophy](../adr/0005-documentation-philosophy.md)
- Living Documentation Concept (guide planned)
- External Tool Sync Guide (planned)
