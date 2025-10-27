# CLAUDE.md Optimization Plan

**Current State**: 3,838 lines (~5,000 tokens)
**Target State**: 500-700 lines (~650-900 tokens)
**Reduction**: **85% smaller** (4,300 tokens saved)

---

## Problem Statement

CLAUDE.md has grown to 3,838 lines containing:
- Complete slash command documentation
- Full increment lifecycle details
- Complete agent/skill lists
- Detailed deployment workflows
- Comprehensive testing philosophy
- Full C4 diagram conventions
- Secrets management details
- Git workflow details

**Issues**:
1. ❌ **Token bloat**: 5,000 tokens loaded EVERY time
2. ❌ **Slow scanning**: Hard to find information quickly
3. ❌ **Maintenance burden**: Updates require editing massive file
4. ❌ **Duplicate information**: Same content in CLAUDE.md AND detailed docs
5. ❌ **Poor scalability**: Can't add more detail without further bloat

---

## Solution: "Index Card" Approach

**Philosophy**: CLAUDE.md becomes a **GUIDE and INDEX**, not a COMPREHENSIVE MANUAL.

### Principles

1. **30-50 lines max per topic** - Quick overview only
2. **Link to detailed guides** - "See: [detailed-guide.md]" for depth
3. **Keep critical rules** - Things that break if violated
4. **Common examples only** - Most-used patterns
5. **Load on demand** - Context-loader fetches detailed docs when needed

### Strategy

```
CLAUDE.md (Index Card)
    ↓
  Quick Overview (30-50 lines)
    ↓
  Link to Detailed Guide
    ↓
.specweave/docs/internal/delivery/guides/{topic}.md
    ↓
  Complete Documentation (200-500 lines)
```

---

## What Stays in CLAUDE.md

### 1. Core Philosophy (50 lines) ✅
- 8 core principles
- Spec-first approach
- Source of truth concept

**Why**: Fundamental, referenced constantly

### 2. Critical Rules (100 lines) ✅
- SpecWeave auto-detection
- Routing rules
- src/ is source of truth
- Increment-centric organization
- WIP limits (basic concept only)
- Test requirements (3+ per skill)

**Why**: Things that break if violated

### 3. Quick Start (50 lines) ✅
- Installation command
- Model requirements
- Tech stack detection priority
- First increment creation

**Why**: Get users started immediately

### 4. Common Workflows (100 lines) ✅
- Greenfield: 5-step workflow
- Brownfield: 5-step workflow
- Git workflow: Basic pattern

**Why**: Most-used patterns (with links to details)

### 5. Quick Reference Tables (80 lines) ✅
- Tech stack detection (table)
- Agent vs Skill (when to use)
- File organization (where to create)
- Slash commands (list + 1-line description)

**Why**: Fast lookups, no deep reading needed

### 6. Essential Troubleshooting (50 lines) ✅
- Common errors
- Quick fixes
- Link to full troubleshooting guide

**Why**: Unblock users immediately

### 7. Links to Detailed Guides (70 lines) ✅
- Organized by category
- One-line description per link
- Clear indication of what's in each guide

**Why**: Navigation to detailed content

---

## What Moves to Detailed Guides

### 1. Slash Commands → `.specweave/docs/public/api/slash-commands.md`

**Keep in CLAUDE.md** (20 lines):
```markdown
## Slash Commands

| Command | Description |
|---------|-------------|
| /create-increment | Create new feature/increment |
| /review-docs | Review strategic docs |
| /sync-github | Sync to GitHub issues |

**See**: [Slash Commands Reference](.specweave/docs/public/api/slash-commands.md)
```

**Move to detailed guide** (200 lines):
- Complete usage examples
- All arguments and options
- Error handling
- Platform-specific notes
- Advanced use cases

**Token savings**: 180 lines (~230 tokens)

---

### 2. Increment Lifecycle → `.specweave/docs/internal/delivery/guides/increment-lifecycle.md`

**Keep in CLAUDE.md** (40 lines):
```markdown
## Increment Lifecycle

**5 Stages**: backlog → planned → in-progress → completed → closed

**WIP Limits**:
- Solo/small team: 1-2 in progress
- Framework dev: 2-3 in progress
- Large team: 3-5 in progress

**Task vs Increment Decision**:
- < 1 day + 1 component = TASK
- Weeks + multiple components = INCREMENT

**See**: [Increment Lifecycle Guide](.specweave/docs/internal/delivery/guides/increment-lifecycle.md)
```

