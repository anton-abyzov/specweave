<h1 align="center">SpecWeave</h1>

<p align="center">
  <strong>AI-assisted development, under control.</strong><br/>
  Stop prompting. Start specifying.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/specweave"><img src="https://img.shields.io/npm/v/specweave?color=brightgreen" alt="npm" /></a>
  <img src="https://img.shields.io/badge/increments-636+-blue" alt="636+ increments" />
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

SpecWeave was built with SpecWeave — 636+ structured increments, every one documented.

| App | Platform | Status |
|-----|----------|--------|
| **SketchMate** | App Store | Shipped Mar 2026 |
| **Lulla** | App Store | Shipped Mar 2026 |
| **SpecWeave** | npm | 538+ releases, 3,200+ commits |

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

## Documentation

**[spec-weave.com](https://spec-weave.com)** — guides, reference, and enterprise docs.

## Community

[Discord](https://discord.gg/UYg4BGJ65V) · [YouTube](https://www.youtube.com/@antonabyzov) · [GitHub Issues](https://github.com/anton-abyzov/specweave/issues)

## License

MIT — [github.com/anton-abyzov/specweave](https://github.com/anton-abyzov/specweave)
