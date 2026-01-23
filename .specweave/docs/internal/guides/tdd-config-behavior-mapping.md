# TDD Configuration to Behavior Mapping

**Last Updated**: 2026-01-23
**Related ADR**: [ADR-0228: TDD Configuration Enforcement Gap](../architecture/adr/0228-tdd-config-enforcement-gap.md)

## Overview

This document maps TDD configuration settings to actual runtime behavior. Use this to understand what happens when you configure TDD mode.

## Configuration Location

`.specweave/config.json`:

```json
{
  "testing": {
    "defaultTestMode": "TDD",
    "tddEnforcement": "warn",
    "defaultCoverageTarget": 90,
    "coverageTargets": {
      "unit": 95,
      "integration": 90,
      "e2e": 100
    }
  }
}
```

## Configuration Options

### `testing.defaultTestMode`

| Value | Meaning | Behavior |
|-------|---------|----------|
| `"TDD"` | Test-Driven Development | Tasks generated as RED-GREEN-REFACTOR triplets; TDD discipline expected |
| `"test-first"` | Write tests first (soft) | Tests encouraged before implementation but not enforced |
| `"test-after"` (default) | Traditional approach | Tests written after implementation |

### `testing.tddEnforcement`

| Value | Meaning | Behavior |
|-------|---------|----------|
| `"strict"` | Hard enforcement | Hooks BLOCK completion if TDD order violated (GREEN before RED) |
| `"warn"` (default) | Soft enforcement | Hooks show WARNING but allow continuation |
| `"off"` | No enforcement | No TDD checks performed |

## Behavior by Component

### 1. Increment Planner (`/sw:increment`)

**Reads**: `testing.defaultTestMode`

**Behavior**:
- If `"TDD"`: Selects `tasks-tdd-single-project.md` template
- Generates tasks with `[RED]`, `[GREEN]`, `[REFACTOR]` phase markers
- Adds dependency links between phases

**Location**: `plugins/specweave/skills/increment-planner/SKILL.md:306-322`

```bash
testMode=$(jq -r '.testing.defaultTestMode // "test-after"' .specweave/config.json)
if [ "$testMode" = "TDD" ]; then
  TASK_TEMPLATE="tasks-tdd-single-project.md"
fi
```

### 2. Do Command (`/sw:do`)

**Reads**: `metadata.json:testMode` (per-increment override) or config, `testing.tddEnforcement`

**Behavior**:
- Displays TDD banner when TDD mode detected
- Shows current phase (RED/GREEN/REFACTOR)
- Suggests `/sw:tdd-cycle` for guided workflow
- **ENFORCES** TDD order based on `tddEnforcement` level (Step 1.6)

**Location**: `plugins/specweave/commands/do.md:228-280` (banner), `277-370` (enforcement)

**Enforcement**:
- `strict`: BLOCKS completing [GREEN] before [RED], [REFACTOR] before [GREEN]
- `warn`: Shows warning but allows continuation
- `off`: No checks

### 3. TDD Enforcement Guard Hook

**Reads**: `testing.tddEnforcement`

**Behavior**:
- Parses `tasks.md` for completed tasks
- Detects TDD phase from markers: `[RED]`, `[GREEN]`, `[REFACTOR]`
- Checks dependency order (GREEN must not complete before RED)

**Enforcement by level**:
- `strict`: Exits with error code (blocks completion)
- `warn`: Outputs warning (allows continuation)
- `off`: Skips all checks

**Location**: `plugins/specweave/hooks/v2/guards/tdd-enforcement-guard.sh`

### 4. Auto Mode (`/sw:auto`)

**Reads**: `testing.defaultTestMode`, `testing.tddEnforcement`, command flags

**Behavior**:
- Sets internal `tddMode` flag from config/flags/increment metadata
- Logs "TDD MODE ENABLED" banner
- Adds `tests_pass` success criterion
- **ENFORCES** TDD order during task execution (Step 1.6)
- Shows TDD section in stop conditions banner

**TDD enforcement sources** (priority):
1. `--tdd` or `--strict` flag (highest)
2. Increment `metadata.json:tddMode`
3. Global `config.json:testing.defaultTestMode`

**Location**: `src/cli/commands/auto.ts`, `plugins/specweave/commands/auto.md` (Step 1.6)

### 5. TDD Commands

| Command | Behavior | Uses Config? |
|---------|----------|--------------|
| `/sw:tdd-red` | Write failing tests for next task | No (explicit) |
| `/sw:tdd-green` | Implement minimal code to pass | No (explicit) |
| `/sw:tdd-refactor` | Improve code quality | No (explicit) |
| `/sw:tdd-cycle` | Full orchestrated workflow | No (explicit) |

