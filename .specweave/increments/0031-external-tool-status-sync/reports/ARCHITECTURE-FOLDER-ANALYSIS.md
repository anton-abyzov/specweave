# Architecture Folder Analysis and Reorganization Plan

**Date**: 2025-11-13
**Analyst**: Claude Code
**Purpose**: Comprehensive review of `.specweave/docs/internal/architecture/` structure

---

## Executive Summary

The architecture folder has **significant organizational issues** that impact maintainability:

- **19 duplicate ADRs** (same number prefix, different suffixes)
- **6 duplicate ADRs** (completely different numbers, same topic)
- **Mixed naming conventions** (UPPERCASE, lowercase, hld-, specs- prefixes)
- **Flat structure** (12 markdown files in root, should be organized)
- **Unclear HLD organization** (HLDs mixed with other docs)

**Impact**: Hard to find documents, unclear which ADR is canonical, inconsistent naming confuses LLMs.

**Recommendation**: Implement 6-phase reorganization plan (see below).

---

## Issues Identified

### 1. Duplicate ADRs (Same Topic, Different Numbers)

| Old ADR | New ADR | Topic | Status |
|---------|---------|-------|--------|
| 0011-intelligent-model-selection.md | 0003-007-intelligent-model-selection.md | Model selection | **Duplicate** |
| 0012-cost-tracking.md | 0003-008-cost-tracking-system.md | Cost tracking | **Duplicate** |
| 0013-phase-detection.md | 0003-009-phase-detection-algorithm.md | Phase detection | **Duplicate** |

**Analysis**: Increment 0003 created sub-ADRs (0003-007, 0003-008, 0003-009) while older ADRs (0011, 0012, 0013) still exist. The newer files (2641-3411 bytes) are more recent than older files (12KB-17KB).

**Root Cause**: Increment-based ADR numbering (0003-00X) conflicts with sequential numbering (00XX).

**Recommendation**:
- ✅ Keep 0003-007, 0003-008, 0003-009 (more recent, increment-scoped)
- ❌ Deprecate/archive 0011, 0012, 0013 (older, outdated)
- 📝 Add superseded notice to old ADRs

### 2. Multiple ADRs with Same Number Prefix (Sub-ADRs)

**Pattern**: Increment creates multiple related ADRs with format `XXXX-YYY-topic.md`

| Prefix | Count | Files | Increment |
|--------|-------|-------|-----------|
| 0002-* | 2 | 0002-context-loading.md, 0002-001-agent-types.md, 0002-002-skills.md | 0002 |
| 0003-* | 4 | 0003-agent-vs-skill.md, 0003-007-intelligent-model.md, 0003-008-cost.md, 0003-009-phase.md | 0003 |
| 0018-* | 5 | brownfield-classification, plugin-validation, reflection-model, specs-org, strategy-team | Multiple |
| 0019-* | 3 | brownfield-first, reflection-storage, test-infrastructure | 0019 |
| 0023-* | 2 | auto-id-generation, multi-repo-init-ux | 0023 |
| 0024-* | 2 | repo-id-auto-generation, root-level-repository | 0024 |
| 0025-* | 2 | incremental-state-persistence, setup-state-persistence | 0025 |
| 0026-* | 2 | github-api-validation, github-validation-strategy | 0026 |
| 0027-* | 2 | env-file-structure, root-level-folder-structure | 0027 |
| 0028-* | 2 | env-file-generation, flatten-internal-docs | 0028 |
| 0031-* | 4 | status-mapping, conflict-resolution, bidirectional-sync, github-actions | 0031 |

**Analysis**: This is actually a **GOOD pattern** for increment-scoped ADRs, but needs better organization.

**Issues**:
1. Hard to see which ADRs belong together (scattered in flat list)
2. No clear index showing increment → ADR mapping
3. Some increments have 5 ADRs (0018), others have 1 (0001-0010)

**Recommendation**: Keep this pattern but improve discoverability:
- ✅ Create increment-based subdirectories OR
- ✅ Enhance ADR README.md with increment grouping

### 3. Files in Architecture Root (Should Be Organized)

**Current** (12 files in root):
```
architecture/
├── INTELLIGENT-LIVING-DOCS-IMPLEMENTATION.md   ← Implementation guide
├── SPEC-COMMIT-SYNC-IMPLEMENTATION.md          ← Implementation guide
├── context-loading.md                          ← Concept doc
├── hld-diagram-generation.md                   ← HLD
├── hld-external-tool-status-sync.md            ← HLD
├── hld-intelligent-model-selection.md          ← HLD
├── increment-vs-spec-lifecycle.md              ← Concept doc
├── meta-capability.md                          ← Concept doc
├── overview-overview.md                        ← Malformed (living docs artifact)
├── specs-brownfield-first-architecture.md      ← Architecture doc
├── specs-complete-example.md                   ← Example doc
└── specs-domain-vs-brownfield-comparison.md    ← Comparison doc
```

