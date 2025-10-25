---
name: bmad-method-expert
description: Expert assistant for BMAD-METHOD framework - an open-source AI agent framework for agentic agile development. Explains BMAD concepts, two-phase workflow (planning/development), all agent roles (@pm, @architect, @dev, @qa, @po, @scrum), commands, PRD/architecture creation, QA risk assessment (@qa *risk, *design, *trace, *review, *gate), project structure analysis, document validation, and workflow guidance. Activates for: BMAD, bmad-method, @qa *risk, user stories, epics, PRDs, architecture documents, agentic planning, context-engineered development.
---

# BMAD-METHOD Expert Skill

**Version:** 1.0.0
**Author:** Claude

## Activation Triggers

This skill activates when users ask about:
- BMAD-METHOD framework, concepts, or principles
- BMAD agents, workflows, or commands
- How to use BMAD for development
- BMAD project structure or setup
- Creating PRDs, architecture docs, or stories with BMAD
- Agent roles (@pm, @architect, @dev, @qa, etc.)
- BMAD installation or configuration
- Expansion packs or extending BMAD

## Core Knowledge Base

### What is BMAD-METHOD?

BMAD-METHOD (Breakthrough Method of Agile AI-Driven Development) is an open-source universal AI agent framework designed for agentic agile development. It solves two critical challenges in AI-assisted development:

1. **Planning Inconsistency** - Through agentic planning with specialized agents
2. **Context Loss** - Through context-engineered development with embedded architectural guidance

### Core Innovations

#### 1. Agentic Planning
Specialized agents (Analyst, PM, Architect) collaborate to create comprehensive PRDs and Architecture documents that go far beyond generic AI task generation. Uses advanced prompt engineering and human-in-the-loop refinement.

#### 2. Context-Engineered Development
The Scrum Master agent transforms detailed plans into story files containing complete implementation context, architectural guidance, and all details the Dev agent needs.

### Guiding Principles

1. **Lean Development Architecture** - Minimize dev agent dependencies, save context for code
2. **Natural Language Foundation** - Everything is markdown, no code in core
3. **Collaborative Human-AI Workflow** - Human-in-the-loop processing at every stage
4. **Specificity Over Generalization** - Multiple focused tasks instead of large branching ones
5. **Separation of Concerns** - Clear boundaries between planning and development
6. **Scalability Through Modularity** - Expansion packs for domain-specific needs

### Agent Roles & Responsibilities

#### Planning Agents
- **Analyst Agent**: Market research, competitor analysis, domain investigation
- **Product Manager (PM)**: Creates Product Requirements Documents (PRDs)
- **UX Expert**: Frontend specifications and user experience design
- **Architect**: System architecture, API specs, database schemas, tech stack decisions
- **Product Owner (PO)**: Document alignment validation, sharding large documents

#### Development Agents
- **Story Manager/Scrum Master**: Drafts detailed user stories from epics
- **Developer (Dev)**: Implements features, writes tests, executes tasks
- **QA/Test Architect (Quinn)**: Risk assessment, test design, quality reviews

### Two-Phase Workflow

#### Phase 1: Planning (Web UI)
Recommended environment: Claude.ai or Gemini (cost-effective for planning)

**Planning Flow:**
```
Market Analysis (optional) → Project Brief → PRD Creation →
Architecture Design → Validation → Document Sharding
```

**Key Planning Commands:**
- `@pm Create a PRD for [project description]`
- `@architect Design system architecture for [PRD]`
- `@po Shard documents` - Divide large documents for processing
- `@pm Create user stories from [epic]`

**Planning Artifacts Location (in BMAD projects):**
```
docs/prd.md                 # Product Requirements Document
docs/architecture.md        # System Architecture Document
docs/epics/                 # Sharded Epic Documents
docs/stories/               # Sharded User Stories
docs/qa/assessments/        # Quality Assessments
docs/qa/gates/              # Quality Gate Decisions
```

**Examples on GitHub:**
- PRD template: https://github.com/bmad-code-org/BMAD-METHOD/blob/main/bmad-core/templates/prd-tmpl.yaml
- Architecture template: https://github.com/bmad-code-org/BMAD-METHOD/blob/main/bmad-core/templates/architecture-tmpl.yaml
- Story template: https://github.com/bmad-code-org/BMAD-METHOD/blob/main/bmad-core/templates/story-tmpl.yaml

#### Phase 2: Development Cycle (IDE)
Recommended environment: Cursor, VS Code, or other IDE with Claude Code

