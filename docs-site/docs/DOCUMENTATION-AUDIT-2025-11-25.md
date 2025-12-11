# SpecWeave Documentation Audit Report

**Date**: November 25, 2025
**Version**: 0.28.14
**Auditor**: Claude (Opus 4.5)

---

## Executive Summary

Comprehensive audit of ~1,400 documentation files across internal and public documentation revealed **36 issues** requiring attention:

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 8 | Blocks learning or causes crashes |
| HIGH | 15 | Breaks documentation continuity |
| MEDIUM | 10 | Optimizes user experience |
| LOW | 3 | Minor style/formatting issues |

**Key Findings**:
1. ADR index severely outdated (10 listed vs 137 actual)
2. Testing modules 08-11 are stubs (only index.md)
3. AI paradigm shift never explained to newcomers
4. Emergency procedures not in public docs
5. Safety rules from CLAUDE.md not public

---

## Part 1: Internal Documentation Issues (15 issues)

### CRITICAL (4 issues)

#### 1. ADR README Index Severely Outdated
**Location**: `.specweave/docs/internal/architecture/adr/README.md`
**Problem**: Lists only 10 ADRs but directory contains 137
**Impact**: Documentation discovery broken
**Fix**: Auto-generate or manually update ADR index

#### 2. Duplicate ADR Numbers
**Location**: `.specweave/docs/internal/architecture/adr/`
**Problem**: Multiple ADRs share same prefix (0002, 0003, 0007, 0018, 0019, 0042, 0043, 0052, 0053, 0055)
**Impact**: Confusion about which ADR to reference
**Fix**: Consolidate or standardize numbering scheme

#### 3. Broken Increment References
**Location**: `.specweave/docs/internal/deprecated/symlink-dev-mode.md`
**Problem**: References increments 0043, 0046 that don't exist
**Impact**: Broken internal links
**Fix**: Update links to archived specs location

#### 4. Architecture README Shows "None yet" for HLDs/LLDs/ADRs
**Location**: `.specweave/docs/internal/architecture/README.md`
**Problem**: Claims no ADRs exist when 137 do
**Impact**: Makes framework appear immature
**Fix**: Generate actual indices

### HIGH (6 issues)

#### 5. Superseded ADRs Not Clearly Linked
**Location**: ADR-0011 and others marked "SUPERSEDED"
**Fix**: Add "Superseded By" section with links

#### 6. File Size Limits in Two Places with Different Context
**Locations**: `coding-standards.md` (function size) vs `CLAUDE.md` (file size)
**Fix**: Clarify function vs file limits in both places

#### 7. Deprecated Symlink Workflow Still Referenced
**Location**: Various active docs reference deprecated mode
**Fix**: Add warning banners, update references

#### 8. Version References Outdated
**Problem**: Many docs reference v0.23-v0.25 but current is v0.28.14
**Fix**: Update version references or add deprecation notices

#### 9. Increment Folder Structure Not Linked from README
**Fix**: Add link to `governance/increment-folder-structure.md` in main README

#### 10. Living Docs Specs Reference Non-existent Increments
**Location**: `FS-043/`, `FS-044/`, `FS-046/` in archive
**Fix**: Update links to point to archived specs

### MEDIUM (4 issues)

#### 11. Inconsistent Terminology (spec/feature/increment)
**Fix**: Create canonical glossary section

#### 12. "Living Docs" Naming Inconsistent
**Fix**: Standardize on "living docs" (two words, lowercase)

#### 13. Emergency Procedures Need Resolution Status
**Fix**: Add "Fixed in vX.X.X" to emergency procedures

#### 14. Last Updated Timestamps Vary
**Fix**: Establish quarterly review process

### LOW (1 issue)

#### 15. Date Format Inconsistency
**Fix**: Standardize on ISO format (YYYY-MM-DD)

---

## Part 2: Public Documentation Issues (11 issues)

### HIGH (4 issues)

#### 16. Part 6 DevOps Description Duplicated with Conflicts
**Location**: `docs-site/docs/academy/index.md` lines 79, 89
**Problem**: Same part described differently (3 vs 4 topics)
**Fix**: Standardize Part 6 description

#### 17. Command Documentation Has 6 TODO Comments
**Location**: `docs-site/docs/commands/overview.md`
**Problem**: Missing dedicated docs for increment, do, validate, qa, done, sync-docs
**Fix**: Create dedicated files or remove TODOs

#### 18. Workflow Docs Incomplete
**Location**: `docs-site/docs/workflows/`
**Problem**: Only 4 of 7 referenced phases documented
**Missing**: research.md, design.md, validation.md, deployment.md
**Fix**: Create missing workflow docs or remove references

#### 19. Reference Section Incomplete
**Location**: `docs-site/docs/reference/`
**Problem**: Only 2 files exist (compliance, cost-tracking)
**Fix**: Create command reference section

