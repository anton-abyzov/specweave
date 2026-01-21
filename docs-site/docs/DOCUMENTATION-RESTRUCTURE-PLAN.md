# Documentation Restructure Plan

**Date**: 2026-01-13
**Status**: Proposed
**Author**: Claude (analysis session)

---

## Executive Summary

The current documentation has **13 top-level directories** with significant overlap and confusion, particularly around learning content. This plan consolidates to **8 clear sections** following the Diátaxis documentation framework.

---

## Current State Analysis

### Directory Audit

| Directory | Files | Purpose | Status |
|-----------|-------|---------|--------|
| `overview/` | 7 | Conceptual intro | ✅ Keep |
| `guides/` | 35+ | How-to guides | ⚠️ Restructure (remove lessons/) |
| `guides/lessons/` | 16 | SpecWeave Academy | 🔄 Move to academy/ |
| `workflows/` | 10 | Process flows | ✅ Keep |
| `commands/` | 10+ | CLI reference | ✅ Keep |
| `learn/` | 8 | Domain fundamentals | 🔄 Merge into academy/ |
| `academy/` | 60+ | Full curriculum | ✅ Keep (expand) |
| `glossary/` | 30+ | Terminology | ✅ Keep |
| `integrations/` | 2 | External tools | 🔄 Merge into guides/ |
| `enterprise/` | 5 | Large-org features | ✅ Keep |
| `api/` | ? | API reference | ✅ Keep |
| `reference/` | 1 | Standards | 🔄 Merge into api/ or commands/ |
| `examples/` | 2+ | Sample usage | ✅ Keep |
| `tutorial-basics/` | 5 | Docusaurus default | ❌ Remove |
| `tutorial-extras/` | 2 | Docusaurus default | ❌ Remove |

---

## Proposed Structure (Diátaxis-Aligned)

```
docs/
├── overview/                    # EXPLANATION - Conceptual understanding
│   ├── introduction.md          # What is SpecWeave?
│   ├── features.md              # Key features
│   ├── philosophy.md            # Why spec-driven?
│   ├── plugins-ecosystem.md     # Plugin architecture
│   └── dogfooding.md            # SpecWeave builds SpecWeave
│
├── getting-started/             # TUTORIAL - First steps (NEW consolidated)
│   ├── quickstart.md            # 5-minute setup
│   ├── installation.md          # Detailed install
│   ├── first-increment.md       # Hello World
│   └── next-steps.md            # Where to go next
│
├── guides/                      # HOW-TO - Task-oriented procedures
│   ├── core-concepts/           # Fundamental concepts
│   ├── integrations/            # External tool setup (from integrations/)
│   │   ├── github.md
│   │   ├── jira.md
│   │   └── azure-devops.md
│   ├── configuration/           # Config guides
│   ├── troubleshooting/         # Problem solving
│   └── mobile/                  # Platform-specific
│
├── workflows/                   # HOW-TO (Process) - End-to-end journeys
│   ├── overview.md              # The complete journey
│   ├── planning.md
│   ├── implementation.md
│   ├── validation.md
│   ├── deployment.md
│   ├── greenfield.md
│   ├── brownfield.md
│   └── hotfix.md
│
├── academy/                     # TUTORIAL (Extended) - Structured learning
│   ├── index.md                 # Academy overview
│   ├── specweave-essentials/    # NEW: Consolidated from guides/lessons/
│   │   ├── 01-getting-started.md
│   │   ├── 02-three-file-structure.md
│   │   ├── 03-your-first-increment.md
│   │   ├── 04-the-next-command.md
│   │   ├── 05-quality-gates.md
│   │   ├── 06-tdd-workflow.md
│   │   ├── 07-external-tools.md
│   │   ├── 08-ai-model-selection.md
│   │   ├── 09-troubleshooting.md
│   │   ├── 10-advanced-patterns.md
│   │   ├── 11-vibe-coding-problem.md
│   │   ├── 12-init-deep-dive.md
│   │   ├── 13-increment-lifecycle.md
│   │   ├── 14-github-integration.md
│   │   ├── 15-jira-integration.md
│   │   └── 16-ado-integration.md
│   ├── fundamentals/            # NEW: Consolidated from learn/
│   │   ├── enterprise-app-development.md
│   │   ├── software-engineering-roles.md
│   │   ├── backend-fundamentals.md
│   │   ├── frontend-fundamentals.md
│   │   ├── testing-fundamentals.md
│   │   ├── iac-fundamentals.md
│   │   ├── ml-fundamentals.md
│   │   └── security-fundamentals.md
│   ├── part-1-foundations/
│   ├── part-2-first-application/
│   ├── part-3-testing/
│   ├── ... (parts 4-14)
│   ├── bridges/
│   └── projects/
│
├── commands/                    # REFERENCE - CLI documentation
│   ├── overview.md
│   ├── increment.md
│   ├── do.md
│   ├── auto.md
│   ├── done.md
│   ├── validate.md
│   └── ... (other commands)
│
├── enterprise/                  # HOW-TO (Advanced) - Large org features
│   ├── github-migration.md
│   ├── jira-migration.md
│   ├── azure-devops-migration.md
│   ├── multi-environment-deployment.md
│   └── release-management.md
│
├── glossary/                    # REFERENCE - Terminology
│   ├── index-by-category.md
│   ├── categories/
│   └── terms/
│
├── examples/                    # TUTORIAL - Real-world samples
│   └── index.md
│
├── api/                         # REFERENCE - API documentation
│   └── (auto-generated)
│
├── intro.md                     # Landing page
├── quick-start.md               # Redirect to getting-started/
├── faq.md                       # Frequently asked questions
└── metrics.md                   # DORA metrics
```

