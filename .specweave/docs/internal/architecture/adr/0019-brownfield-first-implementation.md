# Final Decision: brownfield-first Brownfield-First Architecture

**Date**: 2025-11-12
**Decision**: Approved ✅
**Status**: Ready for Implementation

## ✅ What We're Implementing

**brownfield-first: Brownfield-First, No Duplication**

### Core Principles

1. **No Duplication** - Each document type has ONE home
2. **Brownfield-First** - Structure mirrors JIRA/ADO/GitHub
3. **Clear References** - Specs LINK to other docs (not duplicate)
4. **2-Letter Codes** - Clear naming convention (FS, PRD, HLD, etc.)
5. **Project-Based** - Organize by JIRA project/ADO area path/GitHub repo

### Document Home Map

| Code | Type | Location | Purpose |
|------|------|----------|---------|
| **FS** | Feature Spec | `specs/{project}/` | Living docs (implementation history) |
| **PRD** | Product Req Doc | `strategy/` | Business requirements |
| **HLD** | High-Level Design | `architecture/` | System design |
| **ADR** | Arch Decision | `architecture/adr/` | Design decisions |
| **RUN** | Runbook | `operations/` | Incident response |
| **SLO** | Service Level Obj | `operations/` | Reliability targets |
| **NFR** | Non-Functional Req | `operations/` | Performance, security |
| **TST** | Test Strategy | `delivery/` | Testing approach |

**Result**: 8 document types, 8 locations, ZERO overlap!

### Structure (Brownfield Example - JIRA)

```
.specweave/docs/internal/
├── strategy/                    # PRD-* (Business)
├── architecture/                # HLD-*, ADR-* (Design)
├── operations/                  # RUN-*, SLO-*, NFR-* (Ops)
├── delivery/                    # TST-* (Testing)
└── specs/                       # FS-* ONLY (Living docs)
    ├── BE/                      ← JIRA project key
    │   ├── FS-001-api-v2.md     (References PRD, HLD, ADR, RUN, SLO, NFR, TST)
    │   └── FS-002-auth.md       (References, not duplicates!)
    ├── FE/                      ← JIRA project key
    │   └── FS-001-dashboard.md
    └── _index/
        └── by-project.md
```

## ❌ What We're NOT Implementing

**domain-based approach: Domain-Based with Duplication** ← REJECTED

