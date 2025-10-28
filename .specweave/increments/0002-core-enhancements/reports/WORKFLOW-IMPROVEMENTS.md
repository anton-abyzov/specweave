# SpecWeave Workflow Diagram - Comprehensive Improvements

**Date**: 2025-10-28
**Files**:
- Original: `specweave-workflow.mmd`
- Improved: `specweave-workflow-complete.mmd`

---

## Critical Issues Fixed

### 1. **"Project Ready" Dead End** ✅ FIXED

**Problem**: After project initialization, `InitDone["✅ Project Ready"]` had no outgoing connection. Workflow stopped.

**Solution**: Added connection to first increment:
```mermaid
InitDone --> FirstIncrement["🔄 Ready for first increment"]
FirstIncrement --> Planning
```

**Rationale**: After initializing SpecWeave, users ALWAYS create their first increment. This is the natural next step.

---

### 2. **Missing Auto-Refinement Feedback Loops** ✅ ADDED

**Problem**: PM/Architect/QA agents appeared to run once, but the framework supports auto-refinement with max 3 attempts.

**Solution**: Added feedback loops for each agent with quality validation:

```
PM Agent (Round 1) → Validate Quality → Score ≥ 0.80?
  ↓ No (Attempt 1/3)
PM Refine → PM Agent (Round 2) → Validate Quality → Score ≥ 0.80?
  ↓ No (Attempt 2/3)
PM Refine → PM Agent (Round 3) → Validate Quality → Use Best Result
  ↓ Yes
PM Done ✅
```

**Visualized for**:
- PM Agent (spec.md generation)
- Architect Agent (plan.md + ADRs)
- QA Agent (tests.md + coverage matrix)

**Rationale**: Shows that SpecWeave automatically refines outputs until quality threshold met, demonstrating the framework's commitment to quality.

---

### 3. **Missing Quality Judge (LLM-as-Judge)** ✅ ADDED

**Problem**: `increment-quality-judge` skill existed but wasn't visualized. This is a critical optional quality gate.

**Solution**: Added as optional step after rule-based validation:

```
Rule-based Validation (120 rules) → Pass → Ask: "User wants quality check?"
  ↓ Yes
increment-quality-judge (LLM-as-Judge) → Score ≥ 87/100?
  ↓ No
Generate quality-report.md → Ask: "Improve Now?"
  ↓ Yes
Refine based on AI suggestions → Re-validate
```

**6-Dimension Scoring**:
1. Clarity (clear and unambiguous?)
2. Testability (can acceptance criteria be tested?)
3. Completeness (edge cases covered?)
4. Feasibility (technically sound?)
5. Maintainability (sustainable design?)
6. Architecture (design decisions justified?)

**File Location**: `.specweave/increments/0001-name/reports/quality-report.md`

**Rationale**: Provides nuanced, AI-powered quality assessment beyond rule-based validation. Optional but powerful.

---

### 4. **Missing Context Optimizer (2-Pass)** ✅ ADDED

**Problem**: Only showed `context-loader` (Pass 1), but `context-optimizer` (Pass 2) provides additional 40% reduction.

**Solution**: Visualized 2-pass context optimization with token numbers:

```
Pass 1: context-loader (Load via manifest)
  150k tokens → 45k tokens (70% reduction)
  ↓
Pass 2: context-optimizer (Analyze user intent)
  45k tokens → 27k tokens (additional 40% reduction)
  Total: 82% reduction
```

**How it works**:
- **Pass 1** (Manifest-based): Load only specs in `context-manifest.yaml`
- **Pass 2** (Intent-based): Remove unrelated specs/agents based on task type
  - Bug fix → Remove payment specs if working on auth
  - Backend task → Remove frontend skills
  - Authentication → Remove PM agent (not needed for implementation)

**Rationale**: Shows how SpecWeave scales to enterprise (500-1000+ page specs) through intelligent context reduction.

---

### 5. **Missing File Location Annotations** ✅ ADDED

**Problem**: Diagram didn't show WHERE artifacts are created in the folder structure.

**Solution**: Added 📁 annotations for every file/folder creation:

Examples:
- `spec.md` → `📁 increments/0001-name/spec.md`
- `ADRs` → `📁 docs/internal/architecture/adr/0001-*.md`
- `validation-report.md` → `📁 increments/0001-name/reports/validation-report.md`
- `Infrastructure` → `📁 increments/0001-name/infra/`
- `Tests` → `📁 tests/e2e/`, `📁 tests/unit/`, `📁 tests/integration/`

**Rationale**: Provides complete traceability. Users know exactly where to find artifacts.

---

### 6. **Missing Workflow Continuation** ✅ ADDED

**Problem**: Workflow ended after deployment. Didn't show that users typically build multiple features.

**Solution**: Added loop at the end:

```
Done → Ask: "More features to build?"
  ↓ Yes
Loop back to Planning (create next increment)
  ↓ No
End: Project Complete 🎉
```

**Rationale**: Most projects have multiple increments. Show that workflow repeats.

---

### 7. **All Verification Methods Visualized** ✅ COMPLETE

**Problem**: Unclear what verification methods exist and when they run.

**Solution**: Showed all 4 verification layers:

