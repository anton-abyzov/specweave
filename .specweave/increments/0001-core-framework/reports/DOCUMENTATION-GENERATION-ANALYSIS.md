# Documentation Generation System - Comprehensive Analysis

**Date**: 2025-10-26
**Purpose**: Analyze SpecWeave comprehensively and design automated documentation generation
**Status**: Analysis Complete → Ready for Implementation

---

## Ultrathink: What is SpecWeave?

### Core Identity

**SpecWeave** is a **specification-first AI development framework** where:
- **Specifications are source of truth** (code expresses specs)
- **Living documentation** (specs evolve with code)
- **Regression prevention** (document before modifying)
- **Test-validated** (E2E Playwright when UI exists)
- **Context precision** (70%+ token reduction via selective loading)
- **Auto-role routing** (skills/agents activate automatically)
- **Framework-agnostic** (works with ANY tech stack)

### Revolutionary Capabilities

1. **Autonomous SaaS Development**
   - Describe what you want
   - SpecWeave builds it (PM → Architect → DevOps → Implementation)
   - Deploy for $10-15/month (Hetzner vs $50-100 on Vercel/AWS)

2. **20 Expert Agents** (Separate context windows)
   - Strategic: PM, Architect, Security, QA Lead, DevOps, SRE, Tech Lead, Performance
   - Implementation: NextJS, Node.js, Python, .NET, Frontend
   - Design: Figma Designer, Figma Implementer, Diagrams Architect
   - Documentation: Docs Writer
   - Integration: JIRA Mapper, ADO Mapper

3. **24 Specialized Skills** (Shared context)
   - Core: Detector, Router, Context Loader, Increment Planner, Role Orchestrator
   - Infrastructure: Hetzner Provisioner, Cost Optimizer
   - Integrations: Stripe, Calendar, Notifications, JIRA, GitHub, ADO
   - Design: Figma MCP Connector, Design System Architect, Figma-to-Code
   - Documentation: Docs Updater, Diagrams Generator
   - Brownfield: Analyzer, Onboarder
   - Tools: Task Builder, Skill Creator

4. **Increment Lifecycle Management** (NEW!)
   - 5-stage lifecycle (backlog → planned → in-progress → completed → closed)
   - WIP limits (2-3 for framework, 1-2 for users)
   - Leftover transfer (close with 80% completion if P1 done)
   - Closure reports
   - Task vs Increment decision tree

5. **Context Precision** (70%+ token reduction)
   - Context manifests (load only relevant specs)
   - Modular specifications (payments/, auth/, calendar/)
   - Cache-friendly
   - Scalable to 500+ page specs

6. **Framework-Agnostic**
   - Works with TypeScript, Python, Go, Rust, Java, C#
   - Detects tech stack automatically
   - Generic slash commands adapt to detected stack
   - No vendor lock-in

---

## Current Documentation State

### What Exists ✅

**CLAUDE.md** (2062 lines):
- Complete development guide
- Installation, hooks, commands
- File organization rules
- Scalable directory structure
- Agents vs Skills architecture
- Skills development guide
- Increment lifecycle management (NEW - 300 lines)
- Testing philosophy
- Naming conventions
- Documentation maintenance

**Increment Reports**:
- `CONSOLIDATION-COMPLETE.md` - Increment consolidation
- `INCREMENT-LIFECYCLE-DESIGN.md` - Complete lifecycle design
- `NPM-PACKAGE-GUIDE.md` - NPM packaging
- `COMMANDS-GENERIC-REFACTOR.md` - Command refactoring
- `TEST-CASE-STRATEGY.md` - Testing strategy

**Slash Commands** (7 total):
- `/create-project`, `/create-increment`, `/review-docs`, `/sync-github`
- `/close-increment`, `/add-tasks`, `/start-increment`, `/list-increments` (NEW)

**Agents** (20 in src/agents/):
- All have AGENT.md with system prompts
- Most have test-cases/ (varying completeness)

**Skills** (24 in src/skills/):
- All have SKILL.md with descriptions
- Most have test-cases/ (varying completeness)

### What's Missing ❌

