---
increment: 0002-core-enhancements
title: "Core Framework Enhancements - Diagram Agents & Tool Mapping"
priority: P2
status: planned
created: 2025-10-26
updated: 2025-10-26
started: null
completed: null
closed: null
structure: tasks

# Completion tracking
total_tasks: 0
completed_tasks: 0
completion_rate: 0

# Dependencies
dependencies:
  - 0001-core-framework

# WIP tracking
wip_slot: null
---

# Increment 0002: Core Framework Enhancements

## Overview

**Problem**: Several components currently exist as documentation files but would benefit from specialized agents/skills with complex workflows and dedicated expertise.

**Solution**: Enhance the core framework with:
1. **Diagram Generation**: `diagrams-architect` agent + `diagrams-generator` skill for automated diagram creation following C4 Model and Mermaid conventions
2. **Documentation Refinement**: Keep TOOL-CONCEPT-MAPPING.md as reference documentation (not converted to agent)
3. **Future enhancements**: Additional core framework improvements as identified

## Business Value

**Why this matters**:
- **Automated diagram generation**: Users can request diagrams and get properly-formatted Mermaid diagrams following C4 conventions
- **Consistent quality**: All diagrams follow the same conventions (C4 Levels, naming, placement)
- **Reduced cognitive load**: Developers don't need to remember Mermaid syntax or C4 rules
- **Better documentation**: High-quality diagrams improve architecture documentation

## Scope

### In Scope ✅

1. **diagrams-architect agent** (`src/agents/diagrams-architect/`)
   - Expert in C4 Model (Context, Container, Component, Code)
   - Deep Mermaid syntax knowledge
   - Diagram type detection (sequence, ER, deployment, flow)
   - Template-based generation
   - Validation and best practices

2. **diagrams-generator skill** (`src/skills/diagrams-generator/`)
   - Lightweight coordinator
   - Auto-detection of diagram requests
   - Delegates to diagrams-architect agent
   - Handles file placement (correct location in docs/)
   - Updates diagram index

3. **Migration**
   - Move DIAGRAM-CONVENTIONS.md content to agent prompt
   - Keep simplified conventions in docs for reference
   - Update CLAUDE.md with agent/skill instructions

4. **Testing**
   - Minimum 3 test cases for diagrams-architect agent
   - Minimum 3 test cases for diagrams-generator skill
   - Integration test: User request → Generated diagram

### Out of Scope ❌

- TOOL-CONCEPT-MAPPING.md (remains documentation)
- Automated rendering to SVG (handled by CI/CD)
- Interactive diagram editors
- Non-Mermaid diagram formats (Graphviz, PlantUML)

## User Stories

### US-001: Create C4 Context Diagram

**As a** developer
**I want to** request "create C4 context diagram for authentication"
**So that** I get a properly-formatted Mermaid diagram following SpecWeave conventions

**Acceptance Criteria**:
- [ ] **TC-0001**: User request detected by diagrams-generator skill
- [ ] **TC-0002**: Skill identifies diagram type (C4 Context, Level 1)
- [ ] **TC-0003**: Skill invokes diagrams-architect agent
- [ ] **TC-0004**: Agent creates diagram with correct Mermaid syntax
- [ ] **TC-0005**: Diagram follows C4 Level 1 conventions (system boundary, external actors)
- [ ] **TC-0006**: Diagram saved to correct location (`.specweave/docs/internal/architecture/diagrams/`)
- [ ] **TC-0007**: File named correctly (e.g., `authentication.c4-context.mmd`)

### US-002: Create Sequence Diagram

**As a** developer
**I want to** request "create sequence diagram for login flow"
**So that** I get a Mermaid sequence diagram showing the interaction flow

**Acceptance Criteria**:
- [ ] **TC-0008**: Skill detects sequence diagram request
- [ ] **TC-0009**: Agent generates sequenceDiagram syntax
- [ ] **TC-0010**: Participants clearly labeled
- [ ] **TC-0011**: Flow accurately represents login process
- [ ] **TC-0012**: Diagram saved to `.specweave/docs/internal/architecture/diagrams/flows/`
- [ ] **TC-0013**: File named `login-flow.sequence.mmd`

### US-003: Create ER Diagram

**As a** developer
**I want to** request "create ER diagram for user and order entities"
**So that** I get an entity-relationship diagram showing database schema

