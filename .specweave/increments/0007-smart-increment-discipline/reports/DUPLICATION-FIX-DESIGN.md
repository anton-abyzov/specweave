# ⛔ INCORRECT - SEE CORRECTED-ARCHITECTURE.md

**This design was based on a misunderstanding. See CORRECTED-ARCHITECTURE.md for the correct solution.**

---

# Duplication Fix: Strategy vs Spec.md (INCORRECT APPROACH)

**Issue**: increment-planner and PM agent create duplicate user stories/requirements in two locations
**Increment**: 0007-smart-increment-discipline
**Created**: 2025-11-04
**Status**: ⛔ INCORRECT - Misunderstood the problem
**Priority**: P1 (Causes confusion, violates single source of truth)

---

## Problem Statement

### Current Behavior (WRONG ❌)

When users run `/specweave:inc "Add weather dashboard"`, the system creates:

**Location 1**: `.specweave/docs/internal/strategy/weather-dashboard/`
```
├── overview.md           # Product vision, problem statement
├── requirements.md       # FR-001, FR-002, NFR-001 (detailed)
├── user-stories.md       # US-001, US-002, US-003 (detailed)
└── success-criteria.md   # KPIs, metrics
```

**Location 2**: `.specweave/increments/0001-weather-dashboard/spec.md`
```markdown
# User Stories (Summary)

**Complete user stories**: [user-stories.md](../../docs/internal/strategy/weather-dashboard/user-stories.md)

Quick summary:
- US-001: View current weather
- US-002: View 7-day forecast
- US-003: Search by location
```

### The Duplication

**Same content exists in TWO places**:
1. Detailed user stories in `strategy/weather-dashboard/user-stories.md`
2. Summary (or full copy) in `increments/0001-weather-dashboard/spec.md`

**Result**:
- ❌ Violates single source of truth principle
- ❌ Creates maintenance burden (update both files)
- ❌ Causes confusion (which is authoritative?)
- ❌ Bloats repository (same info twice)
- ❌ Contradicts CLAUDE.md definition: "strategy/ = business strategy, market analysis"

### Root Cause

**File**: `plugins/specweave/skills/increment-planner/SKILL.md`
**Lines**: 84-89, 146-156

```markdown
1. Living docs (source of truth):
   - Create .specweave/docs/internal/strategy/{module-name}/
     * overview.md (product vision, problem, users)
     * requirements.md (FR-001, NFR-001, technology-agnostic)  ← DETAILED
     * user-stories.md (US1, US2, US3...)  ← DETAILED
     * success-criteria.md (KPIs, metrics)
```

**File**: `plugins/specweave/agents/pm/AGENT.md`
**Lines**: 136-143

```markdown
.specweave/docs/internal/strategy/{module}/
├── overview.md          # Product vision, problem statement, target users
├── requirements.md      # Complete functional & non-functional requirements  ← DETAILED
├── user-stories.md      # All user stories (US1, US2, US3, ...)  ← DETAILED
├── success-criteria.md  # KPIs, metrics, business goals
```

---

## Solution: Make Strategy Optional & High-Level Only

### Correct Architecture (NEW ✅)

**Strategy folder** = Optional, high-level business context only:
```
.specweave/docs/internal/strategy/weather-dashboard/
├── overview.md           # High-level product vision, market opportunity
└── business-case.md      # (optional) ROI, competitive analysis

❌ NO user-stories.md       (goes in spec.md)
❌ NO requirements.md       (goes in spec.md)
❌ NO success-criteria.md   (goes in spec.md)
```

**Increment spec.md** = ONLY source of truth for requirements:
```
.specweave/increments/0001-weather-dashboard/spec.md

Contains:
✅ User stories (US-001, US-002, US-003)
✅ Acceptance criteria (AC-US1-01, AC-US1-02)
✅ Functional requirements (FR-001, FR-002)
✅ Non-functional requirements (NFR-001, NFR-002)
✅ Success criteria (KPIs, metrics)
✅ Test strategy
```

### What Goes Where?

| Content Type | Strategy Folder | Increment spec.md |
|--------------|----------------|-------------------|
| Product vision (high-level) | ✅ overview.md | ❌ |
| Market analysis | ✅ overview.md | ❌ |
| Competitive landscape | ✅ overview.md | ❌ |
| Target personas | ✅ overview.md | ❌ |
| Business case (ROI) | ✅ business-case.md | ❌ |
| **User stories (US-001)** | ❌ | ✅ spec.md |
| **Acceptance criteria (AC-*)** | ❌ | ✅ spec.md |
| **Functional requirements (FR-*)** | ❌ | ✅ spec.md |
| **Non-functional requirements (NFR-*)** | ❌ | ✅ spec.md |
| **Success criteria (metrics)** | ❌ | ✅ spec.md |
| **Test strategy** | ❌ | ✅ spec.md |

