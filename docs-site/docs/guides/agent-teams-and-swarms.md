---
sidebar_position: 21
title: Agent Teams & Swarms
description: Coordinate parallel AI agents with SpecWeave — one command to split work across domains, execute in parallel, and merge results
keywords: [agent teams, agent swarms, parallel development, multi-agent, team-lead, orchestration, Claude Code]
---

import CommandTabs from '@site/src/components/CommandTabs';

# Agent Teams & Swarms

One command. Multiple agents. Parallel execution across domains.

SpecWeave's `/sw:team-lead` turns a single feature request into a coordinated multi-agent effort -- splitting work by domain, running agents in parallel, and merging results when done. Built on [Claude Code's Agent Teams capability](https://code.claude.com/docs/en/agent-teams) and made accessible via a single command.

<CommandTabs
  natural="Use a team to build user authentication with login, signup, and OAuth"
  claude='/sw:team-lead "Build user authentication with login, signup, and OAuth"'
  other='team-lead "Build user authentication with login, signup, and OAuth"'
/>

That's it. SpecWeave analyzes the feature, identifies domains (frontend, backend, database), spawns specialized agents, and coordinates their work.

---

## Why Agent Teams?

Sequential development is a bottleneck. When a feature touches frontend, backend, and database — doing them one at a time means the last domain waits for everything else to finish.

```
Sequential:     ████████ db → ████████ backend → ████████ frontend    = 12 hours

Parallel:       ████████ db (shared types)                             = 6 hours
                         ████████ backend  ║  ████████ frontend
```

Agent teams cut delivery time by running independent work streams simultaneously. A feature that takes 12 hours sequentially finishes in 6 with parallel agents.

---

## Quick Start

<CommandTabs
  natural="Use a team to add a user dashboard with real-time analytics"
  claude='/sw:team-lead "Add user dashboard with real-time analytics"'
  other='team-lead "Add user dashboard with real-time analytics"'
/>

Then monitor and merge:
```bash
# 2. Monitor progress across all agents
/sw:team-status

# 3. Merge completed work in dependency order
/sw:team-merge
```

---

## Team-Lead Orchestration

The `/sw:team-lead` skill is the entry point for all multi-agent coordination. It auto-detects what you need and spawns the right team. You can describe a complex feature in natural language, use the slash command in Claude Code, or use the short form in other AI tools.

### Operating Modes

Team-lead adapts to your intent:

| Mode | Trigger | What Happens |
|------|---------|--------------|
| **Brainstorm** | "brainstorm auth approaches" | Spawns agents with different perspectives, each explores independently |
| **Plan** | "plan the checkout flow" | PM + Architect agents work in parallel on specs and design |
| **Implement** | "build user auth" | Domain agents (frontend, backend, db) execute tasks in parallel |
| **Review** | "review my changes" | Multiple reviewers check code, security, and performance |
| **Research** | "research payment providers" | Agents investigate different options concurrently |
| **Test** | "test the auth flow end-to-end" | Unit, integration, and E2E agents run simultaneously |

The orchestrator selects the mode based on your phrasing. You can also be explicit:

```bash
# Slash command with mode
/sw:team-lead "review the checkout module"    # → review mode
/sw:team-lead "brainstorm onboarding UX"      # → brainstorm mode

# Natural language equivalents
# "Let's brainstorm approaches for onboarding UX"
# "Use a team to build the checkout flow"
# "Review my recent changes with multiple reviewers"
```

---

## How It Works

### Step 1: Orchestrate

Describe a feature. The orchestrator analyzes it, identifies domains, and creates one increment per domain:

```bash
/sw:team-lead "Add user authentication with login, signup, and OAuth"
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
│         │  Agent 1 (Shared): 0042-auth-schema                  │   │
│         │  Creating DB models, shared types, OAuth config      │   │
│  t=1h   └──────────────────────────┬──────────────────────────┘   │
│                                     │ DONE → triggers Phase 2     │
│  t=1h   ┌──────────────────────────┴──────────────────────┐      │
│         │  Agent 2 (Backend)  ║  Agent 3 (Frontend)        │      │
│         │  0043-auth-api      ║  0044-auth-ui               │      │
│         │  Express routes     ║  Login/signup forms          │      │
│         │  JWT middleware     ║  OAuth buttons               │      │
│         │  Session handling   ║  Protected routes            │      │
│  t=4h   └──────────────────────────────────────────────────┘      │
│                                                                    │
│  t=0h ──── t=1h ──── t=2h ──── t=3h ──── t=4h                   │
│  ████████ shared types + schema                                    │
│           ████████████████████████ backend (parallel)              │
│           ████████████████████████ frontend (parallel)             │
│                                                                    │
│  RESULT: 4 hours total (vs 7 hours sequential = 43% faster)      │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

### Step 3: Monitor

Check progress across all agents at any time:

```bash
/sw:team-status

# ┌───────────────────────────────────────────────────────────┐
# │  PARALLEL SESSION: user-auth                               │
# │  Started: 2026-03-15 10:00                                │
# ├───────────────┬──────────┬──────────┬────────────────────┤
# │  Agent        │  Tasks   │ Progress │ Status             │
# ├───────────────┼──────────┼──────────┼────────────────────┤
# │  shared/db    │  4/4     │ 100%     │ ✅ completed       │
# │  backend      │  5/8     │  63%     │ 🔄 running         │
# │  frontend     │  3/6     │  50%     │ 🔄 running         │
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
3. **Handles conflicts** — lists conflicting files and owning agents
4. **Triggers sync** — pushes each increment to GitHub/JIRA
5. **Cleans up** — removes parallel session state

---

## Contract-First Spawning

Agent teams follow a **contract-first** two-phase spawning protocol to prevent dependency conflicts:

```
Phase 1 (sequential):   shared-types → db-schema
                                ↓
Phase 2 (parallel):      backend  |  frontend  |  testing
```

1. **Phase 1 — Upstream agents** run first: shared types, database schemas, and any code that downstream agents depend on. These agents finish and their output is available before Phase 2 begins.
2. **Phase 2 — Downstream agents** run in parallel: backend, frontend, and testing agents spawn concurrently once upstream contracts are in place.

This ensures API types, DB models, and shared utilities are committed before consumers start building against them — no broken imports, no type mismatches.

---

## Agent Communication

Agents communicate through structured messages during execution:

| Message | Direction | Purpose |
|---------|-----------|---------|
| **PLAN_READY** | Agent → Lead | Agent has analyzed its increment and is ready to execute |
| **STATUS** | Agent → Lead | Progress update (tasks completed, blockers found) |
| **COMPLETION** | Agent → Lead | All tasks done, ready for quality gates |
| **BLOCKED** | Agent → Lead | Dependency missing or conflict detected |
| **SHUTDOWN** | Lead → Agents | Graceful shutdown signal |

In **native mode** (Claude Agent SDK), agents use real-time `SendMessage` for peer-to-peer communication. In **subagent mode**, communication happens through shared `.specweave/state/parallel/` files.

---

## File Ownership — Preventing Conflicts

The critical safety mechanism: each agent declares which files it owns.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FILE OWNERSHIP MAP                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Agent 1 (Shared/DB)            Agent 2 (Backend)                      │
│   OWNS:                          OWNS:                                  │
│   ├── src/types/*                ├── src/api/*                          │
│   ├── src/utils/*                ├── src/middleware/*                    │
│   ├── prisma/schema.prisma       ├── src/services/*                     │
│   └── tests/shared/*            └── tests/api/*                        │
│                                                                          │
│   Agent 3 (Frontend)             RULE:                                  │
│   OWNS:                          An agent can READ any file             │
│   ├── src/components/*           but only WRITE to files it owns.       │
│   ├── src/pages/*                This prevents merge conflicts          │
│   ├── src/hooks/*                and uncoordinated changes.             │
│   └── tests/frontend/*                                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Agent Types and Expertise

SpecWeave assigns domain-specific expertise to each agent:

| Domain | Skill Assigned | Expertise |
|--------|---------------|-----------|
| frontend | sw:architect | React, Vue, Next.js, CSS |
| backend | backend:database-optimizer | Node, Express, APIs, SQL |
| database | backend:database-optimizer | Migrations, schemas, ORM |
| devops | infra:devops | Docker, K8s, CI/CD, IaC |
| qa | testing:qa | Playwright, Vitest, E2E |
| reviewer | sw:code-reviewer | Logic, security, types |
| researcher | (built-in template) | Codebase + web research |
| pm | sw:pm | User stories, ACs, specs |
| architect | sw:architect | System design, ADRs |
| general | general-purpose | Versatile, any task |

All agents use Claude Opus 4.6 for maximum reasoning capability.

---

## Example Walkthrough: "Build User Authentication"

Here's what happens when you run:

```bash
/sw:team-lead "Build user authentication with login, signup, and OAuth"
```

**1. Analysis** (10 seconds)

The orchestrator identifies three domains: shared types/schema, backend API, frontend UI.

**2. Increment Creation** (30 seconds)

Three increments are created:
- `0042-auth-schema` — Prisma models, TypeScript types, OAuth provider config
- `0043-auth-api` — Express routes, JWT middleware, OAuth callbacks
- `0044-auth-ui` — Login/signup forms, OAuth buttons, protected route wrapper

**3. Phase 1 — Shared Agent** (runs first)

Agent 1 creates the foundation:
- `User` and `Session` Prisma models
- Shared TypeScript types (`AuthUser`, `LoginRequest`, `OAuthProvider`)
- OAuth configuration helpers
- Database migration

**4. Phase 2 — Backend + Frontend** (run in parallel)

Agent 2 (Backend):
- POST `/api/auth/login`, `/api/auth/signup`
- GET `/api/auth/oauth/:provider/callback`
- JWT token generation and validation middleware
- Session management

Agent 3 (Frontend):
- `<LoginForm>`, `<SignupForm>` components
- `<OAuthButton provider="google|github">` component
- `useAuth()` hook with token management
- `<ProtectedRoute>` wrapper

**5. Quality Gates** (per agent)

Each agent runs `/sw:grill` on its increment before signaling completion.

**6. Merge**

`/sw:team-merge` combines work: schema first, then backend, then frontend. All three increments close.

---

## Two Execution Modes

### Mode 1: Subagent-Based (Default — Works Everywhere)

Uses Claude Code's Task tool to spawn background agents. No extra setup needed:

```bash
# Orchestrator spawns agents via Task tool
Task({
  subagent_type: "general-purpose",
  prompt: "Work on increment 0042-auth-schema...",
  run_in_background: true
})
```

**How it works:**
- Orchestrator creates increments and spawns agents as background tasks
- Each agent runs in its own context with domain-specific instructions
- State tracked in `.specweave/state/parallel/session.json`
- Heartbeat monitoring detects zombie agents (5-minute timeout)

### Mode 2: Native Agent Teams (Claude Agent SDK)

When enabled, SpecWeave uses Claude Code's native Agent Teams API for richer coordination:

```bash
# Enable native teams
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

Or add to `.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

**Advantages over subagent mode:**
- Native peer-to-peer messaging between agents via `SendMessage`
- Structured task delegation with status tracking
- Team lifecycle managed by the SDK (TeamCreate, TaskCreate, TeamDelete)
- Better error handling and recovery

SpecWeave automatically detects which mode is available and uses the best option.

### Terminal Setup (Native Mode)

Native Agent Teams spawn multiple Claude Code processes:

| Strategy | Setup | Notes |
|----------|-------|-------|
| **tmux** (recommended) | `brew install tmux` / `apt install tmux` | Each agent gets its own pane |
| **iTerm2** (macOS) | Built-in split panes | Native macOS experience |
| **In-process** (default) | No setup | Agents run as background tasks |

---

## Team-Build Presets

Use a preset for a pre-configured team shape:

| Preset | Agents Spawned | Use Case |
|--------|---------------|----------|
| `full-stack` | shared, backend, frontend | Feature development across the stack |
| `review` | reviewer, security-auditor | Code review and security analysis |
| `testing` | unit-tester, integration-tester, e2e-tester | Comprehensive test coverage |
| `tdd` | red-agent, green-agent, refactor-agent | Test-driven development cycle |
| `migration` | analyzer, migrator, validator | Codebase migrations and upgrades |

```bash
/sw:team-lead "Add checkout flow" --preset full-stack
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SPECWEAVE AGENT TEAM ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐                                                        │
│  │   YOU        │  /sw:team-lead "Build e-commerce checkout"      │
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
│  │  Shared/DB     │ │  Backend       │ │  Frontend      │              │
│  │  ────────────  │ │  ────────────  │ │  ────────────  │              │
│  │  Increment:    │ │  Increment:    │ │  Increment:    │              │
│  │  0042-schema   │ │  0043-api      │ │  0044-ui       │              │
│  │  Files:        │ │  Files:        │ │  Files:        │              │
│  │  src/types/*   │ │  src/api/*     │ │  src/ui/*      │              │
│  └────────┬───────┘ └────────┬───────┘ └────────┬───────┘              │
│           │                  │                  │                        │
│           └──────────────────┼──────────────────┘                       │
│                              ▼                                           │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │                .specweave/ (SHARED STATE)                      │       │
│  │  state/parallel/session.json    ← Active session metadata     │       │
│  │  state/parallel/agents/         ← Per-agent progress          │       │
│  │  increments/0042-schema/        ← Agent 1's work              │       │
│  │  increments/0043-api/           ← Agent 2's work              │       │
│  │  increments/0044-ui/            ← Agent 3's work              │       │
│  └──────────────────────────────────────────────────────────────┘       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Works With Any AI Tool

The coordination layer is file-based markdown. While Claude Code gets the deepest integration, any AI tool can participate:

| Tool | Role in Swarm | Integration Depth |
|------|---------------|-------------------|
| **Claude Code** | Full orchestration, autonomous execution, quality gates | Deep (~48 built-in skills) |
| **OpenClaw** | Reads specs/tasks, executes within scope | Medium (file-based) |
| **GitHub Copilot** | Follows specs as context, implements within scope | Light (reads markdown) |
| **Codex** | Reads increment files, implements tasks | Light (reads markdown) |
| **Cursor / Windsurf** | Any AI IDE reads the same spec/task files | Light (reads markdown) |

The `.specweave/increments/` directory is a **universal coordination protocol**. Any tool that reads markdown can participate.

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

- [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams) — The inspiration behind SpecWeave's team-lead
- [Agent Security Best Practices](./agent-security-best-practices) — Safe agent swarm operation
- [Multi-Project Setup](./multi-project-setup) — Coordinate multiple repositories
- [Autonomous Execution](./autonomous-execution) — `/sw:auto` deep dive
