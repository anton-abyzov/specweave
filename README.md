<h1 align="center">SpecWeave</h1>

<p align="center">
  <strong>AI-assisted development, under control.</strong><br/>
  Stop prompting. Start specifying.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/specweave"><img src="https://img.shields.io/npm/v/specweave?color=brightgreen" alt="npm" /></a>
  <img src="https://img.shields.io/badge/increments-600+-blue" alt="600+ increments" />
  <img src="https://img.shields.io/badge/production_apps-10+-green" alt="10+ production apps" />
  <img src="https://img.shields.io/badge/skills-100+-8B5CF6" alt="100+ skills" />
  <img src="https://img.shields.io/badge/agent_platforms-49-orange" alt="49 platforms" />
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT" /></a>
  <a href="https://discord.gg/UYg4BGJ65V"><img src="https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white" alt="Discord" /></a>
</p>

<br/>

## The Problem

**36.82% of AI skills have security flaws** ([Snyk ToxicSkills](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/)). In May 2025, 170 out of 1,645 vibe-coded apps had security vulnerabilities exposing personal data. No specs. No tests. No review. Just vibes.

Every alternative is an instruction layer — Cursor Rules, Copilot Instructions, Windsurf Rules, CLAUDE.md. They tell the AI *how* to write code but never *what* to build, never *how* to test it, and never *when* it's done.

SpecWeave is a spec-first development layer. Configuration, not prompting. Enforced, not hoped for.

<br/>

## The Solution

```
You: "Build a checkout flow with Stripe"
  ↓
  spec.md → plan.md → tasks.md       ← you review the plan
  ↓
  Autonomous execution for hours      ← AI builds, tests, fixes
  ↓
  Quality gates (Grill + Judge-LLM)   ← code reviewed automatically
  ↓
  Synced to GitHub/JIRA/ADO           ← closed, documented, shipped
```

Every feature starts as a specification — user stories, acceptance criteria, architecture decisions — before a single line of code is written. TDD enforces correctness. Quality gates catch what tests miss.

<br/>

## Built With SpecWeave

12 production projects shipped in 3 months. 5 in the App Store.