**Acceptance Criteria**:
- [ ] **TC-0014**: Skill detects ER diagram request
- [ ] **TC-0015**: Agent generates erDiagram syntax
- [ ] **TC-0016**: Entities, attributes, relationships correctly defined
- [ ] **TC-0017**: Primary/foreign keys marked
- [ ] **TC-0018**: Diagram saved to `.specweave/docs/internal/architecture/diagrams/`
- [ ] **TC-0019**: File named `user-order.entity.mmd`

## Technical Architecture

### Agent Structure

```
src/agents/diagrams-architect/
├── AGENT.md                    # System prompt with C4 + Mermaid expertise
├── templates/
│   ├── c4-context-template.mmd
│   ├── c4-container-template.mmd
│   ├── c4-component-template.mmd
│   ├── sequence-template.mmd
│   ├── er-diagram-template.mmd
│   └── deployment-template.mmd
├── test-cases/                 # MANDATORY (min 3)
│   ├── test-1-c4-context.yaml
│   ├── test-2-sequence.yaml
│   └── test-3-er-diagram.yaml
└── references/
    ├── c4-model-spec.md
    └── mermaid-syntax-guide.md
```

### Skill Structure

```
src/skills/diagrams-generator/
├── SKILL.md                    # Lightweight coordinator
├── test-cases/                 # MANDATORY (min 3)
│   ├── test-1-detect-type.yaml
│   ├── test-2-coordinate.yaml
│   └── test-3-placement.yaml
└── scripts/
    └── validate-diagram.sh
```

### Workflow

1. **User request**: "Create C4 context diagram for authentication"
2. **diagrams-generator skill activates** (auto-detection via description keywords)
3. **Skill validates request**:
   - Identifies diagram type (C4 Context, Level 1)
   - Determines target location
   - Prepares context for agent
4. **Skill invokes diagrams-architect agent** via Task tool:
   ```typescript
   await Task({
     subagent_type: "diagrams-architect",
     prompt: "Create C4 context diagram for authentication system",
     description: "Generate C4 Level 1 diagram"
   });
   ```
5. **Agent generates diagram**:
   - Uses C4 context template
   - Applies naming conventions
   - Validates Mermaid syntax
   - Returns diagram content
6. **Skill saves diagram**:
   - Write to `.specweave/docs/internal/architecture/diagrams/authentication.c4-context.mmd`
   - Update diagram index (if exists)
   - Confirm completion to user

## Migration Plan

### Step 1: Create Agent & Skill

- Create `src/agents/diagrams-architect/` with full C4 + Mermaid expertise
- Create `src/skills/diagrams-generator/` as coordinator
- Add minimum 3 test cases to each
- Verify tests pass

### Step 2: Migrate Content

- Move DIAGRAM-CONVENTIONS.md content to `diagrams-architect/AGENT.md` system prompt
- Keep simplified reference in `.specweave/docs/DIAGRAM-CONVENTIONS.md` (for developers)
- Update CLAUDE.md with agent/skill instructions

### Step 3: Update Installation

- Ensure install scripts copy new agent/skill to `.claude/`
- Test installation process
- Restart Claude Code to load new components

### Step 4: Documentation

- Update CLAUDE.md with:
  - Agent vs Skill architecture section
  - When to use diagrams-architect
  - Examples of diagram requests
- Update `.specweave/docs/README.md` with diagram agent reference

## Success Criteria

- [ ] `diagrams-architect` agent created with ≥3 test cases
- [ ] `diagrams-generator` skill created with ≥3 test cases
- [ ] All tests pass
- [ ] Install scripts copy new components to `.claude/`
- [ ] Agent can generate C4 Context, Container, Component diagrams
- [ ] Agent can generate sequence, ER, deployment diagrams
- [ ] Diagrams follow SpecWeave naming conventions
- [ ] CLAUDE.md updated with agent/skill instructions
- [ ] Documentation complete

## Related Documentation

- [DIAGRAM-CONVENTIONS.md](../../docs/DIAGRAM-CONVENTIONS.md) - Current conventions (to be migrated)
- [CLAUDE.md](../../../CLAUDE.md) - Development guide (to be updated)
- [Agents vs Skills Architecture](../../../CLAUDE.md#agents-vs-skills-architecture) - Framework explanation
