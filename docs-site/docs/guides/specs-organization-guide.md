# Quick Start Guide

**Updated**: 2025-11-12

## 🎯 One-Minute Summary

**Brownfield-First + No Duplication**

1. **specs/ contains ONLY feature specs (FS-*)**
2. **Other docs live in their proper folders** (strategy/, architecture/, operations/, delivery/)
3. **Structure mirrors JIRA/ADO/GitHub** (BE/, FE/, MOB/ from JIRA project keys)
4. **Specs REFERENCE other docs** (not duplicate them)
5. **2-letter codes** for clear naming (FS, PRD, HLD, ADR, RUN, SLO, NFR, TST)

## 📁 The Complete Picture

```
.specweave/docs/internal/
│
├── strategy/          PRD-*  (Business requirements)
├── architecture/      HLD-*, ADR-*  (System design)
├── operations/        RUN-*, SLO-*, NFR-*  (Ops)
├── delivery/          TST-*  (Test strategies)
│
└── specs/             FS-* ONLY  (Living docs)
    ├── BE/            ← JIRA project key
    │   ├── FS-001-api-v2.md        References: PRD, HLD, ADR, RUN, SLO, NFR, TST
    │   └── FS-002-auth.md          References (not duplicates!)
    ├── FE/            ← JIRA project key
    │   └── FS-001-dashboard.md     References: PRD, HLD, etc.
    └── _index/
        └── by-project.md
```

## 🆚 Old vs New Approach

| Aspect | Old Approach (Rejected) | Current Approach (Approved) |
|--------|----------------|-----------------|
| **Specs contain** | ❌ NFRs, overviews, user stories | ✅ ONLY references to other docs |
| **Folder names** | Domain-based (core-framework) | Project-based (BE from JIRA) |
| **Duplication** | ❌ Yes (4x) | ✅ No (1x) |
| **External tool sync** | ❌ Manual mapping | ✅ Automatic (mirrors JIRA) |

## 📚 Related Documentation

- [Living Documentation](/docs/guides/core-concepts/living-documentation) - How docs stay current
- [Multi-Project Setup](/docs/guides/multi-project-setup) - Multi-repo organization
- [Increments](/docs/glossary/terms/increments) - Understanding increments

## 🚀 Next Steps

1. Review [Multi-Project Setup](/docs/guides/multi-project-setup) for complete project organization
2. Check [Living Documentation](/docs/guides/core-concepts/living-documentation) for document maintenance
3. See [Brownfield Workflow](/docs/workflows/brownfield) for existing project migration

---

**Key Principle**: No duplication, brownfield-first, clear references!