### Key Principle: Strategic vs Tactical

**Strategy folder** (`docs/internal/strategy/`):
- **Strategic** = Why this product/module exists
- **High-level** = Product vision, market fit, personas
- **Optional** = Not every increment needs strategic docs
- **Stable** = Changes rarely (product vision)
- **Created once** = For the product/module, not per increment

**Increment spec.md**:
- **Tactical** = What this increment will deliver
- **Detailed** = Specific user stories, requirements, AC
- **Mandatory** = Every increment MUST have spec.md
- **Evolving** = Changes during increment lifecycle
- **Created per increment** = New file for each increment

---

## Implementation Plan

### Step 1: Update increment-planner Skill

**File**: `plugins/specweave/skills/increment-planner/SKILL.md`
**Changes**:

```diff
STEP 2: Invoke PM Agent (🚨 MANDATORY - USE TASK TOOL)

Task(
  subagent_type: "pm",
  description: "PM product strategy",
  prompt: "Create product strategy for: [user feature description]

  Context from existing docs: [summary of strategy docs from Step 1]

- You MUST create BOTH living docs AND increment files:
+ You MUST create increment spec.md (primary) AND optionally update strategy docs:

- 1. Living docs (source of truth):
-    - Create .specweave/docs/internal/strategy/{module-name}/
-      * overview.md (product vision, problem, users)
-      * requirements.md (FR-001, NFR-001, technology-agnostic)
-      * user-stories.md (US1, US2, US3...)
-      * success-criteria.md (KPIs, metrics)
+ 1. Strategy docs (optional, high-level only):
+    - IF this is a NEW module/product, create:
+      .specweave/docs/internal/strategy/{module-name}/
+      * overview.md (high-level product vision, market opportunity, personas)
+      * business-case.md (optional - ROI, competitive analysis)
+    - IMPORTANT:
+      * ❌ NO detailed user stories (those go in spec.md)
+      * ❌ NO detailed requirements (those go in spec.md)
+      * ❌ NO acceptance criteria (those go in spec.md)
+      * ✅ ONLY strategic, high-level business context

- 2. Increment file:
-    - Create .specweave/increments/{number}-{name}/spec.md
-    - Keep spec.md < 250 lines (summary only)
-    - MUST reference living docs
-    - Include links to ../../docs/internal/strategy/{module}/
+ 2. Increment spec.md (MANDATORY, source of truth):
+    - Create .specweave/increments/{number}-{name}/spec.md
+    - This is the COMPLETE requirements spec (not a summary!)
+    - Include ALL of:
+      * User stories (US-001, US-002, etc.) with full details
+      * Acceptance criteria (AC-US1-01, etc.)
+      * Functional requirements (FR-001, etc.)
+      * Non-functional requirements (NFR-001, etc.)
+      * Success criteria (metrics, KPIs)
+      * Test strategy
+    - Optionally reference strategy/overview.md for business context
+    - No line limit (be thorough, this is source of truth)

  Tech stack: [detected tech stack]"
)
```

### Step 2: Update PM Agent

**File**: `plugins/specweave/agents/pm/AGENT.md`
**Changes**:

```diff
## ⚠️ CRITICAL: Two-Output Behavior (Living Documentation)

- **MANDATORY**: As PM Agent, you create **TWO TYPES** of documentation for EVERY increment:
+ **PRIMARY**: Create increment spec.md (source of truth for requirements)
+ **OPTIONAL**: Update strategy docs if needed (high-level business context only)

- ### Output 1: Living Strategy Docs (Source of Truth) ✅
+ ### Output 1: Strategy Docs (Optional, High-Level Only) ⚠️

- **Location**: `.specweave/docs/internal/strategy/{module}/`
+ **Location**: `.specweave/docs/internal/strategy/{module}/` (create only if NEW module)

- **Purpose**: Complete, comprehensive business requirements that grow with the project
+ **Purpose**: High-level product vision and business context (NOT detailed requirements)

**Files to Create**:
```
.specweave/docs/internal/strategy/{module}/
- ├── overview.md          # Product vision, problem statement, target users
- ├── requirements.md      # Complete functional & non-functional requirements
- ├── user-stories.md      # All user stories (US1, US2, US3, ...)
- ├── success-criteria.md  # KPIs, metrics, business goals
- └── roadmap.md           # Product roadmap (if applicable)
+ ├── overview.md          # High-level product vision, market opportunity, personas
+ └── business-case.md     # (optional) ROI, competitive analysis, market fit
```

- **Rationale**: Internal docs = strategic, team-only content (architecture decisions, business strategy)
+ **Rationale**: Strategy docs provide business context, but spec.md is source of truth

**Format Rules**:
- - ✅ **Technology-agnostic** (WHAT and WHY only)
- - ✅ **Complete** (all details, no summaries)
- - ✅ **Reusable** (future increments reference these)
- - ❌ **No HOW** (no tech stack, no implementation details)
+ - ✅ **High-level** (product vision, market opportunity)
+ - ✅ **Strategic** (WHY this product exists, target market)
+ - ✅ **Optional** (only create if new module/product)
+ - ❌ **No detailed user stories** (those go in spec.md)
+ - ❌ **No requirements** (FR-001, NFR-001 go in spec.md)

**Examples**:
```markdown
# ✅ CORRECT (High-Level Strategic Content)
- "System receives real-time price updates from exchanges"
- "User authenticates with email and password"
- "Data persists reliably with < 1% loss"
+ "Weather dashboard targets outdoor enthusiasts and event planners"
+ "Market opportunity: 50M+ users need reliable weather data"
+ "Competitive advantage: Hyper-local predictions vs. national forecasts"

