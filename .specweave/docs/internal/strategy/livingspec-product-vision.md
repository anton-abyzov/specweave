---
title: LivingSpec Product Vision
status: approved
created: 2025-12-06
---

# LivingSpec Product Vision

## Vision Statement

**"Make documentation that stays alive."**

LivingSpec is an open standard for synchronized living documentation that bridges the gap between planning tools, code repositories, and documentation sites.

## Problem We Solve

### The Documentation Death Spiral

```
Day 1: Perfect docs written
Day 7: Small change made, docs not updated
Day 30: Docs 50% accurate
Day 90: Docs actively misleading
Day 180: "Just read the code"
```

### Root Causes

1. **Manual Sync** - Humans forget to update docs
2. **Scattered Sources** - JIRA, GitHub, Confluence, code comments
3. **No Traceability** - Can't trace requirement → implementation → test
4. **Tool Lock-in** - Migration = losing all context

## Solution: Living Documentation

### Bidirectional Sync

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   GitHub    │◄───►│  LivingSpec │◄───►│  Docusaurus │
│   Issues    │     │   Standard  │     │    Site     │
└─────────────┘     └─────────────┘     └─────────────┘
       ▲                   ▲                   ▲
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    JIRA     │◄───►│  ID System  │◄───►│   AI/LLM    │
│   Epics     │     │  (E-suffix) │     │   Context   │
└─────────────┘     └─────────────┘     └─────────────┘
```

### E-Suffix: Clear Provenance

Every external item is clearly marked:
- `US-001` = Created internally
- `US-001E` = Imported from external tool

**Why it matters**:
- Know at a glance where something came from
- Sync conflicts resolved correctly (external wins for E-suffix)
- Deduplication without ID collisions

## Target Users

### Primary: Engineering Teams

| Role | Pain Point | LivingSpec Solution |
|------|------------|---------------------|
| **Developer** | "Where's the spec for this?" | Single source in repo |
| **PM** | "Is this implemented?" | Auto-updated status |
| **Architect** | "Why was this decided?" | ADRs linked to features |
| **New Hire** | "How does this work?" | Discoverable docs |

### Secondary: Documentation Teams

| Role | Pain Point | LivingSpec Solution |
|------|------------|---------------------|
| **Tech Writer** | "Docs are always stale" | Auto-sync from source |
| **DevRel** | "Can't keep up with changes" | Living docs site |

## Market Position

### Competitive Landscape

| Tool | Strength | Weakness |
|------|----------|----------|
| Confluence | Collaboration | No sync, lock-in |
| Notion | Beautiful UI | No version control |
| Docusaurus | Developer-friendly | Static, manual |
| ReadMe | API docs | Narrow scope |
| **LivingSpec** | **Sync + Standard** | **New, adoption** |

### Differentiation

1. **Open Standard** - Not a product, a specification
2. **Bidirectional Sync** - Not just export, real sync
3. **AI-Native** - Structured for LLM context loading
4. **Vendor Neutral** - Works with any tool

## Success Metrics

### Adoption

| Metric | 6 Month Target | 12 Month Target |
|--------|----------------|-----------------|
| GitHub Stars | 500 | 2,000 |
| NPM Downloads/week | 100 | 1,000 |
| Companies Using | 10 | 50 |
| Contributors | 10 | 30 |

### Quality

| Metric | Target |
|--------|--------|
| Spec Compliance Rate | > 95% |
| Sync Success Rate | > 99% |
| E-Suffix Consistency | 100% |

## Roadmap

### Phase 1: Foundation (Q1 2026) ✓
- [x] Core specification
- [x] E-suffix standard
- [x] Directory structure
- [x] JSON schemas

### Phase 2: Tooling (Q2 2026)
- [ ] CLI validator
- [ ] Docusaurus plugin
- [ ] VS Code extension
- [ ] GitHub Action

### Phase 3: Sync (Q3 2026)
- [ ] GitHub sync provider
- [ ] JIRA sync provider
- [ ] ADO sync provider
- [ ] Conflict resolution

### Phase 4: Ecosystem (Q4 2026)
- [ ] MkDocs plugin
- [ ] Confluence migrator
- [ ] Notion migrator
- [ ] AI context loader

## Investment Areas

### Must Have
- Specification document
- JSON schemas
- CLI validator
- Docusaurus integration

### Should Have
- GitHub sync
- VS Code extension
- Quick-start guide

### Nice to Have
- JIRA/ADO sync
- AI features
- Enterprise support

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Low adoption | Medium | High | Marketing, examples |
| Spec complexity | Medium | Medium | Simple start, progressive |
| Sync conflicts | High | Medium | Clear rules, E-suffix |
| Tool changes | Medium | Low | Abstraction layer |