**Move to detailed guide** (400 lines):
- Complete status progression
- Leftover transfer workflow
- Frontmatter schema
- Complete examples
- Closure report format
- Commands reference

**Token savings**: 360 lines (~460 tokens)

---

### 3. Increment Validation → `.specweave/docs/internal/delivery/guides/increment-validation.md`

**Keep in CLAUDE.md** (30 lines):
```markdown
## Increment Validation

**Auto-validates** on document save (spec.md, plan.md, tasks.md, tests.md)

**120 validation rules** across:
- Consistency (spec ↔ plan ↔ tasks)
- Completeness (missing sections)
- Quality (technology-agnostic, testable)
- Traceability (TC-0001 → tests)

**See**: [Increment Validation Guide](.specweave/docs/internal/delivery/guides/increment-validation.md)
```

**Move to detailed guide** (300 lines):
- Complete 120 rules
- Validation workflow
- Report format
- Fix workflow
- Configuration

**Token savings**: 270 lines (~350 tokens)

---

### 4. Agents & Skills Lists → `.specweave/docs/public/api/agents-reference.md`, `skills-reference.md`

**Keep in CLAUDE.md** (50 lines):
```markdown
## Agents vs Skills

**Agents**: Separate context windows, complex tasks
**Skills**: Shared context, lightweight capabilities

**Strategic Agents**: pm, architect, devops, security, qa-lead
**Implementation Agents**: Adapt to YOUR tech stack (nextjs, python-backend, etc.)
**Core Skills**: specweave-detector, feature-planner, skill-router, context-loader

**Complete Lists**:
- [Agents Reference](.specweave/docs/public/api/agents-reference.md) - All 14+ agents
- [Skills Reference](.specweave/docs/public/api/skills-reference.md) - All 24+ skills
```

**Move to detailed guides** (200 lines each):
- Complete agent descriptions
- Installation commands
- Usage examples
- Test requirements
- When to use which

**Token savings**: 350 lines (~450 tokens)

---

### 5. Deployment Intelligence → `.specweave/docs/internal/delivery/guides/deployment-guide.md`

**Keep in CLAUDE.md** (40 lines):
```markdown
## Deployment

**Progressive Disclosure**: Ask deployment questions only when relevant

**Core Principle**: Detect deployment target (local vs cloud) before generating infrastructure

**Platform Options**: Hetzner, Railway, Vercel, AWS, Azure, GCP, DigitalOcean

**Cost Optimizer**: Auto-recommends cheapest platform for your scale

**See**: [Deployment Guide](.specweave/docs/internal/delivery/guides/deployment-guide.md)
```

**Move to detailed guide** (400 lines):
- Complete detection flow
- All deployment questions
- Platform comparison tables
- Config schema
- Provider-specific notes
- Cost budget enforcement

**Token savings**: 360 lines (~460 tokens)

---

### 6. Secrets Management → `.specweave/docs/internal/operations/guides/secrets-management.md`

**Keep in CLAUDE.md** (30 lines):
```markdown
## Secrets Management

**Core Principle**: Request secrets ONLY when needed for blocking operations

**When Requested**:
- Infrastructure provisioning (after deployment target configured)
- External API integrations
- Production database connections

**Security**: .env file (gitignored), never committed to git

**See**: [Secrets Management Guide](.specweave/docs/internal/operations/guides/secrets-management.md)
```

**Move to detailed guide** (250 lines):
- Complete workflow
- Platform-specific secrets
- Validation
- Best practices
- Production secrets managers

**Token savings**: 220 lines (~280 tokens)

---

### 7. Testing Philosophy → `.specweave/docs/internal/delivery/guides/testing-guide.md`

**Keep in CLAUDE.md** (50 lines):
```markdown
## Testing Strategy

**4 Levels of Test Cases**:
1. **Specification** - Acceptance criteria (TC-0001) in strategy docs
2. **Feature** - Test coverage matrix in increments/
3. **Skill** - YAML test cases (3+ per skill)
4. **Code** - E2E/unit/integration tests

**Requirements**:
- E2E (Playwright) MANDATORY when UI exists
- 80%+ coverage for critical paths
- Reference TC-0001 in test names

**See**: [Testing Guide](.specweave/docs/internal/delivery/guides/testing-guide.md)
```

