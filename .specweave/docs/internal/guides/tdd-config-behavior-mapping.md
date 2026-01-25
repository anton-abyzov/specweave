# TDD Configuration to Behavior Mapping

**Last Updated**: 2026-01-25
**Related ADR**: [ADR-0228: TDD Configuration Enforcement Gap](../architecture/adr/0228-tdd-config-enforcement-gap.md)

## Overview

This document maps TDD configuration settings to actual runtime behavior. Use this to understand what happens when you configure TDD mode.

---

## CRITICAL: Settings Confusion Clarification

**These are TWO DIFFERENT settings with DIFFERENT purposes:**

| Setting | Location | Type | Purpose |
|---------|----------|------|---------|
| `testing.defaultTestMode` | `testing` section | `"TDD"` \| `"test-first"` \| `"test-after"` | **TDD WORKFLOW MODE** - How tasks are structured and ordered |
| `auto.requireTests` | `auto` section | Boolean | **COMPLETION GATE** - Whether tests must pass before auto-close |

### `testing.defaultTestMode: "TDD"` (TDD Workflow)

**What it does:**
- Tasks generated as `[RED]` → `[GREEN]` → `[REFACTOR]` triplets
- TDD discipline enforced (write tests FIRST)
- Phase markers in tasks.md: `[RED]`, `[GREEN]`, `[REFACTOR]`
- Dependency links between phases (GREEN depends on RED)
- `/sw:do` and `/sw:auto` check order enforcement

**Example config:**
```json
{
  "testing": {
    "defaultTestMode": "TDD",
    "tddEnforcement": "strict"
  }
}
```

### `auto.requireTests` (Completion Gate)

**What it does:**
- In AUTO mode, tests MUST pass before task is marked complete
- Does NOT change task structure
- Does NOT enforce TDD order
- Simply: "run tests before done" - nothing more

**Example config:**
```json
{
  "auto": {
    "enabled": true,
    "requireTests": true
  }
}
```

### Common Confusion

```json
// ❌ THIS IS NOT TDD MODE!
{
  "auto": {
    "requireTests": false
  }
}
// This just means tests don't need to pass for auto-close

// ✅ THIS IS TDD MODE:
{
  "testing": {
    "defaultTestMode": "TDD",
    "tddEnforcement": "strict"
  }
}
```

### Combined Usage

You can use BOTH settings together:

```json
{
  "testing": {
    "defaultTestMode": "TDD",      // TDD workflow (RED-GREEN-REFACTOR)
    "tddEnforcement": "strict"
  },
  "auto": {
    "requireTests": true           // Also require tests pass before auto-close
  }
}
```

---

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

### 3. User Prompt Submit Hook (NEW - v1.0.148)

**Reads**: Command flags, increment metadata, global config (in priority order)

**Behavior**:
- Runs BEFORE every user prompt is processed
- Detects TDD mode from all sources (respecting priority)
- **INJECTS TDD context into systemMessage** so Claude ALWAYS knows TDD status
- Shows TDD banner with current mode, enforcement level, and source

**Location**: `plugins/specweave/hooks/user-prompt-submit.sh`

**Why This Matters**:
- TDD context is injected into EVERY prompt, not just `/sw:do` or `/sw:auto`
- Claude cannot "forget" about TDD mode mid-session
- Works even for freeform prompts like "implement the login feature"

**Log**: `~/.specweave/logs/tdd-enforcement.log`

### 4. TDD Enforcement Guard Hook

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

**Priority order** (highest to lowest):
1. Command flag (`--tdd`, `--strict`, `--no-tdd`)
2. Increment `metadata.json` (`testMode`, `tddMode`)
3. Increment `spec.md` frontmatter (`tdd: true`)
4. Global `config.json` (`testing.defaultTestMode`)

## Behavior Matrix

| Config | Component | What Happens |
|--------|-----------|--------------|
| TDD enabled (any source) | **user-prompt-submit hook** | **INJECTS** TDD context into EVERY prompt (v1.0.148) |
| `defaultTestMode: "TDD"` | increment-planner | Uses TDD task template with [RED]/[GREEN]/[REFACTOR] markers |
| `defaultTestMode: "TDD"` | /sw:do | Shows TDD banner + **validates markers** + **ENFORCES** order |
| `defaultTestMode: "TDD"` | /sw:auto | TDD banner + **validates markers** + **ENFORCES** order |
| `defaultTestMode: "TDD"` | router | Suggests TDD workflow, shows phase |
| `tddEnforcement: "strict"` | /sw:do | **BLOCKS** if no markers OR GREEN before RED |
| `tddEnforcement: "strict"` | /sw:auto | **BLOCKS** if no markers OR GREEN before RED |
| `tddEnforcement: "warn"` | /sw:do, /sw:auto | WARNING if no markers or out-of-order, allows continuation |
| `tddEnforcement: "off"` | all | No TDD checks |

