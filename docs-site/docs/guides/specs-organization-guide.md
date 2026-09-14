# v2.0 Quick Start Guide

**Updated**: 2025-11-12
**Version**: 2.0 (Brownfield-First)

## 🎯 One-Minute Summary

**v2.0 = Brownfield-First + No Duplication**

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

## 🆚 v1.0 vs v2.0

| Aspect | v1.0 (Rejected) | v2.0 (Approved) |
|--------|----------------|-----------------|
| **Specs contain** | ❌ NFRs, overviews, user stories | ✅ ONLY references to other docs |
| **Folder names** | Domain-based (core-framework) | Project-based (BE from JIRA) |
| **Duplication** | ❌ Yes (4x) | ✅ No (1x) |
| **External tool sync** | ❌ Manual mapping | ✅ Automatic (mirrors JIRA) |

## 📚 Complete Documentation

1. **REVISED-ORGANIZATION-STRATEGY.md (historical reference; not published)** - Full v2.0 architecture
2. **V2-BROWNFIELD-FIRST.md (historical reference; not published)** - Visual comparison
3. **COMPLETE-ARCHITECTURE.md (historical reference; not published)** - Full example
4. **FINAL-DECISION.md (historical reference; not published)** - Implementation plan

## 🚀 Next Steps

1. Read FINAL-DECISION.md (historical reference; not published) for complete implementation plan
2. Review V2-BROWNFIELD-FIRST.md (historical reference; not published) for visual comparison
3. Check COMPLETE-ARCHITECTURE.md (historical reference; not published) for example spec

---

**Key Principle**: No duplication, brownfield-first, clear references!