**`.specweave/docs/` folder**:
- Likely empty or incomplete
- No 5-pillar structure populated
- No public-facing documentation
- No architecture diagrams (C4 Model)
- No user guides
- No API reference

**YouTube Content**:
- Scripts need updating for lifecycle management
- Need new scripts for all capabilities
- Need tutorial series structure

**Public Documentation**:
- No getting started guide
- No installation guide
- No use cases
- No feature overview
- No examples

**Internal Documentation**:
- No system architecture document
- No C4 diagrams (Context, Container, Component)
- No ADRs documented (many decisions made!)
- No deployment guide
- No security model documentation

---

## Documentation Needs Analysis

### Priority 1 (Critical - User-Facing)

**Public Documentation** (`.specweave/docs/public/`):

1. **Overview** (`overview/`)
   - `introduction.md` - What is SpecWeave? (1-2 pages)
   - `features.md` - Key features (1 page)
   - `how-it-works.md` - High-level workflow (1 page)
   - `use-cases.md` - When to use SpecWeave (1 page)
   - `comparison.md` - vs BMAD, vs SpecKit, vs vibe coding (1 page)

2. **Getting Started** (`guides/`)
   - `installation.md` - Install SpecWeave (1 page)
   - `quick-start.md` - First project in 5 minutes (2 pages)
   - `your-first-increment.md` - Create first increment (2 pages)
   - `understanding-agents.md` - How agents work (2 pages)
   - `understanding-skills.md` - How skills work (2 pages)
   - `lifecycle-management.md` - Managing increments (3 pages)

3. **API Reference** (`api/`)
   - `cli-commands.md` - All slash commands (AUTO-GENERATED, 5 pages)
   - `agents-reference.md` - All agents (AUTO-GENERATED, 10 pages)
   - `skills-reference.md` - All skills (AUTO-GENERATED, 10 pages)
   - `hooks-reference.md` - All hooks (2 pages)

4. **Changelog** (`changelog/`)
   - `CHANGELOG.md` - Version history (AUTO-GENERATED)

**Total**: ~40 pages of public documentation

### Priority 2 (Internal - Framework Development)

**Internal Documentation** (`.specweave/docs/internal/`):

1. **Strategy** (`strategy/`)
   - `overview.md` - SpecWeave vision and mission (3 pages)
   - `core/framework-capabilities.md` - What SpecWeave does (5 pages)
   - `agents/agents-system.md` - Agent system specs (10 pages)
   - `skills/skills-system.md` - Skills system specs (10 pages)
   - `workflows/increment-lifecycle.md` - Lifecycle workflows (5 pages)

2. **Architecture** (`architecture/`)
   - `system-design.md` - Overall architecture (10 pages)
   - `diagrams/system-context.mmd` - C4 Level 1 (Context)
   - `diagrams/system-container.mmd` - C4 Level 2 (Container)
   - `diagrams/agents/agents-architecture.mmd` - Agent system
   - `diagrams/skills/skills-architecture.mmd` - Skills system
   - `diagrams/lifecycle/lifecycle-flow.mmd` - Lifecycle diagrams
   - `adr/` - Architecture Decision Records (20+ ADRs!)

3. **Delivery** (`delivery/`)
   - `roadmap.md` - Product roadmap (3 pages)
   - `release-process.md` - How we release (2 pages)
   - `guides/project-conventions.md` - Development conventions (3 pages)
   - `guides/testing-strategy.md` - Testing approach (5 pages)

4. **Operations** (`operations/`)
   - `deployment.md` - How to deploy SpecWeave (3 pages)
   - `monitoring.md` - Monitoring and observability (2 pages)

5. **Governance** (`governance/`)
   - `security.md` - Security model (3 pages)
   - `compliance.md` - Compliance requirements (2 pages)

**Total**: ~80 pages of internal documentation

### Priority 3 (Marketing & Education)

**YouTube Scripts** (`youtube-content/scripts/`):

