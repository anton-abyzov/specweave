# Implementation Plan: Eliminate Skill-Agent Spawning Crashes

## Overview

Refactor the `increment-planner` skill to eliminate Claude Code crashes caused by spawning large content-generating agents. Replace the Task() spawning pattern with a safe template + guidance pattern.

**Key Insight**: Skills should coordinate, not generate. Agents should run in main context, not nested.

---

## Architecture

### Current (Broken) Flow
```
User: "Plan feature X"
  ↓
increment-planner skill activates (1483 lines loaded)
  ↓
STEP 3: Task(PM agent) spawned (600+ lines loaded)
  ↓ generates 500-2000 lines
  ↓ returns through skill
  ↓
STEP 4: Task(Architect agent) spawned (618+ lines loaded)
  ↓ reads 1134 lines
  ↓ generates 1000-3000 lines ("Improvising...")
  ↓ CRASH 💥 (context explosion: 4000-7000 lines)
```

### New (Safe) Flow
```
User: "Plan feature X"
  ↓
increment-planner skill activates (1483 lines loaded)
  ↓
Create increment directory
  ↓
Generate templates:
  - spec.md (< 50 lines)
  - plan.md (< 50 lines)
  - tasks.md (< 30 lines)
  - metadata.json (< 20 lines)
  ↓
Output guidance:
  "To complete planning:
   1. Tell Claude: 'Complete the spec for increment 0055-feature'
   2. Tell Claude: 'Design the architecture for increment 0055-feature'
   3. Tell Claude: 'Create tasks for increment 0055-feature'"
  ↓
Skill exits (< 500 lines total output)
  ↓
User invokes agents directly in main context:
  PM agent activates → generates spec (no nesting)
  Architect activates → creates 1 ADR at a time (chunking works!)
  Test-Aware Planner activates → generates tasks (no nesting)
```

---

## Components to Modify

### 1. `plugins/specweave/skills/increment-planner/SKILL.md`

**Sections to Change**:
- Lines 263-312: STEP 3 (PM agent Task() call)
- Lines 316-346: STEP 4 (Architect agent Task() call)
- Lines 349-382: STEP 5 (Test-Aware Planner agent Task() call)
- Lines 1232+: Example section (update to show new workflow)

**Changes**:
- Remove all Task() calls
- Add template generation logic
- Add user guidance output
- Update examples

---

## Implementation Approach

### Phase 1: Safe Edits to Remove Agent Spawning

**CRITICAL**: Work in SMALL chunks to avoid file corruption.

#### Task 1.1: Refactor STEP 3 (PM Agent)
**Location**: Lines 263-312 (50 lines)

**OLD**:
```markdown
STEP 3: Invoke PM Agent (🚨 MANDATORY - USE TASK TOOL)

Task(
  subagent_type: "specweave:pm:pm",
  ...
)
```

**NEW**:
```markdown
STEP 3: Create spec.md Template

1. Use Write tool to create basic spec.md:
   ```markdown
   ---
   increment: {number}-{name}
   title: "{Human Readable Title}"
   type: feature
   priority: P1
   status: planned
   created: {YYYY-MM-DD}
   structure: user-stories
   test_mode: TDD
   coverage_target: 95
   ---

   # {Feature Title}

   ## Overview
   [To be completed by PM - tell Claude: "Complete the spec for increment {number}-{name}"]

   ## User Stories
   [To be completed by PM]

   ## Functional Requirements
   [To be completed by PM]

   ## Success Criteria
   [To be completed by PM]
   ```

2. DO NOT spawn PM agent
```

#### Task 1.2: Refactor STEP 4 (Architect Agent)
**Location**: Lines 316-346 (31 lines)

**OLD**:
```markdown
STEP 4: Invoke Architect Agent (🚨 MANDATORY - USE TASK TOOL)

Task(
  subagent_type: "specweave:architect:architect",
  ...
)
```

**NEW**:
```markdown
STEP 4: Create plan.md Template

1. Use Write tool to create basic plan.md:
   ```markdown
   # Implementation Plan: {Feature Title}

   ## Overview
   [To be completed by Architect]

   ## Architecture Decisions
   [Architect will create ADRs - one at a time for safety]
   [See .specweave/docs/internal/architecture/adr/]

   ## Components
   [To be completed by Architect]

   ## Technology Stack
   [To be completed by Architect]

   ## References
   - Living docs: .specweave/docs/internal/architecture/
   ```

2. DO NOT spawn Architect agent
```

#### Task 1.3: Refactor STEP 5 (Test-Aware Planner)
**Location**: Lines 349-382 (34 lines)

**OLD**:
```markdown
STEP 5: Invoke Test-Aware Planner Agent (🚨 MANDATORY - USE TASK TOOL)

Task(
  subagent_type: "specweave:test-aware-planner:test-aware-planner",
  ...
)
```

**NEW**:
```markdown
STEP 5: Create tasks.md Template

1. Use Write tool to create basic tasks.md:
   ```markdown
   # Tasks: {Feature Title}

   ## Phase 1: Setup
   [To be completed by test-aware-planner]
   [Tell Claude: "Create tasks for increment {number}-{name}"]

   **Note**: Test-aware planner will generate:
   - Tasks with embedded test plans (BDD format)
   - Unit/integration/E2E test cases
   - Coverage targets (80-90%)
   ```

2. DO NOT spawn test-aware-planner agent
```

