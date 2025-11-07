---
sidebar_position: 10
---

# Brownfield

**Category**: DevOps & Tools

## Definition

**Brownfield** refers to existing codebases, projects, or systems that are already in production or active development. The term contrasts with **greenfield** (new projects starting from scratch).

**In SpecWeave Context**: Brownfield projects are existing codebases that you want to bring into the SpecWeave framework without starting over.

## What Problem Does It Solve?

**The Migration Challenge**:
- ❌ Can't use SpecWeave without rewriting entire project
- ❌ Existing documentation scattered (Google Docs, Confluence, Wiki)
- ❌ No clear migration path
- ❌ Fear of disrupting active development

**Brownfield Solution**:
- ✅ Incremental adoption (start using SpecWeave without rewrite)
- ✅ Import existing docs (Notion, Confluence, GitHub Wiki)
- ✅ Preserve git history (no destructive changes)
- ✅ Work alongside existing processes (gradual transition)

## Brownfield vs Greenfield

| Aspect | Brownfield | Greenfield |
|--------|-----------|-----------|
| **Starting Point** | Existing codebase | Brand new project |
| **Documentation** | Import existing docs | Create from scratch |
| **Migration** | Gradual adoption | Immediate full adoption |
| **Risk** | Low (incremental) | None (starting fresh) |
| **Complexity** | Higher (legacy code) | Lower (clean slate) |

## SpecWeave Brownfield Support

**Three-Phase Approach**:

### Phase 1: Analysis
```bash
/specweave:analyze-brownfield

# Scans codebase and identifies:
# - Existing documentation (README, CONTRIBUTING, docs/)
# - Project structure (frontend, backend, infra)
# - External tools (Jira, GitHub Projects, Confluence)
# - Suggested SpecWeave structure
```

### Phase 2: Import
```bash
/specweave:import-docs --source confluence --type specs

# Imports docs into:
# .specweave/docs/internal/projects/default/legacy/
# ├── migration-report.md    # Classification results
# ├── strategy/               # Imported PRDs, vision docs
# ├── specs/                  # Imported specs
# └── architecture/           # Imported HLDs, ADRs
```

### Phase 3: Migration
```bash
# Gradually migrate legacy/ → proper structure
# - Classify docs (strategy, specs, architecture)
# - Update references (link to external tools)
# - Clean up after migration complete
```

## Real-World Example

**Scenario**: Existing e-commerce platform with scattered docs.

**Before SpecWeave**:
```
my-ecommerce-platform/
├── src/               # Code
├── README.md          # Outdated
├── docs/              # Some old docs
└── Google Drive/      # Most docs here (external)
   ├── PRDs/
   ├── Architecture/
   └── Meeting Notes/
```

**After SpecWeave**:
```
my-ecommerce-platform/
├── .specweave/
│   ├── increments/
│   │   └── 0001-migrate-to-specweave/
│   │       ├── spec.md
│   │       ├── plan.md
│   │       └── tasks.md
│   └── docs/internal/
│       ├── strategy/
│       │   └── prd-001-marketplace.md    # ← Imported from Google Drive
│       ├── specs/
│       │   └── spec-001-checkout.md      # ← Imported from Confluence
│       ├── architecture/
│       │   └── hld-system.md             # ← Imported from Wiki
│       └── projects/default/legacy/      # ← Temporary (during migration)
│           └── migration-report.md
├── src/               # Code (unchanged)
└── README.md          # Updated with SpecWeave links
```

## Import Sources

**SpecWeave can import from**:
- ✅ **Notion** exports (.zip with markdown)
- ✅ **Confluence** exports (HTML → markdown)
- ✅ **GitHub Wiki** (clone → import)
- ✅ **Google Docs** (export as .docx → convert)
- ✅ **Local markdown** folders (copy → classify)

**Command**:
```bash
/specweave:import-docs \
  --source notion \
  --path ~/Downloads/notion-export.zip \
  --classify auto

# Automatically classifies files as:
# - Strategy (PRDs, vision, business docs)
# - Specs (feature specs, user stories)
# - Architecture (HLDs, ADRs, diagrams)
# - Team docs (onboarding, conventions)
# - Legacy (unclassified, needs review)
```

## Best Practices