| App | Platform | What It Does |
|-----|----------|-------------|
| [**EasyChamp**](https://easychamp.com) | Web (GCP) | Enterprise sports league management. 20+ microservices, ML video analytics. 4 years in production. |
| [**SketchMate**](https://apps.apple.com/app/sketchmate-ai-draw-game/id6760250072) | App Store | AI drawing game — multi-model evaluation judges player art semantically. |
| [**Lulla**](https://apps.apple.com/app/lulla-calm-baby-anywhere/id6756977992) | App Store | Baby sleep app with Apple Watch. ML cry classification (tired/hungry/pain). |
| [**Football 2026**](https://apps.apple.com/app/football-2026-travel/id6757258711) | App Store + Web | World Cup 2026 companion. AI travel planner, live tickets, team stats. |
| [**SkillUp Football**](https://apps.apple.com/app/skillup-football/id6756978002) | App Store | Coaches monetize training via Stripe. Instagram-like feed, scheduling. |
| [**BizZone**](https://apps.apple.com/app/business-zone/id6756091030) | App Store | Student & business events with AI-powered news generation. |
| [**EduFeed**](https://edufeed-jet.vercel.app/) | Web | NotebookLM meets Zoom. Upload videos, get quizzes, flashcards, live rooms. |
| [**JobWeave**](https://jobweave.ai) | Web | AI-powered job search. Smart matching, resume optimization. |
| [**SpecWeave**](https://github.com/anton-abyzov/specweave) | npm | The framework itself. 600+ increments, 538+ releases. |
| [**SpecWeave Umbrella**](https://github.com/anton-abyzov/specweave-umb) | GitHub | Multi-repo orchestration workspace for all repositories. |
| [**vskill**](https://github.com/anton-abyzov/vskill) | npm | Package manager for AI skills. Security scanning, 49 platforms. |
| [**verified-skill.com**](https://verified-skill.com) | Web | Skill marketplace & studio. 105K+ verified skills, eval system. |

[Browse increments on GitHub](https://github.com/anton-abyzov/specweave/tree/develop/.specweave/increments) — full transparency.

<br/>

## Quick Start

```bash
npm install -g specweave       # Node.js 20.12.0+
cd your-project
specweave init .
# Then in Claude Code, Cursor, Copilot, or any AI tool:
# "Build me a user authentication system"
```

<br/>

## How It Compares

| Capability | Cursor Rules | Copilot Instructions | Windsurf | Cline | Vibe Coding | **SpecWeave** |
|------------|:---:|:---:|:---:|:---:|:---:|:---:|
| Structured specs (spec + plan + tasks) | — | — | — | — | — | **Yes** |
| Quality gates (Grill + Judge-LLM + 130 rules) | — | — | — | — | — | **Yes** |
| Autonomous execution (hours, unattended) | — | — | — | — | — | **Yes** |
| Multi-agent teams (parallel, contract-first) | — | — | — | — | — | **Yes** |
| External sync (GitHub / JIRA / ADO) | — | — | — | — | — | **Yes** |
| TDD enforcement (strict red-green-refactor) | — | — | — | — | — | **Yes** |
| LSP code intelligence (198x faster) | — | — | — | — | — | **Yes** |
| Self-improving skills (learns from corrections) | — | — | — | — | — | **Yes** |

Cursor tells AI "use Tailwind." SpecWeave tells AI "build a checkout flow with 5 acceptance criteria, test it, review it, sync to JIRA, and close."

<br/>

## Key Features

**Spec-First Planning** — Every feature starts as spec.md + plan.md + tasks.md. Configuration, not prompting.

**TDD Enforcement** — Strict red-green-refactor. Tasks cannot close without passing tests. Coverage targets enforced.

**Agent Swarms** — Run parallel agents across iTerm/tmux panes. Team lead splits work, each agent owns an increment.

```
┌──────────────────┬──────────────────┬──────────────────┐
│  Agent 1 (auth)  │ Agent 2 (payments)│ Agent 3 (catalog)│
│  sw:auto         │  sw:auto         │  sw:auto         │
│  ████████░░ 80%  │  ██████░░░░ 60%  │  ████░░░░░░ 40%  │
└──────────────────┴──────────────────┴──────────────────┘
```

**LSP Code Intelligence** — 198x faster than grep, 0 false positives. Semantic references, definitions, and types.

**100+ Skills** — PM, Architect, QA, Security, DevOps, Frontend, Backend, Mobile, ML. Every skill is customizable via skill-memories without forking.

**External Sync** — GitHub Issues, JIRA, Azure DevOps — bidirectional, real-time. Close an increment, external tools update automatically.

**Enterprise Ready** — Compliance audit trails (SOC 2, HIPAA, FDA). Brownfield analysis. Multi-repo coordination. Multi-environment deployment.

**Dashboard** — Built-in web dashboard for increment progress, analytics, cost tracking, and multi-project monitoring.

<br/>

## Skills Ecosystem

SpecWeave skills are published and verified at **[verified-skill.com](https://verified-skill.com)**. The [vskill](https://www.npmjs.com/package/vskill) package manager provides:

- **Security scanning** — 52 attack patterns, SHA-256 pinning, blocklist API
- **49 agent platforms** — one install deploys to Claude Code, Cursor, Copilot, Windsurf, and 45 more
- **Skill evals** — unit tests, A/B comparisons, cross-model testing. Skills tested like programs.
- **Visual Skill Studio** — `vskill eval serve` for benchmarks, comparisons, and history

```bash
npx vskill install remotion-best-practices    # Install from registry
npx vskill eval run my-skill                  # Run eval suite
```

<br/>

## Core Commands

| You say | SpecWeave runs |
|---------|---------------|
| "Build me X" | `sw:increment` → spec + plan + tasks |
| "Go ahead" | `sw:auto` → autonomous execution |
| "Ship it" | `sw:done` → quality gates + close |
| "Split into teams" | `sw:team-lead` → parallel agents |
| "Review the code" | `sw:code-reviewer` → 6 parallel reviewers |

[Full command reference](https://spec-weave.com/docs/commands/overview)

<br/>

## Upgrading to v1.1.0 (Opus 4.7 Alignment)

SpecWeave v1.1.0 aligns the framework with Claude Opus 4.7 best practices.

### P0 Fixes (required if using judge-llm or team-lead)

1. **Remove fixed extended thinking**: `sw:judge-llm` no longer passes `thinking.budget_tokens`. Adaptive prompt hints replace it. No user action needed — the CLI handles this automatically.

2. **Team-lead spawn heuristic**: `sw:team-lead` now only spawns agents when `domains ≥ 3` OR `tasks ≥ 15` OR `--parallel` is set. Previously it always spawned agents.

3. **State markers removed**: `skill-chain-*.json` and `interview-*.json` state files are no longer written. `pretooluse-guard.ts` uses TaskGet-based state with filesystem fallback.

### Config Migration

Run the migration script to add new config keys with defaults:

```bash
specweave migrate-config-0669
```

### Deprecations

See full list in [CHANGELOG.md](./CHANGELOG.md). Key migrations:
- `/sw:tdd-red` → `/sw:tdd-cycle --phase red`
- `/sw:github-sync` → `/sw-github:sync-spec`
- `/sw:team-build` → `/sw:team-lead --preset <name>`

Full migration guide: `.specweave/docs/internal/specs/opus-47-migration.md`

## Documentation

**[spec-weave.com](https://spec-weave.com)** — guides, reference, and enterprise docs.

## Contributing

Inside this repo dependency install scripts are disabled (`.npmrc`): run `npm ci`, then `npm run setup` (rebuilds the allowlisted native deps), and `npm run security:scan` before pushing — see [SECURITY.md](SECURITY.md).

## Community

[Discord](https://discord.gg/UYg4BGJ65V) · [YouTube](https://www.youtube.com/@antonabyzov) · [GitHub Issues](https://github.com/anton-abyzov/specweave/issues)

## License

MIT — [github.com/anton-abyzov/specweave](https://github.com/anton-abyzov/specweave)