---

## Migration Plan

### Phase 1: Remove Docusaurus Scaffolding (5 min)

**Delete these directories entirely:**

```bash
rm -rf docs-site/docs/tutorial-basics/
rm -rf docs-site/docs/tutorial-extras/
```

**Rationale**: Generic Docusaurus content ("Create a Document", "Deploy Your Site") not relevant to SpecWeave.

---

### Phase 2: Consolidate Learning Content (30 min)

#### 2a. Move `guides/lessons/` → `academy/specweave-essentials/`

```bash
# Create new directory
mkdir -p docs-site/docs/academy/specweave-essentials/

# Move files (rename for consistency)
mv docs-site/docs/guides/lessons/getting-started.md \
   docs-site/docs/academy/specweave-essentials/01-getting-started.md

mv docs-site/docs/guides/lessons/three-file-structure.md \
   docs-site/docs/academy/specweave-essentials/02-three-file-structure.md

# ... (continue for all 16 lessons)
```

**Files to move:**
1. `getting-started.md` → `01-getting-started.md`
2. `three-file-structure.md` → `02-three-file-structure.md`
3. `your-first-increment.md` → `03-your-first-increment.md`
4. `the-next-command.md` → `04-the-next-command.md`
5. `quality-gates.md` → `05-quality-gates.md`
6. `tdd-workflow.md` → `06-tdd-workflow.md`
7. `external-tools.md` → `07-external-tools.md`
8. `ai-model-selection.md` → `08-ai-model-selection.md`
9. `troubleshooting.md` → `09-troubleshooting.md`
10. `advanced-patterns.md` → `10-advanced-patterns.md`
11. `vibe-coding-problem.md` → `11-vibe-coding-problem.md`
12. `init-deep-dive.md` → `12-init-deep-dive.md`
13. `increment-lifecycle.md` → `13-increment-lifecycle.md`
14. `github-integration.md` → `14-github-integration.md`
15. `jira-integration.md` → `15-jira-integration.md`
16. `ado-integration.md` → `16-ado-integration.md`

**Also move:**
- `guides/lessons/index.md` → `academy/specweave-essentials/index.md`
- `guides/lessons/02-three-file-structure.md` (if different from above)

#### 2b. Move `learn/` → `academy/fundamentals/`

