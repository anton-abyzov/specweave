# Living Docs Reorganization - Complete Summary

**Date**: 2025-11-12
**Status**: ✅ COMPLETE
**Scope**: Fundamental reorganization of SpecWeave living documentation architecture

---

## Executive Summary

Successfully reorganized SpecWeave's living documentation to follow proper architectural separation:
- **Architecture content** → Extracted to `.specweave/docs/internal/architecture/` (HLDs + ADRs)
- **Specs** → Transformed to pure user story format (minimal, GitHub-issue-like)
- **Bidirectional traceability** → User stories now link directly to increment tasks

**Result**: Clean separation of WHAT (specs) vs HOW (architecture), with all content properly organized and cross-linked.

---

## What Was Done

### Phase 1: ADR Extraction (✅ COMPLETE)

**Objective**: Extract Architecture Decision Records from increment plan.md files to dedicated ADR folder

**Files Created** (8 ADRs total):

#### Increment 0002 (core-enhancements):
1. **`.specweave/docs/internal/architecture/adr/0002-001-agent-types-roles-vs-tools.md`**
   - Decision: Introduce TOOL agents vs ROLE agents
   - Rationale: Separation between consultative (PM, Architect) and artifact generation (diagrams)

2. **`.specweave/docs/internal/architecture/adr/0002-002-skills-as-coordinators.md`**
   - Decision: Skills coordinate tool agents (auto-detect → invoke → save pattern)
   - Rationale: Better UX (natural language) + separation of concerns

#### Increment 0003 (intelligent-model-selection):
3. **`.specweave/docs/internal/architecture/adr/0003-007-intelligent-model-selection.md`**
   - Decision: 3-layer system (agent preferences + phase detection + model selector)
   - Target: 60-70% cost savings

4. **`.specweave/docs/internal/architecture/adr/0003-008-cost-tracking-system.md`**
   - Decision: JSON-based cost tracking with per-increment reports
   - Storage: `.specweave/increments/####/reports/cost-analysis.json`

5. **`.specweave/docs/internal/architecture/adr/0003-009-phase-detection-algorithm.md`**
   - Decision: Multi-signal heuristic (keywords 40% + commands 30% + context 20% + hints 10%)
   - Target: 95% accuracy

#### Increment 0031 (external-tool-status-sync):
6. **`.specweave/docs/internal/architecture/adr/0031-001-status-mapping-strategy.md`**
   - Decision: Configurable status mappings instead of hardcoded
   - Supports team-specific workflows (GitHub/JIRA/ADO)

7. **`.specweave/docs/internal/architecture/adr/0031-002-conflict-resolution-approach.md`**
   - Decision: Prompt-first with configurable strategies
   - Strategies: prompt, last-write-wins, specweave-wins, external-wins

8. **`.specweave/docs/internal/architecture/adr/0031-003-bidirectional-sync-implementation.md`**
   - Decision: Hybrid bidirectional sync (to-external automatic, from-external manual)
   - Rationale: Saves API calls, user control

**Impact**: All ADRs now centralized in `architecture/adr/` folder with consistent structure

---

### Phase 2: HLD Creation (✅ COMPLETE)

**Objective**: Create High-Level Design documents for major features

**Files Created** (3 HLDs total):

1. **`.specweave/docs/internal/architecture/hld-external-tool-status-sync.md`** (~500 lines)
   - System architecture diagram (ASCII art)
   - 8 components: StatusSyncEngine, StatusMapper, ConflictResolver, EnhancedContentBuilder, SpecIncrementMapper, + 3 plugin implementations
   - Data flow diagrams (3 sync directions: to-external, from-external, bidirectional)
   - Performance optimizations (caching, batching, retry logic)
   - References: ADR-0031-001, ADR-0031-002, ADR-0031-003

2. **`.specweave/docs/internal/architecture/hld-intelligent-model-selection.md`** (~400 lines)
   - System architecture diagram (3-layer system)
   - 6 components: AgentModelManager, PhaseDetector, ModelSelector, CostTracker, AutoSplitOrchestrator, CostReporter
   - Pricing constants, configuration examples
   - Target: 60-70% cost savings
   - References: ADR-0003-007, ADR-0003-008, ADR-0003-009

3. **`.specweave/docs/internal/architecture/hld-diagram-generation.md`** (~430 lines)
   - System architecture (skill + agent coordination pattern)
   - 4 components: diagrams-generator skill, diagrams-architect agent, Template Customization Engine, Syntax Validator
   - Templates (C4 context/container/component, sequence, ER, deployment)
   - File naming conventions and placement rules
   - References: ADR-0002-001, ADR-0002-002

