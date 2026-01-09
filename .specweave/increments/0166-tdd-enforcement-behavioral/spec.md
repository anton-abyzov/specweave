---
increment: 0166-tdd-enforcement-behavioral
title: "TDD Enforcement - Behavioral Implementation"
type: feature
priority: P1
status: completed
created: 2026-01-09
completed: 2026-01-09
epic: CORE-TDD
test_mode: TDD
coverage_target: 80
---

# Feature: TDD Enforcement - Behavioral Implementation

## Problem Statement

**TDD configuration exists but has ZERO behavioral impact.**

Users who select `testMode: "TDD"` during `specweave init` or per-increment expect the system to enforce test-first discipline. Currently:

1. Config is stored correctly (`testing.defaultTestMode: "TDD"`)
2. Metadata captures it (`testMode: "TDD"` in metadata.json)
3. Task generator code exists (`src/core/tdd/task-template-generator.ts`)
4. Warning hook exists (`tdd-enforcement-guard.sh`)

**But NOTHING connects these pieces during actual workflow:**
- `/sw:increment` uses static templates, ignores `testMode`
- `/sw:do` has no TDD awareness
- `/sw:auto` has vestigial `tddMode` flag that does nothing
- Enforcement is warning-only, easily ignored

**Result**: TDD is just a label, not a workflow.

## Ultrathink Analysis

### Why Previous Implementation (0163) Was Archived

The archived increment 0163 was a comprehensive spec but:
1. Too ambitious (5 user stories, complex coverage validation)
2. Didn't address the root issue: **template generation**
3. Focused on validation AFTER tasks exist, not generation DURING planning

### Root Cause Deep Dive

**Gap 1: Template Disconnect**

The `generateTDDTasks()` function in `src/core/tdd/task-template-generator.ts` is NEVER called:

```typescript
// This code exists but is orphaned:
export function generateTDDTasks(options: TDDTaskGenerationOptions): TDDTaskGenerationResult {
  switch (testMode) {
    case 'TDD':
      return generateTDDModeTasks(...);  // Returns RED-GREEN-REFACTOR triplets
```

Instead, increment-planner uses hardcoded templates:
- `templates/tasks-single-project.md`
- `templates/tasks-multi-project.md`

Neither template knows about TDD.

**Gap 2: No Injection Point**

The increment-planner skill reads `testMode` from config but only stores it in metadata.json. It doesn't:
- Choose different template based on testMode
- Pass testMode to any task generation logic
- Inject TDD guidance into the spec or tasks

**Gap 3: Execution Ignorance**

`/sw:do` command has **zero lines** referencing TDD:
```bash
grep -c "testMode\|TDD" plugins/specweave/commands/do.md
# Result: 0
```

It executes tasks sequentially without:
- Checking task phase markers
- Validating task ordering
- Suggesting TDD workflow

### Solution Architecture

**Principle**: Inject TDD at three control points:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  /sw:increment  │────▶│    /sw:do       │────▶│   /sw:done      │
│  (GENERATION)   │     │  (EXECUTION)    │     │  (VALIDATION)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Generate TDD    │     │ Check testMode  │     │ Validate TDD    │
│ triplet tasks   │     │ Enforce order   │     │ compliance      │
│ in tasks.md     │     │ Block GREEN     │     │ before close    │
│                 │     │ before RED      │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Key Insight**: The most impactful fix is **task generation**. If tasks.md already has TDD structure with dependencies, enforcement becomes natural.

---

## User Stories

### US-001: TDD Task Template Generation
**Project**: specweave

**As a** developer who selected TDD mode
**I want** `/sw:increment` to generate tasks in RED-GREEN-REFACTOR triplets
**So that** my tasks.md guides me through proper TDD discipline

**Acceptance Criteria**:
- [x] **AC-US1-01**: When `testMode: "TDD"` in config, increment-planner MUST use TDD task template
  - Priority: P0 (Critical)
  - Testable: Yes
  - Test: Create increment with TDD config, verify tasks have [RED], [GREEN], [REFACTOR] markers

- [x] **AC-US1-02**: Each feature generates a triplet: T-001 [RED], T-002 [GREEN], T-003 [REFACTOR]
  - Priority: P0 (Critical)
  - Testable: Yes
  - Test: Check task IDs and phase markers in generated tasks.md

- [x] **AC-US1-03**: [GREEN] tasks have explicit `**Depends On**: T-XXX [RED]` field
  - Priority: P0 (Critical)
  - Testable: Yes
  - Test: Parse tasks.md, verify GREEN tasks reference their RED prerequisite

- [x] **AC-US1-04**: [REFACTOR] tasks have explicit `**Depends On**: T-XXX [GREEN]` field
  - Priority: P0 (Critical)
  - Testable: Yes

- [x] **AC-US1-05**: spec.md includes TDD Contract section explaining the workflow
  - Priority: P1 (High)
  - Testable: Yes

- [x] **AC-US1-06**: When `testMode: "test-after"`, continue using current implementation-first template
  - Priority: P1 (High)
  - Testable: Yes
  - Test: Create increment with test-after mode, verify no TDD markers

---

### US-002: TDD Template Files
**Project**: specweave

**As a** framework maintainer
**I want** dedicated TDD task templates
**So that** the TDD structure is consistent and maintainable

**Acceptance Criteria**:
- [x] **AC-US2-01**: Create `templates/tasks-tdd-single-project.md` with TDD triplet structure
  - Priority: P0 (Critical)
  - Testable: Yes

- [x] **AC-US2-02**: Create `templates/tasks-tdd-multi-project.md` for umbrella projects
  - Priority: P1 (High)
  - Testable: Yes