### Marker Validation Matrix (NEW)

| Situation | strict | warn | off |
|-----------|--------|------|-----|
| TDD enabled + markers exist | ✅ Enforce order | ✅ Enforce order | Skip |
| TDD enabled + NO markers | ❌ BLOCK | ⚠️ WARN + skip enforcement | Skip |
| TDD disabled | Skip all | Skip all | Skip all |

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

### Scenario 2.5: TDD Enabled BUT Tasks Created Without `/sw:increment`

**Configuration:**
```json
// config.json
{
  "testing": {
    "defaultTestMode": "TDD",
    "tddEnforcement": "strict"
  }
}
```

**User creates tasks manually or copies from non-TDD template:**
```markdown
### T-001: Setup authentication module
### T-002: Implement login endpoint
### T-003: Add logout functionality
```

**Expected behavior (STRICT):**
1. `/sw:do` shows TDD banner
2. Step 1.5.5 scans tasks.md for markers
3. **FINDS 0 markers** → BLOCKS with error:
   ```
   ❌ TDD MARKER VALIDATION FAILED

   TDD mode enabled but tasks.md has NO markers:
     [RED]: 0, [GREEN]: 0, [REFACTOR]: 0

   💡 Fix: Run /sw:increment to regenerate tasks
   ```
4. User must either regenerate tasks or change enforcement level

**Expected behavior (WARN):**
1. `/sw:do` shows TDD banner
2. Step 1.5.5 scans tasks.md for markers
3. **FINDS 0 markers** → Shows warning:
   ```
   ⚠️ TDD MARKERS MISSING - Enforcement bypassed
   ```
4. Proceeds without TDD order enforcement

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

## Fixed Issues (As of 2026-01-23 - Second Update)

### Fixed 4: TDD Marker Validation ✅

**Problem**: If user skipped `/sw:increment`, tasks.md had no `[RED]`, `[GREEN]`, `[REFACTOR]` markers, silently bypassing TDD enforcement.

**Solution**: Added Step 1.5.5 (do.md) and Step 1.6a (auto.md) that validate TDD markers exist BEFORE allowing task execution when TDD mode is enabled.

**Behavior**:
- `strict` mode: BLOCKS if no markers found
- `warn` mode: Shows warning but allows continuation
- Guides user to regenerate tasks with `/sw:increment`

### Fixed 5: Hook-Level TDD Context Injection ✅ (v1.0.148)

**Problem**: TDD enforcement was "instructional" - it depended on Claude reading SKILL.md/command.md files. If Claude didn't read them carefully or user typed a freeform prompt, TDD could be ignored.

**Solution**: Added TDD detection to `user-prompt-submit.sh` hook that injects TDD context into systemMessage for EVERY prompt.

**How it works**:
1. Hook runs BEFORE every prompt
2. Detects TDD mode from: flags > increment metadata > global config
3. If TDD enabled, injects context: "🔴 TDD MODE ACTIVE..."
4. Claude receives this context with every prompt

**Benefits**:
- Claude ALWAYS knows TDD status - cannot "forget" mid-session
- Works for freeform prompts like "implement login"
- Priority order is always respected (flag > increment > global)
- Logs to `~/.specweave/logs/tdd-enforcement.log`

## Remaining Gaps

### Gap 1: Pre-Commit Hook Enforcement

**Status**: Future work
**Workaround**: Use `tddEnforcement: "strict"` for task-level blocking

### Gap 2: `generateTDDTasks()` Not Integrated

**Status**: Future work
**Workaround**: Use `/sw:increment` which reads config and selects TDD task template

### Gap 3: `TestMode` Type Duplication

**Status**: Technical debt to fix
**Issue**: The `TestMode` type is duplicated in 4 different files:

```
src/core/types/config.ts:152    export type TestMode = 'TDD' | 'test-after' | 'manual' | 'none';
src/core/tdd/types.ts:10        export type TestMode = 'TDD' | 'test-after' | 'manual' | 'none';
src/core/qa/coverage-validator.ts:21  export type TestMode = 'TDD' | 'test-after' | 'manual' | 'none';
src/cli/helpers/init/types.ts:133     export type TestMode = 'TDD' | 'test-after' | 'manual' | 'none';
```

**Risk**: If one definition is updated, others may become out of sync.

**Recommended Fix**:
1. Designate `src/core/types/config.ts` as the canonical source
2. Update other files to import from there:
   ```typescript
   import type { TestMode } from '../types/config.js';
   ```
3. Create a refactoring increment to consolidate

## References

- [ADR-0228: TDD Configuration Enforcement Gap](../architecture/adr/0228-tdd-config-enforcement-gap.md)
- [CLAUDE.md TDD Section](../../../../CLAUDE.md#tdd-mode)
- [AGENTS.md TDD Section](../../../../AGENTS.md#tdd-mode)
- [TDD Commands](../../../plugins/specweave/commands/)