```bash
# Create new directory
mkdir -p docs-site/docs/academy/fundamentals/

# Move all files
mv docs-site/docs/learn/foundations/* docs-site/docs/academy/fundamentals/
mv docs-site/docs/learn/backend/* docs-site/docs/academy/fundamentals/
mv docs-site/docs/learn/frontend/* docs-site/docs/academy/fundamentals/
mv docs-site/docs/learn/testing/* docs-site/docs/academy/fundamentals/
mv docs-site/docs/learn/infrastructure/* docs-site/docs/academy/fundamentals/
mv docs-site/docs/learn/ml-ai/* docs-site/docs/academy/fundamentals/
mv docs-site/docs/learn/security-fundamentals.md docs-site/docs/academy/fundamentals/

# Remove empty learn/ directory
rm -rf docs-site/docs/learn/
```

---

### Phase 3: Consolidate Small Sections (15 min)

#### 3a. Move `integrations/` → `guides/integrations/`

```bash
mv docs-site/docs/integrations/* docs-site/docs/guides/integrations/
rm -rf docs-site/docs/integrations/
```

#### 3b. Move `reference/` → `commands/` or delete if empty

```bash
# Check content first
cat docs-site/docs/reference/compliance-standards.md

# If relevant, move to enterprise/
mv docs-site/docs/reference/compliance-standards.md docs-site/docs/enterprise/

# Remove empty directory
rm -rf docs-site/docs/reference/
```

---

### Phase 4: Create Getting Started Section (20 min)

**Create new consolidated quickstart section:**

```bash
mkdir -p docs-site/docs/getting-started/
```

**Create `docs-site/docs/getting-started/index.md`:**

```markdown
---
sidebar_position: 1
title: "Getting Started"
---

# Getting Started with SpecWeave

Choose your path:

| Path | Time | For |
|------|------|-----|
| [Quickstart](./quickstart) | 5 min | Experienced devs |
| [First Increment](./first-increment) | 15 min | Hands-on tutorial |
| [Full Academy](../academy/) | Hours | Complete learning |
```

**Move/consolidate from:**
- `guides/getting-started/quickstart.md` → `getting-started/quickstart.md`
- `quick-start.md` → redirect or merge

---

### Phase 5: Update Sidebar Configuration (30 min)

**Update `sidebars.ts`:**

```typescript
const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'category',
      label: 'Overview',
      collapsed: false,
      items: [
        'overview/introduction',
        'overview/features',
        'overview/plugins-ecosystem',
        'overview/philosophy',
        'metrics',
      ],
    },
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/quickstart',
        'getting-started/first-increment',
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      collapsed: false,
      items: [
        'guides/core-concepts/what-is-an-increment',
        'guides/core-concepts/living-documentation',
      ],
    },
    {
      type: 'category',
      label: 'Workflows',
      collapsed: false,
      items: [
        'workflows/overview',
        'workflows/planning',
        'workflows/implementation',
        'workflows/brownfield',
      ],
    },
    'faq',
  ],

  // Academy sidebar - now includes essentials and fundamentals
  academySidebar: [
    {
      type: 'category',
      label: 'SpecWeave Essentials',
      collapsed: false,
      items: [
        { type: 'autogenerated', dirName: 'academy/specweave-essentials' },
      ],
    },
    {
      type: 'category',
      label: 'Fundamentals',
      collapsed: true,
      items: [
        { type: 'autogenerated', dirName: 'academy/fundamentals' },
      ],
    },
    {
      type: 'category',
      label: 'Full Curriculum',
      collapsed: true,
      items: [
        // ... existing parts
      ],
    },
  ],

  // Remove learnSidebar (merged into academySidebar)
  // Remove tutorial references
};
```

---

### Phase 6: Update Cross-References (45 min)

**Find and update all internal links:**

```bash
# Find references to moved files
grep -r "guides/lessons" docs-site/docs/ --include="*.md"
grep -r "/learn/" docs-site/docs/ --include="*.md"
grep -r "tutorial-basics" docs-site/docs/ --include="*.md"
grep -r "tutorial-extras" docs-site/docs/ --include="*.md"
```