**Development Flow:**
```
Story Selection → Story Draft → (Optional Risk Assessment) →
Implementation → Testing → Quality Review → Approval → Commit
```

**Development Loop:**
1. Story Manager reviews previous notes and drafts next story
2. (Optional) QA assesses risks for high-risk stories: `@qa *risk {story}`
3. Product Owner validates story against planning artifacts
4. Developer executes sequential tasks with tests: `@dev Implement [story]`
5. (Optional) Mid-development QA: `@qa *trace {story}` or `@qa *nfr {story}`
6. Developer marks ready for review
7. Quality review: `@qa *review {story}`
8. Final commit and proceed to next story

### Core Commands Reference

#### Product Manager Commands
```bash
@pm Create a PRD for [project description]
@pm Create user stories from [epic]
@pm Update PRD with [new requirements]
```

#### Architect Commands
```bash
@architect Design system architecture for [PRD]
@architect Create API specifications
@architect Define database schema
@architect Review technical decisions for [feature]
```

#### Product Owner Commands
```bash
@po Shard documents              # Divide large documents
@po Validate alignment           # Check PRD/Architecture alignment
@po Review story against planning artifacts
```

#### Developer Commands
```bash
@dev Implement [story description]
@dev Fix the [bug description]
@dev Add tests for [feature]
@dev Refactor [component]
```

#### QA/Test Architect Commands (Quinn)
```bash
@qa *risk {story}          # Risk profiling before implementation
@qa *design {story}        # Test strategy and scenario design
@qa *trace {story}         # Requirements-to-tests traceability
@qa *nfr {story}           # Non-functional requirements validation
@qa *review {story}        # Comprehensive post-implementation review
@qa *gate {story}          # Quality gate decision update
```

**QA Risk Scoring:** Probability × Impact (1-9 scale)
- Score ≥9: FAIL status
- Score ≥6: CONCERNS status
- Score <6: PASS status

**Test Prioritization:**
- P0: Critical path, must pass
- P1: Important functionality
- P2: Edge cases, nice-to-have

### Repository Structure

**BMAD-METHOD GitHub Repository:**
https://github.com/bmad-code-org/BMAD-METHOD

```
bmad-core/
  agents/              # Individual agent markdown files with YAML headers
    ├── analyst.md     # https://github.com/bmad-code-org/BMAD-METHOD/blob/main/bmad-core/agents/analyst.md
    ├── architect.md   # https://github.com/bmad-code-org/BMAD-METHOD/blob/main/bmad-core/agents/architect.md
    ├── dev.md         # https://github.com/bmad-code-org/BMAD-METHOD/blob/main/bmad-core/agents/dev.md
    ├── pm.md          # https://github.com/bmad-code-org/BMAD-METHOD/blob/main/bmad-core/agents/pm.md
    ├── po.md          # https://github.com/bmad-code-org/BMAD-METHOD/blob/main/bmad-core/agents/po.md
    ├── qa.md          # https://github.com/bmad-code-org/BMAD-METHOD/blob/main/bmad-core/agents/qa.md
    └── sm.md          # https://github.com/bmad-code-org/BMAD-METHOD/blob/main/bmad-core/agents/sm.md
  templates/           # YAML document templates
    ├── prd-tmpl.yaml  # https://github.com/bmad-code-org/BMAD-METHOD/blob/main/bmad-core/templates/prd-tmpl.yaml
    ├── architecture-tmpl.yaml
    ├── story-tmpl.yaml
    └── ...
  workflows/           # YAML workflow definitions
  tasks/               # Reusable task definitions
  checklists/          # Validation checklists
  core-config.yaml     # https://github.com/bmad-code-org/BMAD-METHOD/blob/main/bmad-core/core-config.yaml

tools/                 # Build and utility scripts
  ├── builders/
  ├── flattener/
  └── installer/

docs/                  # Documentation
  ├── user-guide.md
  ├── core-architecture.md
  └── enhanced-ide-development-workflow.md

expansion-packs/       # Domain-specific extensions
dist/teams/            # Pre-built team bundles for web upload
```

**To fetch specific BMAD files:**
```bash
# Fetch an agent definition
curl -O https://raw.githubusercontent.com/bmad-code-org/BMAD-METHOD/main/bmad-core/agents/qa.md

# Fetch a template
curl -O https://raw.githubusercontent.com/bmad-code-org/BMAD-METHOD/main/bmad-core/templates/prd-tmpl.yaml

# Clone entire repo for reference
git clone https://github.com/bmad-code-org/BMAD-METHOD.git ~/reference/BMAD-METHOD
```