TDD commands are explicit - they work regardless of config. They're shortcuts for TDD workflow.

### 6. Router (`increment-work-router`)

**Reads**: `metadata.json:testMode`, `config.json:testing.defaultTestMode`

**Behavior**:
- Checks TDD mode before routing to active increment
- When TDD enabled + new work: Suggests `/sw:tdd-cycle` workflow
- When TDD enabled + resume: Shows TDD phase status and reminder
- Displays current phase (RED/GREEN/REFACTOR) in resume output

**Location**: `plugins/specweave/skills/increment-work-router/SKILL.md` (TDD-Aware Routing section)

## Per-Increment Override

Individual increments can override the global config via `metadata.json`:

```json
{
  "increment": "0001-critical-feature",
  "testMode": "TDD",
  "tddEnforcement": "strict"
}
```

**Priority order**:
1. Increment `metadata.json` (highest)
2. Increment `spec.md` frontmatter
3. Global `config.json` (lowest)

## Behavior Matrix

| Config | Component | What Happens |
|--------|-----------|--------------|
| `defaultTestMode: "TDD"` | increment-planner | Uses TDD task template |
| `defaultTestMode: "TDD"` | /sw:do | Shows TDD banner + **ENFORCES** order |
| `defaultTestMode: "TDD"` | /sw:auto | TDD banner + **ENFORCES** order |
| `defaultTestMode: "TDD"` | router | Suggests TDD workflow, shows phase |
| `tddEnforcement: "strict"` | /sw:do | **BLOCKS** if GREEN before RED |
| `tddEnforcement: "strict"` | /sw:auto | **BLOCKS** if GREEN before RED |
| `tddEnforcement: "warn"` | /sw:do, /sw:auto | WARNING but allows |
| `tddEnforcement: "off"` | all | No TDD checks |

## Common Scenarios

### Scenario 1: New TDD Project

```json
// config.json
{
  "testing": {
    "defaultTestMode": "TDD",
    "tddEnforcement": "strict"
  }
}
```

**Expected behavior**:
1. `/sw:increment` creates tasks with RED/GREEN/REFACTOR phases
2. `/sw:do` shows TDD banner AND checks enforcement at Step 1.6
3. `/sw:auto` shows TDD section in stop conditions banner
4. Router suggests `/sw:tdd-cycle` for new work
5. Attempting to complete GREEN before RED → **BLOCKED** (strict mode)
6. Must write tests first, then implement, then refactor

### Scenario 2: Gradual TDD Adoption

```json
// config.json
{
  "testing": {
    "defaultTestMode": "TDD",
    "tddEnforcement": "warn"
  }
}
```

**Expected behavior**:
1. Tasks generated with TDD phases
2. Violations show warning but work continues
3. Team can learn TDD gradually without hard blocks

### Scenario 3: Legacy Project (No TDD)

```json
// config.json (or default)
{
  "testing": {
    "defaultTestMode": "test-after"
  }
}
```

**Expected behavior**:
1. Standard task format (no phase markers)
2. No TDD banners or warnings
3. Tests written after implementation (traditional)

## Fixed Issues (As of 2026-01-23)

### Fixed 1: Auto Mode Now Enforces TDD Order ✅

Auto mode Step 1.6 checks TDD mode and enforces RED→GREEN→REFACTOR order.
Use `--tdd` flag for explicit strict enforcement, or configure globally.

### Fixed 2: Router Now Suggests TDD Workflow ✅

Router checks TDD mode before routing and suggests `/sw:tdd-cycle` for new work.

### Fixed 3: /sw:do Now Has Pre-Task Validation ✅

Step 1.6 in `/sw:do` validates TDD order before allowing task completion.

## Remaining Gaps

### Gap 1: Pre-Commit Hook Enforcement

**Status**: Future work
**Workaround**: Use `tddEnforcement: "strict"` for task-level blocking

### Gap 2: `generateTDDTasks()` Not Integrated

**Status**: Future work
**Workaround**: Manually structure tasks in RED-GREEN-REFACTOR triplets

## References

- [ADR-0228: TDD Configuration Enforcement Gap](../architecture/adr/0228-tdd-config-enforcement-gap.md)
- [CLAUDE.md TDD Section](../../../../CLAUDE.md#tdd-mode)
- [AGENTS.md TDD Section](../../../../AGENTS.md#tdd-mode)
- [TDD Commands](../../../plugins/specweave/commands/)