### MEDIUM (5 issues)

#### 20. Academy Module-to-Part Mapping Unclear
**Fix**: Add explicit module numbering or clarification

#### 21. Enterprise Migration Guides Lack Examples
**Fix**: Add "Real-World Example" sections

#### 22. Terms Used But Not in Glossary
**Missing**: "model selection", "hooks" (comprehensive), "post-task-completion"
**Fix**: Add glossary entries

#### 23. FAQ Version Stamp Outdated
**Location**: `docs-site/docs/faq.md` shows v0.7.0
**Fix**: Update to current version

#### 24. Command Namespace Mixed in Examples
**Fix**: Ensure all examples use `/sw:*` namespace

### LOW (2 issues)

#### 25. Learning Paths Terminology Mismatch
**Fix**: Add clarification about lessons vs academy paths

#### 26. Command Capitalization Inconsistent (PM vs QA)
**Fix**: Standardize to "PM Agent", "QA Lead"

---

## Part 3: Internal vs Public Discrepancies (10 issues)

### CRITICAL (3 issues)

#### 27. Emergency Procedures Not Public
**Internal**: 7 emergency procedure files
**Public**: None
**Impact**: Users can't recover from crashes
**Fix**: Create `docs/guides/troubleshooting/emergency-recovery.md`

#### 28. Safety Rules Not Public
**Internal**: CLAUDE.md contains crash prevention rules
**Public**: Fragmentary coverage
**Fix**: Create public safety/best practices guide

#### 29. Chunked Editing Best Practices Not Public
**Internal**: `.specweave/docs/internal/best-practices/chunked-editing.md`
**Public**: Missing
**Fix**: Add to advanced patterns lesson

### HIGH (4 issues)

#### 30. Sync Architecture Version Drift
**Internal**: Documents v0.26.3+ with ADR-0137 details
**Public**: Generic overview without version info
**Fix**: Update public docs with detection methods and throttle behavior

#### 31. ADR Decisions Not Accessible to Users
**Internal**: 142+ ADRs with architectural reasoning
**Public**: Only glossary definition of "ADR"
**Fix**: Create key decisions summary for public

#### 32. Coding Standards Not Public
**Internal**: Detailed in governance/coding-standards.md
**Public**: No equivalent
**Fix**: Create contributing/coding-standards.md

#### 33. Security Policy Gaps
**Internal**: Minimal (80 lines)
**Public**: Compliance-focused
**Fix**: Expand both with vulnerability reporting, supply chain security

### MEDIUM (3 issues)

#### 34. Best Practices Documentation Gap
**Internal**: chunked-editing.md exists
**Public**: Not in advanced patterns
**Fix**: Add section to lesson 10

#### 35. Critical Bugs Prevention Guide Not Public
**Internal**: CRITICAL-BUGS-PREVENTION.md
**Public**: None (contributor-focused)
**Fix**: Create for contributors

#### 36. Plugin Documentation Claims Alignment
**Status**: OK - 21 plugins documented consistently

---

## Part 4: Newcomer Learning Gaps (20 items)

### CRITICAL Gaps (4)

| Gap | Description | Est. Lines |
|-----|-------------|-----------|
| Testing modules 08-11 stubs | Only index.md, no lessons | 8,000 |
| AI paradigm shift | Framework raison d'être unexplained | 3,000 |
| Hands-on projects missing | Learn by reading ≠ learn by doing | 20,000 |
| "Why engineering" bridge | Motivation/context missing | 500 |

### HIGH Gaps (8)

| Gap | Description | Est. Lines |
|-----|-------------|-----------|
| Bridge content between parts | Parts feel disconnected | 3,000 |
| Common errors guide | First errors kill momentum | 5,000 |
| SpecWeave integration throughout | Framework underused in academy | 3,000 |
| "When to use AI" guide | Decision-making unclear | 2,000 |
| "Why tests in prod" | Tests as insurance | 1,500 |
| "Why CI/CD matters" | Enterprise requirement context | 2,000 |
| Security from day 1 | Prevent bad habits | 2,000 |
| Complete spec/plan/tasks examples | Learning by example | 5,000 |

### MEDIUM Gaps (4)

| Gap | Description | Est. Lines |
|-----|-------------|-----------|
| Learning paths deep dive | Minimum viable knowledge | 2,000 |
| Reading generated code | Confidence building | 1,500 |
| Scale decision matrix | Prevent over-engineering | 1,000 |
| Command decision tree | 22 commands confusing | 1,000 |

### Total Missing Content: ~60,000-85,000 lines

---

## Recommended Action Plan

### Phase 1: CRITICAL Fixes (Week 1-2)

