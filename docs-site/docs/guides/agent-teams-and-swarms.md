---
sidebar_position: 21
title: Agent Teams & Swarms
description: Coordinate parallel AI agents with SpecWeave — team orchestration, task delegation, and merge strategies
keywords: [agent teams, agent swarms, parallel development, multi-agent, OpenClaw, Claude Code, orchestration]
---

# Agent Teams & Swarms

SpecWeave turns multiple AI agents into a coordinated development team. Whether you're running Claude Code sessions, OpenClaw instances, GitHub Copilot, or Codex — SpecWeave's increment files are the coordination layer.

---

## Lifecycle at a Glance

The full agent team lifecycle maps directly to six SDK primitives:

```
  TeamCreate      TaskCreate (x3)    Spawn Agents     Work in Parallel       Shutdown        TeamDelete
      ●──────────────●──────────────────●──────────────────●──────────────────●──────────────────●
      │              │                  │                  │                  │                  │
  team_create    task_create       agent_spawn        agent_work        agent_shutdown      team_delete
      │              │                  │            ┌─────┴─────┐           │                  │
      │              │                  │            │  Agent 1  │           │                  │
      │              │                  │            │  Agent 2  │           │                  │
      │              │                  │            │  Agent 3  │           │                  │
      │              │                  │            └───────────┘           │                  │
      │              │                  │                                    │                  │
      ▼              ▼                  ▼                 ▼                  ▼                  ▼
   SpecWeave:     SpecWeave:        SpecWeave:       SpecWeave:         SpecWeave:         SpecWeave:
   /sw:team-      /sw:increment     Task tool        /sw:auto           /sw:grill          /sw:team-
   orchestrate    (one per domain)  (background)     (per agent)        (per increment)    merge
```

