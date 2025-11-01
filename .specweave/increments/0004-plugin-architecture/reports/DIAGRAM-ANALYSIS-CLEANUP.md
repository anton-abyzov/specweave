# Diagram Analysis: Simple vs. Detailed - Cleanup Recommendation

**Date**: 2025-10-31
**Context**: You asked about `specweave-workflow-simple.mmd` vs `specweave-workflow.mmd`

---

## TL;DR Recommendation

**DELETE BOTH** old diagrams. They're outdated (pre-v0.4.0, no plugin architecture). Use the new v2 modular diagrams instead.

---

## Current State Analysis

### What You Have Now

| Diagram | Lines | Version | Status | Content |
|---------|-------|---------|--------|---------|
| `specweave-workflow-simple.mmd` | 139 | Pre-v0.4.0 | ⚠️ Outdated | Basic flow, no validation loops |
| `specweave-workflow.mmd` | 221 | Pre-v0.4.0 | ⚠️ Outdated | Detailed with LLM-as-Judge loops |
| `specweave-complete-lifecycle-v2.md` | 6 diagrams | **v0.4.0** | ✅ Current | Plugin architecture, modular |

### Key Differences: Simple vs. Detailed (Old)

**Simple** (139 lines):
```
PM Agent → Arch Agent → QA Agent → Sec Agent → DevOps
(Straight flow, no feedback loops)
```

**Detailed** (221 lines):
```
PM Agent Round 1 → Validate → Score < 0.80? → Refine → Round 2 → Round 3
(Includes 3-round refinement with LLM-as-Judge for EACH agent)
```

**The difference**: Detailed shows validation/feedback loops, simple doesn't.

---

## The Problem: Both Are Outdated

### What's Missing in BOTH Old Diagrams

❌ **Plugin Architecture** (v0.4.0 feature)
- No 4-phase plugin detection
- No selective loading
- No context efficiency (76% reduction)

❌ **Decision Gates** (v0.4.0 feature)
- No user control (spec depth, TDD, test quality, docs sync)

❌ **Living Docs Automation** (v0.4.0 feature)
- No hook-based doc sync
- No automated updates

❌ **GitHub Plugin** (v0.4.0 feature)
- No external integrations shown

### What's Wrong with Keeping Both

1. **Confusion**: Users don't know which to use
2. **Maintenance burden**: 2 outdated diagrams to maintain
3. **Risk**: Someone uses old diagram thinking it's current
4. **Clutter**: 3 diagram sets total (simple, detailed, v2)

---

## Recommendation: Strategic Cleanup

### Phase 1: Delete Outdated (Immediate)

**Delete these files**:
```bash
# Old diagrams (pre-v0.4.0)
rm .specweave/docs/internal/architecture/diagrams/specweave-workflow-simple.mmd
rm .specweave/docs/internal/architecture/diagrams/specweave-workflow.mmd
rm .specweave/docs/internal/architecture/diagrams/specweave-workflow-simple.svg
rm .specweave/docs/internal/architecture/diagrams/specweave-workflow.svg
rm .specweave/docs/internal/architecture/diagrams/specweave-workflow-dark.svg
```

**Why**: They're deprecated, misleading, and no longer accurate.

---

### Phase 2: Use v2 Modular Diagrams (Current)

**Keep**: `specweave-complete-lifecycle-v2.md`

**Contains 6 diagrams**:
1. **Main Flow** - Complete lifecycle (detailed)
2. **Decision Gate Detail** - User control points
3. **4-Phase Plugin Detection** - Intelligence
4. **Context Efficiency** - Before/after metrics
5. **Living Docs Sync** - Automation sequence
6. **Comparison Matrix** - BMAD vs SpecKit vs SpecWeave

**Advantage**: Modular. Use individually or together.

---

### Phase 3: Create NEW Simple (Optional)

**If you need a quick intro diagram**, create:
- `specweave-lifecycle-simple-v2.mmd`
- Based on v2 "Main Flow" but simplified
- Remove: Plugin detection details, quality gates, some decision points
- Keep: Overall flow, key phases, agents

