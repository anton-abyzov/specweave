# TDD Enforcement Implementation Summary

**Increment**: 0166-tdd-enforcement-behavioral
**Status**: Ready for Review
**Completed**: 2026-01-09

## Overview

This increment fixes the root cause of TDD being "just a label, not a workflow" by injecting TDD awareness at three control points: task generation, execution, and enforcement.

## Implemented Features

### 1. TDD Task Template (Phase 1)

**Files Created**:
- [tasks-tdd-single-project.md](plugins/specweave/skills/increment-planner/templates/tasks-tdd-single-project.md)
- [spec-tdd-contract.md](plugins/specweave/skills/increment-planner/templates/spec-tdd-contract.md)

**Key Features**:
- RED-GREEN-REFACTOR triplet structure
- Explicit dependency markers (`**Depends On**: T-XXX [PHASE]`)
- TDD Contract section explaining workflow
- Phase markers in task titles (`[RED]`, `[GREEN]`, `[REFACTOR]`)

### 2. Template Selection Logic (Phase 2)

**Files Modified**:
- [SKILL.md](plugins/specweave/skills/increment-planner/SKILL.md) - Added STEP 0A testMode detection and STEP 7-TDD

**Behavior**:
- When `testMode: "TDD"` in config, selects `tasks-tdd-single-project.md`
- When `testMode: "test-after"` (default), uses standard templates
- Displays "TDD MODE: Using TDD task template" when TDD selected

### 3. /sw:do TDD Awareness (Phase 3)

**Files Modified**:
- [do.md](plugins/specweave/commands/do.md) - Added Step 1.5

**Behavior**:
```
┌─────────────────────────────────────────────────────────────┐
│  TDD MODE ACTIVE                                            │
├─────────────────────────────────────────────────────────────┤
│  This increment uses Test-Driven Development.               │
│                                                             │
│  WORKFLOW:                                                  │
│  1. [RED]      Write failing test FIRST                     │
│  2. [GREEN]    Minimal code to make test pass               │
│  3. [REFACTOR] Improve code, keep tests green               │
│                                                             │
│  Tip: Use /sw:tdd-cycle for guided TDD workflow             │
└─────────────────────────────────────────────────────────────┘
```

### 4. Configurable Enforcement (Phase 4)

**Files Modified**:
- [config.ts](src/core/types/config.ts) - Added `TDDEnforcement` type
- [tdd-enforcement-guard.sh](plugins/specweave/hooks/v2/guards/tdd-enforcement-guard.sh) - Added enforcement levels

**Config Option**: `testing.tddEnforcement`

| Value | Behavior |
|-------|----------|
| `"warn"` (default) | Shows warning, allows operation |
| `"strict"` | Blocks completing GREEN before RED |
| `"off"` | No TDD enforcement |

## Tests

All 19 TDD-specific tests pass:

```
tests/unit/tdd/template-selection.test.ts (10 tests)
tests/unit/tdd/spec-contract.test.ts (9 tests)
```

Test coverage:
- Template selection based on testMode
- TDD marker verification ([RED], [GREEN], [REFACTOR])
- Dependency structure validation
- Spec contract injection

## Deferred Work

### Phase 5: Auto Mode TDD Injection (T-022 to T-027)
**Reason**: Auto mode was simplified in v1.0.107. TDD injection will be revisited when auto mode evolves.

### Phase 6: Integration & Documentation (T-028 to T-030)
**Reason**: Core implementation complete. Documentation updates can be done incrementally.

## Usage

### For New Increments

1. Set `testing.defaultTestMode: "TDD"` in `.specweave/config.json`
2. Run `/sw:increment "feature-name"`
3. Tasks will be generated as RED-GREEN-REFACTOR triplets

### For Strict Enforcement

```json
{
  "testing": {
    "defaultTestMode": "TDD",
    "tddEnforcement": "strict"
  }
}
```

### Example TDD Task Structure

```markdown
### T-001: [RED] Write failing test for user authentication
**User Story**: US-001
**Status**: [ ] pending
**Phase**: RED
**Depends On**: None (first task in triplet)

### T-002: [GREEN] Implement user authentication
**User Story**: US-001
**Status**: [ ] pending
**Phase**: GREEN
**Depends On**: T-001 [RED] MUST be completed first

### T-003: [REFACTOR] Improve authentication code quality
**User Story**: US-001
**Status**: [ ] pending
**Phase**: REFACTOR
**Depends On**: T-002 [GREEN] MUST be completed first
```

## Impact

Before this increment:
- TDD was a config setting with no behavioral impact
- Tasks were generated in implementation-first order
- No guidance during execution
- Warning hook was easily ignored

After this increment:
- TDD generates proper RED-GREEN-REFACTOR triplets
- Explicit dependencies prevent skipping tests
- /sw:do shows TDD reminder when active
- Optional strict mode blocks violations