**Issues**:
1. **Mixed document types**: HLDs, implementation guides, concept docs, examples all in root
2. **Naming inconsistencies**:
   - UPPERCASE (INTELLIGENT-LIVING-DOCS-IMPLEMENTATION.md)
   - lowercase (context-loading.md)
   - hld- prefix (hld-diagram-generation.md)
   - specs- prefix (specs-brownfield-first-architecture.md)
3. **Malformed file**: `overview-overview.md` (living docs artifact, should be removed)

**Recommendation**: Create subdirectories for organization:
```
architecture/
├── hld/                              ← High-Level Designs
│   ├── hld-diagram-generation.md
│   ├── hld-external-tool-status-sync.md
│   └── hld-intelligent-model-selection.md
├── guides/                           ← Implementation Guides
│   ├── intelligent-living-docs-implementation.md
│   └── spec-commit-sync-implementation.md
├── concepts/                         ← Conceptual Documentation
│   ├── context-loading.md
│   ├── increment-vs-spec-lifecycle.md
│   └── meta-capability.md
├── specs-architecture/               ← Specs-related architecture
│   ├── brownfield-first-architecture.md
│   ├── complete-example.md
│   └── domain-vs-brownfield-comparison.md
├── adr/                              ← ADRs (existing)
└── diagrams/                         ← Diagrams (existing)
```

### 4. Naming Convention Issues

**Current Inconsistencies**:

| Pattern | Count | Examples | Issue |
|---------|-------|----------|-------|
| **UPPERCASE** | 2 | INTELLIGENT-LIVING-DOCS-IMPLEMENTATION.md | Inconsistent with lowercase |
| **lowercase** | 6 | context-loading.md, meta-capability.md | Majority pattern |
| **hld- prefix** | 3 | hld-diagram-generation.md | Good pattern |
| **specs- prefix** | 3 | specs-brownfield-first-architecture.md | Ambiguous (specs folder exists) |
| **Malformed** | 1 | overview-overview.md | Living docs artifact |

**Recommendation**: Standardize on **lowercase-with-hyphens**:
- ✅ `hld-{topic}.md` for HLDs
- ✅ `{concept-name}.md` for concepts
- ✅ `{guide-name}-implementation.md` for guides
- ❌ No UPPERCASE (convert to lowercase)
- ❌ No specs- prefix in architecture/ (ambiguous with specs/ folder)

### 5. Overlap with Other Internal Docs Folders

**Potential Overlaps**:

