---
sidebar_position: 3
slug: 02-three-file-structure
title: "Lesson 2: The Three-File Structure"
description: "Understand spec.md, plan.md, and tasks.md with a simple example"
---

# Lesson 2: The Three-File Structure

**Time**: 30 minutes
**Goal**: Understand what goes in each file and why

---

## Why Three Files?

Each file serves a different audience and purpose:

```
┌─────────────────────────────────────────────────────────┐
│  spec.md        plan.md         tasks.md               │
│  (WHAT)         (HOW)           (DO)                   │
├─────────────────────────────────────────────────────────┤
│  Owner:         Owner:          Owner:                 │
│  PM/Product     Architect       Developer              │
│                                                        │
│  Audience:      Audience:       Audience:              │
│  Everyone       Developers      Developers             │
│                                                        │
│  Language:      Language:       Language:              │
│  Business       Technical       Technical + Tests      │
└─────────────────────────────────────────────────────────┘
```

**Key principle**: Each concept lives in exactly ONE place.

---

## Example Feature: Click Counter

Let's see how a simple "Click Counter" feature would be documented across all three files.

:::tip Why this example?
A click counter is simple enough to understand quickly, but shows all the concepts you need.
:::

---

## File 1: spec.md — The Business Requirements

**spec.md** answers: *"What are we building and why?"*

```markdown
---
increment: 0001-click-counter
feature_id: FS-001
status: planning
---

# Click Counter Feature

## Summary

Add a click counter to the homepage that tracks and displays
how many times the user has clicked a button.

## Business Context

**Problem**: Users have no interactive elements on the homepage.
**Goal**: Increase user engagement with a simple interactive widget.
**Success Metric**: Average clicks per session > 3

---

## User Stories

### US-001: Click to Increment

**As a** visitor on the homepage,
**I want** to click a button that increments a counter,
**So that** I can see my interaction tracked.

#### Acceptance Criteria

- **AC-US1-01**: Button displays "Click me!"
- **AC-US1-02**: Counter starts at 0
- **AC-US1-03**: Each click increments counter by 1
- **AC-US1-04**: Counter displays current value

### US-002: Persist Count

**As a** returning visitor,
**I want** my click count to persist,
**So that** I can see my total clicks across visits.

#### Acceptance Criteria

- **AC-US2-01**: Count saved to localStorage
- **AC-US2-02**: Count restored on page load

---

## Non-Functional Requirements

- **NFR-001**: Button click response < 50ms
```

### What Goes in spec.md

| Include | Don't Include |
|---------|---------------|
| User stories | Code snippets |
| [Acceptance criteria](/docs/glossary/terms/acceptance-criteria) | Class names |
| Business value | Technical decisions |
| Success metrics | File paths |
| Constraints | Implementation details |

---

## File 2: plan.md — The Technical Design

**plan.md** answers: *"How will we build this?"*

```markdown
# Implementation Plan: Click Counter

## Architecture

### Component: ClickCounter

**Pattern**: React functional component with useState
**File**: `src/components/ClickCounter.tsx`

**State**:
```typescript
interface CounterState {
  count: number;
}
```

**Responsibilities**:
- Render button and count display
- Handle click events
- Persist to localStorage

### Technical Decisions

**TD-001**: useState vs useReducer
- **Decision**: useState (simpler for single value)
- **Rationale**: No complex state transitions needed

**TD-002**: localStorage for persistence
- **Decision**: Use localStorage directly
- **Rationale**: No backend needed, instant save/load

### Data Flow

```
User Click → onClick handler → setCount(count + 1) → useEffect → localStorage.setItem()
Page Load → useEffect → localStorage.getItem() → setCount(savedValue)
```
```

### What Goes in plan.md

| Include | Don't Include |
|---------|---------------|
| Architecture diagrams | User stories |
| Component designs | Acceptance criteria |
| Technical decisions | Task checkboxes |
| Data models | "As a user" language |
| Integration points | Business justification |

---

## File 3: tasks.md — The Implementation Steps

**tasks.md** answers: *"What specific steps do we take?"*