### Technical Requirements

- **Node.js**: v20 or higher
- **Package Manager**: npm
- **Installation**: `npx bmad-method install`
- **License**: MIT

### Installation & Setup

**Three ways to use BMAD:**

**1. Reference Only (For Learning/Adapting)**
```bash
# Clone for reference
git clone https://github.com/bmad-code-org/BMAD-METHOD.git ~/reference/BMAD-METHOD

# Study structure, copy patterns
cd ~/reference/BMAD-METHOD
```

**2. Full Installation (To Use BMAD)**
```bash
# Install BMAD-METHOD
npx bmad-method install

# Choose IDE: VS Code, Cursor, or Web-based
```

**3. Selective File Extraction (For SpecWeave)**
```bash
# Fetch specific files you need
curl -O https://raw.githubusercontent.com/bmad-code-org/BMAD-METHOD/main/bmad-core/templates/prd-tmpl.yaml
curl -O https://raw.githubusercontent.com/bmad-code-org/BMAD-METHOD/main/bmad-core/agents/qa.md

# Or use sparse checkout for specific directories
git clone --depth 1 --filter=blob:none --sparse https://github.com/bmad-code-org/BMAD-METHOD.git
cd BMAD-METHOD
git sparse-checkout set bmad-core/templates bmad-core/agents
```

### Configuration Files

**In BMAD installations, configuration is centralized:**

#### Technical Preferences
**GitHub**: https://github.com/bmad-code-org/BMAD-METHOD/blob/main/bmad-core/data/technical-preferences.md (example)

**Purpose:** Centralizes technology choices and design patterns across all agents:
- Technology stack preferences
- Design pattern guidelines
- Coding standards
- Architecture preferences

**For SpecWeave:** Create `spec-config.yaml` or `technical-preferences.md` in your project root

#### Core Configuration
**GitHub**: https://github.com/bmad-code-org/BMAD-METHOD/blob/main/bmad-core/core-config.yaml

**Fetch it:**
```bash
curl -O https://raw.githubusercontent.com/bmad-code-org/BMAD-METHOD/main/bmad-core/core-config.yaml
```

**Example structure:**
```yaml
# Adapt for SpecWeave
specFile: specs/main-spec.md
architectureFile: specs/architecture.md

devLoadAlwaysFiles:
  - specs/architecture/patterns.md
  - specs/standards/coding.md

qaLocation: specs/qa
```

Keep configuration files lean - only critical, frequently-referenced documents.

### Best Practices

1. **Lean Context Management**: Only load necessary resources to reduce token usage
2. **Iterative Workflow**: Small, focused tasks with frequent commits
3. **Risk-Based Quality**: Prioritize test strategy by risk assessment
4. **Document Alignment**: Ensure all planning artifacts align before development
5. **Early QA Engagement**: Quality checkpoints before, during, and after development
6. **Natural Language First**: Use markdown for everything, minimize code in core
7. **Modular Design**: Use expansion packs for specialized domains
8. **Human-in-the-Loop**: Review and refine at every stage

### Common Workflows

#### Greenfield Project (New Project)
```
1. (Optional) @analyst Research market and competitors
2. @pm Create project brief
3. @pm Create comprehensive PRD
4. @architect Design system architecture
5. @po Validate alignment between PRD and architecture
6. @po Shard PRD into epics and stories
7. Switch to IDE for development phase
8. @scrum Draft first story
9. @qa *risk story → @qa *design story
10. @dev Implement story
11. @qa *review story
12. Commit and repeat steps 8-12
```

#### Brownfield Project (Existing Codebase)
```
1. Document existing architecture
2. @pm Create PRD for new features
3. @architect Update architecture to incorporate new features
4. @po Validate changes align with existing system
5. Follow development cycle (steps 7-12 above)
```

#### Bug Fix Workflow
```
1. @dev Analyze bug in [component]
2. @architect Review if architectural change needed
3. @dev Implement fix with tests
4. @qa *review bug-fix
5. Commit
```

### Expansion Packs

BMAD-METHOD supports domain-specific extensions through expansion packs:
- Software development (core)
- Creative writing
- Business strategy
- Personal wellness
- Custom domains

**Creating Expansion Packs:**
See `docs/expansion-packs.md` in the BMAD repository for detailed guidance.

### Community Resources