# ❌ WRONG (Detailed Requirements - these go in spec.md)
- "System connects via WebSocket to Binance API"
- "User authenticates using JWT tokens in PostgreSQL"
- "Data persists to PostgreSQL with TimescaleDB extension"
+ "US-001: As a user, I want to view current temperature..."
+ "FR-001: System shall display temperature in Celsius/Fahrenheit"
+ "NFR-001: Page load time < 2 seconds"
```

---

- ### Output 2: Increment Spec (Summary) ✅
+ ### Output 2: Increment Spec (Source of Truth) ✅

**Location**: `.specweave/increments/{increment-id}/spec.md`

- **Purpose**: Quick reference summary that **REFERENCES** (not duplicates) strategy docs
+ **Purpose**: Complete, detailed requirements specification (PRIMARY source of truth)

**Format**:
```markdown
---
increment: 0001-feature-name
title: "Feature Title"
priority: P1
status: planned
created: 2025-10-26
---

# Feature: [Name]

## Overview

- See complete product vision: [Overview](../../docs/internal/strategy/{module}/overview.md)
+ High-level business context: [Strategy Overview](../../docs/internal/strategy/{module}/overview.md)
+ (Optional - only if strategy docs exist)

- ## Requirements (Summary)
+ ## User Stories

- **Complete requirements**: [requirements.md](../../docs/internal/strategy/{module}/requirements.md)
+ ### US-001: View Current Weather (Priority: P1)

- Quick summary:
- - FR-001: Real-time data updates
- - FR-002: Multi-source support
- - NFR-001: Performance (< 500ms latency)
+ **As a** user visiting the weather app
+ **I want** to see current weather conditions for my location
+ **So that** I can quickly know the current temperature and conditions without digging

- ## User Stories (Summary)
+ **Acceptance Criteria**:
+ - [ ] **AC-US1-01**: Current temperature displayed prominently (large, readable font)
+   - **Priority**: P1
+   - **Testable**: Yes (visual regression test)
+ - [ ] **AC-US1-02**: Weather condition description displayed (e.g., "Partly Cloudy")
+   - **Priority**: P1
+   - **Testable**: Yes
+ - [ ] **AC-US1-03**: Weather icon/visual representation displayed
+   - **Priority**: P1
+   - **Testable**: Yes
+
+ (... repeat for US-002, US-003, etc.)
+
+ ## Functional Requirements
+
+ - **FR-001**: Real-time data updates
+   - System shall fetch weather data every 5 minutes
+   - Priority: P1
+
+ (... continue with all FRs)
+
+ ## Non-Functional Requirements
+
+ - **NFR-001**: Performance (< 500ms latency)
+   - Page load time < 2 seconds
+   - Priority: P1
+
+ (... continue with all NFRs)
+
+ ## Success Criteria
+
+ - **Metric 1**: 80%+ users view weather within 3 seconds
+ - **Metric 2**: < 5% error rate on data fetches
+
+ (... continue with all metrics)
```
```

### Step 3: Update Validation

**File**: `plugins/specweave/skills/increment-planner/SKILL.md`
**Section**: Validation Rules