### 1. **Start Small**
```markdown
✅ CORRECT: Start with one feature/module
- Create first increment for small improvement
- Import only relevant docs
- Gradually expand coverage

❌ WRONG: Try to migrate entire codebase at once
```

### 2. **Keep Existing Workflows**
```markdown
✅ CORRECT: Run SpecWeave alongside Jira/GitHub
- SpecWeave increments sync to Jira epics
- GitHub PRs link to increment tasks
- Gradual team adoption

❌ WRONG: Force entire team to switch immediately
```

### 3. **Preserve Git History**
```markdown
✅ CORRECT: SpecWeave adds files, doesn't modify existing
- .specweave/ is new directory (no conflicts)
- Existing code untouched
- Git history preserved

❌ WRONG: Rewrite git history or restructure code
```

### 4. **Import Before Creating Increments**
```markdown
✅ CORRECT Workflow:
1. Import existing docs
2. Review and classify
3. Create first increment (references imported docs)
4. Link increment to existing Jira/GitHub items

❌ WRONG: Create increments before importing (duplication)
```

## Migration Checklist

**Before Starting**:
- [ ] Analyze codebase (`/specweave:analyze-brownfield`)
- [ ] Identify external doc sources (Notion, Confluence, etc.)
- [ ] Get stakeholder buy-in (explain gradual approach)
- [ ] Choose pilot feature/module (start small)

**During Migration**:
- [ ] Import existing docs (`/specweave:import-docs`)
- [ ] Review migration report (classification results)
- [ ] Create first increment (small, low-risk)
- [ ] Link to external tools (Jira, GitHub Projects)
- [ ] Test living docs sync (verify automation works)

**After First Increment**:
- [ ] Team retrospective (what worked? what didn't?)
- [ ] Adjust process (based on feedback)
- [ ] Plan next increments (gradually expand)
- [ ] Clean up legacy/ folder (after docs migrated)

## Common Challenges

### Challenge 1: Scattered Documentation
**Problem**: Docs in 5+ places (Notion, Confluence, Google Drive, Slack, Email)

**Solution**:
```bash
# Import from each source sequentially
/specweave:import-docs --source notion --path notion-export.zip
/specweave:import-docs --source confluence --url https://company.atlassian.net
/specweave:import-docs --source github-wiki --repo company/project-wiki
```

### Challenge 2: Outdated Documentation
**Problem**: Many docs are stale, unclear which are current

**Solution**:
```markdown
# Migration report flags outdated docs
.specweave/docs/internal/projects/default/legacy/migration-report.md

## Stale Docs (⚠️ Review Required)
- prd-marketplace.md (last updated 2 years ago)
- hld-payment-system.md (conflicts with current code)

## Recommendation: Archive stale docs, create fresh specs
```

### Challenge 3: Team Resistance
**Problem**: Team hesitant to adopt new framework

**Solution**:
- Start with volunteers (early adopters)
- Show value quickly (first increment delivers feature)
- Run in parallel (don't disrupt existing workflow)
- Provide training (onboarding sessions)
- Celebrate wins (showcase improved docs/quality)

## Brownfield Success Metrics

**Track adoption**:
- ✅ Number of increments created
- ✅ Docs imported and classified
- ✅ Living docs sync rate (% of tasks that sync)
- ✅ Team satisfaction (surveys)
- ✅ Documentation freshness (stale docs reduced)

**Example**:
```
Month 1: 2 increments, 10 docs imported, 50% team adoption
Month 3: 8 increments, 45 docs imported, 80% team adoption
Month 6: 20 increments, 120 docs imported, 95% team adoption
```

## Related Terms

- [Greenfield](./greenfield.md) - New projects starting from scratch
- [Spec](./spec.md) - Specification document
- [Living Docs](./living-docs.md) - Auto-syncing documentation
- [Increment](./increment.md) - Focused unit of work
- [Legacy](./legacy.md) - Temporary folder for brownfield imports

## Learn More

- [Brownfield Onboarding Guide](/docs/workflows/brownfield/onboarding)
- [Import Documentation](/docs/commands/import-docs)
- [Migration Strategies](/docs/guides/migration/brownfield-to-greenfield)

---

**Category**: DevOps & Tools

**Tags**: #brownfield #migration #legacy #existing-codebase #onboarding