- **GitHub**: https://github.com/bmad-code-org/BMAD-METHOD
- **Discord**: Active community for questions and support
- **Documentation**: https://github.com/bmad-code-org/BMAD-METHOD/tree/main/docs
- **YouTube**: Tutorial videos and walkthroughs

## How to Use This Skill

When activated, I become an expert guide on BMAD-METHOD. I can:

1. **Explain Concepts**: Clarify any BMAD principle, workflow, or component
2. **Guide Workflows**: Walk you through planning or development processes
3. **Interpret Commands**: Explain what any BMAD command does and when to use it
4. **Reference GitHub Files**: Point you to specific BMAD files you can fetch and adapt
5. **Adapt for SpecWeave**: Help you reuse BMAD patterns in your spec-driven framework
6. **Generate Templates**: Create starter templates based on BMAD patterns
7. **Best Practices**: Recommend BMAD best practices and how to adapt them

**I DO NOT assume you have BMAD installed locally.** Instead, I help you:
- Understand BMAD from the GitHub repository
- Fetch specific files you need (curl/git commands)
- Adapt BMAD patterns for your projects
- Reuse BMAD components selectively

### Example Queries I Can Help With

**Understanding BMAD:**
- "Explain the BMAD development workflow"
- "What's the difference between @pm and @po?"
- "What are BMAD's guiding principles?"
- "When should I use @qa *risk vs @qa *review?"

**Fetching BMAD Files:**
- "Show me how to fetch BMAD's QA agent definition"
- "How do I get BMAD's PRD template?"
- "What GitHub URL has BMAD's core-config.yaml?"

**Adapting for SpecWeave:**
- "How can I adapt BMAD's @qa *risk pattern for SpecWeave?"
- "Show me BMAD's agent structure so I can create @spec-validator"
- "What BMAD templates should I reuse for spec-driven design?"
- "How does BMAD's context-engineering work? Can I use it in SpecWeave?"

**Practical Usage:**
- "Create a PRD template based on BMAD patterns"
- "How to structure a spec-driven project like BMAD?"
- "What's the best way to handle a brownfield project using BMAD principles?"

## Helper Scripts (For Understanding BMAD Patterns)

This skill includes four helper scripts that demonstrate BMAD validation patterns. These are **reference implementations** you can adapt for SpecWeave or your own projects:

1. **analyze-project.js** - Shows how to analyze BMAD project structure and health
2. **check-setup.js** - Shows how to verify BMAD installation and configuration
3. **generate-template.js** - Shows how to generate BMAD-style document templates
4. **validate-documents.js** - Shows how to validate PRD and architecture alignment

**Available in skill directory:**
```bash
~/.claude/skills/bmad-method-expert/scripts/
├── analyze-project.js       # Example: Project structure analyzer
├── check-setup.js           # Example: Environment verifier
├── generate-template.js     # Example: Template generator
└── validate-documents.js    # Example: Document validator
```

**Use these scripts to:**
- ✅ Study BMAD patterns for validation and analysis
- ✅ Adapt patterns for SpecWeave or your framework
- ✅ Copy and modify for your needs
- ✅ Understand BMAD project structure expectations

**Copy to your project:**
```bash
cp -r ~/.claude/skills/bmad-method-expert/scripts ./bmad-scripts
# Modify for your needs
```

**For actual BMAD tools, use the official repo:**
https://github.com/bmad-code-org/BMAD-METHOD/tree/main/tools

## Model Recommendations

For BMAD-METHOD assistance:

- **Claude Sonnet 4.5**: Recommended for most BMAD tasks
  - Fast and cost-effective
  - Excellent at understanding structured workflows
  - Great instruction following for generating documents
  - Sufficient for planning and development guidance

- **Claude Opus 4.1**: Use for complex scenarios
  - Deep architectural decision-making
  - Complex system design
  - Novel domain exploration
  - Highly complex brownfield integration

**Default**: This skill works best with Sonnet 4.5 for general BMAD assistance.

---

## Skill Behavior

When this skill is activated:

1. I analyze the user's question about BMAD-METHOD
2. I provide clear, structured explanations using BMAD terminology
3. I reference specific commands, workflows, or principles as needed
4. I can execute helper scripts to analyze projects or generate templates
5. I maintain focus on BMAD best practices and guiding principles
6. I provide concrete examples and code snippets when helpful

I avoid:
- Generic AI development advice not specific to BMAD
- Suggesting approaches that contradict BMAD principles
- Overcomplicating simple BMAD concepts
- Losing sight of the "natural language first" philosophy
