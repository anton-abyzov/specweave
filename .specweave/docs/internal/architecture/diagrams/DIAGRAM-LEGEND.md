# SpecWeave Workflow Diagram - Visual Legend

This document explains all the symbols, colors, and visual conventions used in SpecWeave workflow diagrams.

---

## Node Types & Colors

### 🔵 Agents (Light Blue)
**Color**: `#e1f5ff` (fill), `#0288d1` (border)

Represents AI agents that perform complex, multi-step tasks in separate context windows.

**Examples**:
- `PM Agent` - Product Manager (requirements gathering)
- `Architect Agent` - System design and ADRs
- `QA Agent` - Test strategy and coverage
- `Security Agent` - Threat modeling
- `DevOps Agent` - Infrastructure design

**Invoked via**: `Task` tool with `subagent_type` parameter

---

### 🟠 Skills (Light Orange)
**Color**: `#fff3e0` (fill), `#f57c00` (border)

Represents skills that activate automatically based on context, sharing main conversation window.

**Examples**:
- `skill-router` - Routes requests to appropriate skills
- `context-loader` - Loads context via manifest (Pass 1)
- `context-optimizer` - Optimizes context via intent analysis (Pass 2)
- `increment-validator` - Rule-based validation
- `increment-quality-judge` - LLM-as-Judge quality scoring
- `docs-updater` - Documentation updates

**Activates**: Automatically when keywords/conditions match

---

### 💎 Decision Diamonds (Purple)
**Color**: `#f3e5f5` (fill), `#7b1fa2` (border)

Represents decision points where workflow branches based on conditions.

**Examples**:
- `".specweave/ exists?"` - Check if SpecWeave initialized
- `"Score ≥ 0.80?"` - Quality threshold check
- `"Infrastructure needed?"` - Conditional DevOps agent
- `"Tests Pass?"` - Test validation gate
- `"More features to build?"` - Workflow continuation

**Format**: Always phrased as a question with Yes/No paths

---

### ✅ Success Nodes (Green)
**Color**: `#e8f5e9` (fill), `#388e3c` (border)

Represents successful completion of a phase or validation gate.

**Examples**:
- `✅ Project Ready` - Initialization complete
- `✅ Increment Planned` - Planning phase done
- `✅ Validation Passed` - Validation successful
- `✅ Implementation Done` - Code complete
- `✅ Docs Updated` - Documentation updated
- `✅ Deployed` - Deployment successful

**Indicates**: Milestone reached, ready to proceed

---

### ⚠️ Warning Nodes (Yellow)
**Color**: `#fff9c4` (fill), `#f57f17` (border)

Represents warnings or issues that require user attention but don't block workflow.

**Examples**:
- `⚠️ Warn User: Review Report` - Validation issues found
- `⚠️ Warn: Missing Coverage` - Test coverage incomplete

**Indicates**: User should review but workflow can continue

---

### 🔄 Feedback Loop Nodes (Blue Dashed)
**Color**: `#e3f2fd` (fill), `#1976d2` (border), `stroke-dasharray: 5 5`

Represents refinement/iteration steps in auto-refinement feedback loops.

**Examples**:
- `🔄 Refine with feedback` - Agent refines output based on validation
- `🔄 Ready for first increment` - Loop back to increment creation

**Indicates**: Iterative improvement, up to max 3 attempts

**Styling**: Dashed border distinguishes from regular nodes

---

## Symbols & Annotations

### 📁 File Location
Indicates WHERE a file or folder is created in the SpecWeave structure.

**Examples**:
- `📁 .specweave/increments/0001-name/` - Increment folder
- `📁 increments/0001-name/spec.md` - Spec file
- `📁 docs/internal/architecture/adr/0001-*.md` - ADR files
- `📁 tests/e2e/` - E2E test directory
- `📁 increments/0001-name/reports/validation-report.md` - Report file

**Purpose**: Complete traceability - users know exactly where to find artifacts

---

### 🔔 Hook Trigger
Indicates automatic triggering via Claude Code hooks.

