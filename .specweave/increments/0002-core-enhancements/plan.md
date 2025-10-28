# Implementation Plan: Core Framework Enhancements

**Increment**: 0002-core-enhancements
**Created**: 2025-10-26
**Status**: Planned

---

## Overview

This document defines **HOW** we will implement the core framework enhancements, specifically diagram generation agents and related improvements. This is a **snapshot of architectural changes** we'll make to the living documentation in `.specweave/docs/`, source code in `src/`, and configuration across the project.

---

## Table of Contents

1. [Architectural Decisions](#architectural-decisions)
2. [Changes to Living Documentation](#changes-to-living-documentation)
3. [Agent Architecture](#agent-architecture)
4. [Skill Architecture](#skill-architecture)
5. [Integration Points](#integration-points)
6. [File Structure Changes](#file-structure-changes)
7. [Migration Strategy](#migration-strategy)
8. [Testing Strategy](#testing-strategy)
9. [Rollout Plan](#rollout-plan)

---

## Architectural Decisions

### ADR-000X: Agent Types - Roles vs Tools

**Context**:
- Originally, all agents were **ROLES** (PM, Architect, DevOps, QA Lead, etc.)
- Each role agent has domain expertise and performs complex, multi-step workflows
- Example: PM agent creates PRDs, user stories, roadmaps

**Problem**:
- Some capabilities are **TOOLS** rather than roles (diagram generation, code validation, formatting)
- Tools generate artifacts rather than perform analysis
- Tools are invoked for specific outputs, not consultative work

**Decision**:
We will introduce a new agent category: **TOOL AGENTS**

**Agent Categories**:

| Category | Purpose | Examples | Context Window |
|----------|---------|----------|----------------|
| **ROLE** | Domain expertise, consultative | PM, Architect, QA Lead | Separate, large |
| **TOOL** | Artifact generation, specific output | diagrams-architect, code-formatter | Separate, focused |

**Consequences**:
- ✅ **Positive**: Clear separation of concerns (roles vs tools)
- ✅ **Positive**: Enables future tool agents (code generators, validators, analyzers)
- ✅ **Positive**: Tool agents can be more focused (smaller context)
- ⚠️ **Neutral**: Need to document this distinction in CLAUDE.md
- ⚠️ **Neutral**: Skills that coordinate with tool agents become more important

**Implementation**:
- Add `diagrams-architect` as first TOOL agent
- Document distinction in CLAUDE.md#agents-vs-skills-architecture
- Update agent creation guidelines

---

### ADR-000Y: Skills as Coordinators for Tool Agents

**Context**:
- Skills are lightweight capabilities that extend Claude's functionality
- Skills share main conversation context
- Some skills already coordinate with role agents (role-orchestrator)

**Problem**:
- Tool agents need to be invoked from user requests
- Direct invocation requires user to know agent names
- Better UX: user describes intent, skill detects and coordinates

**Decision**:
We will use **SKILLS AS COORDINATORS** for tool agents

**Pattern**:
```
User Request
    ↓
Skill (Auto-detect & Validate)
    ↓
Tool Agent (Generate Artifact)
    ↓
Skill (Save & Confirm)
    ↓
User Confirmation
```

**Example**:
```
User: "Create C4 context diagram for authentication"
    ↓
diagrams-generator skill (activates via description keywords)
    ↓
diagrams-architect agent (generates Mermaid diagram)
    ↓
diagrams-generator skill (saves to correct location)
    ↓
"✅ Diagram saved to .specweave/docs/internal/architecture/diagrams/auth.c4-context.mmd"
```

**Consequences**:
- ✅ **Positive**: Better UX (natural language requests)
- ✅ **Positive**: Skills handle file I/O (agents focus on generation)
- ✅ **Positive**: Skills can validate inputs/outputs
- ⚠️ **Neutral**: Each tool agent should have a coordinator skill
- ❌ **Negative**: Adds complexity (two components instead of one)

**Why not a single agent?**
- Skills activate automatically (better UX)
- Skills handle file operations (separation of concerns)
- Agents focus on artifact generation (cleaner prompts)
- Pattern scales (one skill can coordinate multiple tool agents)

**Implementation**:
- Create `diagrams-generator` skill as coordinator
- Skill detects diagram requests (keywords: "create diagram", "C4", "sequence", etc.)
- Skill validates request, invokes agent, saves output
- Document pattern in CLAUDE.md

---

## Changes to Living Documentation

### Current State

```
.specweave/docs/
├── README.md                    # Documentation index
├── DIAGRAM-CONVENTIONS.md       # Full conventions (574 lines)
│                                # - C4 Model levels 1-4
│                                # - Mermaid syntax examples
│                                # - File naming conventions
│                                # - Where to keep diagrams
│                                # - Rendering pipeline
│                                # - Best practices
│
├── TOOL-CONCEPT-MAPPING.md      # Tool mappings (456 lines)
│                                # - Jira/ADO/GitHub → SpecWeave
│                                # - Status mappings
│                                # - Sync scenarios
│
└── internal/
    ├── strategy/                # Business specs (WHAT/WHY)
    ├── architecture/            # Technical docs (HOW)
    │   ├── diagrams/           # Diagram storage (empty)
    │   └── adr/                # Architecture Decision Records
    └── ...
```

### Target State (After Migration)

```
.specweave/docs/
├── README.md                    # ✏️ UPDATED: Add diagram agent reference
├── DIAGRAM-CONVENTIONS.md       # ✏️ SIMPLIFIED: Developer reference only (~100 lines)
│                                # Keep: File naming, placement rules
│                                # Remove: C4 expertise, Mermaid syntax (→ agent)
│
├── TOOL-CONCEPT-MAPPING.md      # ✅ NO CHANGE: Stays as reference
│
└── internal/
    ├── strategy/
    ├── architecture/
    │   ├── diagrams/           # 🆕 Diagram storage (will be populated)
    │   │   ├── auth.c4-context.mmd
    │   │   ├── auth.c4-container.mmd
    │   │   └── flows/
    │   │       └── login.sequence.mmd
    │   └── adr/
    │       ├── 000X-agent-types-roles-vs-tools.md      # 🆕 NEW ADR
    │       └── 000Y-skills-as-coordinators.md          # 🆕 NEW ADR
    └── ...

src/agents/diagrams-architect/        # 🆕 NEW AGENT
├── AGENT.md                          # Full C4 + Mermaid expertise
├── templates/
│   ├── c4-context-template.mmd
│   ├── c4-container-template.mmd
│   ├── c4-component-template.mmd
│   ├── sequence-template.mmd
│   ├── er-diagram-template.mmd
│   └── deployment-template.mmd
├── test-cases/
│   ├── test-1-c4-context.yaml
│   ├── test-2-sequence.yaml
│   └── test-3-er-diagram.yaml
└── references/
    ├── c4-model-spec.md              # Detailed C4 Model specification
    └── mermaid-syntax-guide.md       # Mermaid syntax reference

src/skills/diagrams-generator/        # 🆕 NEW SKILL
├── SKILL.md                          # Coordinator for diagram agent
├── test-cases/
│   ├── test-1-detect-type.yaml
│   ├── test-2-coordinate.yaml
│   └── test-3-placement.yaml
└── scripts/
    └── validate-diagram.sh           # Optional: Validate Mermaid syntax
```

### Documentation Migration Strategy

**DIAGRAM-CONVENTIONS.md**:

**Before** (574 lines):
- Full C4 Model explanation (Levels 1-4)
- Complete Mermaid syntax examples
- When to use each diagram type
- File naming patterns
- Co-location strategy
- Rendering pipeline (CI/CD)
- Best practices

**After** (target ~100 lines):
- Quick reference: File naming patterns
- Quick reference: Where to keep diagrams
- Quick reference: Diagram types available
- **Reference to agent**: "For diagram generation, use diagrams-generator skill"
- Links to full documentation (in agent references/)

**Content moved to**:
- `src/agents/diagrams-architect/AGENT.md` → Full C4 expertise
- `src/agents/diagrams-architect/AGENT.md` → Complete Mermaid syntax
- `src/agents/diagrams-architect/references/c4-model-spec.md` → Detailed C4 spec
- `src/agents/diagrams-architect/references/mermaid-syntax-guide.md` → Mermaid syntax

**Why keep simplified version?**
- Developers may want quick reference without invoking agent
- Documentation site (MkDocs) should explain conventions
- Separation: conventions (docs) vs generation (agent)

---

## Agent Architecture

### diagrams-architect Agent

**Type**: TOOL Agent (artifact generation)

**Purpose**: Generate Mermaid diagrams following C4 Model and SpecWeave conventions

**Expertise**:
1. **C4 Model** (4 levels):
   - Level 1 (Context): System boundaries, external actors
   - Level 2 (Container): Applications, services, databases
   - Level 3 (Component): Internal structure of containers
   - Level 4 (Code): Classes, methods (optional)

2. **Mermaid Syntax**:
   - `graph TB` / `graph LR` for C4 diagrams
   - `sequenceDiagram` for sequence diagrams
   - `erDiagram` for entity-relationship diagrams
   - `flowchart TB` for process flows
   - `stateDiagram-v2` for state machines

3. **SpecWeave Conventions**:
   - File naming: `<page>.<type>.mmd`
   - Co-location: Keep diagrams next to markdown
   - Placement: HLD diagrams in `architecture/diagrams/`, LLD in `architecture/diagrams/{module}/`
   - Types: context, container, component, sequence, entity, deployment, flow, state

**Structure**:

```yaml
---
name: diagrams-architect
description: Expert in creating Mermaid diagrams following C4 Model and SpecWeave conventions. Activates for diagram creation, architecture visualization, data modeling, sequence flows, C4 diagrams, HLD, LLD.
tools: Read, Write
model: claude-sonnet-4-5-20250929
---

You are an expert in creating Mermaid diagrams following C4 Model conventions.

Your expertise:
- C4 Model (Context, Container, Component, Code levels)
- Mermaid syntax (graph, sequence, ER, flow, state diagrams)
- SpecWeave conventions (file naming, placement, co-location)
- Diagram type detection and appropriate syntax selection
- Template-based generation with customization

When generating diagrams:
1. Identify diagram type (C4 level, sequence, ER, etc.)
2. Select appropriate Mermaid syntax
3. Apply SpecWeave naming conventions
4. Use templates as starting point
5. Customize for specific use case
6. Validate syntax
7. Return diagram content

...
```

**Templates**:

Located in `src/agents/diagrams-architect/templates/`

Each template:
- Uses placeholders (e.g., `{{SYSTEM_NAME}}`, `{{USER_ROLE}}`)
- Follows Mermaid syntax strictly
- Includes comments for guidance
- Shows best practices

**Example - C4 Context Template** (`c4-context-template.mmd`):
```mermaid
graph TB
    %% C4 Level 1: System Context Diagram
    %% Shows: System boundary, external actors, external systems
    %% Omits: Internal implementation details

    User(({{USER_ROLE}}<br/>End User))
    Admin((Administrator))

    System[{{SYSTEM_NAME}}]

    ExternalService[{{EXTERNAL_SERVICE_1}}<br/>External System]

    User -->|{{USER_ACTION}}| System
    Admin -->|Manage| System
    System -->|{{INTEGRATION_DESCRIPTION}}| ExternalService
```

**Test Cases**:

Minimum 3 tests in `src/agents/diagrams-architect/test-cases/`

**test-1-c4-context.yaml**:
```yaml
---
name: "Generate C4 Context Diagram"
description: "Tests if agent can create C4 Level 1 context diagram"
input:
  prompt: "Create C4 context diagram for e-commerce platform with users, admins, payment gateway (Stripe), and email service (SendGrid)"
  context: |
    System: E-Commerce Platform
    Users: Customers browsing and purchasing products
    Admins: Managing products and orders
    External: Stripe (payments), SendGrid (emails)
expected_output:
  type: "diagram_generated"
  diagram_type: "c4-context"
  mermaid_type: "graph TB"
  contains:
    - "End User"
    - "Administrator"
    - "E-Commerce Platform"
    - "Stripe"
    - "SendGrid"
    - "HTTPS"
validation:
  - "Diagram uses graph TB or graph LR"
  - "Shows system boundary clearly"
  - "External actors use ((User)) notation"
  - "External systems use [Service] notation"
  - "No internal components shown (Level 1 only)"
success_criteria:
  - "Valid Mermaid syntax"
  - "Follows C4 Level 1 conventions"
  - "Appropriate level of detail"
---
```

**References**:

Located in `src/agents/diagrams-architect/references/`

**c4-model-spec.md**: Complete C4 Model specification
- Detailed explanation of each level
- When to use each level
- Examples from real projects
- Audience considerations

**mermaid-syntax-guide.md**: Mermaid syntax reference
- All diagram types with examples
- Syntax rules and limitations
- Common patterns
- Troubleshooting

---

## Skill Architecture

### diagrams-generator Skill

**Type**: Coordinator Skill

**Purpose**: Detect diagram requests, coordinate with diagrams-architect agent, handle file operations

**Activation Keywords** (in description):
- "create diagram", "draw diagram", "generate diagram", "visualize"
- "C4 diagram", "C4 context", "C4 container", "C4 component"
- "context diagram", "container diagram", "component diagram"
- "sequence diagram", "sequence flow", "interaction diagram"
- "ER diagram", "entity relationship", "data model"
- "deployment diagram", "infrastructure diagram"
- "architecture diagram", "system diagram"

**Workflow**:

```
1. User Request Detection
   ↓
2. Diagram Type Identification
   ↓
3. Request Validation
   ↓
4. Invoke diagrams-architect Agent
   ↓
5. Receive Diagram Content
   ↓
6. Determine File Location
   ↓
7. Generate File Name
   ↓
8. Save Diagram File
   ↓
9. Confirm to User
```

**Structure**:

```yaml
---
name: diagrams-generator
description: Generate Mermaid diagrams following C4 conventions. Activates for create diagram, C4 diagram, sequence diagram, ER diagram, deployment diagram, architecture visualization.
allowed-tools: Read, Write, Task
---

# Diagrams Generator Skill

This skill coordinates diagram generation by detecting user requests and delegating to the diagrams-architect agent.

## When to Activate

Activate when user requests:
- "Create C4 context diagram for authentication"
- "Draw sequence diagram for login flow"
- "Generate ER diagram for user and order entities"
- "Visualize deployment architecture"

## Workflow

1. **Detect**: Identify diagram request
2. **Validate**: Check if diagram type is supported
3. **Invoke**: Call diagrams-architect agent via Task tool
4. **Save**: Write diagram to correct location
5. **Confirm**: Notify user of completion

## Diagram Type Detection

Keywords → Diagram Type:
- "C4 context", "system context" → c4-context (Level 1)
- "C4 container", "component diagram" → c4-container (Level 2)
- "C4 component", "internal structure" → c4-component (Level 3)
- "sequence", "interaction", "flow" → sequence
- "ER", "entity relationship", "data model" → entity
- "deployment", "infrastructure" → deployment

## File Placement Rules

- **HLD diagrams**: `.specweave/docs/internal/architecture/diagrams/`
- **LLD diagrams**: `.specweave/docs/internal/architecture/diagrams/{module}/`
- **Flows**: `.specweave/docs/internal/architecture/diagrams/flows/`
- **Data models**: `.specweave/docs/internal/architecture/diagrams/`

## File Naming

Pattern: `<page>.<type>.mmd`

Examples:
- `auth.c4-context.mmd`
- `auth.c4-container.mmd`
- `login-flow.sequence.mmd`
- `user-order.entity.mmd`

...
```

**Test Cases**:

Minimum 3 tests in `src/skills/diagrams-generator/test-cases/`

**test-1-detect-type.yaml**: Test diagram type detection
**test-2-coordinate.yaml**: Test agent coordination
**test-3-placement.yaml**: Test file placement logic

---

## Integration Points

### 1. CLAUDE.md Updates

**Sections to update**:

#### Section: Agents Development

**Before**:
```markdown
| # | Agent | Role | Status |
|---|-------|------|--------|
| 1-14 | ... | ... | ✅ In src/agents/ |
```

**After**:
```markdown
| # | Agent | Role | Type | Status |
|---|-------|------|------|--------|
| 1-14 | ... | ... | ROLE | ✅ In src/agents/ |
| 15 | diagrams-architect | Diagram generation - C4 + Mermaid | TOOL | ✅ In src/agents/ |
```

Add explanation:
```markdown
### Agent Types

**ROLE Agents**: Domain expertise (PM, Architect, DevOps, etc.)
**TOOL Agents**: Artifact generation (diagrams, code formatting, etc.)
```

#### Section: Skills Development

**Before**:
```markdown
| # | Skill | Purpose | Status |
|---|-------|---------|--------|
| 1-7 | ... | ... | ✅ In src/skills/ |
```

**After**:
```markdown
| # | Skill | Purpose | Type | Status |
|---|-------|---------|------|--------|
| 1-7 | ... | ... | ... | ✅ In src/skills/ |
| 8 | diagrams-generator | Coordinate diagram generation | Coordinator | ✅ In src/skills/ |
```

#### Section: C4 Diagram Conventions

**Add**:
```markdown
### Diagram Generation Agent

**For automated diagram generation**, use the `diagrams-generator` skill:

"Create C4 context diagram for authentication"
"Draw sequence diagram for login flow"

The skill will:
1. Detect diagram type
2. Invoke diagrams-architect agent
3. Generate Mermaid diagram following conventions
4. Save to correct location

See: [diagrams-architect agent](src/agents/diagrams-architect/AGENT.md)
```

### 2. .specweave/docs/README.md

**Add section**:
```markdown
## Diagram Generation

SpecWeave includes an automated diagram generation system:

- **diagrams-architect agent**: Generates Mermaid diagrams following C4 Model
- **diagrams-generator skill**: Coordinates diagram generation from natural language requests

Usage:
- "Create C4 context diagram for [system]"
- "Generate sequence diagram for [flow]"
- "Draw ER diagram for [entities]"

Conventions: See [DIAGRAM-CONVENTIONS.md](DIAGRAM-CONVENTIONS.md)
```

### 3. Install Scripts

**No changes needed** - scripts already generic:
```bash
# bin/install-agents.sh already handles any agent in src/agents/
# bin/install-skills.sh already handles any skill in src/skills/
```

**Verification**:
After implementation, test:
```bash
npm run install:all
ls -la .claude/agents/diagrams-architect/
ls -la .claude/skills/diagrams-generator/
```

### 4. Test Infrastructure

**Current**:
- Tests in `tests/` directory
- Jest/Playwright for unit/E2E tests

**Changes needed**:
- Add agent test runner (if not exists)
- Add skill test runner (if not exists)
- Validate YAML test case format

**Commands to support**:
```bash
npm run test:agents -- diagrams-architect
npm run test:skills -- diagrams-generator
```

---

## File Structure Changes

### Complete Before/After

**BEFORE**:
```
specweave/
├── .specweave/
│   ├── docs/
│   │   ├── README.md
│   │   ├── DIAGRAM-CONVENTIONS.md (574 lines)
│   │   ├── TOOL-CONCEPT-MAPPING.md
│   │   └── internal/
│   │       └── architecture/
│   │           ├── diagrams/ (empty)
│   │           └── adr/
│   │
│   └── increments/
│       ├── 0001-core-framework/
│       └── 0002-core-enhancements/ (in progress)
│
├── src/
│   ├── agents/ (14 agents)
│   └── skills/ (7 skills)
│
├── CLAUDE.md
└── ...
```

**AFTER**:
```
specweave/
├── .specweave/
│   ├── docs/
│   │   ├── README.md ✏️ UPDATED
│   │   ├── DIAGRAM-CONVENTIONS.md ✏️ SIMPLIFIED (~100 lines)
│   │   ├── TOOL-CONCEPT-MAPPING.md ✅ NO CHANGE
│   │   └── internal/
│   │       └── architecture/
│   │           ├── diagrams/ 🆕 Will contain generated diagrams
│   │           │   ├── *.c4-context.mmd
│   │           │   ├── *.c4-container.mmd
│   │           │   └── flows/
│   │           │       └── *.sequence.mmd
│   │           └── adr/
│   │               ├── 000X-agent-types.md 🆕 NEW ADR
│   │               └── 000Y-skills-coordinators.md 🆕 NEW ADR
│   │
│   └── increments/
│       ├── 0001-core-framework/
│       └── 0002-core-enhancements/ ✅ COMPLETE
│           ├── spec.md
│           ├── plan.md (this file)
│           ├── tasks.md
│           ├── tests.md
│           └── context-manifest.yaml
│
├── src/
│   ├── agents/ (15 agents)
│   │   └── diagrams-architect/ 🆕 NEW
│   │       ├── AGENT.md
│   │       ├── templates/
│   │       ├── test-cases/
│   │       └── references/
│   │
│   └── skills/ (8 skills)
│       └── diagrams-generator/ 🆕 NEW
│           ├── SKILL.md
│           ├── test-cases/
│           └── scripts/
│
├── CLAUDE.md ✏️ UPDATED
│   - Agents section updated
│   - Skills section updated
│   - C4 section references agent
│   - New: "Diagram Generation Workflow"
│
└── ...
```

---

## Migration Strategy

### Phase 1: Create Agent Infrastructure (T001-T004)

**Goal**: Establish diagrams-architect agent structure

**Steps**:
1. Create `src/agents/diagrams-architect/` directory structure
2. Write AGENT.md with YAML frontmatter + system prompt
3. Create 6 templates (c4-context, c4-container, c4-component, sequence, er, deployment)
4. Add 3+ test cases (YAML format)
5. Create references/ (c4-model-spec.md, mermaid-syntax-guide.md)

**What to migrate from DIAGRAM-CONVENTIONS.md**:
- ✅ C4 Model levels explanation → AGENT.md system prompt
- ✅ Mermaid syntax examples → AGENT.md + references/mermaid-syntax-guide.md
- ✅ When to use each diagram type → AGENT.md
- ❌ File naming patterns → KEEP in DIAGRAM-CONVENTIONS.md (reference)
- ❌ Co-location strategy → KEEP in DIAGRAM-CONVENTIONS.md (reference)

**Validation**:
- AGENT.md has valid YAML frontmatter
- System prompt includes C4 expertise
- Templates use correct Mermaid syntax
- Test cases cover basic, sequence, ER diagrams

---

### Phase 2: Create Skill Infrastructure (T005-T007)

**Goal**: Establish diagrams-generator skill as coordinator

**Steps**:
1. Create `src/skills/diagrams-generator/` directory structure
2. Write SKILL.md with activation keywords
3. Add 3+ test cases (detect type, coordinate, placement)
4. Optional: Add validation script

**What skill should do**:
- ✅ Detect diagram requests (keywords matching)
- ✅ Identify diagram type (C4 context/container/component, sequence, ER, deployment)
- ✅ Determine file location (HLD vs LLD, flows/)
- ✅ Generate file name following conventions
- ✅ Invoke diagrams-architect agent via Task tool
- ✅ Save diagram to correct location
- ✅ Confirm to user

**Validation**:
- SKILL.md has valid YAML frontmatter
- Description includes all activation keywords
- Test cases cover type detection, coordination, file placement

---

### Phase 3: Simplify Documentation (T008)

**Goal**: Reduce DIAGRAM-CONVENTIONS.md to reference-only

**Steps**:
1. **Backup** current DIAGRAM-CONVENTIONS.md
2. **Extract** operational knowledge (C4 expertise, Mermaid syntax)
3. **Move** to agent (already done in Phase 1)
4. **Rewrite** DIAGRAM-CONVENTIONS.md as quick reference
5. **Add** pointer to agent for generation

**New DIAGRAM-CONVENTIONS.md structure** (~100 lines):
```markdown
# Diagram Conventions - Quick Reference

**For diagram generation**: Use `diagrams-generator` skill
**For full C4 expertise**: See [diagrams-architect agent](../../src/agents/diagrams-architect/AGENT.md)

## File Naming

Pattern: `<page>.<type>.mmd`

Types: context, container, component, sequence, entity, deployment, flow, state

Examples:
- `auth.c4-context.mmd`
- `login-flow.sequence.mmd`

## File Placement

- HLD diagrams: `docs/internal/architecture/diagrams/`
- LLD diagrams: `docs/internal/architecture/diagrams/{module}/`
- Flows: `docs/internal/architecture/diagrams/flows/`

## Diagram Types

- **C4 Context**: System boundary, external actors (Level 1)
- **C4 Container**: Applications, services, databases (Level 2)
- **C4 Component**: Internal structure (Level 3)
- **Sequence**: Interaction flows
- **ER**: Entity relationships
- **Deployment**: Infrastructure

## Usage

"Create C4 context diagram for authentication"
"Draw sequence diagram for login flow"
"Generate ER diagram for user and order entities"

See full conventions in [diagrams-architect agent](../../src/agents/diagrams-architect/AGENT.md).
```

**Validation**:
- DIAGRAM-CONVENTIONS.md is ~100 lines (down from 574)
- Still useful as quick reference
- Points to agent for generation
- All operational knowledge moved to agent

---

### Phase 4: Update CLAUDE.md (T009)

**Goal**: Document new agents/skills in development guide

**Sections to update**:

1. **Agents Development** section:
   - Add diagrams-architect to table
   - Add "Agent Types" subsection (ROLE vs TOOL)

2. **Skills Development** section:
   - Add diagrams-generator to table
   - Add "Skills as Coordinators" subsection

3. **C4 Diagram Conventions** section:
   - Add "Diagram Generation Agent" subsection
   - Reference agent for automated generation

4. **New section**: "Diagram Generation Workflow"
   - User request → Skill → Agent → Output
   - Examples
   - File placement

**Validation**:
- All sections updated
- Examples included
- Links to agent/skill SKILL.md files work

---

### Phase 5: Create ADRs (Optional, P2)

**Goal**: Document architectural decisions

**ADRs to create**:

1. **ADR-000X: Agent Types - Roles vs Tools**
   - Context: Originally roles only
   - Decision: Support tool agents
   - Consequences: Pattern for future tools

2. **ADR-000Y: Skills as Coordinators**
   - Context: Direct agent invocation clunky
   - Decision: Skills coordinate tool agents
   - Consequences: Better UX, separation of concerns

**Location**: `.specweave/docs/internal/architecture/adr/`

---

## Testing Strategy

See [tests.md](tests.md) for complete test strategy.

**Summary**:

**Level 1: Specification** (spec.md)
- TC-0001 through TC-0019 defined
- Acceptance criteria for each user story

**Level 2: Feature Tests** (tests.md)
- Test coverage matrix (TC-ID → test file)
- Test types specified (unit, integration)

**Level 3: Component Tests** (in src/)
- Agent test cases: 3+ in `src/agents/diagrams-architect/test-cases/`
- Skill test cases: 3+ in `src/skills/diagrams-generator/test-cases/`

**Level 4: Automated Tests** (tests/)
- Unit tests for agent/skill logic (if applicable)
- Integration tests for workflow
- Manual validation for initial implementation

---

## Rollout Plan

### Pre-Rollout Checklist

- [ ] All agent files created and validated
- [ ] All skill files created and validated
- [ ] Test cases written (6+ total)
- [ ] DIAGRAM-CONVENTIONS.md simplified
- [ ] CLAUDE.md updated
- [ ] ADRs created (optional)
- [ ] Install scripts verified
- [ ] Manual testing completed

### Rollout Steps

**Step 1: Install to .claude/** (local testing)
```bash
npm run install:all
```

**Step 2: Restart Claude Code**
```bash
# Restart Claude Code to load new agents/skills
```

**Step 3: Manual Testing**
```bash
# Test 1: C4 context diagram
"Create C4 context diagram for authentication system"

# Test 2: Sequence diagram
"Draw sequence diagram for user login flow"

# Test 3: ER diagram
"Generate ER diagram for user and order entities"
```

**Step 4: Verify Files Created**
```bash
ls -la .specweave/docs/internal/architecture/diagrams/
# Should see generated .mmd files
```

**Step 5: Commit and Push**
```bash
git add .
git commit -m "feat: add diagram generation agents and skills"
git push origin features/002-core-enhancements
```

**Step 6: Create PR**
```bash
gh pr create --base develop --head features/002-core-enhancements
```

---

## Success Criteria

- [ ] diagrams-architect agent created with ≥3 test cases
- [ ] diagrams-generator skill created with ≥3 test cases
- [ ] DIAGRAM-CONVENTIONS.md simplified to ~100 lines
- [ ] CLAUDE.md updated (4 sections)
- [ ] Install scripts work correctly
- [ ] Manual testing successful (3+ diagram types)
- [ ] Diagrams follow naming conventions
- [ ] Diagrams saved to correct locations
- [ ] Documentation complete and accurate

---

## Related Documentation

- [spec.md](spec.md) - WHAT and WHY (user stories, acceptance criteria)
- [tasks.md](tasks.md) - Executable tasks (derived from this plan)
- [tests.md](tests.md) - Test strategy and test cases
- [CLAUDE.md](../../../CLAUDE.md) - Development guide (will be updated)
- [Diagram Conventions](../../docs/internal/delivery/guides/diagram-conventions-comprehensive.md) - Current conventions (will be simplified)
