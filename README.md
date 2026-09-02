<h1 align="center">SpecWeave</h1>

<p align="center">
  <strong>AI-assisted development, under control.</strong><br/>
  Stop prompting. Start specifying.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/specweave"><img src="https://img.shields.io/npm/v/specweave?color=brightgreen" alt="npm" /></a>
  <img src="https://img.shields.io/badge/increments-600+-blue" alt="600+ increments" />
  <img src="https://img.shields.io/badge/production_apps-10+-green" alt="10+ production apps" />
  <img src="https://img.shields.io/badge/core_skills-10-8B5CF6" alt="10 core skills" />
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
  spec.md (ACs + Approach) → tasks.md ← you review the plan
  ↓
  Autonomous execution for hours      ← AI claims a task, builds, tests, commits
  ↓
  specweave verify + sw:review        ← evidence, then an adversarial pass
  ↓
  Synced to GitHub/JIRA/ADO           ← closed, documented, shipped
```

Every feature starts as a specification — problem, scope, numbered acceptance criteria, approach — before a single line of code is written. Tasks close on a passing test command and a commit sha. A fresh-context review catches what tests miss.

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
| Structured specs (ACs + approach + tasks) | — | — | — | — | — | **Yes** |
| Quality gates (verify + adversarial review) | — | — | — | — | — | **Yes** |
| Autonomous execution (hours, unattended) | — | — | — | — | — | **Yes** |
| Multi-agent teams (parallel, contract-first) | — | — | — | — | — | **Yes** |
| External sync (GitHub / JIRA / ADO) | — | — | — | — | — | **Yes** |
| Evidence-backed task closure (test exit + sha) | — | — | — | — | — | **Yes** |
| LSP code intelligence (198x faster) | — | — | — | — | — | **Yes** |
| Append-only task ledger (conflict-free merges) | — | — | — | — | — | **Yes** |

Cursor tells AI "use Tailwind." SpecWeave tells AI "build a checkout flow with 5 acceptance criteria, test it, review it, sync to JIRA, and close."

<br/>

## Key Features

**Spec-First Planning** — Every feature starts as spec.md (problem, scope, numbered ACs, approach) plus tasks.md. Configuration, not prompting.

**Evidence, Not Claims** — A task closes only with its test command exit 0 and the commit sha, recorded in an append-only ledger. Optional strict red-green-refactor via the `tdd-cycle` skill.

**Agent Swarms** — Run parallel agents across iTerm/tmux panes. `sw:team` gives each agent its own worktree; the ledger arbitrates who owns which task.

```
┌──────────────────┬──────────────────┬──────────────────┐
│  Agent 1 (auth)  │ Agent 2 (payments)│ Agent 3 (catalog)│
│  sw:auto         │  sw:auto         │  sw:auto         │
│  ████████░░ 80%  │  ██████░░░░ 60%  │  ████░░░░░░ 40%  │
└──────────────────┴──────────────────┴──────────────────┘
```

**LSP Code Intelligence** — 198x faster than grep, 0 false positives. Semantic references, definitions, and types.

**10 Core Skills** — increment, do, done, review, team, handoff, sync, auto, brainstorm, qa. Nothing else ships in the plugin, so nothing goes stale. Longer procedures (tdd-cycle, e2e, debug, diagrams, release-expert) live in `skills-optional/` and install on demand with [vskill](https://www.npmjs.com/package/vskill).

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
| "What are our options?" | `sw:brainstorm` → framed alternatives, ends in a pick |
| "Build me X" | `sw:increment` → spec.md with ACs + approach, plus tasks.md |
| "Start working" | `sw:do` → claim a task, implement, commit, close it with evidence |
| "Go ahead" | `sw:auto` → the same loop, unattended, until the tasks run out |
| "Split this across agents" | `sw:team` → a worktree per agent, claims through the ledger |
| "Review the code" | `sw:review` → fresh-context adversarial pass, every finding cites path:line |
| "How risky is this?" | `sw:qa` → risk-scored assessment, blockers, verdict |
| "Ship it" | `sw:done` → verify, review check, `specweave complete` |
| "Push it to the tracker" | `sw:sync` → GitHub, Jira and Azure DevOps: push, pull, status, setup |
| "I'm stopping here" | `sw:handoff` → a one-page, secret-scrubbed continuation doc |

Every skill is a thin wrapper over a CLI command, so the same loop runs in Cursor, Copilot,
Codex or a bare terminal: `specweave create-increment` → `specweave task next` → `specweave task claim`
→ `specweave task done --run "<test cmd>"` → `specweave verify` → `specweave complete`.

[Full command reference](https://spec-weave.com/docs/commands/overview)

<br/>

## Upgrading from 1.x to 2.0

```bash
npm i -g specweave@2
specweave update       # rewrites the managed sections, keeps everything you wrote
```

2.0 replaces the 51-skill surface with the 10 above. There is no alias routing — an old slug
simply has no skill behind it, so use the replacement:

| 1.x | 2.0 |
|-----|-----|
| `sw:grill`, `sw:code-reviewer`, `sw:judge-llm`, `sw:pr-review` | `sw:review` |
| `sw:team-lead`, `sw:team-merge`, `sw:team-build` | `sw:team` |
| `sw:pm`, `sw:architect`, `sw:plan` | `sw:increment` |
| `sw:validate` | `sw:qa` |
| `sw:progress-sync`, `sw:import`, `sw:github-sync`, `sw:jira-sync`, `sw:ado-sync`, `sw:multi-project` | `sw:sync` |
| `sw:progress`, `sw:close-all`, `sw:analytics`, `sw:help` | `specweave status`, `specweave complete --all`, `specweave analytics`, `specweave help` |
| `sw:tdd-cycle`, `sw:tdd-red`, `sw:e2e`, `sw:debug`, `sw:diagrams`, `sw:npm` | `npx vskill install anton-abyzov/specweave/skills-optional/<name>` |
| `sw:skill-gen`, `sw:skill-refine` | the vskill skill-creator |

The full map, including the CLI replacements, is `removedIn2_0` in
[`plugins/specweave/marketplace.json`](plugins/specweave/marketplace.json).

<br/>

## Documentation

**[spec-weave.com](https://spec-weave.com)** — guides, reference, and enterprise docs.

## Contributing

Inside this repo dependency install scripts are disabled (`.npmrc`): run `npm ci`, then `npm run setup` (rebuilds the allowlisted native deps), and `npm run security:scan` before pushing — see [SECURITY.md](SECURITY.md).

## Community

[Discord](https://discord.gg/UYg4BGJ65V) · [YouTube](https://www.youtube.com/@antonabyzov) · [GitHub Issues](https://github.com/anton-abyzov/specweave/issues)

## License

MIT — [github.com/anton-abyzov/specweave](https://github.com/anton-abyzov/specweave)