**Move to detailed guide** (400 lines):
- Complete 4-level strategy
- Traceability examples
- Test formats
- Playwright setup
- Coverage requirements
- Success criteria

**Token savings**: 350 lines (~450 tokens)

---

### 8. C4 Diagram Conventions → `.specweave/docs/internal/architecture/guides/diagram-conventions.md`

**Keep in CLAUDE.md** (40 lines):
```markdown
## C4 Diagrams

**SpecWeave uses C4 Model**:
- **C4-1 Context**: System boundaries (HLD)
- **C4-2 Container**: Applications, services (HLD)
- **C4-3 Component**: Internal structure (LLD)
- **C4-4 Code**: Optional (generated from code)

**CRITICAL**: C4 diagrams start DIRECTLY with `C4Context`, NOT `mermaid` keyword

**Agents**: diagrams-architect (creates), diagrams-generator (coordinates)

**See**: [Diagram Conventions](.specweave/docs/internal/architecture/guides/diagram-conventions.md)
```

**Move to detailed guide** (300 lines):
- Complete C4 mapping
- Syntax rules
- Validation workflow
- Other diagram types
- Best practices
- Common errors

**Token savings**: 260 lines (~330 tokens)

---

### 9. Git Workflow → `.specweave/docs/internal/delivery/guides/git-workflow.md`

**Keep in CLAUDE.md** (30 lines):
```markdown
## Git Workflow

**Branch Pattern**: `features/{increment-id}-{short-name}`

**Workflow**:
1. Create increment folder
2. Create feature branch
3. Implement
4. Create PR (base: develop)
5. Merge and cleanup

**See**: [Git Workflow Guide](.specweave/docs/internal/delivery/guides/git-workflow.md)
```

**Move to detailed guide** (200 lines):
- Complete workflow examples
- Branch strategy
- Commit conventions
- PR templates
- Merge strategies

**Token savings**: 170 lines (~220 tokens)

---

### 10. Directory Structure → `.specweave/docs/internal/architecture/guides/directory-structure.md`

**Keep in CLAUDE.md** (50 lines):
```markdown
## Directory Structure

**Increment-Centric**: ALL supporting files in `.specweave/increments/{id}/`

**Root Folder**: ONLY CLAUDE.md added by SpecWeave

**Increment Structure**:
- spec.md, tasks.md, tests.md
- logs/, scripts/, reports/ (increment-specific)

**See**: [Directory Structure Guide](.specweave/docs/internal/architecture/guides/directory-structure.md)
```

**Move to detailed guide** (400 lines):
- Complete structure examples
- User project structure
- Framework structure
- Monorepo structure
- File organization rules

**Token savings**: 350 lines (~450 tokens)

---

## Total Token Savings

| Section | Current | Optimized | Saved |
|---------|---------|-----------|-------|
| Slash Commands | 200 lines | 20 lines | 180 (~230 tokens) |
| Increment Lifecycle | 400 lines | 40 lines | 360 (~460 tokens) |
| Increment Validation | 300 lines | 30 lines | 270 (~350 tokens) |
| Agents/Skills Lists | 400 lines | 50 lines | 350 (~450 tokens) |
| Deployment Intelligence | 400 lines | 40 lines | 360 (~460 tokens) |
| Secrets Management | 250 lines | 30 lines | 220 (~280 tokens) |
| Testing Philosophy | 400 lines | 50 lines | 350 (~450 tokens) |
| C4 Diagram Conventions | 300 lines | 40 lines | 260 (~330 tokens) |
| Git Workflow | 200 lines | 30 lines | 170 (~220 tokens) |
| Directory Structure | 400 lines | 50 lines | 350 (~450 tokens) |

**Total Reduction**: 2,670 lines saved (~3,430 tokens, **73% reduction**)

**Result**:
- Current: 3,838 lines (~5,000 tokens)
- Optimized: 1,168 lines (~1,500 tokens)
- **Savings: 70% reduction in CLAUDE.md size**

---

## Load-on-Demand Mechanism

### How It Works