**When to create**: Only if you need ultra-simple for landing page/README

---

## When to Use Which (After Cleanup)

### Simple (NEW - if created)

**Use for**:
- ✅ README.md (GitHub landing page)
- ✅ Docs homepage (first thing users see)
- ✅ Blog posts / social media
- ✅ Elevator pitch (30 seconds)
- ✅ Non-technical stakeholders
- ✅ Sales/marketing materials

**Audience**: Non-technical, first-time visitors, quick overview

**Goal**: "What is SpecWeave in 30 seconds?"

**Content**:
- Init → Plan → Build → Test → Deploy
- NO validation loops
- NO plugin detection details
- NO decision gates
- Just the happy path

---

### v2 Modular Diagrams (CURRENT)

**Use for**:
- ✅ YouTube video (all 6 diagrams)
- ✅ Architecture documentation
- ✅ Technical deep dives
- ✅ Implementation guides
- ✅ Contributor onboarding
- ✅ System design discussions
- ✅ Engineering presentations

**Audience**: Engineers, architects, contributors

**Goal**: "How does SpecWeave actually work?"

**Content**:
- Complete lifecycle with all phases
- Plugin detection (4 phases)
- Decision gates (user control)
- Validation loops
- Quality gates
- Automated doc sync
- Context efficiency metrics

---

## Individual Diagram Use Cases (v2)

| Diagram | When to Use | Audience | Duration |
|---------|-------------|----------|----------|
| **1. Main Flow** | Full workflow explanation | Engineers | 5-10 min |
| **2. Decision Gate** | Show user control/flexibility | PMs, Leads | 2 min |
| **3. Plugin Detection** | Explain intelligence/automation | Architects | 3 min |
| **4. Context Efficiency** | Show performance benefits | Decision-makers | 1 min |
| **5. Living Docs Sync** | Explain automation advantage | Engineers | 2 min |
| **6. Comparison Matrix** | Position vs BMAD/SpecKit | Everyone | 2 min |

**Total for all 6**: ~15 minutes (perfect for YouTube section)

---

## Concrete Examples

### Example 1: README.md (Quick Intro)

**Use**: Simple diagram (if created)

**Why**: First-time visitors need 30-second overview, not 10-minute deep dive

**Fallback** (if simple not created): Use v2 "Comparison Matrix" diagram
- Shows value prop quickly
- Positions SpecWeave vs alternatives
- Decision tree format (easy to scan)

---

### Example 2: YouTube Video (Comprehensive)

**Use**: All 6 v2 diagrams

**Timing**:
- 8:00-8:30 - Main Flow (overview)
- 9:30-9:45 - Decision Gate (user control)
- 10:15-10:30 - Plugin Detection (intelligence)
- 10:45-11:00 - Context Efficiency (performance)
- 11:00-11:15 - Living Docs Sync (automation)
- 24:00-24:30 - Comparison Matrix (positioning)

**Why**: Each diagram highlights a different competitive advantage

---

### Example 3: Architecture Documentation

**Use**: Main Flow + Plugin Detection + Living Docs Sync

**Why**: Technical audience needs:
- Complete lifecycle (Main Flow)
- How plugins work (Plugin Detection)
- How automation works (Living Docs Sync)

**Skip**: Comparison Matrix (not technical), Decision Gate (obvious to engineers)

---

### Example 4: Sales Presentation

**Use**: Context Efficiency + Comparison Matrix

**Why**: Decision-makers care about:
- ROI (76% context reduction = cost savings)
- Positioning (vs BMAD/SpecKit)

**Skip**: Technical details (Main Flow, Plugin Detection)

---

## Migration Plan

### Step 1: Backup (Safe)

```bash
# Create backup folder
mkdir -p .specweave/increments/0004-plugin-architecture/reports/old-diagrams-backup

# Backup old diagrams
cp .specweave/docs/internal/architecture/diagrams/specweave-workflow*.* \
   .specweave/increments/0004-plugin-architecture/reports/old-diagrams-backup/
```