- [x] **AC-US2-03**: Create `templates/spec-tdd-contract.md` snippet for TDD guidance
  - Priority: P1 (High)
  - Testable: Yes

- [x] **AC-US2-04**: Templates use consistent phase markers: `[RED]`, `[GREEN]`, `[REFACTOR]`
  - Priority: P0 (Critical)
  - Testable: Yes

---

### US-003: Execution Awareness in /sw:do
**Project**: specweave

**As a** developer running `/sw:do` on a TDD increment
**I want** the system to remind me of TDD workflow
**So that** I don't accidentally skip the test-first approach

**Acceptance Criteria**:
- [x] **AC-US3-01**: `/sw:do` checks `testMode` from metadata.json at start
  - Priority: P0 (Critical)
  - Testable: Yes

- [x] **AC-US3-02**: When TDD mode, show TDD reminder banner before task execution
  - Priority: P1 (High)
  - Testable: Yes
  - Test: Run /sw:do on TDD increment, verify TDD banner appears

- [x] **AC-US3-03**: Suggest `/sw:tdd-cycle` for guided TDD workflow
  - Priority: P2 (Medium)
  - Testable: Yes

- [x] **AC-US3-04**: Parse task phase markers and display current phase
  - Priority: P1 (High)
  - Testable: Yes
  - Test: Execute T-001 [RED], verify output shows "Phase: RED"

---

### US-004: Enforcement Hook Enhancement
**Project**: specweave

**As a** team lead
**I want** configurable enforcement (warn vs block)
**So that** I can choose the right strictness for my team

**Acceptance Criteria**:
- [x] **AC-US4-01**: Add `testing.tddEnforcement` config option: `"strict"` | `"warn"` | `"off"`
  - Priority: P1 (High)
  - Testable: Yes

- [x] **AC-US4-02**: When `strict`, hook BLOCKS completing GREEN before RED
  - Priority: P0 (Critical)
  - Testable: Yes
  - Test: Set strict mode, try marking GREEN complete before RED, verify blocked

- [x] **AC-US4-03**: When `warn` (default), hook warns but allows
  - Priority: P1 (High)
  - Testable: Yes

- [x] **AC-US4-04**: When `off`, no TDD enforcement
  - Priority: P1 (High)
  - Testable: Yes

- [x] **AC-US4-05**: Update `tdd-enforcement-guard.sh` to read enforcement level from config
  - Priority: P0 (Critical)
  - Testable: Yes

---

### US-005: Auto Mode TDD Injection
**Project**: specweave

**As a** developer using `/sw:auto` with TDD mode
**I want** auto mode to inject TDD workflow guidance
**So that** autonomous execution follows test-first discipline

**Acceptance Criteria**:
- [x] **AC-US5-01**: Auto mode reads `testMode` from metadata before execution
  - Priority: P0 (Critical)
  - Testable: Yes

- [x] **AC-US5-02**: When TDD, inject TDD workflow prompt into Claude's context
  - Priority: P0 (Critical)
  - Testable: Yes
  - Test: Run /sw:auto on TDD increment, verify test files created before impl files

- [x] **AC-US5-03**: Create `.specweave/prompts/tdd-workflow-injection.md` prompt template
  - Priority: P1 (High)
  - Testable: Yes

- [x] **AC-US5-04**: Auto mode validates test exists before marking GREEN complete
  - Priority: P1 (High)
  - Testable: Yes

---

## Out of Scope

- Coverage threshold enforcement (existing implementation sufficient)
- Mutation testing integration (future enhancement)
- IDE integration (external tooling)
- Property-based testing enforcement

---

## Technical Constraints

1. **Backwards Compatibility**: Increments without `testMode` default to "test-after"
2. **Performance**: Hooks remain fast (<50ms)
3. **Configurable Strictness**: Default to "warn" not "strict" (gradual adoption)
4. **Template Maintainability**: Use existing template infrastructure

---

## Success Criteria

| Metric | Target |
|--------|--------|
| TDD mode generates triplet tasks | 100% |
| /sw:do shows TDD banner for TDD increments | 100% |
| Strict mode blocks GREEN before RED | 100% |
| Auto mode injects TDD prompt | 100% |
| No regression for test-after mode | 100% |

---

## Implementation Strategy

### Phase 1: Template Generation (US-001, US-002)
**Impact**: Highest - fixes the root cause

1. Create TDD task templates with proper structure
2. Modify increment-planner to select template based on testMode
3. Wire up `generateTDDTasks()` or use template approach

### Phase 2: Execution Awareness (US-003)
**Impact**: Medium - improves UX

1. Add testMode check to /sw:do
2. Display TDD banner when active
3. Show phase markers in task output

### Phase 3: Enforcement (US-004)
**Impact**: High - makes TDD mandatory for teams that want it

1. Add tddEnforcement config option
2. Update guard hook to check config
3. Implement blocking mode

### Phase 4: Auto Mode (US-005)
**Impact**: High - enables autonomous TDD

1. Read testMode in auto setup
2. Create TDD prompt injection template
3. Validate test existence in auto loop

---

## Dependencies

- Existing TDD module: `src/core/tdd/`
- Existing hook: `plugins/specweave/hooks/v2/guards/tdd-enforcement-guard.sh`
- Existing templates: `plugins/specweave/skills/increment-planner/templates/`
- Config schema: `src/core/types/config.ts`

---

## Notes

This increment itself uses TDD mode (`test_mode: TDD`) to dogfood the changes. Tasks are structured as RED-GREEN-REFACTOR triplets.