1. **Claude reads CLAUDE.md** - Gets overview and critical rules (~1,500 tokens)
2. **User asks specific question** - e.g., "How do I close an increment with leftovers?"
3. **context-loader skill detects topic** - "increment lifecycle"
4. **Loads detailed guide** - Reads `.specweave/docs/internal/delivery/guides/increment-lifecycle.md`
5. **Claude answers with full context** - Uses both CLAUDE.md + detailed guide

### Context-Loader Logic

```typescript
// context-loader skill enhancement
const topicGuides = {
  "increment": "internal/delivery/guides/increment-lifecycle.md",
  "validation": "internal/delivery/guides/increment-validation.md",
  "deployment": "internal/delivery/guides/deployment-guide.md",
  "secrets": "internal/operations/guides/secrets-management.md",
  "testing": "internal/delivery/guides/testing-guide.md",
  "diagram": "internal/architecture/guides/diagram-conventions.md",
  "git": "internal/delivery/guides/git-workflow.md",
  "structure": "internal/architecture/guides/directory-structure.md",
  "slash commands": "public/api/slash-commands.md",
  "agents": "public/api/agents-reference.md",
  "skills": "public/api/skills-reference.md"
};

function loadGuideForTopic(userQuestion: string) {
  for (const [topic, guide] of Object.entries(topicGuides)) {
    if (userQuestion.toLowerCase().includes(topic)) {
      return loadDocument(`.specweave/docs/${guide}`);
    }
  }
}
```

### Agent Behavior

Agents automatically load their reference docs via frontmatter:

```yaml
# src/agents/devops/AGENT.md
---
name: devops
description: DevOps Engineer...
reference_docs:
  - .specweave/docs/internal/delivery/guides/deployment-guide.md
  - .specweave/docs/internal/operations/guides/secrets-management.md
---
```

When DevOps agent is invoked, it automatically loads its reference docs.

---

## Implementation Plan

### Phase 1: Create Detailed Guides (New Files)

Create 11 new detailed guide files:

1. `.specweave/docs/public/api/slash-commands.md` (200 lines)
2. `.specweave/docs/internal/delivery/guides/increment-lifecycle.md` (400 lines)
3. `.specweave/docs/internal/delivery/guides/increment-validation.md` (300 lines)
4. `.specweave/docs/internal/delivery/guides/deployment-guide.md` (400 lines)
5. `.specweave/docs/internal/operations/guides/secrets-management.md` (250 lines)
6. `.specweave/docs/internal/delivery/guides/testing-guide.md` (400 lines)
7. `.specweave/docs/internal/architecture/guides/diagram-conventions.md` (300 lines)
8. `.specweave/docs/internal/delivery/guides/git-workflow.md` (200 lines)
9. `.specweave/docs/internal/architecture/guides/directory-structure.md` (400 lines)
10. `.specweave/docs/public/api/agents-reference.md` (200 lines)
11. `.specweave/docs/public/api/skills-reference.md` (200 lines)

**Total new content**: ~3,250 lines (organized, searchable, detailed)

### Phase 2: Condense CLAUDE.md

1. Extract content from each section
2. Replace with 30-50 line summaries
3. Add "See: [link]" to detailed guides
4. Keep only critical rules and quick reference
5. Verify all links work
6. Test token reduction

**Target**: 1,168 lines (~1,500 tokens)

### Phase 3: Update context-loader

1. Add topic detection logic
2. Map topics to guide files
3. Load guides on-demand when relevant
4. Test that guides are loaded correctly

### Phase 4: Update CLAUDE.md.template

1. Apply same condensing strategy
2. Keep user-project-specific rules
3. Add links to SpecWeave online docs (for public guides)
4. Add links to local docs (for project-specific guides)

**Target**: ~400-500 lines (~520-650 tokens)

### Phase 5: Update Agent Frontmatter

Add `reference_docs` to all agents:

```yaml
# Example: src/agents/devops/AGENT.md
---
name: devops
description: DevOps Engineer...
reference_docs:
  - .specweave/docs/internal/delivery/guides/deployment-guide.md
  - .specweave/docs/internal/operations/guides/secrets-management.md
---
```

### Phase 6: Verification