**Each phase in plain English:**
1. **TeamCreate** — `/sw:team-orchestrate "feature"` analyzes your feature, identifies domains (frontend, backend, shared)
2. **TaskCreate (x3)** — Creates one increment per domain, each with its own spec, plan, and tasks
3. **Spawn Agents** — Launches parallel agents via Task tool (background), each with domain expertise
4. **Work in Parallel** — Agents run `/sw:auto` independently on their own increments, no file overlap
5. **Shutdown** — Each agent runs `/sw:grill` quality gates before completing
6. **TeamDelete** — `/sw:team-merge` merges work in dependency order, syncs to GitHub/JIRA, cleans up state

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SPECWEAVE AGENT TEAM ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐                                                        │
│  │   YOU        │  /sw:team-orchestrate "Build e-commerce checkout"      │
│  │  (Human)     │                                                        │
│  └──────┬──────┘                                                        │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │                    ORCHESTRATOR                                │       │
│  │  Analyzes feature → Splits into domains → Creates increments  │       │
│  │  Assigns agents → Declares file ownership → Launches swarm    │       │
│  └──────────────────────────┬───────────────────────────────────┘       │
│                              │                                           │
│           ┌──────────────────┼──────────────────┐                       │
│           │                  │                  │                        │
│           ▼                  ▼                  ▼                        │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐              │
│  │  AGENT 1       │ │  AGENT 2       │ │  AGENT 3       │              │
│  │  Frontend      │ │  Backend       │ │  Shared/DB     │              │
│  │  ────────────  │ │  ────────────  │ │  ────────────  │              │
│  │  Skill:        │ │  Skill:        │ │  Skill:        │              │
│  │  frontend-     │ │  database-     │ │  general-      │              │
│  │  architect     │ │  optimizer     │ │  purpose       │              │
│  │                │ │                │ │                │              │
│  │  Increment:    │ │  Increment:    │ │  Increment:    │              │
│  │  0042-ui       │ │  0043-api      │ │  0044-schema   │              │
│  │                │ │                │ │                │              │
│  │  Files:        │ │  Files:        │ │  Files:        │              │
│  │  src/ui/*      │ │  src/api/*     │ │  src/shared/*  │              │
│  │  tests/ui/*    │ │  tests/api/*   │ │  tests/shared/*│              │
│  └────────┬───────┘ └────────┬───────┘ └────────┬───────┘              │
│           │                  │                  │                        │
│           └──────────────────┼──────────────────┘                       │
│                              │                                           │
│                              ▼                                           │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │                .specweave/ (SHARED STATE)                      │       │
│  │                                                                │       │
│  │  state/parallel/session.json    ← Active session metadata     │       │
│  │  state/parallel/agents/         ← Per-agent progress          │       │
│  │  increments/0042-ui/tasks.md    ← Agent 1's task list         │       │
│  │  increments/0043-api/tasks.md   ← Agent 2's task list         │       │
│  │  increments/0044-schema/tasks.md← Agent 3's task list         │       │
│  │                                                                │       │
│  └──────────────────────────────────────────────────────────────┘       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## The Three Primitives

Agent coordination requires three capabilities: managing teams, managing tasks, and communication. Here's how SpecWeave implements each:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    AGENT TEAM PRIMITIVES                                  │
├────────────────────┬────────────────────┬───────────────────────────────┤
│                    │                    │                                │
│   TEAM MGMT        │   TASK MGMT        │   COMMS                       │
│   ─────────        │   ─────────        │   ─────                       │
│                    │                    │                                │
│   /sw:team-        │   /sw:increment    │   .specweave/state/           │
│   orchestrate      │   Create scoped    │   parallel/session.json       │
│   Plan & launch    │   work units       │   Shared state file           │
│   parallel agents  │                    │   for all agents              │
│                    │   /sw:do /sw:auto  │                                │
│   /sw:team-status  │   Execute tasks    │   tasks.md                    │
│   Monitor all      │   within scope     │   Progress visible            │
│   agent progress   │                    │   to all agents               │
│                    │   /sw:progress     │                                │
│   /sw:team-merge   │   Track completion │   /sw:grill                   │
│   Merge completed  │   per increment    │   Quality feedback            │
│   work in order    │                    │   shared across team          │
│                    │                    │                                │
├────────────────────┴────────────────────┴───────────────────────────────┤
│                                                                          │
│   HOW IT MAPS TO AGENT SDK PRIMITIVES:                                  │
│                                                                          │
│   TeamCreate  → /sw:team-orchestrate (creates session + agents)         │
│   Task        → Task tool with run_in_background: true                  │
│   TeamDelete  → /sw:team-merge (cleanup after completion)               │
│   TaskCreate  → /sw:increment (creates scoped work unit)                │
│   TaskList    → /sw:team-status (lists all agent tasks)                 │
│   TaskGet     → /sw:progress (gets specific increment progress)         │
│   TaskUpdate  → Edit tasks.md (mark tasks complete)                     │
│   SendMessage → Shared .specweave/state/ files (file-based comms)       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## How It Works

### Step 1: Orchestrate

Describe a feature. The orchestrator analyzes it, identifies domains (frontend, backend, database, DevOps), and creates one increment per domain:

```bash
/sw:team-orchestrate "Add user checkout with Stripe payments"
```

The orchestrator:
1. **Analyzes the feature** — what domains does it touch?
2. **Creates increments** — one per domain, with focused specs and tasks
3. **Declares file ownership** — prevents two agents editing the same file
4. **Spawns agents** — each with domain-specific expertise

### Step 2: Execute in Parallel

Each agent runs autonomously on its increment:

```
┌───────────────────────────────────────────────────────────────────┐
│                    PARALLEL EXECUTION TIMELINE                     │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  t=0    ┌─────────────────────────────────────────────────────┐   │
│         │  Agent 3 (Shared): 0044-schema                       │   │
│         │  Creating DB models, shared types, migrations        │   │
│  t=2h   └──────────────────────────┬──────────────────────────┘   │
│                                     │ DONE → triggers parallel    │
│  t=2h   ┌──────────────────────────┴──────────────────────┐      │
│         │  Agent 1 (Frontend)  ║  Agent 2 (Backend)        │      │
│         │  0042-ui             ║  0043-api                  │      │
│         │  React components    ║  Express endpoints         │      │
│         │  Stripe Elements     ║  Stripe webhook handlers   │      │
│  t=6h   └──────────────────────────────────────────────────┘      │
│                                                                    │
│  t=0h ──── t=2h ──── t=4h ──── t=6h                              │
│  ████████ shared                                                   │
│           ████████████████ frontend (parallel)                     │
│           ████████████████ backend  (parallel)                     │
│                                                                    │
│  RESULT: 6 hours total (vs 10 hours sequential = 40% faster)     │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

### Step 3: Monitor

Check progress across all agents at any time:

```bash
/sw:team-status

# ┌───────────────────────────────────────────────────────────┐
# │  PARALLEL SESSION: checkout-feature                        │
# │  Started: 2026-02-09 10:00                                │
# ├───────────────┬──────────┬──────────┬────────────────────┤
# │  Agent        │  Tasks   │ Progress │ Status             │
# ├───────────────┼──────────┼──────────┼────────────────────┤
# │  shared/db    │  5/5     │ 100%     │ ✅ completed       │
# │  frontend     │  6/8     │  75%     │ 🔄 running         │
# │  backend      │  4/7     │  57%     │ 🔄 running         │
# └───────────────┴──────────┴──────────┴────────────────────┘
```

### Step 4: Merge

When all agents complete, merge their work in dependency order:

```bash
/sw:team-merge
```

The merge skill:
1. **Verifies all agents completed** — won't merge partial work
2. **Determines merge order** — shared → backend → frontend (respects dependencies)
3. **Handles conflicts** — lists conflicting files and owning agents, lets you choose resolution
4. **Triggers sync** — pushes each increment to GitHub/JIRA
5. **Cleans up** — removes parallel session state

---

## Agent Types and Expertise

SpecWeave assigns domain-specific expertise to each agent:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    AGENT SPECIALIZATION                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Domain        Skill Assigned              Expertise                    │
│   ──────        ──────────────              ─────────                    │
│   frontend      sw-frontend:frontend-arch   React, Vue, Next.js, CSS    │
│   backend       sw-backend:database-opt     Node, Express, APIs, SQL    │
│   database      sw-backend:database-opt     Migrations, schemas, ORM    │
│   devops        sw-infra:devops             Docker, K8s, CI/CD, IaC     │
│   qa            sw-testing:qa-engineer      Playwright, Vitest, E2E     │
│   general       general-purpose             Versatile, any task         │
│                                                                          │
│   All agents use: Claude Opus 4.6 for maximum reasoning capability      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## File Ownership — Preventing Conflicts

The critical safety mechanism: each agent declares which files it owns.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FILE OWNERSHIP MAP                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Agent 1 (Frontend)           Agent 2 (Backend)                        │
│   OWNS:                        OWNS:                                    │
│   ├── src/components/*         ├── src/api/*                            │
│   ├── src/pages/*              ├── src/middleware/*                      │
│   ├── src/hooks/*              ├── src/services/*                       │
│   ├── src/styles/*             ├── src/models/*                         │
│   └── tests/frontend/*        └── tests/api/*                          │
│                                                                          │
│   Agent 3 (Shared)             SHARED (read-only for agents 1 & 2):    │
│   OWNS:                        ├── src/types/*                          │
│   ├── src/types/*              ├── src/utils/*                          │
│   ├── src/utils/*              └── package.json                         │
│   ├── prisma/schema.prisma                                              │
│   └── tests/shared/*                                                    │
│                                                                          │
│   RULE: An agent can READ any file but only WRITE to files it owns.     │
│   This prevents merge conflicts and uncoordinated changes.              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Two Execution Modes

SpecWeave supports two approaches to running agent teams, depending on your environment:

### Mode 1: Subagent-Based (Current — Works Everywhere)

Uses Claude Code's Task tool to spawn background agents. Works with any Claude Code version:

```bash
# Orchestrator spawns agents via Task tool
Task({
  subagent_type: "general-purpose",
  prompt: "Work on increment 0042-ui. Follow tasks.md...",
  run_in_background: true
})
```

**How it works:**
- Orchestrator creates increments and spawns agents as background tasks
- Each agent runs in its own context with domain-specific instructions
- State is tracked in `.specweave/state/parallel/session.json`
- Heartbeat monitoring detects zombie agents (5-minute timeout)

### Mode 2: Native Agent Teams (Experimental — Claude Agent SDK)

When `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set, SpecWeave uses the native Agent Teams API:

```
┌─────────────────────────────────────────────────────────────────────────┐
│               NATIVE AGENT TEAMS (EXPERIMENTAL)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  The Claude Agent SDK provides first-class team primitives:             │
│                                                                          │
│  TEAM MGMT                TASK MGMT              COMMS                  │
│  ─────────                ─────────              ─────                  │
│  ┌──────────────┐        ┌──────────────┐       ┌──────────────┐       │
│  │ TeamCreate   │        │ TaskCreate   │       │ SendMessage  │       │
│  │ Create team  │        │ Create task  │       │ Agent-to-    │       │
│  └──────────────┘        └──────────────┘       │ agent comms  │       │
│  ┌──────────────┐        ┌──────────────┐       └──────────────┘       │
│  │ Task         │        │ TaskList     │                               │
│  │ Manage tasks │        │ List tasks   │                               │
│  └──────────────┘        └──────────────┘                               │
│  ┌──────────────┐        ┌──────────────┐                               │
│  │ TeamDelete   │        │ TaskGet      │                               │
│  │ Remove team  │        │ Get details  │                               │
│  └──────────────┘        └──────────────┘                               │
│                          ┌──────────────┐                               │
│                          │ TaskUpdate   │                               │
│                          │ Update task  │                               │
│                          └──────────────┘                               │
│                                                                          │
│  ADVANTAGES over subagent mode:                                         │
│  • Native peer-to-peer messaging between agents                         │
│  • Structured task delegation with status tracking                      │
│  • Team lifecycle managed by the SDK                                    │
│  • Better error handling and recovery                                   │
│                                                                          │
│  ENABLE: export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

SpecWeave automatically detects which mode is available and uses the best option.

---

## Works With Any AI Tool

The coordination layer is file-based markdown. While Claude Code gets the deepest integration (skills, hooks, autonomous mode), any AI tool can participate:

| Tool | Role in Swarm | Integration Depth |
|------|---------------|-------------------|
| **Claude Code** | Full orchestration, autonomous execution, quality gates | Deep (100+ skills) |
| **OpenClaw** | Reads specs/tasks, executes within scope, local memory | Medium (file-based) |
| **GitHub Copilot** | Follows specs as context, implements within scope | Light (reads markdown) |
| **Codex** | Reads increment files, implements tasks | Light (reads markdown) |
| **Cursor / Windsurf** | Any AI IDE reads the same spec/task files | Light (reads markdown) |

The key insight: the `.specweave/increments/` directory is a **universal coordination protocol**. Spec files define what to build. Task files track progress. Any tool that reads markdown can participate.

---

## Quick Start

```bash
# 1. Orchestrate — split a feature across agents
/sw:team-orchestrate "Add user dashboard with real-time analytics"

# 2. Monitor — check progress across all agents
/sw:team-status

# 3. Merge — combine completed work in dependency order
/sw:team-merge
```

---

## Security Considerations

Running multiple agents amplifies security risks. See [Agent Security Best Practices](./agent-security-best-practices) for:
- Plugin vetting before installation
- File ownership prevents unauthorized modifications
- Quality gates apply equally to all agents
- Credential scoping per agent
- Review before merging agent-generated code

---

## Further Reading

- [Agent Security Best Practices](./agent-security-best-practices) — Safe agent swarm operation
- [Multi-Project Setup](./multi-project-setup) — Coordinate multiple repositories
- [Auto Mode](../commands/auto) — Autonomous execution deep dive
- [Skills vs Agents](/docs/glossary/terms/skills-vs-agents) — Understanding the difference
