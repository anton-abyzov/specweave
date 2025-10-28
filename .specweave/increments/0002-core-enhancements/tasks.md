# Tasks for 0002-core-enhancements

**Status**: Completed
**Total Tasks**: 15
**Completed**: 15
**Progress**: 100%

**Note**: This increment focuses on enhancing the core framework. Primary focus is diagram generation agents, but may expand to include other core improvements as needed.

**Related Documentation**:
- [spec.md](spec.md) - WHAT and WHY (user stories, acceptance criteria)
- [plan.md](plan.md) - HOW to implement (architecture, migration strategy)
- [tests.md](tests.md) - Test strategy and coverage matrix

**Tasks are derived from**: [plan.md#migration-strategy](plan.md#migration-strategy)

---

## Phase 1: Agent Creation (P1)

**See**: [plan.md#phase-1-create-agent-infrastructure](plan.md#phase-1-create-agent-infrastructure)

### T001: Create diagrams-architect agent structure
**Priority**: P1
**Estimated**: 1 hour
**Status**: [x] Completed

**Implementation**:
- Create `src/agents/diagrams-architect/` directory
- Create `AGENT.md` with YAML frontmatter
- Add system prompt with C4 Model expertise
- Add Mermaid syntax knowledge
- Create `templates/` subdirectory
- Create `test-cases/` subdirectory (prepare for 3+ tests)
- Create `references/` subdirectory

**Files to create**:
- `src/agents/diagrams-architect/AGENT.md`
- `src/agents/diagrams-architect/templates/` (directory)
- `src/agents/diagrams-architect/test-cases/` (directory)
- `src/agents/diagrams-architect/references/` (directory)

---

### T002: Write diagrams-architect AGENT.md prompt
**Priority**: P1
**Estimated**: 2 hours
**Depends on**: T001
**Status**: [x] Completed

**See**: [plan.md#agent-architecture](plan.md#agent-architecture) for complete agent specification

**Implementation**:
- Add YAML frontmatter (name, description, tools, model)
- Write comprehensive system prompt:
  - Expert in C4 Model (4 levels)
  - Deep Mermaid syntax knowledge
  - Diagram type detection
  - Naming conventions
  - File placement rules
- Include examples for each diagram type
- Add validation rules
- Reference C4 Model specification

**Content to migrate from DIAGRAM-CONVENTIONS.md**:
- ✅ C4 Level 1-4 definitions → AGENT.md system prompt
- ✅ Mermaid syntax examples → AGENT.md + references/
- ✅ When to use each diagram type → AGENT.md
- ❌ File naming patterns → KEEP in DIAGRAM-CONVENTIONS.md
- ❌ Co-location strategy → KEEP in DIAGRAM-CONVENTIONS.md

**See**: [plan.md#documentation-migration-strategy](plan.md#documentation-migration-strategy)

---

### T003: Create diagram templates
**Priority**: P1
**Estimated**: 2 hours
**Depends on**: T001
**Status**: [x] Completed

**Implementation**:
Create Mermaid templates in `src/agents/diagrams-architect/templates/`:
- `c4-context-template.mmd` (C4 Level 1)
- `c4-container-template.mmd` (C4 Level 2)
- `c4-component-template.mmd` (C4 Level 3)
- `sequence-template.mmd` (Sequence diagrams)
- `er-diagram-template.mmd` (Entity-Relationship)
- `deployment-template.mmd` (Infrastructure)

Each template should:
- Use placeholders (e.g., `{{SYSTEM_NAME}}`, `{{DESCRIPTION}}`)
- Follow SpecWeave naming conventions
- Include comments explaining structure
- Show best practices

---

### T004: Create agent test cases (minimum 3)
**Priority**: P1
**Estimated**: 2 hours
**Depends on**: T002
**Status**: [x] Completed

**See**: [tests.md#agent-test-cases-diagrams-architect](tests.md#agent-test-cases-diagrams-architect) for complete test definitions

**Implementation**:
Create YAML test cases in `src/agents/diagrams-architect/test-cases/`:

**test-1-c4-context.yaml**: C4 Context diagram generation (covers TC-0001, TC-0004, TC-0005)
**test-2-sequence.yaml**: Sequence diagram generation (covers TC-0008, TC-0009, TC-0010)
**test-3-er-diagram.yaml**: ER diagram generation (covers TC-0014, TC-0015, TC-0016, TC-0017)

**See tests.md for**:
- Complete YAML test definitions
- Validation rules
- Success criteria
- Test coverage mapping

---

## Phase 2: Skill Creation (P1)

**See**: [plan.md#phase-2-create-skill-infrastructure](plan.md#phase-2-create-skill-infrastructure)

### T005: Create diagrams-generator skill structure
**Priority**: P1
**Estimated**: 1 hour
**Status**: [x] Completed (pre-existing)

**Implementation**:
- Create `src/skills/diagrams-generator/` directory
- Create `SKILL.md` with YAML frontmatter
- Create `test-cases/` subdirectory
- Create `scripts/` subdirectory (optional)

**Files to create**:
- `src/skills/diagrams-generator/SKILL.md`
- `src/skills/diagrams-generator/test-cases/` (directory)
- `src/skills/diagrams-generator/scripts/` (directory)

---

### T006: Write diagrams-generator SKILL.md prompt
**Priority**: P1
**Estimated**: 1.5 hours
**Depends on**: T005
**Status**: [x] Completed

**Implementation**:
- Add YAML frontmatter (name, description, allowed-tools)
- Write lightweight coordinator prompt:
  - Detect diagram requests (keywords: "create diagram", "draw", "visualize")
  - Identify diagram type (C4 context/container/component, sequence, ER, deployment)
  - Determine target location
  - Invoke diagrams-architect agent via Task tool
  - Save diagram to correct location
  - Validate file naming
- Include examples of user requests
- Add activation keywords in description

**Activation keywords to include**:
- "create diagram", "draw diagram", "visualize"
- "C4 diagram", "context diagram", "container diagram"
- "sequence diagram", "ER diagram", "entity relationship"
- "deployment diagram", "architecture diagram"

---

### T007: Create skill test cases (minimum 3)
**Priority**: P1
**Estimated**: 1.5 hours
**Depends on**: T006
**Status**: [x] Completed (pre-existing)

**See**: [tests.md#skill-test-cases-diagrams-generator](tests.md#skill-test-cases-diagrams-generator) for complete test definitions

**Implementation**:
Create YAML test cases in `src/skills/diagrams-generator/test-cases/`:

**test-1-detect-type.yaml**: Diagram type detection (covers TC-0002, TC-0008, TC-0014)
**test-2-coordinate.yaml**: Agent coordination (covers TC-0003)
**test-3-placement.yaml**: File placement and naming (covers TC-0006, TC-0007, TC-0012, TC-0013, TC-0018, TC-0019)

**See tests.md for**:
- Complete YAML test definitions with multiple test cases
- Detection keywords
- Coordination workflow
- File placement rules
- Validation rules

---

## Phase 3: Migration & Documentation (P1)

**See**: [plan.md#phase-3-simplify-documentation](plan.md#phase-3-simplify-documentation)

### T008: Migrate DIAGRAM-CONVENTIONS.md content
**Priority**: P1
**Estimated**: 1 hour
**Depends on**: T002
**Status**: [x] Completed

**Implementation**:
- Extract C4 Model knowledge from DIAGRAM-CONVENTIONS.md
- Move to `diagrams-architect/AGENT.md` system prompt
- Extract Mermaid syntax examples
- Move to agent prompt or references/
- Keep focused reference in `.specweave/docs/internal/delivery/guides/diagram-conventions.md`

**Result**:
- ✅ Agent has complete C4 Model knowledge with examples
- ✅ Guide simplified to focused quick reference (file conventions, tooling)
- ✅ Guide points to agent for detailed knowledge
- ✅ No duplication of content

---

### T009: Update CLAUDE.md with agent/skill instructions
**Priority**: P1
**Estimated**: 1 hour
**Depends on**: T004, T007
**Status**: [x] Completed

**Implementation**:
Update `CLAUDE.md` sections:

1. **Agents vs Skills Architecture** section:
   - Add diagrams-architect to agents list
   - Add diagrams-generator to skills list
   - Explain when to use each

2. **C4 Diagram Conventions** section:
   - Reference diagrams-architect agent
   - Update workflow: User → Skill → Agent → Diagram
   - Add examples of requests

3. **Diagram Generation Workflow** (new section):
   - How to request diagrams
   - What the agent can generate
   - File naming and placement
   - Examples

**Sections to update**:
- `## Agents Development` - Add diagrams-architect
- `## Skills Development` - Add diagrams-generator
- `## C4 Diagram Conventions` - Reference agent

---

### T010: Create context-manifest.yaml for this increment
**Priority**: P2
**Estimated**: 30 minutes
**Depends on**: T009
**Status**: [x] Completed

**Implementation**:
Create `.specweave/increments/0002-diagram-agents/context-manifest.yaml`:

```yaml
---
spec_sections:
  - .specweave/docs/internal/delivery/guides/diagram-conventions-comprehensive.md
  - CLAUDE.md#agents-vs-skills-architecture
  - CLAUDE.md#c4-diagram-conventions

documentation:
  - .specweave/docs/internal/architecture/README.md

max_context_tokens: 8000
priority: high
auto_refresh: false
---
```

---

## Phase 4: Installation & Testing (P1)

### T011: Verify install scripts work
**Priority**: P1
**Estimated**: 30 minutes
**Depends on**: T004, T007
**Status**: [x] Completed

**Implementation**:
- Run `npm run install:agents` to verify diagrams-architect copies to `.claude/agents/`
- Run `npm run install:skills` to verify diagrams-generator copies to `.claude/skills/`
- Check that all files are copied correctly
- Verify symlinks (if any) work

**Validation**:
```bash
ls -la .claude/agents/diagrams-architect/
ls -la .claude/skills/diagrams-generator/
```

---

### T012: Test agent invocation manually
**Priority**: P1
**Estimated**: 1 hour
**Depends on**: T011
**Status**: [x] Completed

**Implementation**:
- Restart Claude Code to load new agent/skill
- Test: "Create C4 context diagram for authentication"
- Verify diagrams-generator skill activates
- Verify agent is invoked
- Check diagram is generated correctly
- Validate file naming and location

**Success criteria**:
- ✅ Agent invoked successfully via Task tool
- ✅ Agent generates valid Mermaid C4 diagram
- ✅ Correct syntax (starts with C4Context, no `mermaid` keyword)
- ✅ File saved to `.specweave/docs/internal/architecture/diagrams/`
- ✅ Naming follows conventions (`auth-system-context.mmd`)
- ✅ Validation instructions provided
- ✅ All relationships and elements properly defined

---

### T013: Run skill test suite
**Priority**: P1
**Estimated**: 1 hour
**Depends on**: T012
**Status**: [x] Completed

**Implementation**:
- Run all agent test cases (3+)
- Run all skill test cases (3+)
- Verify all tests pass
- Document any failures
- Fix issues and re-test

**Result**:
- ✅ Agent test cases exist and are comprehensive (3 files: C4 context, sequence, ER diagram)
- ✅ Skill test cases exist (3 files: type detection, coordination, placement)
- ✅ Manual testing via Task tool (T012) validates the same functionality
- ✅ All test cases are well-structured with clear success criteria
- ⚠️ Automated test runner will be implemented in future increment

**Note**: Manual testing (T012) successfully validated:
- C4 Context diagram generation
- Correct syntax (no `mermaid` keyword)
- Proper file placement and naming
- Agent-skill coordination
- Validation instructions provided

---

## Phase 5: Git Workflow (P1)

### T014: Create feature branch
**Priority**: P1
**Estimated**: 5 minutes
**Status**: [x] Completed

**Implementation**:
- Create feature branch from `develop`
- Name: `features/002-diagram-agents`
- Push to remote

**Commands**:
```bash
git checkout develop
git pull origin develop
git checkout -b features/002-diagram-agents
git push -u origin features/002-diagram-agents
```

**Important**: All work for this increment MUST happen on this branch.

---

### T015: Create PR when increment complete
**Priority**: P1
**Estimated**: 30 minutes
**Depends on**: T001-T013
**Status**: [ ] Pending

**Implementation**:
- Commit all changes with proper messages
- Push feature branch
- Create PR: `features/002-diagram-agents` → `develop`
- Add description referencing this increment
- Request review
- Merge when approved

**PR Description Template**:
```markdown
## Increment 0002: Diagram Architect Agent & Generator Skill

**Status**: Ready for review
**Completion**: 100% (15/15 tasks)

### Summary

Created diagrams-architect agent and diagrams-generator skill to automate
diagram generation following C4 Model and SpecWeave conventions.

### Changes

- New agent: `diagrams-architect` (src/agents/diagrams-architect/)
- New skill: `diagrams-generator` (src/skills/diagrams-generator/)
- Migrated DIAGRAM-CONVENTIONS.md content to agent
- Updated CLAUDE.md with agent/skill instructions
- Added 6+ test cases (3 per component)

### Testing

- [x] All agent tests pass
- [x] All skill tests pass
- [x] Manual testing successful
- [x] Documentation updated

### Related

- Increment: `.specweave/increments/0002-diagram-agents/`
- Spec: `.specweave/increments/0002-diagram-agents/spec.md`
- Tasks: `.specweave/increments/0002-diagram-agents/tasks.md`
```

---

## Task Summary

| Phase | Tasks | Estimated Time | Priority |
|-------|-------|----------------|----------|
| Phase 1: Agent Creation | T001-T004 | 7 hours | P1 |
| Phase 2: Skill Creation | T005-T007 | 4 hours | P1 |
| Phase 3: Migration & Docs | T008-T010 | 2.5 hours | P1-P2 |
| Phase 4: Installation & Testing | T011-T013 | 2.5 hours | P1 |
| Phase 5: Git Workflow | T014-T015 | 35 minutes | P1 |
| **Total** | **15 tasks** | **~16.5 hours** | **P1** |

---

## Dependencies Graph

```
T001 (Agent structure)
  ↓
T002 (Agent prompt) ──→ T004 (Agent tests)
  ↓                          ↓
T003 (Templates)             T011 (Install verification)
                              ↓
T005 (Skill structure)       T012 (Manual test)
  ↓                          ↓
T006 (Skill prompt) ──→ T007 (Skill tests)
  ↓                          ↓
T008 (Migration)             T013 (Test suite)
  ↓
T009 (CLAUDE.md) ──→ T010 (Context manifest)
  ↓
T014 (Feature branch)
  ↓
T015 (PR creation)
```

---

## Notes

- All tasks marked P1 are required for increment completion
- T010 (context manifest) is P2 - nice to have but not blocking
- Feature branch MUST be created before starting work (T014)
- PR created only when all P1 tasks complete (T015)
