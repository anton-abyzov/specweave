---
id: FS-148
title: Autonomous Execution Engine with Stop Hook Integration
type: feature
status: active
priority: P1
created: 2025-12-29
lastUpdated: 2025-12-29
increment: 0148-autonomous-execution-auto
external_tools:
  github:
    type: milestone
    id: 64
    url: https://github.com/anton-abyzov/specweave/milestone/64
---

# FS-148: Autonomous Execution Engine with Stop Hook Integration

## Overview

**Auto mode is the DEFAULT** - SpecWeave commands automatically continue working until completion using Claude Code's Stop Hook. No special commands needed.

**Key Value Proposition**: "Ship features while you sleep" - autonomous end-to-end delivery with safety guardrails.

**Design Philosophy**:
- `/sw:increment` auto-detects project complexity and splits into multiple increments with dependencies
- `/sw:do` continues until all tasks complete (stop hook loop)
- `/sw:next` auto-transitions to next increment in queue
- `/sw:progress` and `/sw:status` show auto session info when active
- Only `/sw:cancel-auto` is a new command (to opt-out of running session)
- Use `--manual` flag to opt-OUT of auto behavior (not `--auto` to opt-in)

**Optimized for Claude Code MAX Plan**: Subscription-based, no API key needed, no token cost tracking.

## LLM Judge Evaluation (Ralph Wiggum Alignment)

**Score: 4.3/5.0 - PASS**

| Ralph Wiggum Pattern | SpecWeave Alignment |
|---------------------|---------------------|
| `while :; do cat PROMPT.md \| claude ; done` | Stop Hook `{"decision": "block"}` ✅ |
| `--completion-promise "string"` | tasks.md `[x]` + completion tag ✅ |
| `--max-iterations N` | `auto.maxIterations: 100` ✅ |
| `stop_hook_active` prevents loops | Checked in hook ✅ |

**Verdict**: Core Ralph pattern implemented. Enterprise features (circuit breakers, human gates, multi-increment) are additive, not replacements. `--simple` mode available for pure Ralph behavior.

## User Stories

| ID | Title | Status |
|----|-------|--------|
| [US-001](./us-001-stop-hook-based-continuation-loop.md) | Stop Hook-Based Continuation Loop | Planned |
| [US-002](./us-002-auto-command-implementation.md) | Auto Mode as Default in /sw:increment | Planned |
| [US-003](./us-003-cancel-auto-command.md) | Leverage Claude Code's Built-in Session Recovery | Planned |
| [US-004](./us-004-multi-increment-orchestration.md) | Multi-Increment Orchestration | Planned |
| [US-005](./us-005-test-driven-validation-gates.md) | Test-Driven Validation Gates | Planned |
| [US-006](./us-006-human-gated-sensitive-operations.md) | Human-Gated Sensitive Operations | Planned |
| [US-007](./us-007-integration-with-existing-workflow.md) | Auto-Aware Existing Workflow Commands | Planned |
| [US-008](./us-008-circuit-breaker-patterns.md) | Circuit Breaker Patterns for External Services | Planned |
| [US-009](./us-009-living-docs-sync-at-checkpoints.md) | Living Docs and External Tool Sync at Checkpoints | Planned |
| [US-010](./us-010-auto-status-command.md) | Intelligent "Ask User When Stuck" Behavior | Planned |
| [US-011](./us-011-tdd-enforcement-for-auto-mode.md) | TDD Enforcement for Auto Mode | Planned |
| [US-012](./us-012-two-level-structure-support.md) | 2-Level Structure Support (Projects/Boards) | Planned |

## Technical Architecture

### Stop Hook Integration Flow

```
User runs /sw:auto "Build my app" --max-iterations 50
                    │
                    ▼
        ┌─────────────────────────┐
        │  setup-auto.sh     │
        │  Creates session state  │
        └───────────┬─────────────┘
                    │
                    ▼
        ┌─────────────────────────┐
        │  Claude works on task   │
        │  Executes /sw:do, etc   │
        └───────────┬─────────────┘
                    │
                    ▼ Claude tries to exit
        ┌─────────────────────────┐
        │  stop-auto.sh      │
        │  (Stop Hook)            │
        │  1. Check session state │
        │  2. Check completion    │
        │  3. Block + re-feed OR  │
        │     Allow exit          │
        └───────────┬─────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
   Incomplete              Complete
   "decision": "block"     "decision": "approve"
   re-feed prompt          session ends
```

## Related ADRs

- [ADR-0175: Workflow Orchestration Architecture](../../architecture/adr/0175-workflow-orchestration-architecture.md)
- [ADR-0177: Autonomous Mode Safety](../../architecture/adr/0177-autonomous-mode-safety.md)
- ADR-0178: Stop Hook-Based Auto Architecture (to be created)

## Success Metrics

| Metric | Target |
|--------|--------|
| Auto completion rate | > 80% |
| False positive human gates | < 5% |
| Crash recovery success | > 95% |
| Time savings vs manual | > 50% |
| Test gate enforcement | 100% |
