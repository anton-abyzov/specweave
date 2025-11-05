# Specifications (Living Docs)

**Purpose**: PERMANENT, feature-level specifications that serve as the enterprise source of truth for all completed work.

**Critical Understanding**: Specs are **NOT the same as increments**. Specs are **feature areas** (like epics), while increments are **implementation units**.

---

## ⚠️ CRITICAL: What Belongs in This Directory

**ONLY Specification Files Allowed**:
```
.specweave/docs/internal/specs/
├── README.md                                    ✅ This file
├── spec-001-core-framework-architecture.md      ✅ Feature specs
├── spec-002-intelligent-capabilities.md         ✅ Feature specs
├── spec-NNN-feature-name.md                     ✅ Feature specs
└── _archive_increment_copies/                   ✅ Archive folder
```

**NEVER Create These Here**:
```
❌ tests/                    → Use /tests/ in project root
❌ tests/e2e/                → Use /tests/e2e/ in project root
❌ tests/integration/        → Use /tests/integration/ in project root
❌ .github/                  → Use /.github/ in project root
❌ .github/workflows/        → Use /.github/workflows/ in project root
❌ src/                      → Use /src/ in project root
❌ scripts/                  → Use increment folders or /scripts/ in root
❌ Any code files            → Use /src/ or increment folders
```

**If you need tests/workflows/code**:
- Tests: `/tests/{e2e|integration|unit}/`
- GitHub Workflows: `/.github/workflows/`
- Scripts: `.specweave/increments/####/scripts/`
- Source code: `/src/`

**Other documents belong elsewhere**:
```
❌ retrospectives.md         → Use .specweave/increments/####/reports/ or .specweave/docs/internal/delivery/
❌ scrum-notes.md            → Use .specweave/increments/####/reports/
❌ meeting-minutes.md        → Use .specweave/increments/####/reports/
❌ team-decisions.md         → Use .specweave/docs/internal/governance/
❌ runbooks.md               → Use .specweave/docs/internal/operations/
❌ architecture-diagrams/    → Use .specweave/docs/internal/architecture/diagrams/
```

**This directory is ONLY for**:
✅ Feature specifications (spec-NNN-{name}.md)
✅ README.md (this file)
✅ _archive_increment_copies/ (historical archive)

**Everything else goes to the appropriate internal docs folder**:
- Strategy docs → `.specweave/docs/internal/strategy/`
- Architecture → `.specweave/docs/internal/architecture/`
- Delivery → `.specweave/docs/internal/delivery/`
- Operations → `.specweave/docs/internal/operations/`
- Governance → `.specweave/docs/internal/governance/`
- Increment reports → `.specweave/increments/####/reports/`

---

## The Architecture: Feature-Level Specs

### What is a Spec?

A **spec** is a **comprehensive, permanent document** describing an entire feature area:
- **Scope**: Complete feature (e.g., "Core Framework & Architecture")
- **Lifecycle**: Created once, updated over time, NEVER deleted
- **Contains**: ALL user stories for that feature area (20-50 stories)
- **Links to**: Multiple increments that implement the feature
- **Permanent**: Stays forever as knowledge base

### What is an Increment?

An **increment** is a **focused, temporary implementation snapshot**:
- **Scope**: Subset of work (e.g., "3 user stories from authentication spec")
- **Lifecycle**: Created per iteration, can be deleted after completion
- **Contains**: Focused subset of user stories (3-5 stories)
- **Links to**: ONE spec that it implements
- **Temporary**: Can be deleted after completion (spec remains)

### The Relationship

**One spec → Many increments**

```
SPEC-001: Core Framework & Architecture (Permanent)
├── 0001-core-framework (Temporary - MVP implementation)
├── 0002-core-enhancements (Temporary - Context optimization)
├── 0004-plugin-architecture (Temporary - Plugin system)
└── 0005-cross-platform-cli (Temporary - Cross-platform support)

SPEC-002: Intelligent AI Capabilities (Permanent)
├── 0003-intelligent-model-selection (Temporary - Haiku/Sonnet)
├── 0007-smart-increment-discipline (Temporary - WIP limits)
└── 0009-intelligent-reopen-logic (Temporary - Smart reopening)
```

---

## Current Specs (As of 2025-11-04)

