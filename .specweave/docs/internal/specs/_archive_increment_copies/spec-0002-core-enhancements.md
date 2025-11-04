---
increment: 0002-core-enhancements
title: "Core Framework Enhancements - Multi-Tool Support & Diagram Agents"
priority: P1
status: in-progress
created: 2025-10-26
updated: 2025-10-28
started: 2025-10-27
completed: null
closed: null
structure: user-stories

# Completion tracking
total_tasks: 15
completed_tasks: 11
completion_rate: 73

# Dependencies
dependencies:
  - 0001-core-framework

# WIP tracking
wip_slot: 1

# Notes
notes: "Part B (Diagram Agents) 73% complete. Part A (Multi-Tool Adapters) deferred to future increment."
---

# Increment 0002: Core Framework Enhancements

## Overview

This increment combines two critical framework enhancements:

### Part A: Multi-Tool Compatibility & Adapter System (P1)

**Problem**: SpecWeave v0.1.0-beta.1 only works with Claude Code, limiting adoption to ~10% of developers.

**Solution**: Implement adapter pattern to make SpecWeave work with ALL major AI coding tools (Cursor, GitHub Copilot, Windsurf, ChatGPT, Gemini, etc.) while maintaining best-in-class experience with Claude Code.

**Inspiration**:
- **spec-kit** (GitHub): Works with 14+ AI tools through plain Markdown + text commands
- **BMAD-METHOD**: Portable prompt bundles work across Gemini, Claude, CustomGPT

**Key Insight**: Separate tool-agnostic core (`.specweave/`) from tool-specific adapters (optional enhancements).

### Part B: Diagram Generation Agents (P2)

**Problem**: Diagram creation requires remembering Mermaid syntax and C4 conventions.

**Solution**: Automated diagram generation via `diagrams-architect` agent + `diagrams-generator` skill for C4 Model and Mermaid diagrams.

## Business Value

**Multi-Tool Support**:
- **10x adoption potential**: From 10% (Claude-only) → 90%+ (all AI tools)
- **Lower barrier to entry**: Works with tools developers already use
- **Future-proof**: Easy to add new tools as they emerge

**Diagram Agents**:
- **Automated diagram generation**: Request diagrams, get properly-formatted Mermaid following C4 conventions
- **Consistent quality**: All diagrams follow same conventions
- **Reduced cognitive load**: No need to remember Mermaid syntax or C4 rules

## Scope

### Part A: Multi-Tool Support - In Scope ✅

1. **Core Tool-Agnostic Framework**
   - `.specweave/` directory with ONLY plain Markdown + YAML
   - Zero tool-specific dependencies in core
   - Context manifests work universally
   - Standard Markdown checkboxes for tasks
   - Mermaid diagrams render everywhere

2. **Adapter System** (`src/adapters/`)
   - Claude adapter (`.claude/` - full automation)
   - Cursor adapter (`.cursorrules` - semi-automation)
   - Copilot adapter (`.github/copilot/instructions.md` - basic automation)
   - Generic adapter (`SPECWEAVE.md` manual guide - max compatibility)
   - Adapter registry system
   - Standard adapter interface

3. **CLI Enhancements**
   - `specweave init --adapter [claude|cursor|copilot|generic]`
   - Auto-detection from environment
   - `specweave list-adapters`
   - `specweave add-adapter {name}`