1. `01-introduction-to-specweave.md` (5-10 min video)
2. `02-increment-lifecycle-management.md` (10-15 min video)
3. `03-agents-vs-skills.md` (5-10 min video)
4. `04-context-loading.md` (5-10 min video)
5. `05-autonomous-saas-development.md` (15-20 min video)
6. `06-complete-tutorial.md` (30-45 min video)

**Total**: ~6 video scripts

---

## Architecture Decision Records (ADRs) to Document

**Critical decisions made** (need ADRs):

| # | Decision | Date | Status |
|---|----------|------|--------|
| ADR-001 | Tech Stack (TypeScript, Node.js) | 2025-01-25 | Accepted |
| ADR-002 | Context Loading Approach (Manifests) | 2025-01-25 | Accepted |
| ADR-003 | Skills vs Agents Architecture | 2025-01-25 | Accepted |
| ADR-004 | 5-Pillar Documentation Structure | 2025-01-25 | Accepted |
| ADR-005 | Framework-Agnostic Design | 2025-01-25 | Accepted |
| ADR-006 | Increment-Centric Organization | 2025-01-25 | Accepted |
| ADR-007 | WIP Limits (2-3 for framework) | 2025-10-26 | Accepted |
| ADR-008 | Leftover Transfer Mechanism | 2025-10-26 | Accepted |
| ADR-009 | 5-Stage Lifecycle (vs 4-stage) | 2025-10-26 | Accepted |
| ADR-010 | Hetzner as Default Infrastructure | 2025-02-01 | Accepted |
| ADR-011 | Claude Sonnet 4.5 as Required Model | 2025-01-25 | Accepted |
| ADR-012 | Test-First for Brownfield Only | 2025-02-01 | Accepted |
| ADR-013 | Playwright for E2E (when UI exists) | 2025-02-01 | Accepted |
| ADR-014 | Task Status Markers ([T], [C], etc.) | 2025-10-26 | Accepted |
| ADR-015 | C4 Model for Architecture Diagrams | 2025-10-26 | Accepted |
| ADR-016 | Hooks for Auto-Documentation | 2025-02-01 | Accepted |
| ADR-017 | NPM as Distribution Mechanism | 2025-02-01 | Accepted |
| ADR-018 | Skill Router >90% Accuracy Target | 2025-02-01 | Accepted |
| ADR-019 | 70%+ Token Reduction Target | 2025-01-25 | Accepted |
| ADR-020 | Closure Reports Auto-Generation | 2025-10-26 | Accepted |

**Need**: Auto-generate these ADRs from CLAUDE.md and reports

---

## C4 Diagrams Needed

### Level 1: System Context (HLD)

**File**: `.specweave/docs/internal/architecture/diagrams/system-context.mmd`

**Shows**:
- SpecWeave system boundary
- Users (Solo Developer, Team Developer, Enterprise Team)
- External systems (Hetzner, Stripe, Figma, JIRA, GitHub, ADO)
- Relationships

### Level 2: Container Diagram (HLD)

**File**: `.specweave/docs/internal/architecture/diagrams/system-container.mmd`

**Shows**:
- CLI (Node.js TypeScript)
- Agent System (20 agents)
- Skills System (24 skills)
- Context Loader
- Hooks System
- Documentation Generator

### Level 3: Component Diagrams (LLD)

**Files** (multiple):
- `diagrams/agents/agents-architecture.mmd` - Agent system internals
- `diagrams/skills/skills-architecture.mmd` - Skills system internals
- `diagrams/lifecycle/lifecycle-flow.mmd` - Increment lifecycle flow
- `diagrams/context-loading/context-loading.mmd` - Context loading mechanism
- `diagrams/routing/skill-routing.mmd` - Skill routing logic

---

## Documentation Generation Agent

### Agent: `docs-architect`

**Location**: `src/agents/docs-architect/AGENT.md`

**Responsibilities**:
1. **Scan project** - Understand entire SpecWeave structure
2. **Generate public docs** - User-facing guides, API reference
3. **Generate internal docs** - Strategy, architecture, ADRs
4. **Create C4 diagrams** - Following Mermaid C4 syntax
5. **Generate ADRs** - Document all architectural decisions
6. **Update YouTube scripts** - Based on latest capabilities
7. **Follow 5-pillar structure** - Correct placement of docs

