---
increment: 0184-tdd-enforcement-implementation
generated: 2026-01-07T12:00:00Z
---

# Implementation Plan: TDD Enforcement Implementation

## Overview

Transform TDD configuration from a passive label into active behavioral enforcement across the SpecWeave workflow.

---

## Architecture Analysis

### Current State (Gap Analysis)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CURRENT STATE (BROKEN)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  config.json                metadata.json                           │
│  ┌──────────────┐          ┌──────────────┐                        │
│  │ testing:     │          │ testMode:    │                        │
│  │   default    │ ──copy──▶│   "TDD"      │                        │
│  │   TestMode:  │          │              │                        │
│  │   "TDD"      │          │ coverage     │                        │
│  └──────────────┘          │ Target: 80   │                        │
│         │                  └──────────────┘                        │
│         │                         │                                │
│         ▼                         ▼                                │
│  ┌──────────────┐          ┌──────────────┐                        │
│  │ /sw:inc      │          │ /sw:do       │                        │
│  │ reads config │          │ IGNORES      │  ◀── THE PROBLEM!      │
│  │ writes meta  │          │ testMode     │                        │
│  └──────────────┘          └──────────────┘                        │
│                                                                     │
│  Result: testMode stored but NEVER affects behavior                │
└─────────────────────────────────────────────────────────────────────┘
```

### Target State

```
┌─────────────────────────────────────────────────────────────────────┐
│                      TARGET STATE (ENFORCED)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  config.json                metadata.json                           │
│  ┌──────────────┐          ┌──────────────┐                        │
│  │ testing:     │          │ testMode:    │                        │
│  │   default    │ ──copy──▶│   "TDD"      │◀──┐                    │
│  │   TestMode:  │          │              │   │                    │
│  │   "TDD"      │          │ coverage     │   │ READ BY            │
│  └──────────────┘          │ Target: 80   │   │                    │
│         │                  └──────────────┘   │                    │
│         │                         │           │                    │
│         ▼                         ▼           │                    │
│  ┌──────────────┐          ┌──────────────┐   │                    │
│  │ /sw:inc      │          │ /sw:do       │───┘                    │
│  │ GENERATES    │          │ ENFORCES     │                        │
│  │ TDD TASKS    │          │ TDD ORDER    │                        │
│  │ (RED-GREEN-  │          │ (warnings)   │                        │
│  │  REFACTOR)   │          └──────────────┘                        │
│  └──────────────┘                 │                                │
│         │                         ▼                                │
│         │                  ┌──────────────┐                        │
│         │                  │ /sw:auto     │                        │
│         │                  │ INJECTS TDD  │                        │
│         │                  │ GUIDANCE     │                        │
│         │                  └──────────────┘                        │
│         │                         │                                │
│         ▼                         ▼                                │
│  ┌──────────────┐          ┌──────────────┐                        │
│  │ /sw:done     │◀─────────│ stop-auto.sh │                        │
│  │ VALIDATES    │          │ VALIDATES    │                        │
│  │ COVERAGE     │          │ TDD COMPLIANCE│                       │
│  └──────────────┘          └──────────────┘                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Design

### Component 1: TDD Task Template Generator

**Location**: `src/core/tdd/task-template-generator.ts`

**Purpose**: Generate tasks in RED-GREEN-REFACTOR structure when TDD mode enabled.

```typescript
export interface TDDTaskTriple {
  redTask: Task;      // Write failing test
  greenTask: Task;    // Implement minimal code
  refactorTask: Task; // Improve code quality
}

export function generateTDDTasks(
  featureDescription: string,
  userStory: UserStory,
  testMode: TestMode
): Task[] {
  if (testMode !== 'TDD') {
    return generateStandardTasks(featureDescription, userStory);
  }

  const triples = splitIntoTDDTriples(featureDescription, userStory);
  return triples.flatMap(triple => [
    triple.redTask,
    triple.greenTask,
    triple.refactorTask
  ]);
}
```

### Component 2: TDD Enforcement Hook

**Location**: `plugins/specweave/hooks/v2/guards/tdd-enforcement-guard.sh`

**Purpose**: Validate TDD discipline when tasks are marked complete.

- Reads testMode from metadata.json
- Warns (not blocks) when GREEN completed before RED
- Logs violations for tracking

### Component 3: Auto Mode TDD Integration

**Location**: Modifications to `setup-auto.sh` and `stop-auto.sh`

- Inject TDD guidance into re-feed prompt
- Check TDD compliance before session completion

### Component 4: Coverage Validation

**Location**: `src/core/qa/coverage-validator.ts`

- Validate coverage meets target during `/sw:done`
- Support common coverage formats (Istanbul, c8, Jest)

---

## Implementation Phases

### Phase 1: Task Template Differentiation (Highest Impact)
- Create task-template-generator.ts
- Modify increment-planner skill
- Add phase markers to task format

### Phase 2: TDD Enforcement Hook
- Create tdd-enforcement-guard.sh
- Register in hook dispatcher
- Add violation logging

### Phase 3: Auto Mode Integration
- Modify setup-auto.sh and stop-auto.sh
- Add TDD guidance injection

### Phase 4: Coverage Validation
- Create coverage-validator.ts
- Integrate with /sw:done command

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing workflows | All enforcement is WARNING-only |
| Performance impact | Hooks optimized for <50ms |
| Missing jq dependency | Graceful fallback with grep |

---

## File Changes Summary

| File | Action |
|------|--------|
| src/core/tdd/task-template-generator.ts | CREATE |
| src/core/tdd/types.ts | CREATE |
| src/core/qa/coverage-validator.ts | CREATE |
| plugins/specweave/hooks/v2/guards/tdd-enforcement-guard.sh | CREATE |
| plugins/specweave/scripts/setup-auto.sh | MODIFY |
| plugins/specweave/scripts/stop-auto.sh | MODIFY |
| src/cli/commands/done.ts | MODIFY |
