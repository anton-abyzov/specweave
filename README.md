# SpecWeave

**The spec-driven Skill Fabric for AI coding agents.** Program your AI in English. Ship features while you sleep.

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
"Use React Hook Form with Zod..."           "Add a login form"
"Remember, we use Tailwind..."              → AI already knows your patterns.
"Don't forget the test pattern..."          → It remembered from last time.
"Wait, I told you this yesterday..."        → Fix once, learned permanently.
```

Each skill is a **programmable AI behavior** you can customize without forking. Fix once, remembered permanently. 100+ skills ship out of the box — PM, Architect, QA, Security, DevOps, Frontend, Backend, Mobile, ML.

**You don't need to learn Claude Code docs.** SpecWeave handles hooks, plugins, CLAUDE.md, and context management for you. Install, describe your feature, skills do the rest.

---

## The Workflow

Just describe what you want. SpecWeave handles the rest.

```
You: "Build me a checkout flow with Stripe"
  ↓
SpecWeave asks 5-10 clarifying questions
  (What payment methods? Guest checkout? Subscriptions? Which UI library?)
  ↓
Creates: spec.md → plan.md → tasks.md
  ↓
You: "Go ahead and build it"
  → autonomous execution for hours
  (writes code, runs tests, fixes failures, syncs to GitHub/JIRA)
  ↓
You wake up. Review finished work.
  Tests cover technical correctness. You check the UI and UX.
  ↓
You: "Looks good, ship it"
  → validated, documented, shipped.
```

**Solo developer:**
```
You: "I need user authentication with OAuth and magic links"
  → SpecWeave interviews you, creates spec + plan + tasks
You: "Build it"
  → AI works autonomously for hours
You: "Ship it"
  → reviewed, validated, done.
```

**Agent team (parallel):**
```
You: "Build an e-commerce MVP"
  → SpecWeave splits into auth, payments, catalog
  → 3 agents work in parallel across iTerm/tmux panes
```

**Brownfield project:**
```
You: "Migrate the checkout page to React"
  → SpecWeave analyzes existing code, plans strangler fig migration
  → TDD-first autonomous execution
```

<details>
<summary><strong>Under the hood</strong> — SpecWeave auto-activates these skills from natural language:</summary>

| You say | SpecWeave runs |
|---------|---------------|
| "Build me X" | `/sw:increment` → spec + plan + tasks |
| "Go ahead" / "Build it" | `/sw:auto` → autonomous execution |
| "Ship it" / "We're done" | `/sw:done` → quality gates + close |
| "Split this into teams" | `/sw:team-lead` → parallel agents |
| "Review the code" | `/sw:grill` → critical code review |

You can also invoke commands directly for fine-grained control.
</details>

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
```
You: "Add dark mode to the app"
→ SpecWeave creates spec, plans architecture, builds it autonomously.
```

> **Node.js 20.12.0+** required (22 LTS recommended). Getting `SyntaxError`? [Upgrade instructions](https://spec-weave.com/docs/guides/troubleshooting/common-errors#node-version-error).

---

## Core Commands

All commands activate automatically from natural language. Use directly for fine-grained control.

| Command | Purpose | Natural trigger |
|---------|---------|----------------|
| `/sw:increment "feature"` | Create spec + plan + tasks | "Build me X" |
| `/sw:auto` | Autonomous execution | "Go ahead and build it" |
| `/sw:do` | Execute one task at a time | "Do the next task" |
| `/sw:grill` | Code review before close | "Review the code" |
| `/sw:done` | Close with quality validation | "Ship it" |
| `/sw:progress-sync` | Push to GitHub / JIRA / ADO | "Sync progress" |
| `/sw:next` | Auto-close + suggest next | "What's next?" |

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
