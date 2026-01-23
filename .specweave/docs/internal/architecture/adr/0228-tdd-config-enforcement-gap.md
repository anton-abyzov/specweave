# ADR-0228: TDD Configuration Enforcement Gap

**Date**: 2026-01-23
**Status**: Implemented
**Category**: Testing, Configuration
**Updated**: 2026-01-23 - Implemented enforcement in commands

## Context

SpecWeave supports TDD (Test-Driven Development) mode via `testing.defaultTestMode: "TDD"` in config.json. Investigation revealed that while the configuration was **read** by various components, it was **not enforced** in practice.

**This gap has been addressed** with enforcement added to `/sw:do`, `/sw:auto`, and the router skill.

### Current State

**Config Location**: `.specweave/config.json`
```json
{
  "testing": {
    "defaultTestMode": "TDD",
    "tddEnforcement": "warn",
    "coverageTargets": { "unit": 85, "integration": 80, "e2e": 90 }
  }
}
```

### What Works

| Component | Location | Status |
|-----------|----------|--------|
| Config reading | `increment-planner/SKILL.md:306-322` | ✅ Reads `defaultTestMode` |
| Template selection | Same file | ✅ Selects TDD template |
| TDD commands | `/sw:tdd-red`, `/sw:tdd-green`, etc. | ✅ All exist and work |
| Enforcement hook | `hooks/v2/guards/tdd-enforcement-guard.sh` | ✅ Detects violations |
| Banner display | `/sw:do` command | ✅ Shows TDD status |

### What Was BROKEN (Now Fixed)

| Issue | Location | Status | Fix |
|-------|----------|--------|-----|
| Default enforcement is "warn" | config.ts | ⚠️ By design | Users must set `strict` for blocking |
| `generateTDDTasks()` orphaned | `task-template-generator.ts` | 🔧 Future work | To be integrated |
| Auto mode reads but doesn't enforce | `auto.md` | ✅ FIXED | Step 1.6 added TDD enforcement |
| `/sw:do` doesn't block ordering | `do.md` | ✅ FIXED | Step 1.6 added TDD enforcement |
| Router not TDD-aware | `router/SKILL.md` | ✅ FIXED | TDD-Aware Routing section added |

### Implementation Details

**1. `/sw:do` command** (`do.md`):
- Added Step 1.6: TDD Enforcement
- Checks TDD mode from config and metadata
- Enforces RED→GREEN→REFACTOR order based on `tddEnforcement` level
- BLOCKS on `strict`, WARNS on `warn`

**2. `/sw:auto` command** (`auto.md`):
- Added Step 1.6: TDD Enforcement Check
- Reads TDD mode from flag, metadata, and global config
- Adds TDD section to stop conditions banner
- Includes enforcement code for task completion

**3. Router skill** (`increment-work-router/SKILL.md`):
- Added "TDD-Aware Routing" section
- Checks TDD mode before routing
- Suggests `/sw:tdd-cycle` for new work when TDD enabled
- Shows TDD phase status when resuming

## Decision

Document the gap and establish TDD enforcement rules in CLAUDE.md and AGENTS.md templates.

### TDD Enforcement Levels

| Level | Behavior | Use Case |
|-------|----------|----------|
| `strict` | BLOCKS violations (hook exits with error) | High-quality projects |
| `warn` (default) | Shows warning, allows continuation | Gradual adoption |
| `off` | No enforcement | Legacy projects |

### Required Documentation Updates

1. **CLAUDE.md.template**: Add TDD section explaining:
   - How TDD mode is configured
   - What happens when TDD is enabled
   - How to enforce TDD discipline

2. **AGENTS.md**: Add TDD workflow for non-Claude tools:
   - Manual TDD workflow steps
   - RED-GREEN-REFACTOR discipline
   - How to check for TDD config

3. **Router Integration**: Document that router should check TDD config and suggest TDD workflow.

## Consequences

### Positive

- Clear documentation of TDD behavior
- Users understand TDD is advisory unless `strict` enforcement is enabled
- Path forward for strict enforcement

### Negative

- TDD mode remains non-blocking by default
- Users may expect automatic enforcement

### Completed Work

1. ✅ Added TDD enforcement to `/sw:do` command (Step 1.6)
2. ✅ Added TDD enforcement to `/sw:auto` command (Step 1.6)
3. ✅ Made router TDD-aware with TDD-Aware Routing section
4. ✅ Removed `invocableBy` restriction from increment-planner skill

### Future Work

1. Add TDD enforcement guard in user-prompt-submit.sh (for pre-commit blocking)
2. Integrate `generateTDDTasks()` for automatic triplet task generation
3. Add TDD progress tracking in status display

## References

- Increment 0166-tdd-enforcement-behavioral (completed but partial)
- `src/core/tdd/task-template-generator.ts` (orphaned generator)
- `plugins/specweave/commands/tdd-*.md` (TDD commands)