#### Layer 1: Rule-Based Validation (Always)
- **Tool**: `increment-validator` skill
- **Speed**: 5-10s
- **Rules**: 120 rules (Consistency, Completeness, Quality, Traceability)
- **When**: Automatic on document save

#### Layer 2: Deep Analysis (When Issues Found)
- **Tool**: `increment-validator` agent
- **Speed**: 30-60s
- **Perspectives**: PM, Architect, QA, Security
- **Output**: `validation-report.md`
- **When**: Rule-based validation finds issues

#### Layer 3: LLM-as-Judge (Optional, User-Requested)
- **Tool**: `increment-quality-judge` skill
- **Scoring**: 6 dimensions (0-100 scale)
- **Output**: `quality-report.md`
- **When**: User asks "validate quality of increment X"

#### Layer 4: Test Execution (Always)
- **Tool**: Jest/Pytest/Go Test + Playwright (E2E)
- **Requirement**: >80% coverage, must tell truth (no false positives)
- **When**: Implementation phase

**Rationale**: Shows SpecWeave's comprehensive quality assurance approach. Multiple layers catch different types of issues.

---

## Visual Improvements

### Feedback Loop Styling
- Added dashed-border styling to refinement nodes (`PMRefine1`, `ArchRefine1`, etc.)
- Uses `loopStyle` class: `stroke-dasharray: 5 5` to indicate iteration

### Token Reduction Numbers
- Showed exact token counts: `150k → 45k → 27k`
- Demonstrates scalability to enterprise specs

### File Annotations
- 📁 symbols show exact file locations
- Helps users understand SpecWeave's file organization

### Decision Diamond Clarity
- All decision points use question format ("Score ≥ 0.80?")
- Clear Yes/No paths

---

## Agent Execution Guarantee

**Question**: Are all 4 agents guaranteed to run?

**Answer**: YES, with one conditional:

1. **PM Agent** → ALWAYS runs (generates spec.md)
2. **Architect Agent** → ALWAYS runs (generates plan.md + ADRs)
3. **QA Agent** → ALWAYS runs (generates tests.md)
4. **Security Agent** → ALWAYS runs (generates threat model)
5. **DevOps Agent** → CONDITIONAL (only if infrastructure needed)

The diagram now shows this clearly with the decision diamond:
```
Security Agent → "Infrastructure needed?"
  ↓ Yes
DevOps Agent
  ↓ No
Skip to context manifest
```

---

## Documentation Updates Location

**Question**: Where exactly do docs updates happen?

**Answer**: Clearly shown in "📚 Documentation Updates (Auto)" subgraph:

1. **Trigger**: `post-task-completion` hook (automatic)
2. **Skill**: `docs-updater` (analyzes changes)
3. **Files Updated**:
   - `CLAUDE.md` (if structure changed) → `📁 CLAUDE.md`
   - API Reference (if commands changed) → `📁 .specweave/docs/public/api/`
   - Changelog (feature completed) → `📁 CHANGELOG.md`

**Automatic**: No user action required. Hook triggers after implementation complete.

---

## Comparison: Old vs New

| Feature | Old Diagram | New Diagram |
|---------|-------------|-------------|
| Project Ready dead end | ❌ Stopped after init | ✅ Loops to first increment |
| Auto-refinement loops | ❌ Not shown | ✅ Max 3 attempts per agent |
| Quality judge (LLM) | ❌ Missing | ✅ Optional quality gate |
| Context optimizer (Pass 2) | ❌ Missing | ✅ Shows 82% total reduction |
| File locations | ❌ Not shown | ✅ 📁 annotations everywhere |
| Workflow continuation | ❌ Ends after one feature | ✅ "More features?" loop |
| Verification methods | ⚠️ Partial (rule-based only) | ✅ All 4 layers visualized |
| Token reduction numbers | ❌ Not shown | ✅ 150k → 45k → 27k |

---

## When to Use Which Diagram

### `specweave-workflow.mmd` (Original)
- **Use for**: Quick overview, onboarding new users
- **Pros**: Simpler, easier to understand at a glance
- **Cons**: Missing advanced features

### `specweave-workflow-complete.mmd` (New)
- **Use for**: Complete reference, understanding advanced features
- **Pros**: Shows ALL capabilities, feedback loops, verification layers
- **Cons**: More complex, requires careful study

**Recommendation**: Start users with original, graduate to complete as they gain experience.

---

## Next Steps

1. **Update Documentation**: Reference new diagram in guides
2. **Create Legend**: Separate diagram explaining symbols (📁, 🔄, etc.)
3. **Create Simplified Views**: Extract specific paths (e.g., "Greenfield Path Only")
4. **Add Timing Estimates**: Show how long each phase typically takes
5. **Create Interactive Version**: Clickable nodes that explain each step

---

## Summary

The improved diagram now **comprehensively visualizes the entire SpecWeave workflow** including:

✅ Auto-refinement feedback loops (max 3 attempts)
✅ LLM-as-Judge quality validation (6-dimension scoring)
✅ 2-pass context optimization (82% token reduction)
✅ Exact file locations for all artifacts
✅ All 4 verification layers
✅ Workflow continuation (multiple increments)
✅ Complete traceability from spec → code → tests

**This diagram serves as the definitive reference for understanding how SpecWeave works end-to-end.**
