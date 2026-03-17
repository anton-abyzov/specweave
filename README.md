# SpecWeave

**AI-assisted development, under control.**

Your AI responds to natural language — and now follows a structured, spec-first, quality-gated process every time. Configure your standards once. Every developer, every AI tool, every session enforces them automatically.

*Works with Claude Code, Cursor, Copilot, Codex, Antigravity & any LLM-powered coding tool.*

[![NPM Version](https://img.shields.io/npm/v/specweave?color=brightgreen)](https://www.npmjs.com/package/specweave)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Test & Validate](https://github.com/anton-abyzov/specweave/actions/workflows/test.yml/badge.svg?branch=develop)](https://github.com/anton-abyzov/specweave/actions/workflows/test.yml)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white)](https://discord.gg/UYg4BGJ65V)

```bash
npm install -g specweave   # Requires Node.js 20.12.0+
```

---

## The Problem No Tool Solved

Multi-repository microservices in brownfield codebases — this is the reality for most enterprise teams. Dozens of repos, years of undocumented decisions, existing systems that must be extended and maintained, not replaced.

AI coding tools weren't built for this. They're designed for greenfield, single-repo demos. Cross into enterprise brownfield territory and they fall apart: standards vanish between sessions, parallel agents have no coordination layer, and there's no way to enforce a process consistently across a team.

Nothing on the market solved this. So SpecWeave was built — open source, born from the same frustration.

**Two design decisions make it work:**

**Deterministic configuration** — your standards encoded in version-controlled files. `.specweave/config.json` defines how AI behaves in your project. Every increment carries `metadata.json`, `spec.md`, `plan.md`, `tasks.md`. This is configuration, not prompting — reproducible, auditable, enforced identically for every developer, every agent, every session.

**Context-aware routing** — describe what you want in natural language. SpecWeave reads context and activates the right skill automatically: PM agent for planning, Architect for design, TDD cycle for implementation, Grill for review. No orchestration overhead. No manual tool selection.

This combination makes structured AI development practical at the scale and complexity of real enterprise systems — not just demo apps.

---

## No Commands to Memorize

SpecWeave is not a workflow you switch into. It is a behavior layer that changes how your AI works — installed once, active in every conversation.

When you describe what you want, your AI routes internally to the right skill. You just work naturally:

| You say | Your AI runs — automatically |
|---------|------------------------------|
| "Build me X" / "Let's add Y" | `/sw:increment` → spec + plan + tasks |
| "Go ahead" / "Build it" | `/sw:auto` → autonomous execution |
| "Ship it" / "We're done" | `/sw:done` → quality gates + close |
| "Split this into teams" | `/sw:team-lead` → parallel agents (implement mode) |
| "Brainstorm approaches for X" | `/sw:team-lead` → parallel perspectives (brainstorm mode) |
| "Plan X in parallel" | `/sw:team-lead` → PM + Architect agents (planning mode) |
| "Review the code" | `/sw:code-reviewer` → 6 parallel reviewers |
| "Grill the code" | `/sw:grill` → critical audit before close |

You can also invoke these directly for fine-grained control — but you rarely need to.

---

## What You Control

SpecWeave's behavior is driven by configuration. Define your standards once; every AI interaction in your project enforces them.

```json
// .specweave/config.json
{
  "testing": {
    "defaultTestMode": "TDD",       // AI always follows red-green-refactor
    "tddEnforcement": "strict"      // Tasks cannot close without passing tests
  },
  "quality": {
    "grillRequired": true,          // Code review gate before every close
    "judgeLlmRequired": true        // Independent AI validation gate
  },
  "sync": {
    "github": true,                 // Auto-sync to GitHub Issues / PRs
    "jira": true                    // Bidirectional JIRA sync on close
  }
}
```

This is the difference between **asking** an AI to follow a process and **configuring** it to. No prompting required. No hoping it remembers. The config is the contract.

---

## The Workflow

Just describe what you want. Your AI handles the orchestration.

```
You: "Build me a checkout flow with Stripe"
  ↓
AI asks 5-10 clarifying questions
  (What payment methods? Guest checkout? Subscriptions? Which UI library?)
  ↓
Creates: spec.md → plan.md → tasks.md   ← you review the plan here
  ↓
You: "Go ahead and build it"
  → autonomous execution for hours
  (writes code, runs tests, fixes failures, syncs to GitHub/JIRA)
  ↓
You wake up. Review finished work.
  Tests cover technical correctness. You check the UI and UX.
  ↓
You: "Looks good, ship it"
  → validated, documented, closed.
```

**Solo developer:**
```
You: "I need user authentication with OAuth and magic links"
  → AI interviews you, creates spec + plan + tasks
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

---

## What Are Skills?

**A skill is a `SKILL.md` file with instructions — Claude adds it to its toolkit, uses it automatically when relevant, or you invoke it directly with `/skill-name`.** Each skill packages domain expertise: patterns, rules, and examples that make AI produce consistent, production-grade output instead of generic guesses.

```
Without SpecWeave:                          With SpecWeave:
─────────────────                           ───────────────
"Use React Hook Form with Zod..."           "Add a login form"
"Remember, we use Tailwind..."              → AI already knows your patterns.
"Don't forget the test pattern..."          → It remembered from last time.
"Wait, I told you this yesterday..."        → Fix once, learned permanently.
```

100+ skills ship out of the box — PM, Architect, QA, Security, DevOps, Frontend, Backend, Mobile, ML. Every skill is customizable without forking: write corrections once in `skill-memories/`, and they apply forever across every session and every agent.

**You don't need to learn Claude Code docs.** SpecWeave handles hooks, plugins, CLAUDE.md, and context management for you. Install, describe your feature, skills do the rest.

---

## Why Spec-First?

**The plan is more important than the code.**

AI coding agents are powerful, but without structured planning they produce what practitioners call "slop" — code generated through unstructured chat that creates technical debt from day one. The [Research-Plan-Implement (RPI)](https://www.youtube.com/watch?v=rmvDxxNubIg) methodology demonstrates that **bad plans create orders of magnitude more problems than bad code**. Human review should focus on the plan — the highest-leverage checkpoint where misunderstandings are cheapest to correct.

SpecWeave embodies this principle. Each **increment** is a focused, reviewable unit of work — spec, plan, tasks — that you control through a sprint or external tools (GitHub, JIRA, ADO). As long as the spec and plan are solid, the implementation follows naturally, one step at a time.

The more structure in your workflow, the harder the problems you can solve:

```
Hardest problem          big refactors,              ○  ← /sw:team-lead
you can solve          whole new features                 (multi-agent)
    ↑                                          ○
    │               medium features               ← /sw:brainstorm → /sw:increment → /sw:auto
    │              across repos                 (research + plan + implement)
    │                                    ○
    │           small features              ← /sw:increment → /sw:do
    │          across 3-5 files                (plan + implement)
    │                              ○
    │       small fixes               ← just talk to AI
    │       copy changes                 (no planning)
    └────────────────────────────────────────────→
      just talk     simple plan    research →    multi-phase
      to AI         then work it   plan → impl   agent teams

                 amount of context engineering →
```

SpecWeave solves multi-agent chaos with **file-based coordination**:

```
.specweave/increments/0001-oauth/
├── spec.md    ← WHAT: User stories, acceptance criteria
├── plan.md    ← HOW: Architecture decisions, tech choices
└── tasks.md   ← DO: Implementation tasks with tests
```

### Three Pillars

**Extensible AI** — Skills extend what AI coding agents can do — structured markdown instructions that define how an agent behaves. Customize any skill via `skill-memories/*.md` without forking. Your rules override defaults. Original skills keep getting updates.

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

**[Full agent teams guide](https://verified-skill.com/docs/guides/agent-teams-and-swarms)**

---

## Enterprise Ready

SpecWeave is built for the reality of enterprise development.

- **Compliance audit trails** — every decision tracked in version-controlled spec files. SOC 2, HIPAA, FDA ready.
- **Brownfield excellence** — automated codebase analysis, strangler fig migrations, knowledge preservation. 90%+ of enterprise work is brownfield.
- **Multi-repo coordination** — specs reference cross-repo dependencies. Agent teams work across repositories.
- **External sync** — GitHub Issues, JIRA, Azure DevOps — bidirectional, real-time. Local-first, works offline.
- **Multi-environment** — dev, QA, staging, UAT, production deployment pipelines.

**[Enterprise documentation](https://verified-skill.com/docs/enterprise)**

---

## LSP Code Intelligence

AI agents waste tokens on grep — slow, noisy, full of false positives. SpecWeave ships with **LSP integration** that gives agents semantic understanding of your codebase.

```
                    Grep (text search)          LSP (semantic)
                    ──────────────────          ──────────────
Speed:              69ms                        0.35ms (198x faster)
"read" symbol:      254 matches                 32 references
False positives:    222 noise results            0
```

Grep matches `read`, `readFile`, `readFileSync`, `readdir`, and every comment containing "read". LSP resolves the actual `MetadataManager.read()` calls — nothing else.

![LSP Benchmark Results](docs/assets/lsp-benchmark.png)

**Supported languages:** TypeScript, Python, Go, Rust, Java, C#

**How it works:** SpecWeave starts a language server alongside your agent session. Every "find references", "go to definition", and "show type" query goes through the LSP instead of grep — 198x faster with zero false positives.

```bash
specweave lsp refs src/core/metadata.ts read     # Semantic references
specweave lsp def src/cli/commands/init.ts init   # Go to definition
specweave lsp hover src/core/config.ts Config     # Type information
```

**[LSP documentation](https://verified-skill.com/docs/guides/lsp-code-intelligence)**

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
| Suggestions only | Structured reasoning |

**Enable auto-learning:**
```bash
/sw:reflect-on       # Corrections become permanent knowledge
/sw:reflect-status   # See what Claude has learned
```

**[Skills deep dive](https://verified-skill.com/docs/overview/skills-as-structured-expertise)** | **[Skill development guidelines](https://verified-skill.com/docs/guides/skill-development-guidelines)** | **[Skill generation](https://verified-skill.com/docs/skills/extensible/skill-generation)**

**AI-Powered Skill Generation:** SpecWeave automatically detects recurring patterns across your project's living docs using LLM analysis -- not hardcoded keyword matching. When patterns mature, it suggests generating project-specific Claude Code skills complete with evals and benchmarks. Use `--seed` mode to bootstrap instantly on existing projects. [Learn more](https://verified-skill.com/docs/skills/extensible/skill-generation).

---

## Install

```bash
npm install -g specweave
cd your-project
specweave init .
```

Init automatically detects your project setup:
- **Git provider** — GitHub, Azure DevOps, or Bitbucket from `.git/config`
- **Umbrella structure** — discovers all child repos in `repositories/` and configures multi-repo coordination
- **AI tool** — Claude Code, Cursor, Copilot, Codex, or generic

The `specweave` CLI ships with 49 commands — project init, LSP code intelligence, skill management, dashboard, plugin marketplace, diagnostics, and more.

Then in any AI coding agent (Claude Code, Codex, Antigravity, Cursor, Copilot):
```
You: "Add dark mode to the app"
→ SpecWeave creates spec, plans architecture, builds it autonomously.
```

> **Node.js 20.12.0+** required (22 LTS recommended). Getting `SyntaxError`? [Upgrade instructions](https://verified-skill.com/docs/guides/troubleshooting/common-errors#node-version-error).

**Plugin Installation**: SpecWeave detects which plugins your project needs and suggests them with install commands, but never auto-installs without your consent. To opt into automatic installation, set `"pluginAutoLoad": { "suggestOnly": false }` in `.specweave/config.json`.

---

## Core Commands

These run automatically from natural language — see the table above. Use directly when you want fine-grained control.

| Command | Purpose | Natural trigger |
|---------|---------|----------------|
| `/sw:increment "feature"` | Create spec + plan + tasks | "Build me X" |
| `/sw:auto` | Autonomous execution | "Go ahead and build it" |
| `/sw:do` | Execute one task at a time | "Do the next task" |
| `/sw:grill` | Code review before close | "Review the code" |
| `/sw:done` | Close with quality validation | "Ship it" |
| `/sw:progress-sync` | Push to GitHub / JIRA / ADO | "Sync progress" |
| `/sw:next` | Auto-close + suggest next | "What's next?" |

**[Full command reference](https://verified-skill.com/docs/commands/overview)**

---

## Integrations

| Platform | What Syncs |
|----------|-----------|
| **GitHub** | Issues, PRs, milestones — bidirectional |
| **JIRA** | Epics, stories, status |
| **Azure DevOps** | Work items, area paths |
| **[Verified Skills](https://verified-skill.com)** | Security scanning, trust certification, public skill registry |

When you close an increment, external tools update automatically.

### Verified Skills Registry

Every SpecWeave skill can be submitted to [verified-skill.com](https://verified-skill.com) for automated security scanning and trust certification. Three tiers: Scanned (automated 41-pattern check), Verified (LLM intent analysis), Certified (human review + sandbox). Marketplace repos are auto-discovered — submit a single GitHub URL and all plugins/skills are detected.

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
| **LSP code intelligence** | 198x faster, semantic accuracy | No | No |
| **Specialized skills** | 100+ (PM, QA, DevOps, ML...) | 21 agents | None |
| **Spec/plan/tasks workflow** | Yes | Yes | Yes |
| **Agent-agnostic** | Claude Code + Codex + Antigravity + Copilot + Cursor + OpenClaw | Multi-IDE | Multi-IDE |

---

## Dashboard & Analytics

SpecWeave includes a built-in web dashboard for monitoring your projects. Launch it with:

```bash
specweave dashboard
```

**What you get:**

- **Overview** — increment progress, task completion, acceptance criteria status at a glance
- **Analytics** — command invocations, skill activations, agent spawns tracked locally in JSONL. Captures implicit calls too (team-lead spawning agents, agents calling `/sw:do` internally). Daily breakdowns, success rates, and top-used commands/skills
- **Multi-project support** — switch between projects via `?project=` query param. All views are project-scoped
- **Cost tracking** — token usage and cost estimates per increment
- **Live updates** — SSE-powered real-time refresh as increments and tasks change
- **Error resilience** — ErrorBoundary catches page crashes without killing the entire SPA

All analytics data stays local in `.specweave/state/analytics/events.jsonl` — nothing is sent externally.

**[Analytics dashboard guide](https://verified-skill.com/docs/guides/analytics-dashboard)**

---

## Built With SpecWeave

> SpecWeave builds itself. Every feature, bug fix, and release is spec-driven.

**[Browse increments](https://github.com/anton-abyzov/specweave/tree/develop/.specweave/increments)** — see how SpecWeave develops SpecWeave.

---

## Documentation

**[verified-skill.com](https://verified-skill.com)** — guides, examples, and full reference.

## Troubleshooting

### npm E401 during `specweave update` or `npm install -g specweave`

If you see `npm error code E401` / `Unable to authenticate`, your `~/.npmrc` has a stale auth token that npm sends even for public packages. Starting from **v1.0.416**, `specweave update` bypasses all user auth config automatically. To install or upgrade when blocked:

```bash
npm i -g specweave --registry https://registry.npmjs.org --userconfig /dev/null
```

To fix the root cause, remove the stale token from `~/.npmrc`:

```bash
# Remove stale registry.npmjs.org token (keeps other tokens like GitHub Packages)
sed -i.bak '/registry.npmjs.org.:_authToken/d' ~/.npmrc
```

## Community

[Discord](https://discord.gg/UYg4BGJ65V) · [YouTube](https://www.youtube.com/@antonabyzov) · [GitHub Issues](https://github.com/anton-abyzov/specweave/issues)

## License

MIT — [github.com/anton-abyzov/specweave](https://github.com/anton-abyzov/specweave)