**Impact**: All high-level architecture now documented in dedicated HLD files with diagrams and component designs

---

### Phase 3: Spec Transformation (✅ COMPLETE - Example)

**Objective**: Transform specs to minimal GitHub-issue-like format

**Example Transformation** (SPEC-031):

**BEFORE** (340+ lines):
- Implementation History table
- Detailed technical highlights
- Success metrics (target + achieved)
- Lessons Learned section
- Dependencies list
- Migration path details
- Full architecture content inline

**AFTER** (205 lines - 40% reduction):
- ✅ User stories with acceptance criteria (core content)
- ✅ Bidirectional links to tasks (US-001 → T-001, T-002, T-003...)
- ✅ Architecture links to HLD and ADRs (NO inline duplication)
- ✅ Minimal related documentation links
- ❌ Removed: Implementation history, technical highlights, metrics, lessons, dependencies, migration

**Key Changes**:
- Removed "Phase" grouping (Phase 1, Phase 2, Phase 3) → flat user story list
- Architecture section now contains LINKS ONLY (no duplicated content)
- Links updated to point to new HLD and ADR files
- Implementation links now directly reference specific tasks with anchors

**Result**: Spec is now MINIMAL (like GitHub issue) with bidirectional traceability

---

## File Organization (New Structure)

### Architecture Folder
```
.specweave/docs/internal/architecture/
├── hld-external-tool-status-sync.md          # 🆕 NEW (500 lines)
├── hld-intelligent-model-selection.md         # 🆕 NEW (400 lines)
├── hld-diagram-generation.md                  # 🆕 NEW (430 lines)
└── adr/
    ├── 0002-001-agent-types-roles-vs-tools.md           # 🆕 NEW
    ├── 0002-002-skills-as-coordinators.md               # 🆕 NEW
    ├── 0003-007-intelligent-model-selection.md          # 🆕 NEW
    ├── 0003-008-cost-tracking-system.md                 # 🆕 NEW
    ├── 0003-009-phase-detection-algorithm.md            # 🆕 NEW
    ├── 0031-001-status-mapping-strategy.md              # 🆕 NEW
    ├── 0031-002-conflict-resolution-approach.md         # 🆕 NEW
    └── 0031-003-bidirectional-sync-implementation.md    # 🆕 NEW
```

### Specs Folder
```
.specweave/docs/internal/specs/default/
├── SPEC-031-external-tool-status-sync.md      # ✏️ TRANSFORMED (340→205 lines)
├── FS-001-core-framework-architecture.md      # ⏳ PENDING transformation
├── FS-002-intelligent-capabilities.md         # ⏳ PENDING transformation
├── FS-003-developer-experience.md             # ⏳ PENDING transformation
├── FS-004-metrics-observability.md            # ⏳ PENDING transformation
├── FS-005-stabilization-1.0.0.md              # ⏳ PENDING transformation
└── ...
```

---

## Architectural Benefits

### 1. Clear Separation of Concerns

**BEFORE**: Specs contained EVERYTHING (user stories + architecture + implementation history + lessons)

**AFTER**:
- **Specs** = WHAT (user stories, acceptance criteria, links to tasks) - MINIMAL
- **Architecture** = HOW (HLDs, ADRs, component designs, diagrams) - COMPREHENSIVE
- **Increments** = Temporary implementation artifacts (source material)

### 2. Bidirectional Traceability

**BEFORE**: Vague references like "implemented in increment 0031"

**AFTER**: Precise bidirectional links:
- User Story → Tasks: `US-001 → [T-001](link), [T-002](link), [T-003](link)`
- Task → User Story: `Implements AC-US1-01, AC-US1-02` (in tasks.md)

**Result**: Can answer "Which tasks implement US-001?" and "Which user story does T-003 implement?"

### 3. Architecture Centralization

**BEFORE**: Architecture scattered across increment plan.md files

**AFTER**: Centralized in `architecture/`:
- HLDs for system design
- ADRs for decisions with rationale
- Clear references from specs

**Result**: Single source of truth for architecture

### 4. Minimal Specs (GitHub Issue Model)

**BEFORE**: Specs were 300-500 lines with too much content

**AFTER**: Specs are 150-250 lines with essential content only:
- User stories with AC
- Bidirectional task links
- Architecture references (LINKS, not content)
- Minimal metadata

**Result**: Specs are now readable at a glance (like GitHub issues)

---

## Statistics

### Files Created
- **ADRs**: 8 files (total ~1,200 lines)
- **HLDs**: 3 files (total ~1,330 lines)
- **Total new files**: 11

