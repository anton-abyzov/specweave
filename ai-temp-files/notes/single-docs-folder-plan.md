# Single Documentation Folder - Reorganization Plan

**Date**: 2025-01-25
**Goal**: Combine `docs/`, `architecture/`, and `adrs/` into ONE root folder

---

## Problem

Currently documentation is scattered:
- `docs/` - Guides, references
- `architecture/` - System design
- `docs/decisions/` - ADRs (already moved from `adrs/`)

**User insight**: All knowledge should be in ONE place - "gold resource, source of truth"

---

## Solution: Everything Under `docs/`

**Folder Name**: `docs/` (standard, clear, universally understood)

### New Structure

```
docs/                           # 🌟 SINGLE SOURCE OF TRUTH for all knowledge
├── README.md                   # Documentation index
├── principles.md               # Framework principles
│
├── getting-started/            # Onboarding
│   ├── installation.md
│   ├── quickstart.md
│   └── configuration.md
│
├── guides/                     # How-to guides
│   ├── writing-specs.md
│   ├── creating-skills.md
│   ├── feature-planning.md
│   └── brownfield-onboarding.md
│
├── reference/                  # API/CLI reference (auto-generated)
│   ├── cli-commands.md
│   ├── skills-api.md
│   └── configuration.md
│
├── architecture/               # 🏗️ System Design (MOVED from root)
│   ├── overview.md
│   ├── system-design.md
│   ├── skills-system.md
│   ├── context-loading.md
│   ├── deployment/
│   │   ├── infrastructure.md
│   │   └── scaling-strategy.md
│   ├── security/
│   │   ├── authentication.md
│   │   └── authorization.md
│   └── data/
│       ├── database-schema.md
│       └── data-flow.md
│
├── decisions/                  # 📋 ADRs (Architecture Decision Records)
│   ├── index.md
│   ├── 001-tech-stack.md
│   ├── 002-database-choice.md
│   └── 003-context-loading-approach.md
│
└── changelog/                  # Release notes
    ├── releases.md
    └── 2025-01.md
```

---

## What Changes

### Before
```
specweave/
├── docs/
│   ├── getting-started/
│   ├── guides/
│   ├── reference/
│   ├── principles.md
│   └── decisions/          # ADRs here
├── architecture/            # Separate root folder
│   ├── system-design.md
│   ├── deployment/
│   ├── security/
│   └── data/
└── adrs/                    # Moved to docs/decisions/
```

### After
```
specweave/
├── docs/                    # 🌟 EVERYTHING HERE
│   ├── getting-started/
│   ├── guides/
│   ├── reference/
│   ├── architecture/        # MOVED from root
│   ├── decisions/           # ADRs
│   ├── principles.md
│   └── changelog/
└── specs/                   # ONLY business requirements
    ├── overview.md
    └── modules/
```

---

## Why This is Better

### 1. Single Source of Truth
All knowledge in `docs/` - no confusion about where to look

