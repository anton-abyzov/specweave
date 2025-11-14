# Documentation Index - Which Doc to Use?

**Status**: Navigation Guide
**Date**: 2025-11-13
**Increment**: 0030-intelligent-living-docs

---

## Quick Answer: Which Document Should I Read?

### 🎯 THE ONE GUIDE TO RULE THEM ALL

**For implementing atomic sync with external tool mapping**:

📖 **READ THIS**: [`UNIVERSAL-HIERARCHY-MAPPING.md`](./UNIVERSAL-HIERARCHY-MAPPING.md)

**This is THE definitive guide** covering:
- ✅ Simple → Standard → Enterprise mapping
- ✅ GitHub, Jira, ADO configuration
- ✅ Auto-detection and progressive scaling
- ✅ Complete config templates (copy-paste ready)
- ✅ Works for ANY project using SpecWeave

**Stop here if you want**: This document has everything you need to implement atomic sync!

---

## All Documents - What Each Covers

We created 5 documents during this session. Here's what each covers:

### 1. 🌟 UNIVERSAL-HIERARCHY-MAPPING.md (31KB) - **START HERE**

**Purpose**: THE definitive implementation guide for ANY project

**Covers**:
- ✅ Three complexity levels (Simple/Standard/Enterprise)
- ✅ Complete mapping tables (SpecWeave → GitHub/Jira/ADO)
- ✅ Auto-detection logic
- ✅ Configuration templates (copy-paste ready)
- ✅ Progressive upgrade path (no migration pain)

**Who should read**: **EVERYONE using SpecWeave**

**When to read**: **Before implementing atomic sync**

**Key sections**:
- Part 1: How to choose your level (decision matrix)
- Part 2: Level 1 - Simple mapping (solo/small team)
- Part 3: Level 2 - Standard mapping (medium team)
- Part 4: Level 3 - Enterprise mapping (large org)
- Part 5: Auto-detection
- Part 6: Complete config templates

**Bottom line**: Read this if you want to know "How do I sync SpecWeave to my external tool?"

---

### 2. ATOMIC-SYNC-ARCHITECTURE.md (17KB) - **Technical Deep Dive**

**Purpose**: Technical architecture for atomic sync engine

**Covers**:
- ✅ Section Parser (how to split spec.md by headers)
- ✅ Item Extractor (how to extract US-001, NFR-001, etc.)
- ✅ Atomic File Generator (how to create individual files)
- ✅ Merge Engine (how to merge with existing docs)
- ✅ Cross-Linker (how to generate bidirectional links)

**Who should read**: **SpecWeave contributors, advanced users**

**When to read**: When implementing the atomic sync engine

**Key sections**:
- Core Concept: Parse → Classify → Extract → Distribute → Merge
- Architecture Diagram
- Component specifications (TypeScript interfaces)
- Example transformation (before/after)

**Bottom line**: Read this if you're implementing the atomic sync engine code

---

### 3. TEST-ORGANIZATION-BEST-PRACTICES.md (26KB) - **Test Philosophy**

**Purpose**: Where test plans should live (embedded in tasks.md)

**Covers**:
- ✅ SpecWeave's three-level test architecture
- ✅ Why tests belong in tasks.md (not separate docs)
- ✅ Traceability flow (AC → Task → Test)
- ✅ What gets extracted vs what stays

**Who should read**: **Contributors, users planning increments**

**When to read**: When writing test plans, planning increments

**Key sections**:
- Level 1: Spec (AC-IDs) - WHAT to test
- Level 2: Tasks (embedded test plans) - HOW to test
- Level 3: Code (test files) - WHERE tests are
- Do's and Don'ts

**Bottom line**: Read this if you're wondering "Where should my test plans live?"

---

### 4. ENTERPRISE-TEST-ARCHITECTURE.md (26KB) - **Test Code Placement**

**Purpose**: Where test CODE should live (codebase vs separate repo)

**Covers**:
- ✅ Unit tests (always in codebase)
- ✅ Integration tests (usually in codebase)
- ✅ E2E tests (often separate repo)
- ✅ Performance tests (always separate repo)
- ✅ Security tests (usually separate repo)
- ✅ Enterprise patterns (monolith, microservices, large org)

**Who should read**: **Contributors, architects**

**When to read**: When deciding test repository structure

**Key sections**:
- Where each test type lives (unit/integration/E2E/performance/security)
- Enterprise patterns (monolith vs microservices vs large org)
- Decision matrix (same repo vs separate repo)

**Bottom line**: Read this if you're wondering "Should my E2E tests be in a separate repo?"

---

### 5. PORTFOLIO-HIERARCHY-MAPPING.md (26KB) - **Deep Dive on Capabilities**