| Spec | Feature Area | Increments | Status | GitHub Project |
|------|-------------|-----------|--------|----------------|
| **[SPEC-001](spec-001-core-framework-architecture.md)** | Core Framework & Architecture | 0001, 0002, 0004, 0005 | 100% Complete | TBD |
| **[SPEC-002](spec-002-intelligent-capabilities.md)** | Intelligent AI Capabilities | 0003, 0007, 0009 | 66% Complete | TBD |
| **[SPEC-003](spec-003-developer-experience.md)** | Developer Experience & Education | 0006, 0008 | 100% Complete | TBD |
| **[SPEC-004](spec-004-metrics-observability.md)** | Metrics & Observability | 0010 | 100% Complete | TBD |
| **[SPEC-005](spec-005-stabilization-1.0.0.md)** | Stabilization & 1.0.0 Release | 0011-0014 | 0% (Planned) | [Create](https://github.com/anton-abyzov/specweave/projects/new) |

---

## When to Create a New Spec

**Create a new spec when**:
- ✅ Planning a major feature area (authentication, payments, messaging)
- ✅ Feature will span multiple increments (weeks/months of work)
- ✅ Need permanent historical record (how did we build this?)
- ✅ Want to link to external PM tool (GitHub Project, Jira Epic)
- ✅ Brownfield integration needed (link to existing project docs)

**Don't create a spec for**:
- ❌ Small features (1 increment, <1 week) - just use increment spec
- ❌ Bug fixes or hotfixes - use increment spec only
- ❌ Temporary experiments - use increment spec only

---

## Spec Structure (Standard Template)

```markdown
# SPEC-XXX: Feature Area Name

**Feature Area**: One-line description
**Status**: Planned | In Progress (X%) | Complete
**GitHub Project**: Link or TBD
**Priority**: P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low)

---

## Overview

High-level description of the feature area (2-3 paragraphs)

---

## Increments (Implementation History)

| Increment | Status | Completion | Notes |
|-----------|--------|------------|-------|
| 0001-xxx | ✅ Complete | 2025-10-15 | MVP implementation |
| 0002-xxx | ⏳ In Progress | 60% done | Enhanced features |
| 0003-xxx | 🔜 Planned | Not started | Future work |

**Overall Progress**: X/Y increments complete (Z%)

---

## User Stories & Acceptance Criteria

### Epic 1: First Major Component

**US-001**: As a [role], I want [feature] so that [benefit]
- [x] **AC-001-01**: Acceptance criterion 1
- [x] **AC-001-02**: Acceptance criterion 2
- [ ] **AC-001-03**: Acceptance criterion 3 (pending)

[Repeat for all user stories across all increments]

---

## Technical Architecture

[Mermaid diagrams, tech stack, system design]

---

## Architecture Decisions (ADRs)

| ADR | Decision | Rationale |
|-----|----------|-----------|
| ADR-001 | What we decided | Why we decided |

---

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Adoption rate | 50%+ | 12% | ⚠️ Below |

---

## Future Enhancements (After 1.0.0)

[Planned improvements, P2/P3 work]

---

## Related Documentation

- Links to ADRs, guides, etc.

---

**Last Updated**: YYYY-MM-DD
**Owner**: Team Name
```

---

## Naming Convention

**Format**: `spec-NNN-descriptive-kebab-case-name.md`

**Examples**:
- ✅ `spec-001-core-framework-architecture.md` (Feature area, not increment)
- ✅ `spec-002-intelligent-capabilities.md` (Feature area, not increment)
- ✅ `spec-005-stabilization-1.0.0.md` (Release milestone)

**Numbering**: Sequential 3-digit (001, 002, 003, ...) - NO leading zero padding to 4 digits

**Key Difference from Increments**:
- Specs: `spec-001-feature-name.md` (3-digit, feature-level)
- Increments: `0001-implementation-name/` (4-digit, implementation-level)

---

## Living Documentation Principle

**Specs are the permanent source of truth**:
- ✅ **Never deleted** (even after all increments complete)
- ✅ **Updated over time** (as implementation progresses)
- ✅ **Complete history** (all user stories, not just current work)
- ✅ **Enterprise-level** (onboarding, compliance, auditing)
- ✅ **Linked to external tools** (GitHub Projects, Jira Epics)

**Increments are temporary snapshots**:
- ⏳ **Can be deleted** (after completion, optional)
- ⏳ **Focused subset** (just the work for this iteration)
- ⏳ **Implementation tracker** (what am I building RIGHT NOW?)
- ⏳ **No external links** (GitHub Project links go in specs)

---

## Comparison: Spec vs Increment

| Aspect | Spec (Living Docs) | Increment (Implementation) |
|--------|-------------------|----------------------------|
| **Location** | `.specweave/docs/internal/specs/` | `.specweave/increments/####/` |
| **Lifecycle** | ✅ Permanent (never deleted) | ⏳ Temporary (optional deletion) |
| **Scope** | 📚 Complete feature (20-50 US) | 🎯 Focused subset (3-5 US) |
| **Size** | 500-2000 lines (comprehensive) | 50-200 lines (focused) |
| **Purpose** | Knowledge base + history | Implementation tracker |
| **Coverage** | ALL user stories for feature | SUBSET of user stories |
| **Brownfield** | ✅ Links to existing docs | ❌ Rarely needed |
| **External Links** | ✅ GitHub Project, Jira Epic | ❌ Rarely needed |
| **Multiple Increments** | ✅ One spec → many increments | ❌ One increment → one spec |
| **After Completion** | ✅ Remains forever | ⚠️ Can be deleted |

---

## Archive

**Old Increment Copies** (incorrect 1:1 mapping):
- Moved to `_archive_increment_copies/` on 2025-11-04
- These were incorrectly created as 1:1 mappings (increment → spec)
- Replaced with proper feature-level specs (spec-001 through spec-005)

---

## Related Documentation

- [Architecture Decision Records (ADRs)](../architecture/adr/README.md) - What we decided and why
- [System Architecture Diagrams](../architecture/diagrams/README.md) - Visual architecture
- [Architecture Overview](../architecture/README.md) - System design and architecture
- [Increments](../../increments/README.md) - Implementation units

---

**Location**: `.specweave/docs/internal/specs/`
**Last Updated**: 2025-11-04
**Maintainer**: SpecWeave Core Team
