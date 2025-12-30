---
id: FS-148
title: Autonomous Execution Engine with Stop Hook Integration
type: feature
status: active
priority: P1
created: 2025-12-29
lastUpdated: 2025-12-29
increment: 0148-autonomous-execution-autopilot
external_tools:
  github:
    type: milestone
    id: 64
    url: https://github.com/anton-abyzov/specweave/milestone/64
---

# FS-148: Autonomous Execution Engine with Stop Hook Integration

## Overview

Implement `/sw:autopilot` command that enables Claude Code to work autonomously for extended periods (hours/days) on SpecWeave projects. Uses Claude Code Stop Hook to create a feedback loop that prevents session exit until all specified work is completed.

**Key Value Proposition**: "Ship features while you sleep" - autonomous end-to-end delivery with safety guardrails.

## User Stories

| ID | Title | Status |
|----|-------|--------|
| [US-001](./us-001-stop-hook-based-continuation-loop.md) | Stop Hook-Based Continuation Loop | Planned |
| [US-002](./us-002-autopilot-command-implementation.md) | Autopilot Command Implementation | Planned |
| [US-003](./us-003-cancel-autopilot-command.md) | Cancel Autopilot Command | Planned |
| [US-004](./us-004-multi-increment-orchestration.md) | Multi-Increment Orchestration | Planned |
| [US-005](./us-005-test-driven-validation-gates.md) | Test-Driven Validation Gates | Planned |
| [US-006](./us-006-human-gated-sensitive-operations.md) | Human-Gated Sensitive Operations | Planned |
| [US-007](./us-007-integration-with-existing-workflow.md) | Integration with Existing Workflow Commands | Planned |
| [US-008](./us-008-circuit-breaker-patterns.md) | Circuit Breaker Patterns for External Services | Planned |
| [US-009](./us-009-living-docs-sync-at-checkpoints.md) | Living Docs and External Tool Sync at Checkpoints | Planned |
| [US-010](./us-010-autopilot-status-command.md) | Autopilot Status Command | Planned |

## Technical Architecture

### Stop Hook Integration Flow

```
User runs /sw:autopilot "Build my app" --max-iterations 50
                    │
                    ▼
        ┌─────────────────────────┐
        │  setup-autopilot.sh     │
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
        │  stop-autopilot.sh      │
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
- ADR-0178: Stop Hook-Based Autopilot Architecture (to be created)

## Success Metrics

| Metric | Target |
|--------|--------|
| Autopilot completion rate | > 80% |
| False positive human gates | < 5% |
| Crash recovery success | > 95% |
| Time savings vs manual | > 50% |
| Test gate enforcement | 100% |