1. ✅ CLAUDE.md reduced to ~1,500 tokens
2. ✅ All detailed guides created
3. ✅ Links work correctly
4. ✅ context-loader loads guides on-demand
5. ✅ Agents load their reference docs
6. ✅ CLAUDE.md.template optimized
7. ✅ Documentation complete and searchable

---

## Benefits

1. **Token Savings**: 70% reduction in CLAUDE.md (5,000 → 1,500 tokens)
2. **Faster Loading**: Only load what's needed (on-demand)
3. **Better Maintenance**: Update detailed docs separately
4. **Easier Navigation**: Quick scan for overview, deep dive when needed
5. **Scalability**: Can add more detailed guides without bloating CLAUDE.md
6. **Better Organization**: Content in logical locations (public vs internal)
7. **Searchability**: Detailed guides indexed by MkDocs
8. **Single Source of Truth**: No duplicate content

---

## Example: Condensed CLAUDE.md Structure

```markdown
# SpecWeave - Spec-Driven Development Framework

**THIS FILE IS YOUR QUICK REFERENCE GUIDE**

For detailed documentation, see `.specweave/docs/`

---

## Core Philosophy (50 lines)
[8 principles]

---

## Quick Start (50 lines)
[Installation, first increment]

---

## Critical Rules (100 lines)
[Must-follow rules]

---

## Common Workflows (100 lines)

### Greenfield (30 lines)
[5-step workflow]
**See**: [Greenfield Workflow](.specweave/docs/internal/delivery/guides/greenfield-workflow.md)

### Brownfield (30 lines)
[5-step workflow]
**See**: [Brownfield Workflow](.specweave/docs/internal/delivery/guides/brownfield-workflow.md)

### Git Workflow (30 lines)
[Branch pattern, basic workflow]
**See**: [Git Workflow Guide](.specweave/docs/internal/delivery/guides/git-workflow.md)

---

## Quick Reference (80 lines)

### Slash Commands
[Table with 1-line descriptions]
**See**: [Slash Commands Reference](.specweave/docs/public/api/slash-commands.md)

### Agents & Skills
[When to use which]
**See**: [Agents Reference](.specweave/docs/public/api/agents-reference.md)
**See**: [Skills Reference](.specweave/docs/public/api/skills-reference.md)

---

## Detailed Guides (70 lines)

### Increment Management
- [Increment Lifecycle](.specweave/docs/internal/delivery/guides/increment-lifecycle.md)
- [Increment Validation](.specweave/docs/internal/delivery/guides/increment-validation.md)

### Development
- [Testing Guide](.specweave/docs/internal/delivery/guides/testing-guide.md)
- [Git Workflow](.specweave/docs/internal/delivery/guides/git-workflow.md)
- [Directory Structure](.specweave/docs/internal/architecture/guides/directory-structure.md)

### Deployment
- [Deployment Guide](.specweave/docs/internal/delivery/guides/deployment-guide.md)
- [Secrets Management](.specweave/docs/internal/operations/guides/secrets-management.md)

### Architecture
- [Diagram Conventions](.specweave/docs/internal/architecture/guides/diagram-conventions.md)
- [Agents Reference](.specweave/docs/public/api/agents-reference.md)
- [Skills Reference](.specweave/docs/public/api/skills-reference.md)

### API
- [Slash Commands](.specweave/docs/public/api/slash-commands.md)

---

**Total**: ~500-600 lines (~750-900 tokens)
**Reduction**: 85% smaller than current CLAUDE.md
```

---

## Next Steps

1. **Review this plan** - Ensure approach is sound
2. **Create detailed guides** - Extract content from CLAUDE.md to new files
3. **Condense CLAUDE.md** - Replace with summaries + links
4. **Update context-loader** - Add topic detection
5. **Test** - Verify load-on-demand works
6. **Apply to template** - Optimize CLAUDE.md.template similarly
7. **Document** - Update meta-documentation about this approach

---

## Success Criteria

1. ✅ CLAUDE.md < 700 lines (~900 tokens max)
2. ✅ All detailed content preserved in guides
3. ✅ Load-on-demand working correctly
4. ✅ Links functional
5. ✅ No information loss
6. ✅ Better user experience (faster scanning)
7. ✅ Scalable (can add more guides without bloat)

---

**This optimization will make SpecWeave more efficient, maintainable, and scalable while preserving ALL information.**