### Phase 2: Add User Guidance Output

After all templates are created, output clear guidance:

```markdown
STEP 6: Output User Guidance

```
✅ Increment structure created: .specweave/increments/{number}-{name}/

Files created:
- spec.md (template with frontmatter)
- plan.md (template with placeholders)
- tasks.md (template with instructions)
- metadata.json (status tracking enabled)

To complete planning, run these commands in sequence:

1. **Complete product specification** (user stories, requirements):
   Tell Claude: "Complete the spec for increment {number}-{name}"

   The PM expertise will activate automatically (no /command needed).
   PM will fill in Overview, User Stories, Requirements, Success Criteria.

2. **Design technical architecture** (ADRs, system design):
   Tell Claude: "Design the architecture for increment {number}-{name}"

   The Architect will activate and create:
   - ADRs one at a time (prevents crashes!)
   - System design updates
   - Component diagrams
   - Complete plan.md

3. **Generate implementation tasks** (with embedded tests):
   Tell Claude: "Create tasks for increment {number}-{name}"

   The test-aware planner will generate:
   - Tasks with embedded test plans (BDD format)
   - Test cases (unit/integration/E2E)
   - Coverage targets

**Why this is safer**:
- Agents run in main context (no nesting = no context explosion)
- Architect can create 1 ADR at a time (proper chunking)
- You have control and visibility into what's being generated
```
```

### Phase 3: Update Documentation and Examples

#### Task 3.1: Update Examples Section
**Location**: Lines 1232+ ("Example: Creating a Feature")

**Changes**:
- Remove Task() invocation examples
- Show template creation output
- Show user guidance output
- Demonstrate the 3-step completion workflow

#### Task 3.2: Validate No Old Pattern References
**Validation**:
```bash
grep -i "must use the task tool" plugins/specweave/skills/increment-planner/SKILL.md
# Should return: nothing

grep -n "Task(" plugins/specweave/skills/increment-planner/SKILL.md
# Should return: nothing (or only in warning/example sections)
```

---

## Testing Strategy

### Manual Testing

1. **Test increment creation**:
   ```
   Tell Claude: "Plan a feature for user authentication"
   ```

   Expected:
   - Increment directory created
   - Templates generated (spec.md, plan.md, tasks.md, metadata.json)
   - User guidance output displayed
   - NO Claude Code crash

2. **Test completion workflow**:
   ```
   Tell Claude: "Complete the spec for increment 0055-user-auth"
   ```

   Expected:
   - PM expertise activates
   - spec.md filled in with user stories
   - No crashes

3. **Test architecture workflow**:
   ```
   Tell Claude: "Design the architecture for increment 0055-user-auth"
   ```

   Expected:
   - Architect activates
   - Creates 1 ADR, asks "which next?"
   - Chunking discipline works correctly
   - No crashes

### Validation

- [ ] No Task() calls to PM agent
- [ ] No Task() calls to Architect agent
- [ ] No Task() calls to Test-Aware Planner agent
- [ ] Templates are valid (YAML frontmatter correct, Markdown valid)
- [ ] metadata.json is valid JSON
- [ ] User guidance is clear and actionable
- [ ] No Claude Code crashes during testing

---

## File Structure

```
plugins/specweave/skills/increment-planner/
├── SKILL.md                    # ← MODIFY (remove Task() calls)
├── scripts/
│   └── feature-utils.js        # ← NO CHANGES (already correct)
└── templates/                  # ← Could add templates here (future enhancement)
    ├── spec-template.md
    ├── plan-template.md
    └── tasks-template.md
```

---

## Technology Stack

- **Language**: Markdown (skill documentation)
- **Tools**: Claude Code Read/Write/Edit tools
- **Validation**: grep, git diff

---

## Performance Targets

- **Skill execution**: < 5 seconds (no agent spawning)
- **Total output**: < 500 lines (templates + guidance)
- **Memory footprint**: < 2000 lines in context (vs 4000-7000 with old pattern)

---

## Security Considerations

- No security issues (pure documentation refactoring)
- Validate template files don't contain user input injection vulnerabilities
- Ensure metadata.json doesn't expose sensitive information

---

## Deployment Considerations

- **Rollout**: Immediate (affects only new increment creation)
- **Backward compatibility**: Existing increments unaffected
- **User communication**: Warning already added to skill header
- **Documentation**: ADR-0133 and CLAUDE.md already updated

---

## Rollback Plan

If issues arise:
```bash
git restore plugins/specweave/skills/increment-planner/SKILL.md
```

Restore to previous version. Warning at top of file will prevent old pattern usage.

---

## References

- **ADR-0133**: `.specweave/docs/internal/architecture/adr/0133-skills-must-not-spawn-large-agents.md`
- **CLAUDE.md**: Section 15 (Skills Must NOT Spawn Large Agents)
- **Architect Agent**: `plugins/specweave/agents/architect/AGENT.md` (chunking discipline)