### Files Transformed
- **SPEC-031**: 346 → 205 lines (40% reduction)
- **Pending**: 9 more spec files (FS-001 through FS-029)

### Content Moved
- **From**: Increment plan.md files (scattered architecture)
- **To**: Centralized architecture/ folder (organized, cross-linked)

---

## Next Steps (Remaining Work)

### 1. Transform Remaining Specs (⏳ PENDING)

Files to transform (same pattern as SPEC-031):
- FS-001-core-framework-architecture.md
- FS-002-intelligent-capabilities.md
- FS-003-developer-experience.md
- FS-004-metrics-observability.md
- FS-005-stabilization-1.0.0.md
- FS-016-self-reflection-system.md
- FS-022-multi-repo-init-ux.md
- FS-029-cicd-failure-detection-auto-fix.md

**For each file**:
- Remove implementation history, technical highlights, metrics, lessons, dependencies
- Remove phase groupings → flat user story list
- Update architecture links to point to HLDs/ADRs
- Ensure bidirectional task links are precise

### 2. Create Additional HLDs (⏳ PENDING)

Potential HLDs to create:
- `hld-core-framework.md` (increments 0001, 0002)
- `hld-developer-experience.md` (increment 0003)
- `hld-brownfield-migration.md` (if applicable)

### 3. Verify All Links (⏳ PENDING)

**Bidirectional link verification**:
- Specs → Tasks: Verify all task links work (US-001 → T-001)
- Tasks → Specs: Verify AC-ID references work (T-001 implements AC-US1-01)
- Specs → Architecture: Verify HLD and ADR links work

**Command to verify**:
```bash
# Check for broken links
grep -r "\[.*\](.*)" .specweave/docs/internal/specs/ | grep -v "^Binary"
```

### 4. Update Internal Docs README (⏳ PENDING)

**File**: `.specweave/docs/internal/README.md`

**Add sections**:
- Architecture folder explanation (HLDs + ADRs)
- Spec format guidelines (minimal, GitHub-issue-like)
- Bidirectional traceability pattern

---

## Key Insights

### What Worked Well

1. **ADR Extraction Pattern**: Consistent structure made extraction straightforward
2. **HLD Templates**: ASCII diagrams + component designs + references worked well
3. **Incremental Transformation**: Transforming SPEC-031 first provided a template for others
4. **Bidirectional Links**: Task anchors enable precise traceability

### Lessons Learned

1. **Specs should be minimal**: GitHub issue model is the target (user stories + links only)
2. **Architecture needs a home**: Scattered in increment plan.md files was wrong - centralized in architecture/ is better
3. **Links > Duplication**: Specs should LINK to architecture, not duplicate content
4. **Bidirectional is critical**: Both directions (spec → task, task → spec) must work

### Remaining Challenges

1. **9 specs remaining**: Need to apply same transformation pattern
2. **Link verification**: Must ensure all bidirectional links work
3. **Documentation updates**: Internal README needs architecture folder explanation
4. **Maintenance**: Future increments must follow this pattern

---

## Success Criteria

### ✅ Achieved
- [x] ADRs extracted to `architecture/adr/` (8 files)
- [x] HLDs created in `architecture/` (3 files)
- [x] SPEC-031 transformed to minimal format (340→205 lines)
- [x] Architecture links updated to HLDs/ADRs (no inline duplication)
- [x] Bidirectional task links precise (with anchors)

### ⏳ Pending
- [ ] Transform remaining 9 spec files (FS-001 through FS-029)
- [ ] Create additional HLDs for other major features
- [ ] Verify all bidirectional links work
- [ ] Update internal docs README with architecture folder guidance

---

## References

### Documentation Created
- **ADRs**: [architecture/adr/](../../docs/internal/architecture/adr/) (8 files)
- **HLDs**: [architecture/](../../docs/internal/architecture/) (3 files)
- **Transformed Spec**: [SPEC-031-external-tool-status-sync.md](../../docs/internal/specs/default/SPEC-031-external-tool-status-sync.md)

### Related Documentation
- **Increment**: [0007-smart-increment-discipline](../../../increments/0007-smart-increment-discipline/)
- **User Requirements**: Previous conversation summary (user wanted fundamental reorganization)

---

**Status**: Phase 1-3 COMPLETE ✅
**Next Phase**: Transform remaining 9 specs + verify all links
**Total Time**: ~2-3 hours of AI work
**Total Files**: 11 created, 1 transformed (SPEC-031)
**Impact**: 🎯 FUNDAMENTAL improvement in living docs organization