**Purpose**: Deep dive on ADO/Jira portfolio hierarchy (Capability level)

**Covers**:
- ✅ ADO's 5-level hierarchy (Initiative → Epic → Feature → Story → Task)
- ✅ Jira's portfolio hierarchy (Initiative → Epic → Story)
- ✅ Capability mapping (Domain → Epic at capability level)
- ✅ SpecWeave contributors' internal usage

**Who should read**: **SpecWeave contributors, enterprise architects**

**When to read**: When you need deep understanding of portfolio hierarchies

**Key sections**:
- ADO's full 5-level hierarchy
- Capability = Domain (SpecWeave's implicit grouping)
- Three mapping strategies (full hierarchy, simplified, capability grouping)

**Bottom line**: Read this if you need to understand "What is a Capability in ADO?"

**Note**: Most content is DUPLICATED in UNIVERSAL-HIERARCHY-MAPPING.md (Part 4: Enterprise)

---

### 6. FINAL-ATOMIC-SYNC-GUIDE.md (28KB) - **Increment ≈ Feature Insight**

**Purpose**: Understanding that most increments ARE complete features

**Covers**:
- ✅ Increment ≈ Feature (90% of cases)
- ✅ Hierarchical sync (preserve User Stories → Tasks structure)
- ✅ External tool hierarchy mapping
- ✅ Epic-level extraction (NEW content type)
- ✅ 100% coverage validation

**Who should read**: **SpecWeave contributors**

**When to read**: When understanding increment-to-feature relationship

**Key sections**:
- Part 1: Understanding Increment ≈ Feature
- Part 2: External tool hierarchy mapping (GitHub/Jira/ADO)
- Part 3: Atomic sync - complete extraction
- Part 4: Epic-level extraction (NEW!)

**Bottom line**: Read this if you're wondering "Why did you say Increment ≈ Feature?"

**Note**: Most content is INCLUDED in UNIVERSAL-HIERARCHY-MAPPING.md

---

## Relationship Between Documents

### Hierarchy of Information

```
UNIVERSAL-HIERARCHY-MAPPING.md (THE GUIDE)
├── Includes: Simple → Standard → Enterprise
├── Includes: Auto-detection
├── Includes: Config templates
├── Includes: Progressive upgrade
└── References:
    ├── ATOMIC-SYNC-ARCHITECTURE.md (implementation details)
    ├── TEST-ORGANIZATION-BEST-PRACTICES.md (test plans)
    └── ENTERPRISE-TEST-ARCHITECTURE.md (test code placement)

FINAL-ATOMIC-SYNC-GUIDE.md
└── Insight: Increment ≈ Feature
    └── Merged into UNIVERSAL-HIERARCHY-MAPPING.md

PORTFOLIO-HIERARCHY-MAPPING.md
└── Deep dive: ADO Capability
    └── Summarized in UNIVERSAL-HIERARCHY-MAPPING.md (Part 4)
```

### Which Documents Are Redundant?

**PORTFOLIO-HIERARCHY-MAPPING.md** and **FINAL-ATOMIC-SYNC-GUIDE.md** are **90% duplicated** by **UNIVERSAL-HIERARCHY-MAPPING.md**.

**You can safely ignore them** if you read **UNIVERSAL-HIERARCHY-MAPPING.md**.

---

## Reading Paths by Role

### For SpecWeave Users (Implementing Sync)

**READ (in order)**:

1. **UNIVERSAL-HIERARCHY-MAPPING.md** (31KB) - THE guide
   - Choose your level (Simple/Standard/Enterprise)
   - Copy config template
   - Implement sync

**OPTIONAL (if needed)**:

2. **TEST-ORGANIZATION-BEST-PRACTICES.md** (26KB)
   - If writing test plans
   - Understand where tests go

3. **ENTERPRISE-TEST-ARCHITECTURE.md** (26KB)
   - If deciding test repo structure
   - Understand unit vs E2E placement

**SKIP**:
- ATOMIC-SYNC-ARCHITECTURE.md (internal implementation)
- FINAL-ATOMIC-SYNC-GUIDE.md (duplicated by UNIVERSAL)
- PORTFOLIO-HIERARCHY-MAPPING.md (duplicated by UNIVERSAL)

### For SpecWeave Contributors (Implementing Engine)

**READ (in order)**:

1. **ATOMIC-SYNC-ARCHITECTURE.md** (17KB) - Implementation
   - Section Parser design
   - Item Extractor logic
   - Merge Engine strategy

2. **UNIVERSAL-HIERARCHY-MAPPING.md** (31KB) - User-facing guide
   - Understand user needs
   - See config templates
   - Test with real projects

3. **TEST-ORGANIZATION-BEST-PRACTICES.md** (26KB) - Test philosophy
   - Understand SpecWeave's test architecture
   - Know what to extract vs what to skip

**OPTIONAL**:
- FINAL-ATOMIC-SYNC-GUIDE.md (Increment ≈ Feature insight)
- PORTFOLIO-HIERARCHY-MAPPING.md (Deep ADO/Jira details)

### For Architects (Understanding System)

**READ (in order)**:

1. **UNIVERSAL-HIERARCHY-MAPPING.md** (31KB) - Overall approach
   - Three complexity levels
   - Progressive scaling
   - Auto-detection logic

2. **PORTFOLIO-HIERARCHY-MAPPING.md** (26KB) - Portfolio details
   - ADO's 5-level hierarchy
   - Capability mapping
   - Enterprise patterns

3. **ATOMIC-SYNC-ARCHITECTURE.md** (17KB) - Technical design
   - Component architecture
   - Data flow
   - Merge strategies

---

## Quick Reference Table

| Question | Document | Section |
|----------|----------|---------|
| **How do I sync to GitHub/Jira/ADO?** | UNIVERSAL-HIERARCHY-MAPPING.md | Part 2-4 |
| **What level should I use?** | UNIVERSAL-HIERARCHY-MAPPING.md | Part 1 |
| **How do I configure auto-detection?** | UNIVERSAL-HIERARCHY-MAPPING.md | Part 5 |
| **Where do test plans go?** | TEST-ORGANIZATION-BEST-PRACTICES.md | Level 2 |
| **Should E2E tests be separate?** | ENTERPRISE-TEST-ARCHITECTURE.md | Part 3 |
| **How does atomic sync work?** | ATOMIC-SYNC-ARCHITECTURE.md | Part 2 |
| **What is a Capability in ADO?** | UNIVERSAL-HIERARCHY-MAPPING.md | Part 4 (or PORTFOLIO-HIERARCHY-MAPPING.md) |
| **Increment ≈ Feature?** | UNIVERSAL-HIERARCHY-MAPPING.md | Part 4 (or FINAL-ATOMIC-SYNC-GUIDE.md) |

---

## Consolidation Recommendation

**Current state**: 6 documents with significant overlap

**Recommended consolidation**:

### Keep These (Core Docs)

1. **UNIVERSAL-HIERARCHY-MAPPING.md** (31KB) - THE definitive guide
   - ✅ Keep as-is (comprehensive, user-facing)

2. **ATOMIC-SYNC-ARCHITECTURE.md** (17KB) - Implementation details
   - ✅ Keep as-is (technical, contributor-facing)

3. **TEST-ORGANIZATION-BEST-PRACTICES.md** (26KB) - Test philosophy
   - ✅ Keep as-is (unique content, important principle)

4. **ENTERPRISE-TEST-ARCHITECTURE.md** (26KB) - Test code placement
   - ✅ Keep as-is (unique content, important for architects)

### Archive These (Redundant)

5. **FINAL-ATOMIC-SYNC-GUIDE.md** (28KB)
   - ⚠️ Archive (90% duplicated by UNIVERSAL-HIERARCHY-MAPPING.md)
   - Keep as historical reference

6. **PORTFOLIO-HIERARCHY-MAPPING.md** (26KB)
   - ⚠️ Archive (95% duplicated by UNIVERSAL-HIERARCHY-MAPPING.md Part 4)
   - Keep as historical reference

---

## The ONE Document You Need

**If you only read ONE document**:

📖 **[UNIVERSAL-HIERARCHY-MAPPING.md](./UNIVERSAL-HIERARCHY-MAPPING.md)**

**This covers**:
- ✅ All three complexity levels (Simple/Standard/Enterprise)
- ✅ All three external tools (GitHub/Jira/ADO)
- ✅ Auto-detection and progressive scaling
- ✅ Complete configuration templates
- ✅ Migration paths and best practices
- ✅ Works for ANY project using SpecWeave

**This is THE definitive guide for atomic sync implementation.**

---

## Summary

**For 90% of users**: Read **UNIVERSAL-HIERARCHY-MAPPING.md** and you're done!

**For contributors**: Also read **ATOMIC-SYNC-ARCHITECTURE.md**

**For test planning**: Also read **TEST-ORGANIZATION-BEST-PRACTICES.md**

**For test repo structure**: Also read **ENTERPRISE-TEST-ARCHITECTURE.md**

**Everything else**: Optional (redundant or historical)

---

**Date**: 2025-11-13
**Author**: SpecWeave Team
