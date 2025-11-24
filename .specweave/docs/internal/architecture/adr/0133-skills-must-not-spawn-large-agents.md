# ADR-0133: Skills Must Not Spawn Large Content-Generating Agents

**Status**: Accepted
**Date**: 2025-11-24
**Context**: Increment 0054 (Sync Guard Fixes)
**Related**: Architect Agent Incident (2025-11-24, Increment 0052)

## Context

The `increment-planner` skill spawns three large agents using Task():
- PM agent (generates specs, 500-2000 lines)
- Architect agent (generates ADRs, diagrams, 1000-3000 lines)
- Test-Aware Planner agent (generates tasks with tests, 500-1500 lines)

This causes **context explosion crashes**:

```
increment-planner skill (1,483 lines loaded)
  → Task() spawns PM agent (600+ lines loaded)
    → PM generates content (500-2000 lines)
      → Returns through skill
  → Task() spawns architect agent (618+ lines loaded)
    → Architect generates ADRs (1000-3000 lines total)
      → "Improvising..." state (buffering large output)
        → CRASH 💥
```

**Observed Symptoms**:
- Claude Code freezes at "Improvising..."
- Complete crash requiring restart
- Screenshot evidence: architect read 1134 lines, then crashed
- Happened "again" per user - recurring issue

## Problem

### 1. Nested Context Accumulation
- Skill prompt: ~1500 lines
- Agent prompt: ~600 lines per agent
- Agent file reads: ~1000 lines
- Agent output generation: 1000-3000 lines
- **Total**: 4,000-7,000 lines in memory simultaneously

### 2. Agent Chunking Incompatibility
Architect agent has `max_response_tokens: 2000` and chunking discipline:
- Creates 1 ADR at a time
- Pauses and asks "which ADR next?"
- Waits for user confirmation

**But when spawned via Task() from skill**:
- Can't pause and ask questions
- Can't wait for user confirmation
- Tries to complete entire task in one response
- Bypasses chunking protection

### 3. Hook Triggering
Write operations trigger `post-task-completion.sh` during agent execution:
- Additional process spawning
- Potential external sync attempts
- Compounds the context pressure

## Decision

**Skills MUST NOT spawn agents that generate substantial content.**

### What Changes

**❌ OLD (Broken)**:
```markdown
STEP 3: Invoke PM Agent (🚨 MANDATORY - USE TASK TOOL)

Task(
  subagent_type: "specweave:pm:pm",
  description: "PM product strategy",
  prompt: "[1000+ line prompt with all requirements]"
)
```

**✅ NEW (Safe)**:
```markdown
STEP 3: Create Template and Guide User

1. Create basic spec.md template (< 50 lines)
2. Output guidance:
   "To complete planning, tell Claude:
    'Complete the spec for increment 0005-feature-name'

    The PM expertise will activate automatically (no Task() needed)."
```

### Implementation Rules

1. **Skills as Lightweight Coordinators**
   - Create directory structure
   - Create minimal templates
   - Output user guidance
   - Total output < 500 lines

2. **Direct Agent Invocation**
   - Users invoke agents via conversation
   - Agents run in main context (no nesting)
   - Chunking discipline works correctly
   - User has control and visibility

3. **No Task() for Content Generators**
   - PM agent: NO (generates large specs)
   - Architect agent: NO (generates multiple ADRs)
   - Test-Aware Planner: NO (generates comprehensive tasks)
   - Small utility agents: OK if output < 200 lines

## Consequences

### Positive
- ✅ Eliminates context explosion crashes
- ✅ Enables proper agent chunking (1 ADR at a time)
- ✅ User maintains control of workflow
- ✅ Better visibility into what's being generated
- ✅ Incremental progress with checkpoints

### Negative
- ❌ Requires 3 separate user commands instead of 1
- ❌ User must know the workflow sequence
- ❌ Less "magical" automation

### Neutral
- Skills become coordination guides, not generators
- Focus shifts from automation to guided workflows
- Documentation becomes critical for user success

## Alternatives Considered

### 1. Streaming Agent Output
**Rejected**: Claude Code doesn't support output streaming during Task() execution. Agent must return complete output.

### 2. Agent Output Size Limits
**Rejected**: Artificially limiting output (e.g., "create only 1 ADR") doesn't solve nesting issue. Skill context + agent context is still too large.

### 3. Split Skills Into Smaller Skills
**Rejected**: Multiple skills still call Task(). The anti-pattern is Task() spawning, not skill size.

## Migration Path

1. Update `increment-planner` skill:
   - Remove all Task() calls
   - Add template creation logic
   - Output user guidance

2. Document new workflow in skill description

3. Update `/specweave:increment` command (if exists) to follow same pattern

4. Add clear error if old pattern detected

## Skill Size Limits (Added 2025-11-24)

**Discovery**: During crash investigation, found multiple skills >1000 lines causing crashes even WITHOUT agent spawning.

**Root Cause**: Skills load entire content into context on activation. Large skills (1000-1500 lines) consume excessive context before any work begins.

### Recommended Limits

| Skill Type | Max Lines | Rationale |
|------------|-----------|-----------|
| **Planning Skills** | 400-600 | Complex workflows, templates |
| **Implementation Skills** | 300-500 | Code examples, patterns |
| **Orchestration Skills** | 400-500 | Multi-agent coordination |
| **Utility Skills** | 200-300 | Focused, single-purpose |

### Skills Refactored (2025-11-24)

1. ✅ increment-planner: 1480 → 566 lines (62% reduction)
2. ✅ role-orchestrator: 1126 → 450 lines (60% reduction)
3. ✅ technical-writing: 1039 → 533 lines (49% reduction)
4. ✅ unit-testing-expert: 1011 → 519 lines (49% reduction)
5. ✅ brownfield-analyzer: 1008 → 407 lines (60% reduction)

**Total**: 5,644 lines → 2,475 lines (56% reduction)

### Self-Containment Rule

**Skills MUST be 100% self-contained** - NO references to SpecWeave internal docs/ADRs.

**Why**: Users run `specweave init` in THEIR projects. SpecWeave repo docs (.specweave/docs/internal/) don't exist in user projects.

**❌ Prohibited**:
```markdown
See ADR-0133 for details
Reference: .specweave/docs/internal/delivery/guides/increment-lifecycle.md
```

**✅ Required**:
- Embed all essential instructions inline
- Complete templates and examples
- No external SpecWeave doc references
- Works in ANY user project after `specweave init`

## References

- Architect Agent: `plugins/specweave/agents/architect/AGENT.md` (lines 36-117, chunking discipline)
- Increment Planner Skill: `plugins/specweave/skills/increment-planner/SKILL.md` (refactored 2025-11-24)
- Incident: Architect crash 2025-11-24, Increment 0052
- User Report: "calling architect agent from my claude plugin/skills crashed the whole claude code again!!"
- Refactoring: 5 major skills compacted 2025-11-24 (autonomous 600-hour session)