```markdown
# Tasks: Click Counter

## Progress: 0/3 tasks (0%)

---

### T-001: Create ClickCounter Component

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04
**Status**: [ ] pending

**Implementation**:
- [ ] Create `src/components/ClickCounter.tsx`
- [ ] Add useState for count
- [ ] Render button with "Click me!" text
- [ ] Render count display
- [ ] Add onClick handler to increment

**Test Plan** (BDD):
- **Given** counter at 0
- **When** button clicked
- **Then** counter shows 1

**Test Cases**:
- `counter_initial_showsZero`
- `counter_afterClick_incrementsByOne`
- `button_render_showsClickMe`

---

### T-002: Add localStorage Persistence

**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02
**Status**: [ ] pending

**Implementation**:
- [ ] Add useEffect to save count on change
- [ ] Add useEffect to load count on mount
- [ ] Handle missing/invalid localStorage data

**Test Plan** (BDD):
- **Given** count is 5
- **When** page reloads
- **Then** counter shows 5

**Test Cases**:
- `persistence_save_storesInLocalStorage`
- `persistence_load_restoresCount`
- `persistence_corrupt_defaultsToZero`

---

### T-003: Add to Homepage

**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [ ] pending

**Implementation**:
- [ ] Import ClickCounter in HomePage
- [ ] Add component to render
- [ ] Verify styling matches design
```

### What Goes in tasks.md

| Include | Don't Include |
|---------|---------------|
| Task IDs (T-XXX) | Architecture decisions |
| [AC-ID](/docs/glossary/terms/ac-id) links | User story definitions |
| Implementation checkboxes | Why decisions were made |
| Test plans (BDD) | Business justification |
| Status tracking | Detailed code |

---

## How Files Connect: AC-IDs

The magic is in the **AC-ID** references. They create traceability:

```
spec.md                    tasks.md
────────                   ────────

AC-US1-01: Button shows    T-001: Create ClickCounter
"Click me!"                **Satisfies ACs**: AC-US1-01 ←─┐
           ─────────────────────────────────────────────┘
```

This lets you answer:
- "Which tasks implement AC-US1-01?" → Look at tasks.md
- "What requirement does T-001 satisfy?" → Check the AC-ID

---

## The Golden Rule

> **Each concept lives in exactly ONE place.**

| Concept | Lives In | Never In |
|---------|----------|----------|
| User stories | spec.md | plan.md, tasks.md |
| Technical decisions | plan.md | spec.md, tasks.md |
| Implementation steps | tasks.md | spec.md, plan.md |

If you find yourself duplicating content, you're putting it in the wrong file.

---

## Quick Exercise

Look at this snippet and identify what's wrong:

```markdown
### US-001: User Login

**Implementation**:
- [ ] Create LoginForm component
- [ ] Add JWT token handling
```

**Answer**: Implementation details don't belong in spec.md (user stories). This should be:

```markdown
### US-001: User Login

**As a** registered user,
**I want** to log in with my credentials,
**So that** I can access my account.

#### Acceptance Criteria
- **AC-US1-01**: Login form accepts email and password
- **AC-US1-02**: Successful login redirects to dashboard
```

The implementation details go in tasks.md.

---

## Glossary Terms Used

- **[Acceptance Criteria](/docs/glossary/terms/acceptance-criteria)** — Testable success conditions
- **[AC-ID](/docs/glossary/terms/ac-id)** — Acceptance criteria identifier (e.g., AC-US1-01)
- **[User Stories](/docs/glossary/terms/user-stories)** — Requirements from user perspective
- **[Increment](/docs/glossary/terms/increments)** — A unit of work

---

## Key Takeaways

1. **spec.md** = Business requirements (WHAT)
2. **plan.md** = Technical design (HOW)
3. **tasks.md** = Implementation steps (DO)
4. **AC-IDs** connect requirements to tasks
5. **Each concept** lives in exactly one place

---

## What's Next?

Now you understand the structure. In the next lesson, you'll create a complete increment from start to finish.

**:next** → [Lesson 3: Your First Increment](./03-your-first-increment)