| File | Current Location | Could Also Go To | Recommendation |
|------|------------------|------------------|----------------|
| increment-vs-spec-lifecycle.md | architecture/ | delivery/guides/ | **Keep in architecture/** (lifecycle is architectural) |
| context-loading.md | architecture/ | governance/ | **Keep in architecture/** (technical decision) |
| INTELLIGENT-LIVING-DOCS-IMPLEMENTATION.md | architecture/ | delivery/guides/ | **Keep in architecture/** (technical implementation) |
| specs-*-architecture.md | architecture/ | specs/ | **Keep in architecture/** (meta-architecture about specs) |

**Analysis**: Minimal overlap. Current placement is mostly correct.

### 6. Diagram Organization

**Current Structure**:
```
architecture/diagrams/
├── 1-main-flow.mmd/svg
├── 3-plugin-detection-4phase.mmd/svg
├── 4-context-efficiency.mmd/svg
├── 5-living-docs-sync.mmd/svg
├── brownfield-onboarding-strategy.mmd/svg
├── meta-capability.mmd/svg
├── documentation-flow.mmd/svg
├── cicd/
│   ├── auto-fix-architecture.mmd
│   └── failure-detection-flow.mmd
├── discipline/
│   ├── cli-sequence.mmd
│   └── enforcement-flow.mmd
└── diagram-legend.md
```

**Issues**:
1. **Numbered prefixes** (1-, 3-, 4-, 5-) - hard to understand
2. **Mixed organization** - some diagrams in subdirs, others in root
3. **No clear mapping** to parent docs (which .md references which diagram?)

**Recommendation**: Co-locate diagrams with parent docs (best practice):
```
architecture/
├── hld/
│   ├── hld-diagram-generation.md
│   ├── hld-diagram-generation-main-flow.mmd
│   ├── hld-diagram-generation-main-flow.svg
│   └── ...
└── concepts/
    ├── context-loading.md
    ├── context-loading-efficiency.mmd
    └── context-loading-efficiency.svg
```

---

## Reorganization Plan

### Phase 1: Deprecate Duplicate ADRs ✅

**Action**: Add superseded notices to old ADRs

**Files to update**:
```bash
# Add to top of each file:
# **Status**: Superseded by ADR-0003-007
# **Date**: 2025-11-13

.specweave/docs/internal/architecture/adr/0011-intelligent-model-selection.md
.specweave/docs/internal/architecture/adr/0012-cost-tracking.md
.specweave/docs/internal/architecture/adr/0013-phase-detection.md
```

**Content to add**:
```markdown
---
**⚠️ SUPERSEDED**: This ADR has been superseded by more detailed sub-ADRs in Increment 0003.

**See instead**:
- [ADR-0003-007: Intelligent Model Selection](0003-007-intelligent-model-selection.md)
- [ADR-0003-008: Cost Tracking System](0003-008-cost-tracking-system.md)
- [ADR-0003-009: Phase Detection Algorithm](0003-009-phase-detection-algorithm.md)

**Date Superseded**: 2025-11-13
---

# ADR-0011: Intelligent Model Selection (DEPRECATED)
...
```

### Phase 2: Create Subdirectories ✅

**Action**: Create new subdirectories for organization

```bash
mkdir -p .specweave/docs/internal/architecture/{hld,guides,concepts,specs-architecture}
```

### Phase 3: Move Files to Subdirectories ✅

**Action**: Move files from root to appropriate subdirectories

**HLDs** (3 files):
```bash
mv architecture/hld-diagram-generation.md                architecture/hld/
mv architecture/hld-external-tool-status-sync.md        architecture/hld/
mv architecture/hld-intelligent-model-selection.md      architecture/hld/
```

**Implementation Guides** (2 files - rename to lowercase):
```bash
mv architecture/INTELLIGENT-LIVING-DOCS-IMPLEMENTATION.md \
   architecture/guides/intelligent-living-docs-implementation.md

mv architecture/SPEC-COMMIT-SYNC-IMPLEMENTATION.md \
   architecture/guides/spec-commit-sync-implementation.md
```

**Concepts** (3 files):
```bash
mv architecture/context-loading.md                      architecture/concepts/
mv architecture/increment-vs-spec-lifecycle.md          architecture/concepts/
mv architecture/meta-capability.md                      architecture/concepts/
```

**Specs Architecture** (3 files):
```bash
mv architecture/specs-brownfield-first-architecture.md  architecture/specs-architecture/
mv architecture/specs-complete-example.md               architecture/specs-architecture/
mv architecture/specs-domain-vs-brownfield-comparison.md architecture/specs-architecture/
```

**Remove Malformed** (1 file):
```bash
rm architecture/overview-overview.md  # Living docs artifact, not architecture
```

### Phase 4: Co-locate Diagrams ✅

**Action**: Move diagrams next to their parent docs

**Requires**:
1. Identify which diagrams belong to which docs
2. Move diagram files
3. Update markdown references

**Example**:
```bash
# Before:
architecture/diagrams/1-main-flow.mmd
architecture/hld/hld-diagram-generation.md

# After:
architecture/hld/hld-diagram-generation.md
architecture/hld/hld-diagram-generation-main-flow.mmd
architecture/hld/hld-diagram-generation-main-flow.svg
```

### Phase 5: Update ADR Index ✅

**Action**: Enhance `adr/README.md` to show increment grouping

**Add to README.md**:
```markdown
## ADRs by Increment

### Core Framework (0001-0010)
- ADR-0001: Technology Stack
- ADR-0002: Context Loading
- ...

### Intelligent Model Selection (0003)
- ADR-0003-007: Intelligent Model Selection Architecture
- ADR-0003-008: Cost Tracking System
- ADR-0003-009: Phase Detection Algorithm

### External Tool Status Sync (0031)
- ADR-0031-001: Status Mapping Strategy
- ADR-0031-002: Conflict Resolution Approach
- ADR-0031-003: Bidirectional Sync Implementation
- ADR-0031: GitHub Actions Polling vs Webhooks

...
```

### Phase 6: Update Cross-References ✅

**Action**: Update all cross-references in documentation

**Files to update**:
- All files that reference moved documents
- CLAUDE.md
- Internal docs README.md
- Increment specs

**Find cross-references**:
```bash
grep -r "architecture/hld-" .specweave/docs/
grep -r "INTELLIGENT-LIVING-DOCS" .specweave/docs/
grep -r "context-loading.md" .specweave/docs/
```

---

## Recommended Final Structure

```
.specweave/docs/internal/architecture/
├── README.md                         ← Overview
│
├── hld/                              ← High-Level Designs (C4 L1-L2)
│   ├── README.md                     ← HLD index
│   ├── hld-diagram-generation.md
│   ├── hld-diagram-generation-*.mmd  ← Co-located diagrams
│   ├── hld-external-tool-status-sync.md
│   ├── hld-external-tool-status-sync-*.mmd
│   ├── hld-intelligent-model-selection.md
│   └── hld-intelligent-model-selection-*.mmd
│
├── guides/                           ← Implementation Guides
│   ├── README.md                     ← Guide index
│   ├── intelligent-living-docs-implementation.md
│   └── spec-commit-sync-implementation.md
│
├── concepts/                         ← Conceptual Documentation
│   ├── README.md                     ← Concepts index
│   ├── context-loading.md
│   ├── context-loading-*.mmd         ← Co-located diagrams
│   ├── increment-vs-spec-lifecycle.md
│   ├── meta-capability.md
│   └── meta-capability-*.mmd
│
├── specs-architecture/               ← Meta-architecture about specs
│   ├── README.md                     ← Specs arch index
│   ├── brownfield-first-architecture.md
│   ├── complete-example.md
│   └── domain-vs-brownfield-comparison.md
│
├── adr/                              ← Architecture Decision Records
│   ├── README.md                     ← Enhanced with increment grouping
│   ├── 0001-tech-stack.md
│   ├── 0002-context-loading.md
│   ├── 0002-001-agent-types-roles-vs-tools.md
│   ├── 0002-002-skills-as-coordinators.md
│   ├── 0003-agent-vs-skill.md
│   ├── 0003-007-intelligent-model-selection.md
│   ├── 0003-008-cost-tracking-system.md
│   ├── 0003-009-phase-detection-algorithm.md
│   ├── 0011-intelligent-model-selection.md  ← Marked as SUPERSEDED
│   ├── 0012-cost-tracking.md                ← Marked as SUPERSEDED
│   ├── 0013-phase-detection.md              ← Marked as SUPERSEDED
│   └── ...
│
└── diagrams/                         ← Shared/cross-cutting diagrams only
    ├── README.md
    ├── diagram-legend.md
    ├── cicd/                         ← Keep subdirs for cross-cutting
    │   ├── auto-fix-architecture.mmd
    │   └── failure-detection-flow.mmd
    └── discipline/
        ├── cli-sequence.mmd
        └── enforcement-flow.mmd
```

---

## Benefits of Reorganization

### 1. Improved Discoverability
- ✅ Clear separation by document type (HLD, guides, concepts, ADRs)
- ✅ Related diagrams co-located with parent docs
- ✅ No more flat 12-file root directory

### 2. Better Maintainability
- ✅ Consistent naming conventions (lowercase-with-hyphens)
- ✅ Clear which ADRs are superseded
- ✅ Easy to find related documents

### 3. LLM-Friendly Structure
- ✅ Subdirectory names signal document type
- ✅ Co-located diagrams reduce search time
- ✅ README.md files in each subdir provide context

### 4. Reduced Duplication Confusion
- ✅ Superseded ADRs clearly marked
- ✅ Increment grouping shows related ADRs
- ✅ No more "which ADR is canonical?" questions

---

## Implementation Checklist

- [ ] Phase 1: Deprecate duplicate ADRs (add superseded notices)
- [ ] Phase 2: Create subdirectories (hld, guides, concepts, specs-architecture)
- [ ] Phase 3: Move files to subdirectories
- [ ] Phase 4: Co-locate diagrams with parent docs
- [ ] Phase 5: Update ADR index with increment grouping
- [ ] Phase 6: Update cross-references in all docs

---

## Risk Assessment

**Low Risk**: This is purely organizational - no code changes, no functionality changes.

**Mitigations**:
1. ✅ Keep old files with superseded notices (don't delete)
2. ✅ Update cross-references systematically
3. ✅ Create README.md files in new subdirs
4. ✅ Test all links after migration

---

## Next Steps

1. **Get approval** for reorganization plan
2. **Execute Phase 1** (deprecate duplicates) - safe, no file moves
3. **Execute Phases 2-3** (create dirs, move files) - requires care
4. **Execute Phase 4** (co-locate diagrams) - most complex, may defer
5. **Execute Phases 5-6** (update indices and cross-refs) - essential
6. **Validate** all links work

---

**Generated**: 2025-11-13 by Claude Code
**Increment**: 0031-external-tool-status-sync
**Category**: Architecture Analysis