**Update patterns:**
- `/docs/guides/lessons/` → `/docs/academy/specweave-essentials/`
- `/docs/learn/` → `/docs/academy/fundamentals/`
- Remove any `tutorial-basics` or `tutorial-extras` references

---

## Validation Checklist

After migration, verify:

- [ ] `npm run build` succeeds without broken links
- [ ] All sidebar items resolve correctly
- [ ] Navigation flows logically
- [ ] No 404s on key pages
- [ ] Search index updated

---

## Before/After Comparison

### Before (13 directories, confusing)

```
docs/
├── overview/          # Conceptual
├── guides/            # How-to + Lessons (mixed!)
│   └── lessons/       # Learning (why here?)
├── workflows/         # Process
├── commands/          # Reference
├── learn/             # Learning (duplicate!)
├── academy/           # Learning (another one!)
├── glossary/          # Reference
├── integrations/      # Small, orphaned
├── enterprise/        # Advanced
├── api/               # Reference
├── reference/         # Orphaned
├── examples/          # Tutorials
├── tutorial-basics/   # Docusaurus junk
└── tutorial-extras/   # Docusaurus junk
```

### After (8 directories, clear taxonomy)

```
docs/
├── overview/          # EXPLANATION: What & Why
├── getting-started/   # TUTORIAL: First steps
├── guides/            # HOW-TO: Task procedures
├── workflows/         # HOW-TO: Process flows
├── academy/           # TUTORIAL: Full curriculum
│   ├── specweave-essentials/  # SpecWeave lessons
│   ├── fundamentals/          # Domain knowledge
│   └── part-X-*/              # Full curriculum
├── commands/          # REFERENCE: CLI docs
├── enterprise/        # HOW-TO: Advanced
├── glossary/          # REFERENCE: Terms
├── examples/          # TUTORIAL: Samples
└── api/               # REFERENCE: API docs
```

---

## Diátaxis Mapping

| Diátaxis Type | SpecWeave Section | User Need |
|---------------|-------------------|-----------|
| **Tutorials** | `getting-started/`, `academy/`, `examples/` | Learning |
| **How-to Guides** | `guides/`, `workflows/`, `enterprise/` | Problem-solving |
| **Explanation** | `overview/` | Understanding |
| **Reference** | `commands/`, `glossary/`, `api/` | Information |

---

## Timeline Estimate

| Phase | Time | Effort |
|-------|------|--------|
| Phase 1: Remove scaffolding | 5 min | Trivial |
| Phase 2: Consolidate learning | 30 min | Mechanical |
| Phase 3: Consolidate small sections | 15 min | Mechanical |
| Phase 4: Create getting-started | 20 min | Content |
| Phase 5: Update sidebars | 30 min | Config |
| Phase 6: Update cross-refs | 45 min | Tedious |
| **Total** | **~2.5 hours** | |

---

## Decision Required

**Option A: Full Restructure**
- Implement all phases
- Clean, professional structure
- ~2.5 hours effort

**Option B: Minimal Cleanup**
- Phase 1 only (remove Docusaurus junk)
- Phase 2a only (move lessons to academy)
- ~45 min effort

**Option C: Document Only**
- Keep this plan for future
- No immediate changes

---

## Appendix: Files to Delete

```
docs-site/docs/tutorial-basics/
├── create-a-document.md
├── create-a-page.md
├── deploy-your-site.md
├── congratulations.md
└── create-a-blog-post.md

docs-site/docs/tutorial-extras/
├── translate-your-site.md
└── manage-docs-versions.md
```

These are Docusaurus default scaffold files with no SpecWeave-specific content.

---

## Appendix: Redirect Map

If implementing, create redirects for SEO:

| Old URL | New URL |
|---------|---------|
| `/docs/guides/lessons/*` | `/docs/academy/specweave-essentials/*` |
| `/docs/learn/*` | `/docs/academy/fundamentals/*` |
| `/docs/tutorial-basics/*` | `/docs/academy/` (or 404) |
| `/docs/integrations/*` | `/docs/guides/integrations/*` |
