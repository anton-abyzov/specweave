---
increment: 0055-eliminate-skill-agent-spawning-crashes
title: "Eliminate Skill-Agent Spawning Crashes"
type: refactor
priority: P0
status: completed
created: 2025-11-24
structure: user-stories
test_mode: test-after
coverage_target: 85
---

# Eliminate Skill-Agent Spawning Crashes

## Overview

**Problem**: The `increment-planner` skill spawns large content-generating agents (PM, Architect, Test-Aware Planner) using `Task()`, causing Claude Code to crash due to context explosion. This has happened repeatedly (Increment 0052, user reports).

**Root Cause**: Context accumulation when skills spawn agents:
- Skill prompt: 1,483 lines
- Agent prompt: 600+ lines per agent
- Agent file reads: 1,000+ lines
- Agent output generation: 1,000-3,000 lines
- **Total**: 4,000-7,000 lines in memory simultaneously = CRASH 💥

**Solution**: Refactor `increment-planner` skill to use **template + guidance pattern**:
1. Skill creates minimal templates (spec.md, plan.md, tasks.md stubs)
2. Skill outputs guidance for user to invoke agents directly
3. Agents run in main context (not nested) = SAFE

**Business Impact**:
- **Reliability**: Eliminates recurring crashes
- **User Experience**: Predictable, controlled workflow
- **Maintainability**: Clear separation of concerns (skills coordinate, agents generate)
- **Safety**: Proper chunking discipline works (1 ADR at a time)

**Scope**: This increment refactors ONLY the increment-planner skill. Other skills don't have this anti-pattern.

**References**: ADR-0133, CLAUDE.md Section 15

---

## User Stories

### US-001: Safe Increment Structure Creation (Priority: P0)

**As a** SpecWeave contributor
**I want** increment-planner to create increment structure WITHOUT spawning agents
**So that** Claude Code doesn't crash during increment planning

**Acceptance Criteria**:

- [x] **AC-US1-01**: Remove Task() call for PM agent (STEP 3 in workflow) ✅ VERIFIED
  - **Priority**: P0
  - **Testable**: Yes (verify no Task() calls in code)
  - **Implementation**: Replace with template creation + guidance
  - **Location**: `plugins/specweave/skills/increment-planner/SKILL.md` lines 263-312

- [x] **AC-US1-02**: Remove Task() call for Architect agent (STEP 4 in workflow)
  - **Priority**: P0
  - **Testable**: Yes (verify no Task() calls in code)
  - **Implementation**: Replace with template creation + guidance
  - **Location**: `plugins/specweave/skills/increment-planner/SKILL.md` lines 316-346

- [x] **AC-US1-03**: Remove Task() call for Test-Aware Planner agent (STEP 5 in workflow)
  - **Priority**: P0
  - **Testable**: Yes (verify no Task() calls in code)
  - **Implementation**: Replace with template creation + guidance
  - **Location**: `plugins/specweave/skills/increment-planner/SKILL.md` lines 349-382

- [x] **AC-US1-04**: Verify no other Task() calls exist in skill
  - **Priority**: P0
  - **Testable**: Yes (grep for Task() in SKILL.md)
  - **Implementation**: Search entire skill file
  - **Validation**: `grep -n 'Task(' plugins/specweave/skills/increment-planner/SKILL.md` returns nothing

---

### US-002: Template Generation Implementation (Priority: P0)

**As a** SpecWeave contributor
**I want** increment-planner to generate minimal file templates
**So that** users have a starting structure without crashing Claude Code

**Acceptance Criteria**:

- [x] **AC-US2-01**: Generate spec.md template with frontmatter
  - **Priority**: P0
  - **Testable**: Yes (verify spec.md created with correct structure)
  - **Template**: Frontmatter + placeholders for Overview, User Stories, Requirements, Success Criteria
  - **Size**: < 50 lines
  - **Location**: Created in `.specweave/increments/{number}-{name}/spec.md`

- [x] **AC-US2-02**: Generate plan.md template with placeholders
  - **Priority**: P0
  - **Testable**: Yes (verify plan.md created with correct structure)
  - **Template**: Placeholders for Overview, Architecture Decisions, Components, Tech Stack
  - **Size**: < 50 lines
  - **Location**: Created in `.specweave/increments/{number}-{name}/plan.md`

- [x] **AC-US2-03**: Generate tasks.md template with instructions
  - **Priority**: P0
  - **Testable**: Yes (verify tasks.md created with correct structure)
  - **Template**: Placeholder for Phase 1: Setup with note "[To be completed by test-aware-planner]"
  - **Size**: < 30 lines
  - **Location**: Created in `.specweave/increments/{number}-{name}/tasks.md`

- [x] **AC-US2-04**: Generate metadata.json (MANDATORY)
  - **Priority**: P0
  - **Testable**: Yes (verify metadata.json exists and is valid JSON)
  - **Content**: id, status: "planned", type, priority, created, lastActivity, testMode, coverageTarget
  - **Validation**: JSON.parse succeeds
  - **Location**: Created in `.specweave/increments/{number}-{name}/metadata.json`

---

### US-003: User Guidance Implementation (Priority: P0)

**As a** SpecWeave user
**I want** clear instructions on how to complete increment planning
**So that** I know what commands to run next without confusion

**Acceptance Criteria**:

- [x] **AC-US3-01**: Output increment creation success message
  - **Priority**: P0
  - **Testable**: Yes (verify output includes success message)
  - **Message**: "✅ Increment structure created: .specweave/increments/{number}-{name}/"
  - **Format**: Clear, visual (uses ✅ emoji)

- [x] **AC-US3-02**: Provide step-by-step completion instructions
  - **Priority**: P0
  - **Testable**: Yes (verify output includes 3 steps)
  - **Steps**:
    1. Complete spec: "Tell Claude: 'Complete the spec for increment {number}-{name}'"
    2. Design architecture: "Tell Claude: 'Design the architecture for increment {number}-{name}'"
    3. Generate tasks: "Tell Claude: 'Create tasks for increment {number}-{name}'"
  - **Format**: Numbered list, clear instructions

- [x] **AC-US3-03**: Explain why this is safer
  - **Priority**: P1
  - **Testable**: Yes (verify explanation in output)
  - **Content**: Brief note that agents run in main context (prevents crashes)
  - **Reasoning**: Helps users understand the change

---

### US-004: Workflow Documentation Update (Priority: P1)

**As a** SpecWeave contributor
**I want** workflow documentation to reflect the new safe pattern
**So that** future developers don't reintroduce the anti-pattern

**Acceptance Criteria**:

- [x] **AC-US4-01**: Update "Correct Workflow" section
  - **Priority**: P1
  - **Testable**: Yes (verify section updated)
  - **Changes**: Replace STEP 3-5 with new template + guidance workflow
  - **Location**: `plugins/specweave/skills/increment-planner/SKILL.md` lines 244-396
  - **Note**: Warning already added at lines 24-38

- [x] **AC-US4-02**: Update examples to show new workflow
  - **Priority**: P1
  - **Testable**: Yes (verify examples updated)
  - **Section**: "Example: Creating a Feature" (lines 1232+)
  - **Changes**: Show template creation + guidance output instead of Task() calls

- [x] **AC-US4-03**: Validate no references to old Task() pattern remain
  - **Priority**: P1
  - **Testable**: Yes (search for "YOU MUST USE THE TASK TOOL")
  - **Validation**: `grep -i "must use the task tool" SKILL.md` returns nothing

---

## Functional Requirements

### FR-001: Template Files Must Be Valid
All generated template files must be syntactically correct (valid YAML frontmatter, valid Markdown).

### FR-002: Metadata.json Must Be Valid JSON
Generated metadata.json must parse successfully with JSON.parse() and contain all required fields.

### FR-003: No Agent Spawning
Skill must not contain any Task() calls to content-generating agents (PM, Architect, Test-Aware Planner).

### FR-004: Backward Compatibility
Existing increments must not be affected. Only new increment creation workflow changes.

---

## Non-Functional Requirements

### NFR-001: Performance
Skill execution time must be < 5 seconds (no agent spawning = fast).

### NFR-002: Output Size
Total skill output must be < 500 lines to avoid context issues.

### NFR-003: User Experience
Instructions must be clear enough for users unfamiliar with the change.

---

## Success Criteria

- ✅ No Claude Code crashes during increment planning
- ✅ Zero Task() calls to content-generating agents in increment-planner skill
- ✅ Templates generated successfully for spec.md, plan.md, tasks.md, metadata.json
- ✅ User guidance output is clear and actionable
- ✅ Existing increments unaffected
- ✅ Documentation updated to reflect new pattern

---

## Out of Scope

- ❌ Refactoring other skills (they don't have this anti-pattern)
- ❌ Changing agent implementations (Architect, PM, Test-Aware Planner)
- ❌ Modifying slash commands (focus on skill only)
- ❌ Creating automated tests (manual testing sufficient for this refactor)

---

## Dependencies

- ADR-0133 (already created)
- CLAUDE.md Section 15 update (already done)
- Warning in SKILL.md header (already added)

---

## Technical Approach

### Phase 1: Remove Agent Spawning
1. Locate all Task() calls in SKILL.md
2. Replace STEP 3 (PM agent) with spec.md template creation
3. Replace STEP 4 (Architect agent) with plan.md template creation
4. Replace STEP 5 (Test-Aware Planner agent) with tasks.md template creation

### Phase 2: Implement Templates
1. Create spec.md template with proper frontmatter
2. Create plan.md template with placeholders
3. Create tasks.md template with instructions
4. Ensure metadata.json is created (already mandatory)

### Phase 3: Add User Guidance
1. Output success message
2. Provide 3-step completion instructions
3. Explain safety benefits

### Phase 4: Update Documentation
1. Revise "Correct Workflow" section
2. Update examples
3. Remove all references to old pattern

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Skill file corruption during edit | Low | High | Work in small chunks, test after each edit |
| Users don't follow new workflow | Medium | Low | Clear instructions, warning at top of skill |
| Template format issues | Low | Medium | Validate templates before committing |
| Breaking existing increments | Very Low | Critical | Only modify skill, don't touch existing data |

---

## References

- **ADR-0133**: `.specweave/docs/internal/architecture/adr/0133-skills-must-not-spawn-large-agents.md`
- **CLAUDE.md Section 15**: Skills vs Agents anti-patterns
- **Architect Incident**: Increment 0052 (2025-11-24)
- **User Report**: "calling architect agent from my claude plugin/skills crashed the whole claude code again!!"