**Tools**: Read, Write, Edit, Grep, Glob, Bash

**Model**: Claude Sonnet 4.5

**Test Cases**: 3+ (basic generation, update existing, diagram creation)

### Skill: `docs-generator`

**Location**: `src/skills/docs-generator/SKILL.md`

**Responsibilities**:
1. **Detect documentation requests** - "Generate docs", "Update documentation"
2. **Invoke docs-architect agent** - Delegate to specialized agent
3. **Handle specific doc types** - Public, internal, diagrams, ADRs, YouTube
4. **Validate output** - Ensure docs generated correctly

**Coordinates with**:
- `docs-architect` agent (main worker)
- `diagrams-architect` agent (for complex diagrams)

### Slash Command: `/generate-docs`

**Location**: `.claude/commands/generate-docs.md`

**Usage**:
```bash
/generate-docs --type=all              # Generate ALL documentation
/generate-docs --type=public           # Only public docs
/generate-docs --type=internal         # Only internal docs
/generate-docs --type=diagrams         # Only C4 diagrams
/generate-docs --type=adrs             # Only ADRs
/generate-docs --type=youtube          # Only YouTube scripts
/generate-docs --type=api              # Only API reference (auto-generated)
```

**Workflow**:
1. Validate type
2. Scan project structure
3. Invoke `docs-generator` skill
4. Skill invokes `docs-architect` agent
5. Agent generates documentation
6. Output summary with file locations

---

## Auto-Generated vs Manual Documentation

### Auto-Generated (DO NOT MANUALLY EDIT)

**Marked with**:
```markdown
<!-- AUTO-GENERATED - DO NOT EDIT MANUALLY -->
<!-- Last generated: 2025-10-26 -->
<!-- To update: Run /generate-docs --type=api -->
```

**Files**:
- `.specweave/docs/public/api/cli-commands.md` - Scans `.claude/commands/*.md`
- `.specweave/docs/public/api/agents-reference.md` - Scans `src/agents/*/AGENT.md`
- `.specweave/docs/public/api/skills-reference.md` - Scans `src/skills/*/SKILL.md`
- `.specweave/docs/public/changelog/CHANGELOG.md` - Scans git tags + increment reports

### Manual (PRESERVED on regeneration)

**Examples**:
- `.specweave/docs/public/overview/introduction.md`
- `.specweave/docs/public/guides/quick-start.md`
- `.specweave/docs/internal/strategy/overview.md`
- `.specweave/docs/internal/architecture/system-design.md`

**Approach**:
- Check if file exists
- If exists: Only update auto-generated sections
- If new: Generate from template

---

## Documentation Templates

### Template: ADR (Architecture Decision Record)

```markdown
# ADR-XXX: [Decision Title]

**Date**: YYYY-MM-DD
**Status**: Accepted | Superseded | Deprecated
**Supersedes**: ADR-000 (if applicable)

## Context

[What is the issue/problem we're addressing?]

## Decision

[What did we decide?]

## Consequences

**Positive**:
- [Benefit 1]
- [Benefit 2]

**Negative**:
- [Trade-off 1]
- [Trade-off 2]

## Alternatives Considered

### Option 1: [Alternative]
- Pros: ...
- Cons: ...
- **Rejected because**: ...

## References

- [Link to related document]
- [Link to code]
```

### Template: Guide (Public)

```markdown
# [Guide Title]

**Audience**: [Who this is for]
**Duration**: [Time to complete]
**Prerequisites**: [What you need before starting]

---

## Overview

[Brief description of what this guide covers]

## Step 1: [First Step]

[Instructions]

**Example**:
```bash
[Code example]
```

## Step 2: [Second Step]

[Instructions]

---

## Next Steps

- [Related guide 1]
- [Related guide 2]

## Troubleshooting

**Problem**: [Common issue]
**Solution**: [How to fix]
```

### Template: YouTube Script