**Example**:
- `🔔 Triggered automatically` (in docs update subgraph)

**Purpose**: Shows automation, no user action required

---

### 📊 Data/Metrics
Indicates analysis, reporting, or metrics generation.

**Examples**:
- `📊 Scan codebase` - Brownfield analysis
- `📊 Hetzner vs AWS vs Vercel` - Cost comparison
- `📊 Clarity, Testability, Completeness...` - Quality dimensions

**Purpose**: Highlights data-driven decisions

---

### 📝 Document/File Creation
Indicates writing or updating documentation/code files.

**Examples**:
- `📝 Retroactive specs` - Document existing code
- `📝 Analyze changes` - Review what changed
- `📝 Update src/` - Modify source code

**Purpose**: Shows documentation/code modifications

---

### ✅ Validation/Check
Indicates validation, testing, or verification step.

**Examples**:
- `✅ Regression protection` - Baseline tests
- `✅ Must tell truth (no false positives)` - Test requirement

**Purpose**: Emphasizes quality gates

---

### 🚀 Deployment/Infrastructure
Indicates deployment or infrastructure provisioning.

**Example**:
- `🚀 Deploy to target` - Actual deployment step

**Purpose**: Highlights production operations

---

## Subgraph Categories

### 🆕 Project Initialization
**Border**: Solid
**Contains**: Tech stack detection, selective installation, structure creation

**Flow**: New projects only, one-time setup

---

### 🔧 Brownfield Path
**Border**: Solid
**Contains**: Code analysis, documentation merge, baseline testing

**Flow**: Existing projects with code, optional path

---

### 📋 Feature Planning (Multi-Agent + Feedback Loops)
**Border**: Solid
**Contains**: PM/Arch/QA/Security agents with auto-refinement loops

**Flow**: Every increment, iterative with quality validation

**Key Feature**: Shows max 3 refinement attempts per agent

---

### ✅ Multi-Layer Validation
**Border**: Solid
**Contains**: Rule-based → Deep analysis → LLM-as-Judge → Test execution

**Flow**: 4 verification layers, increasing depth

**Key Feature**: Shows optional quality judge step

---

### 💻 Implementation Phase (Context-Optimized)
**Border**: Solid
**Contains**: 2-pass context loading, code generation, testing

**Flow**: Uses optimized context (82% reduction), test-driven

**Key Feature**: Shows token reduction numbers (150k → 27k)

---

### 🎯 Acceptance Criteria Validation
**Border**: Solid
**Contains**: TC-0001 traceability mapping

**Flow**: Ensures all acceptance criteria tested

---

### 📚 Documentation Updates (Auto)
**Border**: Solid
**Contains**: Hook-triggered docs updating

**Flow**: Automatic via `post-task-completion` hook

**Key Feature**: No user action required

---

### 🚀 Deployment (Optional)
**Border**: Solid
**Contains**: Target selection, infrastructure generation, provisioning

**Flow**: Optional, only when ready to deploy

**Key Feature**: Cost optimizer for platform comparison

---

## Connection Types

### Solid Arrow (→)
**Meaning**: Sequential flow, one step after another

**Example**: `PM Agent → Architect Agent → QA Agent`

---

### Dashed Arrow (⇢)
**Meaning**: Optional or conditional flow

**Example**: Not currently used, but reserved for future

---

## Token Reduction Annotations

Shows exact token counts to demonstrate context optimization:

```
150k tokens → 45k tokens (70% reduction)
  ↓ Pass 2
45k tokens → 27k tokens (additional 40% reduction)
Total: 82% reduction
```

**Purpose**: Demonstrates scalability to enterprise specs (500-1000+ pages)

---

## Quality Scoring Annotations

Shows scoring thresholds and dimensions:

```
Score ≥ 0.80? (threshold for auto-refinement)
Score ≥ 87/100? (threshold for quality judge)
```

**6 Dimensions**:
1. **Clarity** - Clear and unambiguous requirements
2. **Testability** - Acceptance criteria can be tested
3. **Completeness** - Edge cases covered
4. **Feasibility** - Technically sound design
5. **Maintainability** - Sustainable long-term
6. **Architecture** - Design decisions justified