```diff
### Validation Rules (MANDATORY)

Before completing feature planning, verify:

- **Living Docs Created**:
- - [ ] `.specweave/docs/internal/strategy/{module}/requirements.md` exists
- - [ ] `.specweave/docs/internal/architecture/adr/` has ≥3 ADRs
- - [ ] `requirements.md` is technology-agnostic (no PostgreSQL, WebSocket, etc.)
- - [ ] ADRs follow template (Context, Decision, Alternatives, Consequences)
+ **Strategy Docs (Optional)**:
+ - [ ] If created, `.specweave/docs/internal/strategy/{module}/overview.md` is high-level only
+ - [ ] No detailed user stories in strategy docs (US-001, etc.)
+ - [ ] No detailed requirements in strategy docs (FR-001, NFR-001, etc.)

- **Increment Files Reference Living Docs**:
- - [ ] `spec.md` has links to `../../docs/internal/strategy/{module}/`
- - [ ] `plan.md` has links to `../../docs/internal/architecture/adr/`
- - [ ] `spec.md` is < 250 lines (summary only)
- - [ ] `plan.md` is < 500 lines (summary only)
+ **Increment spec.md (Mandatory)**:
+ - [ ] `spec.md` contains ALL user stories (US-001, US-002, etc.) with full details
+ - [ ] `spec.md` contains ALL acceptance criteria (AC-US1-01, etc.)
+ - [ ] `spec.md` contains ALL requirements (FR-001, NFR-001, etc.)
+ - [ ] `spec.md` contains success criteria (metrics, KPIs)
+ - [ ] `spec.md` may reference `../../docs/internal/strategy/{module}/overview.md` for context
+ - [ ] No line limit on spec.md (be thorough!)
```

### Step 4: Update CLAUDE.md

**File**: `CLAUDE.md`
**Section**: Directory Structure

```diff
.specweave/
├── docs/
│   ├── internal/           # Strategic docs (NEVER published)
- │   │   ├── strategy/       # Business strategy, market analysis
+ │   │   ├── strategy/       # High-level product vision, market analysis (OPTIONAL)
+ │   │   │   └── {module}/   # Created only for new products/modules
+ │   │   │       ├── overview.md      # Product vision, market opportunity
+ │   │   │       └── business-case.md # (optional) ROI, competitive analysis
+ │   │   │   # ❌ NO user-stories.md (those go in increment spec.md)
+ │   │   │   # ❌ NO requirements.md (those go in increment spec.md)
```

### Step 5: Add Task to Increment 0007

**File**: `.specweave/increments/0007-smart-increment-discipline/tasks.md`

Add new task after T-024:

```markdown
#### T-002a: Fix strategy/spec.md duplication issue

**User Story**: US-BUGFIX
**Acceptance Criteria**: Prevent duplicate user stories in strategy/ and spec.md
**Priority**: P1
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** increment-planner invoked
- **When** creating new increment
- **Then** strategy docs are optional and high-level only
- **And** spec.md contains ALL detailed requirements
- **And** no duplication between strategy/ and spec.md

**Test Cases**:
1. **Manual**: Create test increment
   - Run: `/specweave:inc "9995-test-no-duplication"`
   - Check: No `docs/internal/strategy/test-no-duplication/user-stories.md`
   - Check: `increments/9995-test-no-duplication/spec.md` has full user stories
   - **Coverage**: 100%

**Implementation**:
1. Update `plugins/specweave/skills/increment-planner/SKILL.md` per design doc
2. Update `plugins/specweave/agents/pm/AGENT.md` per design doc
3. Update validation rules
4. Test with new increment
5. Update CLAUDE.md
```

---

## Migration Path for Existing Increments

**For increments created before this fix**:

1. **If strategy docs exist with duplicate content**:
   - Keep spec.md as source of truth
   - Optionally reduce strategy/overview.md to high-level only
   - Delete strategy/user-stories.md, strategy/requirements.md, strategy/success-criteria.md
   - Or keep them but add warning: "Deprecated - see increment spec.md for current requirements"

2. **If spec.md is just a summary**:
   - Expand spec.md to include full details from strategy docs
   - Make spec.md the complete source of truth
   - Reduce strategy docs to high-level only

**No forced migration required** - this is a forward-looking fix.

---

## Success Criteria

1. ✅ New increments have NO duplicate user stories
2. ✅ Strategy docs are optional and high-level only
3. ✅ Increment spec.md is the ONLY source of truth for requirements
4. ✅ Test increment creation shows correct behavior
5. ✅ CLAUDE.md updated with correct architecture

---

## Files Changed

1. `plugins/specweave/skills/increment-planner/SKILL.md` - Remove strategy duplication
2. `plugins/specweave/agents/pm/AGENT.md` - Clarify strategy vs spec.md boundaries
3. `CLAUDE.md` - Update directory structure documentation
4. `.specweave/increments/0007-smart-increment-discipline/tasks.md` - Add task T-002a
5. `.specweave/increments/0007-smart-increment-discipline/reports/DUPLICATION-FIX-DESIGN.md` - This document

---

**Created**: 2025-11-04
**Part of**: Increment 0007-smart-increment-discipline
**Status**: Design approved, ready for implementation
