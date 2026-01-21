# Tasks: {{FEATURE_TITLE}}

<!--
  TDD Task Template (tasks-tdd-single-project.md)

  This template generates tasks in RED-GREEN-REFACTOR triplet structure
  when testMode: "TDD" is configured in .specweave/config.json

  Template Variables:
  - {{FEATURE_TITLE}}: Main feature name from spec
  - {{PHASE_N_NAME}}: Phase/milestone name
  - {{FEATURE_N}}: Individual feature component name
  - {{MODULE}}: Module path for test file location

  Each feature component generates 3 tasks:
  - T-xxx [RED]: Write failing test
  - T-xxx+1 [GREEN]: Make test pass (depends on RED)
  - T-xxx+2 [REFACTOR]: Improve code quality (depends on GREEN)
-->

## Task Notation

- `[T-###]`: Task ID
- `[RED]`: Write failing test first
- `[GREEN]`: Make test pass with minimal code
- `[REFACTOR]`: Improve code quality, keep tests green
- `[ ]`: Not started
- `[x]`: Completed
- Model hints: ⚡ haiku (simple), 💎 opus (default)

## TDD Contract

**This increment uses TDD mode. For EVERY feature:**
1. **RED**: Write failing test FIRST
2. **GREEN**: Minimal code to pass test
3. **REFACTOR**: Clean up while keeping tests green

**CRITICAL**: Complete [RED] tasks before their [GREEN] counterpart!

---

## Phase 1: {{PHASE_1_NAME}} (TDD)

### T-001: [RED] Write failing test for {{FEATURE_1}}
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [ ] pending
**Phase**: RED
**Priority**: P0
**Model**: 💎 opus

**Description**:
Write a failing test that defines the expected behavior for {{FEATURE_1}}.
The test MUST fail initially (red) to prove it's testing real behavior.

**Test File**: `tests/unit/{{MODULE}}/{{FEATURE_1}}.test.ts`

**Test Plan**:
- **Given**: Test file created for {{FEATURE_1}}
- **When**: Run npm test
- **Then**: Test FAILS with clear assertion message

---

### T-002: [GREEN] Implement {{FEATURE_1}}
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [ ] pending
**Phase**: GREEN
**Priority**: P0
**Model**: 💎 opus
**Depends On**: T-001 [RED] MUST be completed first

**Description**:
Write the MINIMAL code necessary to make T-001's test pass.
Do not over-engineer. Hardcoded values acceptable at this stage.

**Test Plan**:
- **Given**: T-001 test exists and fails
- **When**: Implement minimal code, run npm test
- **Then**: Test PASSES (green)

---

### T-003: [REFACTOR] Improve {{FEATURE_1}} code quality
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [ ] pending
**Phase**: REFACTOR
**Priority**: P1
**Model**: 💎 opus
**Depends On**: T-002 [GREEN] MUST be completed first

**Description**:
Improve the code from T-002 without changing behavior.
Extract methods, remove duplication, improve naming.

**Test Plan**:
- **Given**: T-001 test passes
- **When**: Refactor code, run npm test
- **Then**: Test STILL passes (green)

---

## Phase 2: {{PHASE_2_NAME}} (TDD)

### T-004: [RED] Write failing test for {{FEATURE_2}}
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [ ] pending
**Phase**: RED
**Priority**: P0
**Model**: 💎 opus

**Description**:
Write a failing test that defines the expected behavior for {{FEATURE_2}}.

**Test File**: `tests/unit/{{MODULE}}/{{FEATURE_2}}.test.ts`

**Test Plan**:
- **Given**: Test file created for {{FEATURE_2}}
- **When**: Run npm test
- **Then**: Test FAILS with clear assertion message

---

### T-005: [GREEN] Implement {{FEATURE_2}}
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [ ] pending
**Phase**: GREEN
**Priority**: P0
**Model**: 💎 opus
**Depends On**: T-004 [RED] MUST be completed first

**Description**:
Write the MINIMAL code necessary to make T-004's test pass.

**Test Plan**:
- **Given**: T-004 test exists and fails
- **When**: Implement minimal code, run npm test
- **Then**: Test PASSES (green)

---

### T-006: [REFACTOR] Improve {{FEATURE_2}} code quality
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [ ] pending
**Phase**: REFACTOR
**Priority**: P1
**Model**: ⚡ haiku
**Depends On**: T-005 [GREEN] MUST be completed first

**Description**:
Improve the code from T-005 without changing behavior.

**Test Plan**:
- **Given**: T-004 test passes
- **When**: Refactor code, run npm test
- **Then**: Test STILL passes (green)

---

## Summary

| Phase | RED | GREEN | REFACTOR |
|-------|-----|-------|----------|
| {{PHASE_1_NAME}} | T-001 | T-002 | T-003 |
| {{PHASE_2_NAME}} | T-004 | T-005 | T-006 |

**TDD Discipline**: RED → GREEN → REFACTOR (never skip steps!)