4. **Backward Compatibility**
   - Keep `.claude/` support (don't break beta.1 users)
   - `CLAUDE.md` → `SPECWEAVE.md` with symlink
   - Automatic adapter detection

5. **Increment Numbering Fix** (4-digit format)
   - Update `feature-utils.js` to enforce 0001-9999 format
   - Add duplicate detection
   - Update all documentation references

### Part B: Diagram Agents - In Scope ✅

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

4. **Testing**
   - Minimum 3 test cases for each adapter
   - Minimum 3 test cases for diagrams-architect agent
   - Minimum 3 test cases for diagrams-generator skill
   - Integration test: User request → Generated diagram
   - E2E test per adapter

### Out of Scope ❌

- TOOL-CONCEPT-MAPPING.md (remains documentation)
- Automated rendering to SVG (handled by CI/CD)
- Interactive diagram editors
- Non-Mermaid diagram formats (Graphviz, PlantUML)
- Breaking changes to existing beta.1 projects
- Custom adapter creation UI (CLI only)

## User Stories

### Part A: Multi-Tool Support

### US-A001: Developer Using Cursor

**As a** Cursor user
**I want to** use SpecWeave's spec-driven workflow
**So that** I can benefit from specifications, context manifests, and structured development without switching to Claude Code

**Acceptance Criteria**:
- [ ] **TC-A001**: Running `specweave init my-project --adapter cursor` creates Cursor-compatible project
- [ ] **TC-A002**: `.cursorrules` file generated with SpecWeave workflow instructions
- [ ] **TC-A003**: @ context shortcuts (e.g., `@increments`, `@docs`) work in Cursor Composer
- [ ] **TC-A004**: User can create increments manually or via Cursor's multi-file editing
- [ ] **TC-A005**: Context manifests guide Cursor to load only relevant specs (70%+ token reduction)
- [ ] **TC-A006**: SpecWeave structure is standard Markdown (no Cursor extensions required)

### US-A002: Developer Using GitHub Copilot

**As a** GitHub Copilot user
**I want to** use SpecWeave without Claude-specific features
**So that** I can follow spec-driven development in my existing GitHub workflow

**Acceptance Criteria**:
- [ ] **TC-A007**: Running `specweave init my-project --adapter copilot` creates Copilot-compatible project
- [ ] **TC-A008**: `.github/copilot/instructions.md` generated with SpecWeave workspace instructions
- [ ] **TC-A009**: Copilot reads context manifests to understand which docs to load
- [ ] **TC-A010**: Copilot suggests code based on spec.md and plan.md content
- [ ] **TC-A011**: No GitHub Copilot extensions required
- [ ] **TC-A012**: All SpecWeave files compatible with GitHub's rendering

### US-A003: Developer Using ANY AI Tool (Generic Adapter)

**As a** developer using ChatGPT, Gemini, Windsurf, or any other AI
**I want to** use SpecWeave's structured approach
**So that** I can benefit from specs, context manifests, and living documentation

**Acceptance Criteria**:
- [ ] **TC-A013**: Running `specweave init my-project --adapter generic` creates universal project
- [ ] **TC-A014**: `SPECWEAVE.md` file provides manual workflow guide
- [ ] **TC-A015**: All files are plain Markdown + YAML (no tool dependencies)
- [ ] **TC-A016**: Context manifests work by manually guiding AI
- [ ] **TC-A017**: Workflow documented: spec → plan → tasks → implement
- [ ] **TC-A018**: Works with literally ANY AI tool

### US-A004: Developer Upgrading from Claude-Only beta.1

**As a** SpecWeave beta.1 user (Claude-only)
**I want to** upgrade to multi-tool support without breaking my existing project
**So that** my project continues working while gaining cross-tool compatibility

**Acceptance Criteria**:
- [ ] **TC-A019**: Existing `.claude/` directory continues to work
- [ ] **TC-A020**: Running `specweave upgrade --adapter cursor` adds Cursor support
- [ ] **TC-A021**: `CLAUDE.md` renamed to `SPECWEAVE.md` with symlink
- [ ] **TC-A022**: All existing increments, specs, docs work without modification
- [ ] **TC-A023**: CLI detects adapter type automatically

### US-A005: Framework Developer (Adapter Creation)

**As a** SpecWeave framework developer
**I want** clear separation between core and adapters
**So that** I can add support for new tools easily

**Acceptance Criteria**:
- [ ] **TC-A024**: Core framework has zero tool-specific dependencies
- [ ] **TC-A025**: Adapters follow standard interface
- [ ] **TC-A026**: Adding new adapter requires only creating adapter directory
- [ ] **TC-A027**: Adapter interface documented with examples
- [ ] **TC-A028**: CLI automatically discovers adapters

---

### Part B: Diagram Generation Agents

### US-B001: Create C4 Context Diagram

**As a** developer
**I want to** request "create C4 context diagram for authentication"
**So that** I get a properly-formatted Mermaid diagram following SpecWeave conventions

**Acceptance Criteria**:
- [ ] **TC-B001**: User request detected by diagrams-generator skill
- [ ] **TC-B002**: Skill identifies diagram type (C4 Context, Level 1)
- [ ] **TC-B003**: Skill invokes diagrams-architect agent
- [ ] **TC-B004**: Agent creates diagram with correct Mermaid syntax
- [ ] **TC-B005**: Diagram follows C4 Level 1 conventions (system boundary, external actors)
- [ ] **TC-B006**: Diagram saved to correct location (`.specweave/docs/internal/architecture/diagrams/`)
- [ ] **TC-B007**: File named correctly (e.g., `authentication.c4-context.mmd`)

### US-B002: Create Sequence Diagram

**As a** developer
**I want to** request "create sequence diagram for login flow"
**So that** I get a Mermaid sequence diagram showing the interaction flow

**Acceptance Criteria**:
- [ ] **TC-B008**: Skill detects sequence diagram request
- [ ] **TC-B009**: Agent generates sequenceDiagram syntax
- [ ] **TC-B010**: Participants clearly labeled
- [ ] **TC-B011**: Flow accurately represents login process
- [ ] **TC-B012**: Diagram saved to `.specweave/docs/internal/architecture/diagrams/flows/`
- [ ] **TC-B013**: File named `login-flow.sequence.mmd`

### US-B003: Create ER Diagram

**As a** developer
**I want to** request "create ER diagram for user and order entities"
**So that** I get an entity-relationship diagram showing database schema

**Acceptance Criteria**:
- [ ] **TC-B014**: Skill detects ER diagram request
- [ ] **TC-B015**: Agent generates erDiagram syntax
- [ ] **TC-B016**: Entities, attributes, relationships correctly defined
- [ ] **TC-B017**: Primary/foreign keys marked
- [ ] **TC-B018**: Diagram saved to `.specweave/docs/internal/architecture/diagrams/`
- [ ] **TC-B019**: File named `user-order.entity.mmd`

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

- Move diagram conventions content to `diagrams-architect/AGENT.md` system prompt
- Keep focused reference in `.specweave/docs/internal/delivery/guides/diagram-conventions.md` (for developers)
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

- [Diagram Conventions](../../docs/internal/delivery/guides/diagram-conventions-comprehensive.md) - Current conventions (to be migrated)
- [CLAUDE.md](../../../CLAUDE.md) - Development guide (to be updated)
- [Agents vs Skills Architecture](../../../CLAUDE.md#agents-vs-skills-architecture) - Framework explanation
