---
sidebar_position: 5
title: SpecWeave vs SpecKit
description: Understanding how SpecWeave extends the spec-driven development foundation laid by GitHub's SpecKit
---

# SpecWeave vs GitHub SpecKit: Understanding the Ecosystem

## The Rise of Spec-Driven Development

In September 2025, GitHub released [SpecKit](https://github.com/github/spec-kit) — an open-source toolkit that formalized **spec-driven development** for AI coding agents. With 28k+ stars and growing, SpecKit proved that structured specifications dramatically improve AI code generation quality.

SpecWeave builds on this foundation, extending the single-project snapshot approach into a full **enterprise lifecycle management system**.

## Quick Comparison

| Dimension | SpecKit | SpecWeave |
|-----------|---------|-----------|
| **Core Philosophy** | Specification snapshot for one feature | Living documentation for entire product lifecycle |
| **Workflow Phases** | Specify → Plan → Tasks → Implement | Same + Hooks → Sync → Validate → Close |
| **Project Scope** | Single project, single repo | Multi-project, multi-repo, umbrella setups |
| **External Tools** | None | GitHub Issues, JIRA, Azure DevOps (bidirectional) |
| **Documentation** | Static snapshots | Living docs (auto-update after every task) |
| **Codebase Support** | Greenfield only | Greenfield + Brownfield |
| **Team Scale** | Solo / small team | Solo to 50+ teams |
| **Quality Enforcement** | Developer discipline | 3-gate validation (tasks, tests, docs) |
| **AI Tool Support** | Claude, Copilot, etc. | Same + plugin ecosystem with hooks |

## SpecKit: The Foundation

SpecKit introduced a clean 4-phase workflow:

```
/speckit.constitution  → Project principles
/speckit.specify       → Feature requirements
/speckit.plan          → Technical approach
/speckit.tasks         → Implementation checklist
/speckit.implement     → Code generation
```

**Best for:**
- Weekend MVPs
- Single-feature greenfield projects
- Learning spec-driven development
- Solo developers or small teams
- Projects with no external tool dependencies

**Limitations:**
- Specs are snapshots — they don't evolve with implementation
- No integration with project management tools
- Single project focus
- No quality gates — completion is honor-based
- Limited brownfield support

## SpecWeave: Enterprise Evolution

SpecWeave extends the SpecKit foundation with enterprise capabilities:

### 1. Living Documentation (Not Snapshots)

In SpecKit, specs are created once and may become stale. In SpecWeave, documentation updates **automatically after every task**:

```bash
# Task completed → Hooks fire → Living docs sync
/specweave:do

# What happens automatically:
# 1. tasks.md updated with completion status
# 2. spec.md acceptance criteria checked off
# 3. Living docs in .specweave/docs/ synchronized
# 4. External tools (GitHub/JIRA/ADO) updated
```

### 2. External Tool Integration

Real enterprise projects don't live in vacuum — they have JIRA epics, GitHub issues, Azure DevOps work items:

```bash
# Bidirectional sync with your tools
/specweave:sync-progress

# Creates GitHub issue from increment
/specweave-github:create-issue

# Syncs JIRA epic/story hierarchy
/specweave-jira:sync
```

### 3. Multi-Project Support

Enterprise = multiple repos, multiple teams, one source of truth:

```bash
# Initialize umbrella project
specweave init . --multiproject

# Work spans frontend, backend, mobile
/specweave:increment "User authentication"
# → Creates specs mapped to correct repos
# → Syncs to correct JIRA projects/ADO areas
```

### 4. Brownfield Support

10-year-old codebase? Existing documentation sprawl? No problem:

```bash
# Analyze existing project
specweave init . --brownfield

# Import from existing tools
/specweave:import-external --source jira --days 90

# Import documentation
/specweave:import-docs ./legacy-wiki
```

### 5. Quality Gates

Nothing ships without validation:

```bash
/specweave:done 0042

# Validates:
# ✓ All tasks complete
# ✓ Test coverage ≥ 60%
# ✓ Documentation updated
# ✓ External tools synced
```

## When to Use Which

### Choose SpecKit When:

- Building a weekend project or MVP
- Learning spec-driven development concepts
- Working solo on a single greenfield repo
- No need for project management tool integration
- You want minimal setup overhead

### Choose SpecWeave When:

- Working on brownfield (existing) codebases
- Needing JIRA, GitHub Issues, or Azure DevOps sync
- Managing multiple repos or projects
- Working with multiple teams
- Requiring quality gates and compliance
- Building enterprise products with audit trails
- Wanting documentation that stays current automatically

## Migration Path

**SpecKit → SpecWeave** is seamless:

1. SpecWeave uses the same 3-file structure (`spec.md`, `plan.md`, `tasks.md`)
2. Existing SpecKit specs work directly in SpecWeave
3. SpecWeave adds hooks, sync, and quality gates on top

```bash
# In a project with existing SpecKit specs
specweave init .

# Your specs are now living documents
# with external sync and quality gates
```

## The Bigger Picture

Think of the relationship like this:

- **SpecKit** = Requirements snapshot tool (like a camera)
- **SpecWeave** = Product lifecycle management (like a film studio)

SpecKit captures a moment. SpecWeave manages the entire journey from idea to production, keeping everything synchronized across tools, teams, and time.

## Learn More

- [GitHub SpecKit Repository](https://github.com/github/spec-kit)
- [SpecWeave Quickstart](/docs/guides/getting-started/quickstart)
- [Living Documentation Guide](/docs/guides/intelligent-living-docs-sync)
- [External Tool Sync](/docs/guides/external-tool-sync)
- [Multi-Project Setup](/docs/guides/multi-project-setup)
