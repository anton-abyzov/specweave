---
id: FS-039
title: "Ultra-Smart Next Command - Intelligent Workflow Orchestrator"
type: feature
status: planning
priority: P1
created: 2025-11-16
lastUpdated: 2025-11-16T00:00:00.000Z
projects: ["specweave"]
sourceIncrement: 0039-ultra-smart-next-command
---

# Ultra-Smart Next Command - Intelligent Workflow Orchestrator

## Overview

Enhance the /specweave:next command to be ultra-intelligent, automatically detecting the current workflow phase and orchestrating the entire SpecWeave workflow autonomously. Users can just hit `/specweave:next` repeatedly to move through planning → execution → validation → QA → closure → next increment.

## Source

This feature was created from increment: [`0039-ultra-smart-next-command`](../../../../../increments/0039-ultra-smart-next-command)

## Vision

Transform SpecWeave from a powerful but manual system into an autonomous workflow orchestrator:
- **Current**: User runs 8+ commands manually (inc → plan → do → validate → done → next)
- **Future**: User runs 1 command repeatedly (/specweave:next → auto-detects phase → auto-executes)

## Key Capabilities

1. **Auto-Detect Workflow Phase**: No increments → spec.md only → plan needed → tasks ready → validation needed → closure ready
2. **Auto-Call Commands**: /specweave:plan, /specweave:do, /specweave:validate, /specweave:qa
3. **Intelligent Suggestions**: Backlog ranking, dependency validation, priority filtering
4. **Autonomous Mode**: --autonomous flag for zero-prompt execution (ship features while you sleep!)
5. **Confidence Scoring**: 95% accuracy, transparent confidence scores, user control

## Business Value

- **40% faster workflows**: 4 minutes manual overhead → 30 seconds automated
- **Better UX**: "What's next?" is one command, not mental overhead
- **Autonomous shipping**: Power users can enable full automation
- **Onboarding**: Beginners don't need to memorize command sequences

## Projects

This feature applies to the SpecWeave framework:
- **specweave** (core framework - /specweave:next command enhancement)

## User Stories

### US-001: Auto-Detect Current Workflow Phase

**Priority**: P1

**Story**:
As a developer working in SpecWeave
I want /specweave:next to automatically detect where I am in the workflow
So that I don't need to remember which command to run next

**Acceptance Criteria**:
- AC-US1-01: Detect if no increments exist (clean slate)
- AC-US1-02: Detect if spec.md exists but no plan.md/tasks.md (needs planning)
- AC-US1-03: Detect if plan.md/tasks.md exist with incomplete tasks (needs execution)
- AC-US1-04: Detect if all P1 tasks completed but not validated (needs validation)
- AC-US1-05: Detect if increment completed but not closed (needs closure)
- AC-US1-06: Detect if all increments closed (suggest new or backlog)
- AC-US1-07: Detect multi-project context (project-specific detection)

[Full details in user story file](../../specweave/FS-039/us-001-auto-detect-workflow-phase.md)

---

### US-002: Auto-Call /specweave:plan When Needed

**Priority**: P1

**Story**:
As a developer who just created a spec.md
I want /specweave:next to automatically call /specweave:plan
So that I don't need to manually run the plan command

**Acceptance Criteria**:
- AC-US2-01: Detect spec.md exists without plan.md
- AC-US2-02: Auto-invoke Architect Agent to create plan.md
- AC-US2-03: Auto-invoke test-aware-planner to create tasks.md with embedded tests
- AC-US2-04: Validate plan.md and tasks.md were created successfully
- AC-US2-05: Handle planning errors gracefully
- AC-US2-06: User can skip auto-planning with --skip-plan flag

[Full details in user story file](../../specweave/FS-039/us-002-auto-call-plan.md)

---

### US-003: Auto-Call /specweave:do When Ready

**Priority**: P1

**Story**:
As a developer with a complete plan.md and tasks.md
I want /specweave:next to automatically call /specweave:do
So that I can start implementation without manual command execution

**Acceptance Criteria**:
- AC-US3-01: Detect plan.md and tasks.md exist with uncompleted tasks
- AC-US3-02: Auto-invoke /specweave:do to execute next task
- AC-US3-03: Resume from last incomplete task
- AC-US3-04: User can skip auto-execution with --dry-run flag

[Full details in user story file](../../specweave/FS-039/us-003-auto-call-do.md)

---

_Additional user stories (US-004 through US-012) are documented in their respective user story files in the `specweave/FS-039/` directory._

## Functional Requirements

See increment [tasks.md](../../../../../increments/0039-ultra-smart-next-command/tasks.md) for complete functional requirements.

**Key FRs**:
- FR-001: Phase Detection Engine (>= 95% accuracy)
- FR-002: Command Orchestration (auto-invoke plan/do/validate/qa)
- FR-003: /specweave:plan Command (new command)
- FR-004: Increment Transition Logic (respect WIP limits)
- FR-005: Backlog Intelligence (priority ranking, dependency filtering)
- FR-006: Increment Structure Validation (prevent duplicate task files, enforce single source of truth)

## Non-Functional Requirements

See increment [spec.md](../../../../../increments/0039-ultra-smart-next-command/spec.md#non-functional-requirements-summary) for complete NFR list.

**Key NFRs**:
- NFR-001: Performance (< 500ms phase detection, < 1s orchestration)
- NFR-002: Accuracy (>= 95% phase detection accuracy)
- NFR-003: Reliability (handle partial state, agent failures)
- NFR-004: Usability (clear prompts, human-readable confidence scores)

## Success Criteria

See increment [spec.md](../../../../../increments/0039-ultra-smart-next-command/spec.md#success-criteria) for complete metrics.

**Key Metrics**:
1. **Time-to-Completion**: 40% reduction (4 min → 30 sec overhead)
2. **User Satisfaction**: 85%+ report "easier workflow"
3. **Accuracy**: 95%+ phase detection accuracy
4. **Adoption**: 60%+ users switch to /specweave:next within 1 month

## Related Documentation

- **Increment**: [0039-ultra-smart-next-command](../../../../../increments/0039-ultra-smart-next-command)
- **ADR-0003-009**: [Phase Detection Algorithm](../../architecture/adr/0003-009-phase-detection-algorithm.md) _(if exists)_
- **Increment Lifecycle Guide**: [increment-lifecycle.md](../../delivery/guides/increment-lifecycle.md) _(if exists)_
- **Existing Command**: [specweave-next.md](../../../../../plugins/specweave/commands/specweave-next.md)

## Status

- **Current Status**: Planning
- **Created**: 2025-11-16
- **Last Updated**: 2025-11-16
- **Source Increment**: 0039-ultra-smart-next-command