---

### Step 2: Delete Old (Clean)

```bash
# Delete outdated diagrams
rm .specweave/docs/internal/architecture/diagrams/specweave-workflow-simple.mmd
rm .specweave/docs/internal/architecture/diagrams/specweave-workflow.mmd
rm .specweave/docs/internal/architecture/diagrams/specweave-workflow*.svg
```

---

### Step 3: Update README (Document)

Update `.specweave/docs/internal/architecture/diagrams/README.md`:

```markdown
## Available Diagrams

### Complete Lifecycle (v2.0 - CURRENT)

**File**: `specweave-complete-lifecycle-v2.md`

**Contains**: 6 modular diagrams for v0.4.0 plugin architecture

**Use for**: All documentation (see individual diagram use cases)

---

## Deprecated Diagrams

- ❌ `specweave-workflow-simple.mmd` - Removed (pre-v0.4.0)
- ❌ `specweave-workflow.mmd` - Removed (pre-v0.4.0)

**Reason**: Both lacked plugin architecture, decision gates, and automation features.

**Replacement**: Use `specweave-complete-lifecycle-v2.md` (modular, current)
```

---

### Step 4: Create Simple (Optional)

**Only if needed for landing page**:

```bash
# Extract simplified version from v2 Main Flow
# Manual simplification:
# - Remove plugin detection details
# - Remove quality gates
# - Keep only: Init → Plan → Build → Test → Done
```

---

## Final Structure (After Cleanup)

```
.specweave/docs/internal/architecture/diagrams/
├── README.md                               # Updated guide
├── specweave-complete-lifecycle-v2.md      # CURRENT (6 diagrams)
├── meta-capability.mmd                     # Meta-capability diagram
├── meta-capability.svg
└── [optional] specweave-lifecycle-simple-v2.mmd   # NEW simple (if created)
```

**Before**: 2 outdated + 1 current = 3 diagram sets (confusion)
**After**: 1 current modular = clean, clear, maintainable

---

## Decision Matrix: Do You Need Simple?

| Scenario | Need Simple? | Recommendation |
|----------|--------------|----------------|
| **README.md** needs 30-second overview | ✅ Yes | Create simple OR use Comparison Matrix |
| **Docs site** has landing page | ✅ Yes | Create simple |
| **Only technical docs** (no landing page) | ❌ No | v2 Main Flow is fine |
| **YouTube video** is primary content | ❌ No | v2 modular diagrams sufficient |
| **Sales/marketing** materials needed | ✅ Yes | Create simple OR use Context Efficiency |

**My gut**: You probably DON'T need simple yet.

**Why**:
- YouTube video = primary use case = v2 modular diagrams perfect
- Docs site can use v2 "Comparison Matrix" for quick intro
- README.md can use v2 "Comparison Matrix" (decision tree format)

**Create simple later** when you have:
- Sales team asking for 1-pager
- Conference talk (need slide version)
- Marketing campaign (need social media version)

---

## Answer to Your Question

**Q: "Do I really need 2?"**

**A: No. You need ZERO old diagrams and ONE current modular set.**

**What to do**:
1. ✅ **Delete both old diagrams** (simple + detailed)
2. ✅ **Keep v2 modular diagrams** (6 diagrams, mix and match)
3. ⏸️ **Create new simple LATER** (only if needed for landing page)

**When to use which** (after cleanup):
- **Quick intro** (30 sec): v2 Comparison Matrix OR create simple later
- **Technical deep dive** (10 min): v2 Main Flow
- **YouTube video** (28 min): All 6 v2 diagrams
- **Specific feature** (2 min): Individual v2 diagram (plugin detection, etc.)

---

**Bottom line**: The v2 modular set is SO comprehensive that you don't need the old "simple vs detailed" split anymore. Each of the 6 v2 diagrams serves a specific purpose. Mix and match as needed.

**Execute cleanup?** I can run the deletion commands if you approve.