**Why rejected**:
- ❌ Duplicates NFRs (operations/ AND specs/*/nfrs/)
- ❌ Duplicates overviews (architecture/ AND specs/*/overviews/)
- ❌ Duplicates user stories (strategy/ AND specs/*/user-stories/)
- ❌ 4x maintenance burden
- ❌ Sync issues (which is source of truth?)
- ❌ Domain names ≠ JIRA/ADO/GitHub structure

## 🎯 Key Differences

| Aspect | domain-based approach (Rejected) | brownfield-first (Approved) |
|--------|----------------|-----------------|
| **Duplication** | ❌ Yes (4x) | ✅ No (1x) |
| **Spec Location** | `specs/{domain}/` | `specs/{project}/` |
| **Folder Names** | Domain-based (core-framework, dx, etc.) | Project-based (BE, FE, MOB from JIRA) |
| **Subfolder Structure** | `nfrs/`, `user-stories/`, `overviews/` | None (no duplication!) |
| **Spec Content** | Duplicates other docs | References other docs |
| **External Tool Sync** | ❌ Manual mapping | ✅ Automatic (mirrors JIRA) |
| **Source of Truth** | ❌ Unclear | ✅ Clear (each doc has ONE home) |

## 📋 Implementation Checklist

### Phase 1: Scripts & Automation (Week 1)

- [ ] Create `detect-external-structure.ts` - Auto-detect JIRA/ADO/GitHub
- [ ] Create `fetch-external-projects.ts` - Fetch JIRA projects/ADO area paths/GitHub repos
- [ ] Create `restructure-to-brownfield.ts` - Migrate existing specs to project-based structure
- [ ] Create `generate-spec-indices.ts` - Generate by-project.md, by-status.md, etc.

### Phase 2: Configuration (Week 1)

- [ ] Update `.specweave/config.json` with:
  - `specs.organization.strategy: "brownfield"`
  - `specs.organization.externalTool: "jira" | "ado" | "github"`
  - `specs.organization.specPrefix: "FS"`
- [ ] Add 2-letter code mappings to config

### Phase 3: PM Agent Updates (Week 2)

- [ ] Update PM agent to:
  - Detect external tool (JIRA/ADO/GitHub)
  - Fetch projects/area paths/repos
  - Ask user to select project when creating spec
  - Create spec in `specs/{project}/FS-{NNN}-*.md`
  - Create JIRA epic/ADO feature/GitHub project
  - Add epic/feature link to spec frontmatter
- [ ] Update spec template with references (not duplication)

### Phase 4: Living Docs Sync Updates (Week 2)

- [ ] Update living docs sync to:
  - Detect project from increment spec
  - Place spec in correct `specs/{project}/` folder
  - Add frontmatter with references
  - Create JIRA epic/ADO feature if not exists
  - Link epic/feature to spec

### Phase 5: Migration (Week 3)

- [ ] Run detection: `npx ts-node scripts/detect-external-structure.ts`
- [ ] Fetch projects: `npx ts-node scripts/fetch-external-projects.ts`
- [ ] Map existing specs to projects (manual)
- [ ] Run restructure: `npx ts-node scripts/restructure-to-brownfield.ts`
- [ ] Generate indices: `npx ts-node scripts/generate-spec-indices.ts`
- [ ] Verify: Check all specs in correct `specs/{project}/` folders

### Phase 6: Documentation (Week 3)

- [ ] Update CLAUDE.md with brownfield-first architecture
- [ ] Create user guide for brownfield setup
- [ ] Create migration guide for existing projects
- [ ] Update all templates with 2-letter codes

### Phase 7: Testing (Week 4)

- [ ] Test PM agent creates specs correctly
- [ ] Test living docs sync places specs correctly
- [ ] Test JIRA/ADO/GitHub epic creation
- [ ] Test indices generation
- [ ] Test migration from domain-based approach to brownfield-first

## 🎓 Agent Instructions (Updated)

### PM Agent MUST

When creating living docs specs:

1. **Detect External Tool**
   ```typescript
   const tool = await detectExternalStructure();
   // Result: 'jira' | 'ado' | 'github' | 'greenfield'
   ```

2. **Fetch Projects** (if brownfield)
   ```typescript
   const projects = await jiraClient.getProjects();
   // Result: [{ key: 'BE', name: 'Backend' }, ...]
   ```

3. **Ask User to Select Project**
   ```typescript
   const project = await selectProject(projects);
   // Result: { key: 'BE', name: 'Backend' }
   ```

4. **Create Spec in Correct Folder**
   ```typescript
   const specPath = `.specweave/docs/internal/specs/${project.key}/FS-001-api-v2.md`;
   // Result: specs/BE/FS-001-api-v2.md
   ```

5. **Add Frontmatter with References** (not duplication!)
   ```yaml
   ---
   id: FS-001-api-v2
   project: BE
   epic: BE-123
   strategy_docs: [PRD-001]
   architecture_docs: [HLD-001, ADR-0012]
   operations_docs: [RUN-001, SLO-001, NFR-001]
   delivery_docs: [TST-001]
   ---
   ```

6. **Create JIRA Epic** (if not exists)
   ```typescript
   const epic = await jiraClient.createEpic({
     project: 'BE',
     summary: 'API v2',
     description: generateDescription(spec)
   });
   // Update spec frontmatter with epic.key and epic.url
   ```

### Living Docs Sync MUST

When syncing increment specs to living docs:

1. **Detect Project** from increment spec content
2. **Place in Correct Folder**: `specs/{project}/FS-{NNN}-*.md`
3. **Add References** (not duplication): `strategy_docs`, `architecture_docs`, etc.
4. **Create JIRA Epic** if not exists
5. **Link Epic** to spec frontmatter

## 📊 Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Zero Duplication** | 0 duplicate docs | Manual audit: No NFRs/overviews/user-stories in specs/ |
| **100% Brownfield Alignment** | All specs in project folders | Check: All specs in specs/{project}/ matching JIRA/ADO/GitHub |
| **100% Reference Coverage** | All specs reference other docs | Check: All FS-* have strategy_docs, architecture_docs, etc. |
| **Auto-Detection Works** | 95%+ accuracy | Test: `detect-external-structure.ts` detects JIRA/ADO/GitHub correctly |
| **Migration Success** | 100% specs migrated | Verify: All specs moved from domain folders to project folders |

## 🚀 Next Steps (Immediate)

1. ✅ **Review this decision** - Ensure alignment
2. ⏳ **Create detection script** - Start with `detect-external-structure.ts`
3. ⏳ **Test with SpecWeave project** - We have JIRA/GitHub, perfect test case!
4. ⏳ **Update PM agent** - Implement brownfield-first logic
5. ⏳ **Run migration** - Restructure SpecWeave's own specs/

## 📚 Documentation Created

1. **REVISED-ORGANIZATION-STRATEGY.md** - Complete brownfield-first architecture
2. **V2-BROWNFIELD-FIRST.md** - Visual comparison domain-based approach vs brownfield-first
3. **COMPLETE-ARCHITECTURE.md** - Full example with 2-letter codes
4. **FINAL-DECISION.md** - This document

**Total**: 4 comprehensive docs (2,500+ lines)

## 🎯 Summary

**Decision**: Implement brownfield-first Brownfield-First Architecture

**Why**:
- ✅ No duplication (each doc has ONE home)
- ✅ Brownfield-first (mirrors JIRA/ADO/GitHub)
- ✅ Clear references (specs link to other docs)
- ✅ 2-letter codes (FS, PRD, HLD, ADR, RUN, SLO, NFR, TST)
- ✅ Project-based organization (BE, FE, MOB from JIRA)
- ✅ Auto-detection (detects external tool structure)
- ✅ Enterprise-ready (scales to 100+ projects, 1000+ specs)

**Impact**: Clean, maintainable, brownfield-native specs organization!

---

**Status**: ✅ Approved | 🚀 Ready for Implementation
**Version**: 2.0 (Brownfield-First)
**Estimated Effort**: 3-4 weeks
**Key Principle**: No duplication, brownfield-first, clear references