### 2. Clear Separation
- **specs/** = Business requirements (WHAT and WHY)
- **docs/** = All other knowledge (HOW, WHY decisions, guides)

### 3. Standard Convention
Most open source projects: `docs/` contains all documentation

### 4. Easier Navigation
```bash
# Find anything documentation-related
cd docs/

# Not scattered across:
# docs/, architecture/, adrs/
```

### 5. Better for MkDocs
```yaml
# mkdocs.yml
docs_dir: docs  # Everything in one place!

nav:
  - Architecture: architecture/overview.md
  - Decisions: decisions/index.md
  - Guides: guides/writing-specs.md
```

---

## Migration Steps

### 1. Move `architecture/` → `docs/architecture/`

```bash
mv architecture docs/
```

### 2. Update References

**Files to update**:
- `CLAUDE.md` - Update directory structure
- `README.md` - Update links
- `features/001-context-loader/context-manifest.yaml` - Update paths
- `mkdocs.yml` - Update nav paths
- All feature `context-manifest.yaml` files

**Example**:
```yaml
# Before
architecture:
  - architecture/system-design.md

# After
architecture:
  - docs/architecture/system-design.md
```

### 3. Update .gitignore

```gitignore
# No changes needed - docs/ already tracked
```

---

## Clear Distinction: specs/ vs docs/

### specs/ - Business Requirements

**Purpose**: Define WHAT to build and WHY

**Contents**:
- User stories
- Business requirements
- Acceptance criteria
- Functional requirements
- Success metrics

**Example**: `specs/modules/payments/stripe/spec.md`
```markdown
# Stripe Payment Integration

## User Stories

### US1: Process Payment (P1)
As a customer
I want to pay with credit card
So that I can complete my purchase

**Acceptance Criteria**:
- [ ] Customer can enter card details
- [ ] Payment is processed via Stripe
- [ ] Success/failure feedback shown
```

**Technology-Agnostic**: No mention of HOW to implement

---

### docs/ - All Other Knowledge

**Purpose**: Document HOW to build, architecture decisions, guides

**Contents**:
- System architecture
- Technical design
- Architecture Decision Records
- How-to guides
- API reference
- Principles

**Example**: `docs/architecture/payments/stripe-integration.md`
```markdown
# Stripe Integration Architecture

## Technical Design

### Components
- StripeService: Wraps Stripe SDK
- PaymentController: REST endpoints
- WebhookHandler: Stripe webhooks

### Data Flow
Customer → PaymentController → StripeService → Stripe API

### Technology Stack
- Stripe SDK: stripe-node v11.x
- Backend: Express.js
- Database: PostgreSQL (store payment records)
```

**Technology-Specific**: Detailed HOW

---

## Context Manifests Update

### Before
```yaml
# features/001-context-loader/context-manifest.yaml
spec_sections:
  - specs/constitution.md#article-iv
architecture:
  - architecture/system-design.md#context-loading
adrs:
  - adrs/004-context-loading-approach.md
```

### After
```yaml
# features/001-context-loader/context-manifest.yaml
spec_sections:
  - specs/modules/core/context-loading.md
docs:
  - docs/architecture/context-loading.md
  - docs/decisions/004-context-loading-approach.md
  - docs/principles.md#context-precision
```

**Clearer**: `docs:` key includes architecture, decisions, and principles

---

## Updated Directory Structure

### Complete Structure

```
specweave/
├── src/                        # Source code
│   ├── skills/                 # Skills (source of truth)
│   ├── cli/
│   └── core/
│
├── specs/                      # 📋 Business Requirements (WHAT, WHY)
│   ├── overview.md
│   └── modules/
│       ├── payments/
│       ├── authentication/
│       └── ...
│
├── docs/                       # 📚 ALL KNOWLEDGE (HOW, guides, architecture)
│   ├── README.md
│   ├── principles.md
│   ├── getting-started/
│   ├── guides/
│   ├── reference/
│   ├── architecture/           # ← MOVED from root
│   ├── decisions/              # ← ADRs
│   └── changelog/
│
├── features/                   # Implementation plans
│   ├── roadmap.md
│   └── 001-context-loader/
│
├── work/                       # Active work items
│   └── issues/
│
├── tests/                      # Tests
├── ai-temp-files/              # Supporting files
├── .specweave/                 # Framework config
├── .github/                    # CI/CD
└── mkdocs.yml                  # Docs portal config
```

---

## Benefits Summary

1. ✅ **Single source of truth** - All knowledge in `docs/`
2. ✅ **Clear separation** - specs/ (business) vs docs/ (technical)
3. ✅ **Standard convention** - docs/ is universally understood
4. ✅ **Easier navigation** - One folder to search
5. ✅ **Better for tooling** - MkDocs, search, etc.
6. ✅ **Scalable** - Can grow to 1000+ docs without confusion

---

## Alternative Considered: `knowledge/`

**Pros**:
- More explicit ("knowledge base")
- Emphasizes it's source of truth

**Cons**:
- Non-standard (most projects use `docs/`)
- Longer to type
- Less familiar to new contributors

**Decision**: Stick with `docs/` for standardization

---

## Implementation Checklist

- [ ] Move `architecture/` to `docs/architecture/`
- [ ] Update `CLAUDE.md` with new structure
- [ ] Update `README.md` links
- [ ] Update all `context-manifest.yaml` files
- [ ] Update `mkdocs.yml` navigation
- [ ] Update `.specweave/config.yaml` paths
- [ ] Test all links work
- [ ] Commit changes

---

## Final Structure Validation

### Is it clear?
- ✅ `specs/` = Business requirements (WHAT)
- ✅ `docs/` = All knowledge (HOW, architecture, decisions, guides)

### Is it scalable?
- ✅ Can add unlimited modules to `specs/modules/`
- ✅ Can add unlimited architecture docs to `docs/architecture/`
- ✅ Can add unlimited guides to `docs/guides/`

### Is it standard?
- ✅ `docs/` is universal convention
- ✅ Similar to React, Vue, TypeScript, Kubernetes, etc.

---

**Decision**: Consolidate all knowledge into `docs/` folder. This is cleaner, clearer, and follows open source best practices.
