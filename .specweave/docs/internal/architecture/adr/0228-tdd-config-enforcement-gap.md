# ADR-0228: TDD Configuration Enforcement Gap

**Date**: 2026-01-23
**Status**: Accepted
**Category**: Testing, Configuration

## Context

SpecWeave supports TDD (Test-Driven Development) mode via `testing.defaultTestMode: "TDD"` in config.json. However, investigation reveals that while the configuration is **read** by various components, it is **not enforced** in practice.

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

### What's BROKEN

| Issue | Location | Impact |
|-------|----------|--------|
| Default enforcement is "warn" | config.ts | Violations show warning but don't block |
| `generateTDDTasks()` orphaned | `task-template-generator.ts` | Dynamic generator never called |
| Auto mode reads but doesn't enforce | `auto.ts:435,512` | Just logs "TDD MODE ENABLED", no behavior change |
| `/sw:do` doesn't block ordering | `do.md` | Can mark GREEN complete before RED |
| Router not TDD-aware | `router/SKILL.md` | Doesn't route to TDD workflow |

### Root Cause

The TDD configuration is **advisory only**:

```typescript
// From auto.ts:435
tddMode = config.testing?.defaultTestMode?.toUpperCase() === 'TDD';

// At line 512 - ONLY USED FOR LOGGING:
logger.info("🔴 TDD MODE ENABLED");  // That's it. No enforcement.
```

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

### Future Work

1. Add TDD enforcement guard in user-prompt-submit.sh
2. Update auto mode to inject TDD workflow when configured
3. Make router TDD-aware to suggest `/sw:tdd-cycle` when appropriate

## References

- Increment 0166-tdd-enforcement-behavioral (completed but partial)
- `src/core/tdd/task-template-generator.ts` (orphaned generator)
- `plugins/specweave/commands/tdd-*.md` (TDD commands)
