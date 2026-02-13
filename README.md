# SpecWeave

**The spec-driven skill layer for AI coding agents.** Program your AI in English. Ship features while you sleep.

*First-class support for Claude Code — compatible with any LLM-powered coding tool.*

[![NPM Version](https://img.shields.io/npm/v/specweave?color=brightgreen)](https://www.npmjs.com/package/specweave)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Test & Validate](https://github.com/anton-abyzov/specweave/actions/workflows/test.yml/badge.svg?branch=develop)](https://github.com/anton-abyzov/specweave/actions/workflows/test.yml)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white)](https://discord.gg/UYg4BGJ65V)

```bash
npm install -g specweave   # Requires Node.js 20.12.0+
```

---

## What Are Skills?

**Skills are programs written in English** — not prompts, not templates, but reusable logic that controls how AI thinks, decides, and acts.

```
Without SpecWeave:                          With SpecWeave:
─────────────────                           ───────────────
"Use React Hook Form with Zod..."           /sw:increment "Add login form"
"Remember, we use Tailwind..."              /sw:auto
"Don't forget the test pattern..."          # AI already knows your patterns.
"Wait, I told you this yesterday..."        # It remembered from last time.
```

Each skill is a **programmable AI behavior** you can customize without forking. Fix once, remembered permanently. 100+ skills ship out of the box — PM, Architect, QA, Security, DevOps, Frontend, Backend, Mobile, ML.

**You don't need to learn Claude Code docs.** SpecWeave handles hooks, plugins, CLAUDE.md, and context management for you. Install, describe your feature, skills do the rest.

---

## The Workflow

```
You: "Build me a checkout flow with Stripe"
  ↓
SpecWeave PM: asks 5-10 clarifying questions
  (What payment methods? Guest checkout? Subscriptions? Which UI library?)
  ↓
Creates: spec.md → plan.md → tasks.md
  ↓
/sw:auto — autonomous execution for hours
  (writes code, runs tests, fixes failures, syncs to GitHub/JIRA)
  ↓
You wake up. Review finished work.
  Tests cover technical correctness. You check the UI and UX.
  ↓
/sw:done — validated, documented, shipped.
```

**Solo developer:**
```bash
/sw:increment "User authentication"   # AI interviews you, creates spec + plan + tasks
/sw:auto                               # Go to sleep. AI builds it.
/sw:done 0001                          # Review and ship in the morning.
```

**Agent team (parallel):**
```bash
/sw:team-lead "E-commerce MVP"         # Splits into auth, payments, catalog
# 3 agents run /sw:auto in iTerm/tmux panes simultaneously
```

**Brownfield project:**
```bash
/sw:increment "Migrate checkout to React"  # Analyzes existing code first
/sw:auto --tdd                             # TDD-first, strangler fig pattern
```

---

## Why SpecWeave?

AI coding agents are powerful individually. Run three of them on the same codebase and you get conflicts, duplicated work, and zero traceability.

SpecWeave solves this with **file-based coordination**:

```
.specweave/increments/0001-oauth/
├── spec.md    ← WHAT: User stories, acceptance criteria
├── plan.md    ← HOW: Architecture decisions, tech choices
└── tasks.md   ← DO: Implementation tasks with tests
```

### Three Pillars

**Programmable AI** — Skills are programs in English. Customize any skill's behavior via `skill-memories/*.md` without forking. Your rules override defaults. Original skills keep getting updates.

**Autonomous Teams** — Run agent swarms across iTerm/tmux panes. Each agent owns an increment. File-based coordination prevents conflicts. Work on auth, payments, and notifications simultaneously.

**Enterprise Ready** — Compliance audit trails in git. Brownfield analysis for legacy code. Bidirectional sync with GitHub, JIRA, Azure DevOps. Multi-repo coordination. Production-grade from day one.

---

## Agent Swarms

Run multiple AI agents on the same repository — locally, in the cloud, or with [OpenClaw](https://openclaw.ai). Each agent owns an isolated increment. No conflicts.

```
iTerm2 / tmux split panes:
┌──────────────────┬──────────────────┬──────────────────┐
│  Agent 1 (auth)  │ Agent 2 (payments)│ Agent 3 (catalog)│
│  /sw:auto        │  /sw:auto         │  /sw:auto        │
│  ████████░░ 80%  │  ██████░░░░ 60%   │  ████░░░░░░ 40%  │
└──────────────────┴──────────────────┴──────────────────┘
```

`/sw:team-lead "feature"` splits work → each agent runs `/sw:auto` → quality gates ensure consistency → progress syncs to GitHub/JIRA.

**[Full agent teams guide](https://spec-weave.com/docs/guides/agent-teams-and-swarms)**

---

## Enterprise Ready

SpecWeave is built for the reality of enterprise development.

- **Compliance audit trails** — every decision tracked in version-controlled spec files. SOC 2, HIPAA, FDA ready.
- **Brownfield excellence** — automated codebase analysis, strangler fig migrations, knowledge preservation. 90%+ of enterprise work is brownfield.
- **Multi-repo coordination** — specs reference cross-repo dependencies. Agent teams work across repositories.
- **External sync** — GitHub Issues, JIRA, Azure DevOps — bidirectional, real-time. Local-first, works offline.
- **Multi-environment** — dev, QA, staging, UAT, production deployment pipelines.

**[Enterprise documentation](https://spec-weave.com/docs/enterprise)**

---

## Extensible Skills (Open/Closed Principle)

**Customize any skill without forking.**

```bash
# First time
You: "Generate a login form"
Claude: *creates form with useState*
You: "No, we always use React Hook Form + Zod"

# SpecWeave learns this → .specweave/skill-memories/frontend.md

# Next session — any agent, any skill
You: "Generate a signup form"
Claude: *automatically uses React Hook Form + Zod*
```

| Traditional Tools | SpecWeave Skills |
|------------------|------------------|
| Obfuscated behavior | Transparent SKILL.md |
| Can't customize | Extend via skill-memories |
| Vendor lock-in | You control the logic |
| Suggestions only | Programmable reasoning |

**Enable auto-learning:**
```bash
/sw:reflect-on       # Corrections become permanent knowledge
/sw:reflect-status   # See what Claude has learned
```

**[Skills deep dive](https://spec-weave.com/docs/overview/skills-as-programs)** | **[Skill development guidelines](https://spec-weave.com/docs/guides/skill-development-guidelines)**

---

## Install

```bash
npm install -g specweave
cd your-project
specweave init .
```

Then in Claude Code:
```bash
/sw:increment "Add dark mode"   # Describe your feature
/sw:auto                        # Ship while you sleep
```

> **Node.js 20.12.0+** required (22 LTS recommended). Getting `SyntaxError`? [Upgrade instructions](https://spec-weave.com/docs/guides/troubleshooting/common-errors#node-version-error).

---

## Core Commands

| Command | Purpose |
|---------|---------|
| `/sw:increment "feature"` | Create spec + plan + tasks |
| `/sw:auto` | Autonomous execution |
| `/sw:do` | Execute one task at a time |
| `/sw:grill` | Code review before close |
| `/sw:done` | Close with quality validation |
| `/sw:progress-sync` | Push to GitHub / JIRA / ADO |
| `/sw:next` | Auto-close + suggest next |

**[Full command reference](https://spec-weave.com/docs/commands/overview)**

---

## Integrations

| Platform | What Syncs |
|----------|-----------|
| **GitHub** | Issues, PRs, milestones — bidirectional |
| **JIRA** | Epics, stories, status |
| **Azure DevOps** | Work items, area paths |

When you close an increment, external tools update automatically.

---

## How It Compares

| Capability | SpecWeave | BMAD Method | GitHub SpecKit |
|------------|-----------|-------------|----------------|
| **Parallel agent coordination** | Increment-scoped isolation | No | No |
| **Autonomous execution** | Hours of unattended `/sw:auto` | No | No |
| **Agent swarms (iTerm/tmux)** | Visual parallel monitoring | No | No |
| **Quality gates** | Code Grill before every release | No | No |
| **Living documentation** | Auto-updated after every task | Manual | Manual |
| **Self-improving AI** | Learns from corrections | No | No |
| **Enterprise compliance** | SOC 2, HIPAA, FDA audit trails | No | No |
| **External sync** | GitHub / JIRA / ADO bidirectional | No | No |
| **Brownfield support** | Analyzer + migration patterns | No | No |
| **Specialized skills** | 100+ (PM, QA, DevOps, ML...) | 21 agents | None |
| **Spec/plan/tasks workflow** | Yes | Yes | Yes |
| **Agent-agnostic** | Claude Code + OpenClaw + Copilot + Codex | Multi-IDE | Multi-IDE |

---

## Built With SpecWeave

> SpecWeave builds itself. Every feature, bug fix, and release is spec-driven.

**[Browse increments](https://github.com/anton-abyzov/specweave/tree/develop/.specweave/increments)** — see how SpecWeave develops SpecWeave.

---

## Documentation

**[spec-weave.com](https://spec-weave.com)** — guides, examples, and full reference.

## Community

[Discord](https://discord.gg/UYg4BGJ65V) · [YouTube](https://www.youtube.com/@antonabyzov) · [GitHub Issues](https://github.com/anton-abyzov/specweave/issues)

## License

MIT — [github.com/anton-abyzov/specweave](https://github.com/anton-abyzov/specweave)