1. **Fix ADR README index** - Add all 137 ADRs
2. **Create emergency recovery guide** (public)
3. **Expand testing modules 08-11** with real lessons
4. **Create AI Revolution Context doc**
5. **Add safety rules to public docs**

### Phase 2: HIGH Fixes (Week 3-4)

6. Consolidate duplicate ADRs or document scheme
7. Create bridge content between parts
8. Add common errors troubleshooting
9. Create complete increment examples
10. Document sync architecture with ADR-0137

### Phase 3: MEDIUM Fixes (Week 5-6)

11. Update version references
12. Add glossary terms
13. Create command decision tree
14. Standardize terminology
15. Add "Why X matters" sections

### Phase 4: Content Creation (Week 7+)

16. Hands-on task tracker project (all parts)
17. Security from day 1 guide
18. AI integration throughout academy
19. Enterprise context guides
20. Complete reference documentation

---

## Glossary Terms to Add/Enhance

| Term | Status | Location |
|------|--------|----------|
| model selection | MISSING | glossary/terms/ |
| hooks (comprehensive) | PARTIAL | Expand existing |
| post-task-completion | MISSING | glossary/terms/ |
| chunked editing | MISSING | glossary/terms/ |
| context explosion | MISSING | glossary/terms/ |
| circuit breaker | MISSING | glossary/terms/ |
| living docs | EXISTS | Verify consistency |
| source of truth | MISSING | glossary/terms/ |
| quality gates | MISSING | glossary/terms/ |
| acceptance criteria | EXISTS | Verify depth |

---

## Files to Create

### Public Documentation (Priority Order)

```
docs-site/docs/
├── overview/
│   └── ai-revolution-context.md              NEW (CRITICAL)
├── learn/
│   ├── ai-development-paradigm.md            NEW (CRITICAL)
│   ├── software-engineering-value.md         NEW (CRITICAL)
│   ├── security-fundamentals.md              NEW (HIGH)
│   └── ai-integration-guide.md               NEW (HIGH)
├── guides/
│   ├── troubleshooting/
│   │   ├── emergency-recovery.md             NEW (CRITICAL)
│   │   ├── common-errors.md                  NEW (HIGH)
│   │   └── specweave-errors.md               NEW (HIGH)
│   └── contributing/
│       └── coding-standards.md               NEW (HIGH)
├── reference/
│   ├── command-decision-tree.md              NEW (HIGH)
│   ├── complete-examples/
│   │   └── 01-user-auth-increment.md         NEW (HIGH)
│   └── security-policy.md                    NEW (MEDIUM)
├── academy/
│   ├── learning-paths-deep-dive.md           NEW (HIGH)
│   ├── projects/
│   │   └── 01-task-tracker-progression.md    NEW (CRITICAL)
│   └── part-3-testing/
│       ├── 08-unit-testing/
│       │   ├── 01-setup.md                   NEW (CRITICAL)
│       │   ├── 02-first-test.md              NEW (CRITICAL)
│       │   ├── 03-mocking.md                 NEW (CRITICAL)
│       │   ├── 04-async.md                   NEW (CRITICAL)
│       │   └── 05-coverage.md                NEW (CRITICAL)
│       ├── 09-integration-testing/
│       │   ├── 01-api-testing.md             NEW (CRITICAL)
│       │   ├── 02-database-testing.md        NEW (CRITICAL)
│       │   └── 03-fixtures.md                NEW (CRITICAL)
│       ├── 10-e2e-testing/
│       │   ├── 01-playwright-setup.md        NEW (CRITICAL)
│       │   ├── 02-browser-automation.md      NEW (CRITICAL)
│       │   └── 03-test-strategies.md         NEW (CRITICAL)
│       └── 11-tdd-bdd/
│           ├── 01-red-green-refactor.md      NEW (CRITICAL)
│           ├── 02-bdd-scenarios.md           NEW (CRITICAL)
│           └── 03-specweave-tdd.md           NEW (CRITICAL)
└── glossary/terms/
    ├── model-selection.md                    NEW (MEDIUM)
    ├── chunked-editing.md                    NEW (MEDIUM)
    ├── context-explosion.md                  NEW (MEDIUM)
    ├── circuit-breaker.md                    NEW (MEDIUM)
    ├── source-of-truth.md                    NEW (MEDIUM)
    └── quality-gates.md                      NEW (MEDIUM)
```

---

## Conclusion

The SpecWeave documentation has **strong foundations** but requires significant investment to:

1. **Fix critical internal inconsistencies** (ADR index, duplicates, broken links)
2. **Bridge internal→public gap** (emergency procedures, safety rules)
3. **Complete newcomer learning path** (testing modules, hands-on projects)
4. **Explain the AI paradigm shift** (why spec-driven matters)

Estimated total work: **60,000-85,000 lines** of documentation

Priority: Start with CRITICAL fixes that block learning or cause user confusion.