```markdown
# [Video Title]

**Duration**: [X-Y minutes]
**Target Audience**: [Who this is for]
**Prerequisites**: [What viewers should know]

---

## Hook (0:00-0:30)

[Attention-grabbing opening]

## Introduction (0:30-1:00)

[What we'll cover in this video]

## Main Content

### Section 1: [Topic] (1:00-3:00)

**Talking Points**:
- [Point 1]
- [Point 2]

**Visuals**:
- [Screen recording of X]
- [Diagram showing Y]

**Script**:
> [What to say verbatim]

### Section 2: [Topic] (3:00-5:00)

[Same structure]

## Demo (5:00-8:00)

**What to show**:
- [Step-by-step demo]

## Conclusion (8:00-10:00)

**Summary**:
- [Key takeaway 1]
- [Key takeaway 2]

**Call to action**:
- [What viewer should do next]

---

## Resources

- [Link to docs]
- [Link to GitHub]
```

---

## Implementation Plan

### Phase 1: Agent & Skill Creation (1 hour)

- [ ] Create `src/agents/docs-architect/AGENT.md`
- [ ] Create `src/agents/docs-architect/templates/` with all templates
- [ ] Create `src/agents/docs-architect/test-cases/` (3 tests minimum)
- [ ] Create `src/skills/docs-generator/SKILL.md`
- [ ] Create `src/skills/docs-generator/test-cases/` (3 tests minimum)

### Phase 2: Slash Command (30 min)

- [ ] Create `.claude/commands/generate-docs.md`
- [ ] Document all options (--type=all, public, internal, etc.)
- [ ] Document workflow

### Phase 3: Test Generation (30 min)

- [ ] Run `/generate-docs --type=public` (test)
- [ ] Verify output in `.specweave/docs/public/`
- [ ] Run `/generate-docs --type=diagrams` (test)
- [ ] Verify C4 diagrams created

### Phase 4: Full Generation (User runs this)

- [ ] User runs: `/generate-docs --type=all`
- [ ] Agent scans entire project
- [ ] Generates all 120+ pages of documentation
- [ ] Creates 5 C4 diagrams
- [ ] Generates 20 ADRs
- [ ] Creates 6 YouTube scripts
- [ ] Updates API reference

**Estimated time**: 10-15 minutes for agent to complete

---

## Success Criteria

### Documentation Coverage

- ✅ **Public docs**: 40+ pages covering installation, guides, API reference
- ✅ **Internal docs**: 80+ pages covering strategy, architecture, delivery, operations
- ✅ **C4 diagrams**: 5 diagrams (system context, container, 3 component)
- ✅ **ADRs**: 20 documented decisions
- ✅ **YouTube scripts**: 6 video scripts
- ✅ **API reference**: Auto-generated from source

### Quality

- ✅ **Accurate**: Reflects actual capabilities
- ✅ **Complete**: No missing sections
- ✅ **Up-to-date**: Includes lifecycle management, WIP limits, leftover transfer
- ✅ **Navigable**: Cross-linked, clear structure
- ✅ **Actionable**: Users can follow guides successfully

### Automation

- ✅ **Regenerable**: Can run `/generate-docs --type=all` anytime
- ✅ **Incremental**: Can update specific types only
- ✅ **Preserved**: Manual content not overwritten
- ✅ **Marked**: Auto-generated sections clearly marked

---

## Command to Run (What User Will Execute)

```bash
# First time: Generate all documentation
/generate-docs --type=all

# This will:
# 1. Scan entire SpecWeave project
# 2. Generate 40+ public docs
# 3. Generate 80+ internal docs
# 4. Create 5 C4 diagrams
# 5. Generate 20 ADRs
# 6. Create 6 YouTube scripts
# 7. Update API reference
# 8. Create changelog

# Estimated time: 10-15 minutes
# Output: 120+ documentation files in .specweave/docs/
```

---

## Next Actions

1. **Create docs-architect agent** ✅ (me)
2. **Create docs-generator skill** ✅ (me)
3. **Create /generate-docs command** ✅ (me)
4. **User runs**: `/generate-docs --type=all` ✅ (user)

---

**This analysis provides complete blueprint for documentation generation system!**
