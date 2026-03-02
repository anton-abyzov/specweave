---
sidebar_position: 3
title: "Skills-First Architecture"
description: "Why SpecWeave follows Anthropic's recommended layered architecture: Models → Agents → Skills — and what it means for how you build"
keywords: [skills, agents, models, architecture, anthropic hierarchy, skill-creator, design pattern]
---

# Skills-First Architecture

Anthropic's recommended architecture for building on Claude follows a clear layered hierarchy. SpecWeave has implemented this pattern from the start. This page explains the architecture, why it matters, and how to apply it when building custom skills.

---

## The Three Layers

Think of AI-assisted development as three concentric layers, each building on the one below:

```
┌──────────────────────────────────────────────────────┐
│                      SKILLS                          │
│  User-facing workflows with clear triggers           │
│  and outcomes. Users invoke skills by name.           │
│                                                      │
│    ┌──────────────────────────────────────────┐      │
│    │                AGENTS                    │      │
│    │  Tool orchestration, context management, │      │
│    │  permissions. Skills compose agents       │      │
│    │  internally as implementation details.    │      │
│    │                                          │      │
│    │    ┌──────────────────────────────┐      │      │
│    │    │           MODELS             │      │      │
│    │    │  Raw capability: Claude       │      │      │
│    │    │  Opus, Sonnet, Haiku          │      │      │
│    │    └──────────────────────────────┘      │      │
│    │                                          │      │
│    └──────────────────────────────────────────┘      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

| Layer | Analogy | What It Means |
|-------|---------|---------------|
| **Models** | Processors | Raw capability — Claude Opus, Sonnet, Haiku |
| **Agents** | Operating systems | Tool orchestration, context management, permissions |
| **Skills** | Applications | User-facing workflows with clear triggers and outcomes |

The key insight: **users interact with Skills, not Agents.** Agents are internal plumbing that Skills use to get work done.

---

## The Pattern: Skills Compose Agents Internally

Anthropic's own `skill-creator` (the reference implementation for building skills) demonstrates this pattern directly:

```
skill-creator/
├── SKILL.md              ← The skill (user-facing contract)
├── agents/
│   ├── grader.md         ← Agent embedded inside the skill
│   ├── analyzer.md       ← Another embedded agent
│   └── comparator.md     ← Another embedded agent
├── scripts/              ← Deterministic helpers
├── references/           ← Context docs
└── eval-viewer/          ← Bundled tooling
```

The user invokes the **skill**. The skill internally spawns **agents** (grader, analyzer, comparator) as implementation details. The user never thinks about agents — they think about "create a skill" and the skill handles orchestration.

This is the canonical pattern: **the `agents/` subdirectory inside a skill contains agents that the skill owns and orchestrates.**

---

## How SpecWeave Implements This

Every SpecWeave `/sw:*` command follows the Skills-first pattern:

### `/sw:do` — Execute increment tasks

The user says `/sw:do`. The skill internally spawns implementation agents to work through tasks, run tests, and update progress.

### `/sw:team-lead` — Orchestrate parallel development

The user says `/sw:team-lead`. The skill spawns domain-specialized agents (frontend, backend, testing, database) that work in parallel across worktrees.

### `/sw:increment` — Plan a feature

The user says `/sw:increment "Add user auth"`. The skill spawns a PM agent, then an Architect agent, then a Tech Lead agent — each producing their part of the spec.

### `/sw:grill` — Code review

The user says `/sw:grill`. The skill runs three parallel review agents examining quality, security, and maintainability.

### `/sw:judge-llm` — Independent validation

The user says `/sw:judge-llm`. The skill spawns an evaluator agent using extended thinking for thorough, independent assessment.

**The user never configures or thinks about the agents.** They invoke skills. Skills handle agent orchestration.

```
┌─────────────────────────────────────────────────────────┐
│  USER                                                   │
│                                                         │
│  /sw:team-lead "Build checkout flow"                    │
│         │                                               │
│         ▼                                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │  SKILL: sw:team-lead                            │    │
│  │  (user sees this abstraction)                   │    │
│  │                                                 │    │
│  │  Internally spawns:                             │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐       │    │
│  │  │ Frontend │ │ Backend  │ │ Testing  │       │    │
│  │  │ Agent    │ │ Agent    │ │ Agent    │       │    │
│  │  └──────────┘ └──────────┘ └──────────┘       │    │
│  │  (implementation details — user doesn't see)    │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Result: Checkout flow implemented, tested, reviewed    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Why Skills-First Matters

### For users

You don't need to understand agent configuration, context management, or model selection. You say what you want — `/sw:do`, `/sw:grill`, `/sw:increment` — and the skill handles everything.

This is why SpecWeave's tagline works: *"Skills Are Programs in English."* You invoke a program. The program runs agents internally. You get results.

### For skill authors

When building custom skills, design from the **user's perspective**:

1. **What does the user want to accomplish?** That's your skill.
2. **What sub-tasks are needed?** Those are your agents.
3. **What model capabilities matter?** That's your model selection per agent.

The user should never need to know how many agents your skill uses, what models they run on, or how they coordinate. Those are implementation details.

### For teams

Skills-first architecture means:
- **Consistent interfaces** — every workflow is a skill with the same invocation pattern
- **Upgradeable internals** — swap agents, change models, add parallelization without changing the user-facing API
- **Composable workflows** — skills can invoke other skills, building complex workflows from simple building blocks

---

## Building Skills with Embedded Agents

To build a skill that internally uses agents, follow the `agents/` subdirectory convention:

### Directory structure

```
my-skill/
├── SKILL.md              # Main instructions (user-facing contract)
├── agents/
│   ├── researcher.md     # Agent: gathers context
│   ├── implementer.md    # Agent: writes code
│   └── reviewer.md       # Agent: validates output
├── scripts/
│   └── validate.sh       # Deterministic helpers
└── templates/
    └── output.md         # Output format template
```

### Agent definition (`agents/researcher.md`)

```yaml
---
name: researcher
description: Gathers context and analyzes requirements before implementation
model: sonnet
tools: Read, Grep, Glob, WebSearch
---

# Researcher Agent

You are a research specialist. Your job:

1. Read the relevant source files
2. Identify existing patterns and conventions
3. Analyze requirements against current architecture
4. Report findings to the parent skill

## Output format

Provide a structured summary:
- **Files examined**: list of files read
- **Patterns found**: conventions to follow
- **Risks identified**: potential issues
- **Recommendation**: approach to take
```

### Skill referencing agents (`SKILL.md`)

```yaml
---
name: my-workflow
description: Execute a research-implement-review workflow
allowed-tools: Read, Write, Edit, Bash, Agent
model: opus
---

# My Workflow Skill

When the user invokes this skill:

## Step 1: Research
Spawn the `researcher` agent to gather context. Wait for findings.

## Step 2: Implement
Based on research findings, spawn the `implementer` agent
with the context provided.

## Step 3: Review
Spawn the `reviewer` agent to validate the implementation.
If issues found, fix them directly.

## Step 4: Report
Summarize what was done and present results to the user.
```

### Key principles

| Principle | Description |
|-----------|-------------|
| **Agents are invisible** | The user invokes the skill, not individual agents |
| **Agents are disposable** | Swap, add, or remove agents without changing the user API |
| **Agents are focused** | Each agent does one thing well (research, implement, review) |
| **Model selection per agent** | Use `opus` for critical decisions, `sonnet` for bulk work, `haiku` for fast checks |
| **Tool restrictions per agent** | Read-only agents can't modify files. Implementation agents get `Write` and `Edit`. |

---

## Skills vs Agents: Decision Framework

When designing a new workflow, ask:

| Question | If Yes → | If No → |
|----------|----------|---------|
| Does the user invoke this directly? | **Skill** | Agent |
| Does it need auto-activation on keywords? | **Skill** | Agent |
| Does it run in isolated context? | **Agent** (spawned by a skill) | Skill (main context) |
| Is it an implementation detail of something larger? | **Agent** | Skill |
| Should the user configure its behavior? | **Skill** (with `skill-memories/`) | Agent |

The simple test: **if a user would say "I want to [X]", then [X] is a skill.** If [X] is a step inside a larger workflow, it's an agent.

---

## Real-World Examples

### Simple skill (no agents)

A domain expertise skill that provides guidance in the main conversation:

```yaml
---
name: sql-optimizer
description: SQL optimization and query performance tuning expert
model: sonnet
---

# SQL Optimizer

When analyzing SQL queries:
1. Check for missing indexes
2. Identify N+1 query patterns
3. Suggest query rewrites for performance
...
```

No agents needed — the skill provides expertise directly.

### Complex skill (multiple agents)

A workflow skill that coordinates several specialists:

```
sw:increment/
├── SKILL.md          # Orchestrates the planning workflow
├── agents/
│   ├── pm.md         # Product Manager: writes user stories
│   ├── architect.md  # Architect: designs technical approach
│   └── planner.md    # Planner: breaks down into tasks
└── templates/
    ├── spec.md       # Spec template
    ├── plan.md       # Plan template
    └── tasks.md      # Tasks template
```

The user says `/sw:increment "user auth"`. The skill spawns PM → Architect → Planner in sequence, each building on the previous agent's output. The user sees a complete spec, plan, and task breakdown.

---

## Summary

| Concept | Role |
|---------|------|
| **Models** | Raw AI capability (Opus, Sonnet, Haiku) |
| **Agents** | Internal workers that skills spawn for isolated tasks |
| **Skills** | User-facing programs that orchestrate agents |

**The rule**: Build Skills, not Agents. Users invoke skills. Skills compose agents internally. Agents are implementation details that can be swapped, upgraded, and parallelized without changing the user experience.

SpecWeave has followed this pattern since day one — every `/sw:*` command is a skill. When `/sw:team-lead` spawns 5 parallel agents across frontend, backend, and testing domains, you didn't build those agents. You invoked a skill.

---

## Further Reading

- [Skills Are Programs in English](/docs/overview/skills-as-programs) — Why skills are programs, not prompts
- [Skills, Plugins & Marketplaces](/docs/skills/fundamentals) — How skills, plugins, and marketplaces relate
- [Claude Code Architecture](/docs/overview/claude-code-architecture) — Technical component reference
- [Extensible Skills Standard](/docs/skills/extensible/) — How to customize skills for your project
- [Development Guidelines](/docs/skills/extensible/skill-development-guidelines) — Writing effective skills