---

## Iteration Indicators

### Max Attempts
Shows maximum refinement attempts:

```
Attempt 1/3 → Attempt 2/3 → Attempt 3/3 → Use Best Result
```

**Purpose**: Prevents infinite loops, ensures progress

---

### Round Numbers
Shows refinement iteration:

```
PM Agent (Round 1) → PM Agent (Round 2) → PM Agent (Round 3)
```

**Purpose**: Tracks improvement over iterations

---

## File Organization Patterns

### Increment-Scoped Files
All in `.specweave/increments/0001-name/`:
- `spec.md` - Requirements
- `plan.md` - Technical design
- `tasks.md` - Implementation checklist
- `tests.md` - Test strategy
- `context-manifest.yaml` - Context loading config
- `security.md` - Threat model
- `reports/` - Validation/quality reports
- `scripts/` - Helper scripts
- `logs/` - Execution logs
- `infra/` - Infrastructure code

**Benefit**: Complete traceability, easy cleanup, clear context

---

### Shared Documentation
In `.specweave/docs/internal/`:
- `strategy/` - Business specs (WHAT, WHY)
- `architecture/` - Technical design (HOW)
  - `adr/` - Architecture Decision Records
  - `diagrams/` - System diagrams
- `delivery/` - Roadmap, CI/CD, guides
- `operations/` - Runbooks, SLOs
- `governance/` - Security, compliance

**Benefit**: Cross-increment knowledge sharing

---

### Test Repository
In `.specweave/tests/` (centralized) or `tests/` (project root):
- `unit/` - Unit tests
- `integration/` - Integration tests
- `e2e/` - End-to-end tests (Playwright)

**Benefit**: Organized by test type, easy to run

---

## Reading the Diagram

### Top-to-Bottom Flow
Workflow generally flows from top to bottom, left to right.

**Start**: `User Request`
**End**: `Workflow Complete` or `Project Complete`

---

### Subgraph Boundaries
Dashed rectangles group related steps.

**Purpose**: Visual organization, shows phases

---

### Decision Points
Always diamond-shaped, always phrased as questions.

**Format**: `Condition?`
**Paths**: Yes (down/right), No (right/down)

---

### Feedback Loops
Look for dashed-border nodes connecting back to earlier steps.

**Identifies**: Iteration, refinement, retry logic

---

## Example: Reading Auto-Refinement Loop

```
PM Agent (Round 1) [Blue Agent]
  ↓
Validate Quality [Orange Skill]
  ↓
Score ≥ 0.80? [Purple Diamond]
  ↓ No (Attempt 1/3)
🔄 Refine with feedback [Blue Dashed Loop Node]
  ↓
PM Agent (Round 2) [Blue Agent]
  ↓
Validate Quality [Orange Skill]
  ↓
Score ≥ 0.80? [Purple Diamond]
  ↓ Yes
✅ PM Done [Green Success]
  ↓
Architect Agent [Blue Agent]
```

**Key Points**:
1. Agent generates output (blue)
2. Skill validates quality (orange)
3. Decision checks score (purple)
4. If fails, refine (dashed blue loop)
5. If passes, proceed (green success)
6. Next agent starts (blue)

---

## Summary: Quick Reference

| Symbol | Meaning |
|--------|---------|
| 🔵 Light Blue | Agent (separate context) |
| 🟠 Light Orange | Skill (shared context) |
| 💎 Purple Diamond | Decision point |
| ✅ Green | Success/milestone |
| ⚠️ Yellow | Warning |
| 🔄 Blue Dashed | Feedback loop |
| 📁 | File location |
| 🔔 | Hook trigger (auto) |
| 📊 | Data/metrics |
| 📝 | Document/file creation |
| ✅ | Validation/check |
| 🚀 | Deployment |

---

**Use this legend** to navigate the comprehensive SpecWeave workflow diagram and understand every step of the spec-driven development process.
