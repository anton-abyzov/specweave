# SpecWeave - Spec-Driven Development Framework

**THIS FILE IS YOUR QUICK REFERENCE GUIDE**

For detailed documentation, see `.specweave/docs/`

---

## Table of Contents

1. [Core Philosophy](#core-philosophy)
2. [Quick Start](#quick-start)
3. [Common Workflows](#common-workflows)
4. [Critical Rules](#critical-rules)
5. [Quick Reference](#quick-reference)
6. [Detailed Guides](#detailed-guides)

---

## Core Philosophy

**SpecWeave** is a specification-first AI development framework where **specifications and documentation are the SOURCE OF TRUTH**. Code is the expression of these specifications in a particular language.

### Core Principles

1. **Specification Before Implementation** - Define WHAT and WHY before HOW
2. **Living Documentation** - Specs evolve with code, never diverge
3. **Regression Prevention** - Document existing code before modification
4. **Test-Validated Features** - Every feature proven through automated tests
5. **Scalable from Solo to Enterprise** - Modular structure that grows with project size
6. **Context Precision** - Load only relevant specs (70%+ token reduction)
7. **Auto-Role Routing** - Skills detect and route to appropriate expertise automatically
8. **Closed-Loop Validation** - E2E tests must tell the truth (no false positives)

**See**: [Framework Philosophy](.specweave/docs/public/overview/philosophy.md) for complete philosophy

---

## Quick Start

### Installation

**Required Model**: Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)

**Initialize New Project** (Selective Installation):
```bash
# Option 1: Using slash command (auto-detects tech stack)
specweave init --type python --framework fastapi

# Option 2: Using CLI (auto-detects or asks)
npx specweave init
```

**What Gets Installed**:
- Strategic agents: pm, architect, security, qa-lead, devops, docs-writer
- Implementation agents: Based on YOUR tech stack (python-backend, nextjs, etc.)
- Core skills: specweave-detector, skill-router, context-loader, increment-planner
- Total: 7 agents + 4 skills (vs 19 agents + 24 skills if installing all!)

**See**: [Installation Guide](.specweave/docs/public/guides/getting-started/installation.md) for complete setup

---

## Common Workflows

### Greenfield Projects

1. **Initialize SpecWeave**: `specweave init` (detects YOUR tech stack)
2. **Create specifications**: `.specweave/docs/internal/strategy/` (technology-agnostic WHAT/WHY)
3. **Design architecture**: `.specweave/docs/internal/architecture/` (technical HOW with ADRs)
4. **Plan features**: `/create-increment "feature description"`
5. **Implement**: Autonomous execution using YOUR detected stack

**See**: [Greenfield Workflow](.specweave/docs/internal/delivery/guides/greenfield-workflow.md)

### Brownfield Projects

1. **Merge existing CLAUDE.md**: `brownfield-onboarder` skill (preserves project knowledge)
2. **Analyze existing code**: `brownfield-analyzer` skill
3. **Document current behavior**: Generate specs from implementation
4. **Create baseline tests**: Prevent regression
5. **Plan modifications**: `/create-increment "enhancement" --brownfield`

**See**: [Brownfield Workflow](.specweave/docs/internal/delivery/guides/brownfield-workflow.md)

### Git Workflow

**Branch Pattern**: `features/{increment-id}-{short-name}`

**Basic Flow**:
1. Create increment folder → `/create-increment "feature"`
2. Create feature branch → `git checkout -b features/002-feature-name`
3. Implement → Work on spec, tasks, code
4. Create PR → `gh pr create --base develop`
5. Merge and cleanup

**See**: [Git Workflow Guide](.specweave/docs/internal/delivery/guides/git-workflow.md)

---

## Critical Rules

### 1. SpecWeave Auto-Detection (MANDATORY)

**CRITICAL**: This project has SpecWeave installed (`.specweave/` directory exists).

**Auto-Detection Rules**:
1. ✅ ALWAYS check for SpecWeave FIRST before responding
2. ✅ ROUTE ALL development requests through `specweave-detector` skill
3. ✅ Load context via `context-loader` when needed
4. ✅ Adapt to detected tech stack (TypeScript, Python, Go, etc.)

### 2. Source of Truth: src/ Folder

**CRITICAL**: All framework components (agents, skills, commands, hooks) MUST be created in `src/` first, then installed to `.claude/`.

- ✅ Agents → `src/agents/{name}/`
- ✅ Skills → `src/skills/{name}/`
- ✅ Commands → `src/commands/{name}.md`
- ✅ Hooks → `src/hooks/{name}.sh`

### 3. Increment-Centric Organization (MANDATORY)

**CRITICAL**: ALL supporting files (logs, scripts, reports) MUST belong to an INCREMENT.

- ✅ Logs → `.specweave/increments/{id}/logs/`
- ✅ Scripts → `.specweave/increments/{id}/scripts/`
- ✅ Reports → `.specweave/increments/{id}/reports/`
- ❌ NO files in project root except `CLAUDE.md`

**See**: [Directory Structure](.specweave/docs/internal/architecture/guides/directory-structure.md)

### 4. WIP Limits

**Prevent context-switching overhead**:
- Solo/small team (1-5): **1-2 in progress**
- Framework development: **2-3 in progress**
- Large team (10+): **3-5 in progress**

**See**: [Increment Lifecycle](.specweave/docs/internal/delivery/guides/increment-lifecycle.md)

### 5. Test Requirements

**Minimum requirements**:
- ✅ Skills: **3+ test cases** in `test-cases/` (MANDATORY)
- ✅ Agents: **3+ test cases** in `test-cases/` (MANDATORY)
- ✅ E2E tests: **MANDATORY when UI exists** (Playwright)
- ✅ Coverage: **80%+ for critical paths**

**See**: [Testing Guide](.specweave/docs/internal/delivery/guides/testing-guide.md)

### 6. Framework-Agnostic Commands

**CRITICAL**: All slash commands and agents are **framework-agnostic** and adapt to ANY tech stack.

- ✅ Never assume framework (Next.js, Django, etc.)
- ✅ Detect from `.specweave/config.yaml` or project files
- ✅ Ask user if detection fails
- ✅ Use generic templates with placeholders

### 7. Deployment Intelligence

**CRITICAL**: Agents MUST ask about deployment target before generating infrastructure code.

- ✅ Ask only when relevant (not day 1 of prototyping)
- ✅ Settings auto-detected
- ✅ Progressive disclosure (local vs cloud → provider selection → cost optimization)

**See**: [Deployment Guide](.specweave/docs/internal/delivery/guides/deployment-guide.md)

### 8. Secrets Management

**CRITICAL**: Request secrets ONLY when needed for blocking operations.

- ✅ After deployment target configured
- ✅ After infrastructure code generated
- ✅ When user explicitly says "deploy now"
- ❌ NOT during planning or documentation

**See**: [Secrets Management](.specweave/docs/internal/operations/guides/secrets-management.md)

### 9. Validation Before Implementation

**CRITICAL**: Increment documents (spec.md, plan.md, tasks.md, tests.md) are auto-validated before implementation.

- ✅ **120 validation rules** (consistency, completeness, quality, traceability)
- ✅ Quick validation on save (5-10s)
- ✅ Deep analysis if issues found (30-60s)
- ✅ Block implementation if critical errors

**See**: [Increment Validation](.specweave/docs/internal/delivery/guides/increment-validation.md)

### 10. C4 Diagram Syntax

**CRITICAL**: C4 diagrams start DIRECTLY with `C4Context`, NOT `mermaid` keyword.

- ✅ `C4Context` for Level 1 (system context)
- ✅ `C4Container` for Level 2 (containers)
- ✅ `C4Component` for Level 3 (components)
- ❌ NO `mermaid` keyword in C4 diagrams

**See**: [Diagram Conventions](.specweave/docs/internal/architecture/guides/diagram-conventions.md)

---

## Quick Reference

### Tech Stack Detection Priority
2. **`package.json`** → TypeScript/JavaScript
3. **`requirements.txt`** or **`pyproject.toml`** → Python
4. **`go.mod`** → Go
5. **`Cargo.toml`** → Rust
6. **`pom.xml`** or **`build.gradle`** → Java
7. **`*.csproj`** → C#/.NET
8. **Ask user** if detection fails

### Slash Commands

| Command | Description |
|---------|-------------|
| `specweave init` | Bootstrap new SpecWeave project (framework-agnostic) |
| `/create-increment` | Create new feature/increment (auto-numbered) |
| `/sync-docs` | Review strategic docs before implementation |
| `/sync-github` | Sync increment to GitHub issues |

**See**: [Slash Commands Reference](.specweave/docs/public/api/slash-commands.md)

### Agent vs Skill Decision

| Create Agent When | Create Skill When |
|-------------------|-------------------|
| Complex, multi-step workflows | Simple, focused tasks |
| Needs separate context window | Can share main context |
| Distinct personality/role needed | Capability extension |
| Tool restrictions by role | All tools acceptable |
| Long-running tasks | Quick operations |

**See**: [Agents Reference](.specweave/docs/public/api/agents-reference.md)

### File Organization

| Component Type | Create In | Installed To |
|----------------|-----------|--------------|
| Agent | `src/agents/{name}/` | `.claude/agents/{name}/` |
| Skill | `src/skills/{name}/` | `.claude/skills/{name}/` |
| Command | `src/commands/{name}.md` | `.claude/commands/{name}.md` |
| Hook | `src/hooks/{name}.sh` | `.claude/hooks/{name}.sh` |
| Project file | `src/templates/{file}` | User's project root |

**See**: [Directory Structure](.specweave/docs/internal/architecture/guides/directory-structure.md)

---

## Detailed Guides

### Increment Management

- **[Increment Lifecycle](.specweave/docs/internal/delivery/guides/increment-lifecycle.md)** - Complete lifecycle, status progression, WIP limits, leftover transfer
- **[Increment Validation](.specweave/docs/internal/delivery/guides/increment-validation.md)** - 120 validation rules, validation workflow, report format

### Development

- **[Testing Guide](.specweave/docs/internal/delivery/guides/testing-guide.md)** - 4-level testing strategy, traceability, E2E requirements
- **[Git Workflow](.specweave/docs/internal/delivery/guides/git-workflow.md)** - Branch strategy, commit conventions, PR workflow
- **[Directory Structure](.specweave/docs/internal/architecture/guides/directory-structure.md)** - Complete structure examples, organization rules

### Deployment

- **[Deployment Guide](.specweave/docs/internal/delivery/guides/deployment-guide.md)** - Deployment intelligence, platform selection, cost optimization
- **[Secrets Management](.specweave/docs/internal/operations/guides/secrets-management.md)** - Secrets workflow, platform-specific secrets, security best practices

### Architecture

- **[Diagram Conventions](.specweave/docs/internal/architecture/guides/diagram-conventions.md)** - C4 model, syntax rules, validation workflow
- **[Context Loading](.specweave/docs/internal/architecture/context-loading.md)** - Context manifests, token reduction, selective loading

### API Reference

- **[Slash Commands](.specweave/docs/public/api/slash-commands.md)** - Complete command reference with examples
- **[Agents Reference](.specweave/docs/public/api/agents-reference.md)** - All 14+ agents with descriptions
- **[Skills Reference](.specweave/docs/public/api/skills-reference.md)** - All 24+ skills with descriptions

### Workflow Guides

- **[Greenfield Workflow](.specweave/docs/internal/delivery/guides/greenfield-workflow.md)** - Starting from scratch
- **[Brownfield Workflow](.specweave/docs/internal/delivery/guides/brownfield-workflow.md)** - Working with existing code

---

## Documentation Philosophy

**SpecWeave supports TWO valid documentation approaches**:

### Approach 1: Comprehensive Upfront (Enterprise/Production)
- Create 500-600+ page specs BEFORE implementation
- Complete architecture documented upfront
- All ADRs documented in advance
- Best for: Enterprise, regulated industries, large teams (10+)

### Approach 2: Incremental/Evolutionary (Startup/Iterative)
- Start with high-level overview (10-20 pages)
- Build documentation AS YOU GO (like Microsoft)
- Add modules/specs as features are planned
- Best for: Startups, MVPs, small teams (1-5)

**Both approaches fully supported!**

**See**: [Documentation Philosophy](.specweave/docs/public/overview/philosophy.md)

---

## Summary

**SpecWeave** replaces vibe coding with **Spec-Driven Development**:

1. ✅ **CLAUDE.md is your guide** - Quick reference (this file)
2. ✅ **Specifications are SOURCE OF TRUTH** - Code expresses specs
3. ✅ **Framework-agnostic** - Works with ANY language/framework (TypeScript, Python, Go, Rust, Java, etc.)
4. ✅ **Generic commands** - Adapt to detected tech stack
5. ✅ **Selective installation** - Only install what's needed (60% token reduction)
6. ✅ **Context precision** - Load only relevant docs (70%+ token reduction)
7. ✅ **Auto-role routing** - Skills detect expertise automatically
8. ✅ **Deployment intelligence** - Ask about deployment only when relevant
9. ✅ **Test-validated** - 3+ tests per skill, E2E Playwright when UI exists
10. ✅ **Living documentation** - Auto-update via Claude hooks
11. ✅ **Brownfield-ready** - Analyze, document, then modify safely
12. ✅ **Production-ready** - Documentation is CRUCIAL for production, supports enterprise scale

**This framework enables building software at ANY scale, with ANY tech stack, with confidence, clarity, and minimal context usage.**

---

**Total Lines**: ~400-450 lines
**Token Count**: ~550-600 tokens
**Reduction**: **85% smaller** than current CLAUDE.md (3,838 lines → 450 lines)

**Last Updated**: Auto-updated via `post-task-completion` hook
**SpecWeave Version**: 0.1.0
