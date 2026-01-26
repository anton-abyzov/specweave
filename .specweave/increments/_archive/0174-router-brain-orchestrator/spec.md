---
increment: 0174-router-brain-orchestrator
title: "Router Brain Orchestrator"
status: active
type: feature
created: 2025-01-23
---

# Router Brain Orchestrator

## Overview

Transform the SpecWeave router into a true "brain" that orchestrates every user prompt through intelligent skill routing, plugin management, and workflow guidance.

## Problem Statement

Currently:
1. Skills activate randomly based on keyword matching (~20-50% activation rate)
2. Plugins install but Claude doesn't know HOW to use them effectively
3. No unified orchestration - increment creation, TDD mode, and skill selection are disconnected
4. Multi-skill tasks lack coordination (e.g., frontend + testing + payments)

## Solution: Router Brain Architecture

The UserPromptSubmit hook becomes a "brain" that:
1. Analyzes every prompt via LLM
2. Installs required plugins (already working)
3. **NEW**: Returns skill routing instructions
4. **NEW**: Provides workflow sequencing (what to do first, second, etc.)
5. **NEW**: Handles multi-skill coordination

---

## User Stories

### US-001: Skill Routing Detection
**Project**: specweave
**As a** developer, I want the router to detect which skills are needed for my task
**So that** I get specialized expertise automatically

**Acceptance Criteria**:
- [ ] AC-US1-01: LLM detection returns `routing.skills[]` array with skill names
- [ ] AC-US1-02: Each skill has `invokeWhen` timing (immediate, after_increment, after_planning)
- [ ] AC-US1-03: Primary skill is identified for multi-skill tasks
- [ ] AC-US1-04: Confidence score included for skill routing decisions

### US-002: Workflow Sequencing
**Project**: specweave
**As a** developer, I want the router to guide me through the correct workflow order
**So that** I don't skip important steps (increment creation, planning, etc.)

**Acceptance Criteria**:
- [ ] AC-US2-01: Workflow phases returned (preparation, skill_activation, implementation)
- [ ] AC-US2-02: `invokeWhen: "after_increment"` delays skill use until increment exists
- [ ] AC-US2-03: `invokeWhen: "after_planning"` waits for plan mode approval
- [ ] AC-US2-04: Complex tasks trigger plan mode suggestion

### US-003: Multi-Skill Coordination
**Project**: specweave
**As a** developer, I want proper coordination when multiple skills are needed
**So that** skills work together effectively (e.g., TDD + Frontend)

**Acceptance Criteria**:
- [ ] AC-US3-01: Multiple skills can be returned in priority order
- [ ] AC-US3-02: TDD mode + domain skill = testing skill comes first
- [ ] AC-US3-03: `with_primary` timing for parallel skill usage
- [ ] AC-US3-04: `after_primary` timing for sequential skill usage

### US-004: Brain Message Injection
**Project**: specweave
**As a** developer, I want clear instructions on what skills to use and when
**So that** I know exactly how to proceed

**Acceptance Criteria**:
- [ ] AC-US4-01: systemMessage includes workflow steps in order
- [ ] AC-US4-02: Skill invocation instructions provided (Skill tool or keywords)
- [ ] AC-US4-03: TDD instructions included when TDD mode active
- [ ] AC-US4-04: Plugin installation status shown

---

## Technical Design

### Enhanced LLM Response Schema

```json
{
  "plugins": ["sw-frontend", "sw-testing"],
  "confidence": 0.95,
  "reasoning": "React dashboard with TDD",

  "increment": {
    "action": "new",
    "suggestedName": "react-dashboard",
    "confidence": 0.9,
    "reasoning": "New feature work requiring spec"
  },

  "routing": {
    "skills": [
      {
        "name": "qa-engineer",
        "plugin": "sw-testing",
        "fullName": "sw-testing:qa-engineer",
        "priority": "primary",
        "invokeWhen": "after_increment",
        "reason": "TDD requires tests first"
      },
      {
        "name": "frontend-architect",
        "plugin": "sw-frontend",
        "fullName": "sw-frontend:frontend-architect",
        "priority": "secondary",
        "invokeWhen": "with_primary",
        "reason": "React component design"
      }
    ],
    "workflow": {
      "suggestPlanMode": false,
      "phases": ["create_increment", "invoke_skills", "implement_with_tdd"]
    },
    "reasoning": "TDD + Frontend task: testing skill leads, frontend follows"
  }
}
```

### Invoke Timing Options

| Timing | Description | Use Case |
|--------|-------------|----------|
| `immediate` | Invoke right away | Simple tasks, no increment needed |
| `after_increment` | Create increment first | Feature work |
| `after_planning` | Plan mode first | Complex/architectural tasks |
| `with_primary` | Parallel with primary | Supporting skills |
| `after_primary` | After primary completes | Sequential dependencies |

### Brain Message Format

```markdown
# Router Brain Active

## Analysis Summary
| Aspect | Decision |
|--------|----------|
| Plugins | sw-frontend ✓, sw-testing ✓ |
| Increment | Create: "react-dashboard" |
| TDD Mode | Enabled |
| Primary Skill | sw-testing:qa-engineer |

## Workflow (Follow This Order)

### Step 1: Create Increment
/sw:increment "react-dashboard"

### Step 2: Activate Skills
**Primary**: sw-testing:qa-engineer (TDD - tests first!)
**Supporting**: sw-frontend:frontend-architect

Invoke: /sw-testing:qa-engineer
Or mention: "test strategy", "TDD", "test coverage"

### Step 3: Implementation
Follow TDD: RED → GREEN → REFACTOR
Use frontend skill for component design
```

---

## Implementation Plan

### Phase 1: Enhance LLM Detector
1. Update `buildDetectionPrompt()` with skill routing rules
2. Add `routing` field to `LLMDetectionResult` interface
3. Parse and validate routing from LLM response

### Phase 2: Update Hook
1. Extract routing from `specweave detect-intent` response
2. Build brain message with workflow steps
3. Include skill invocation instructions

### Phase 3: Testing
1. Test multi-skill detection
2. Test workflow sequencing
3. Test TDD + domain skill coordination

---

## Out of Scope

- Automatic skill invocation (Claude decides when to actually invoke)
- Agent spawning from hook (Task tool is for Claude to use)
- Skill content injection (skills load via Claude Code mechanism)
