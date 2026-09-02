<h1 align="center">SpecWeave</h1>

<p align="center">
  <strong>AI-assisted development, under control.</strong><br/>
  One folder per unit of work. Six commands. An append-only ledger any tool can write to.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/specweave"><img src="https://img.shields.io/npm/v/specweave?color=brightgreen" alt="npm" /></a>
  <img src="https://img.shields.io/badge/skills-10-8B5CF6" alt="10 skills" />
  <img src="https://img.shields.io/badge/production_apps-10+-green" alt="10+ production apps" />
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT" /></a>
  <a href="https://discord.gg/UYg4BGJ65V"><img src="https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white" alt="Discord" /></a>
</p>

<br/>

## Install

```bash
npm install -g specweave        # Node.js 20.12.0+
cd your-project
specweave init .
```

## The loop

| # | Command | Claude Code skill | What it does |
|---|---------|-------------------|--------------|
| 1 | `specweave create-increment "<title>"` | `/sw:increment` | `spec.md` with Problem, Scope, numbered ACs and an Approach. Approved before any code. |
| 2 | `specweave task next` → `claim` → `done --run "<test>"` | `/sw:do` | Work the tasks. `done` refuses a failing test command. |
| 3 | `specweave verify` | — | Runs your test/lint/build; writes `reports/verify.json`. |
| 4 | — | `/sw:review` | Fresh-context adversarial review; every finding cites `path:line`. |
| 5 | `specweave complete <id>` | `/sw:done` | Closes. Blocks only on a green `verify.json` (or `--reason`). |
| 6 | `specweave handoff` | `/sw:handoff` | A portable one-page doc so any other tool can pick the work up. |

Everything lives in `.specweave/increments/NNNN-slug/`: `spec.md`, `tasks.md` (+ the rendered `SW:BOARD`), `ledger.jsonl`, `handoff.md`, `reports/`.

## The ten skills

The CLI is the product and it runs in any AI tool or in CI. These ten skills are the Claude Code wrappers over it — nothing else ships in the plugin, so nothing goes stale.

| Skill | Use it for |
|-------|------------|
| `sw:brainstorm` | Framed alternatives, ending in a pick. |
| `sw:increment` | Plan the work: `spec.md` with ACs, plus `tasks.md`. |
| `sw:do` | Claim a task, implement it, close it with evidence. |
| `sw:auto` | The same loop, unattended, until the tasks run out. |
| `sw:team` | A worktree per agent, claims arbitrated by the ledger. |
| `sw:review` | Fresh-context adversarial pass; findings cite `path:line`. |
| `sw:qa` | Risk-scored assessment, blockers, verdict. |
| `sw:done` | Verify, review check, `specweave complete`. |
| `sw:sync` | GitHub, Jira and Azure DevOps: push, pull, status, setup. |
| `sw:handoff` | A one-page, secret-scrubbed continuation doc. |

Five longer procedures (tdd-cycle, e2e, debug, diagrams, release-expert) live in `skills-optional/` and install on demand with [vskill](https://www.npmjs.com/package/vskill).

## Upgrade to 2.0

```bash
npm i -g specweave@2
specweave update
```

`specweave update` is idempotent: it rewrites the managed sections of `CLAUDE.md`/`AGENTS.md` while preserving your own, migrates `config.json` in one pass, writes the `.gitignore`/`.gitattributes` entries 2.0 needs, and keeps backups under `.specweave/backups/`. Then run `specweave doctor`.

2.0 removed a lot on purpose — the three-report closure pipeline, auto-generated living docs, 34 never-invoked skills, the queued sync mode. See **[What was removed, and why](https://spec-weave.com/docs/guides/specweave-2#what-was-removed-and-why)**.

There is no alias routing: a 1.x slug simply has no skill behind it. The old-to-new map —
every removed skill, the skill or CLI command that replaced it, and the ones that moved to
`skills-optional/` — is `removedIn2_0` in
[`plugins/specweave/marketplace.json`](plugins/specweave/marketplace.json).

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

## How It Compares

| Capability | Cursor Rules | Copilot Instructions | Windsurf | Cline | Vibe Coding | **SpecWeave** |
|------------|:---:|:---:|:---:|:---:|:---:|:---:|
| Structured specs (Problem, ACs, Approach) | — | — | — | — | — | **Yes** |
| One closure gate you can actually see (`verify.json`) | — | — | — | — | — | **Yes** |
| Autonomous execution (hours, unattended) | — | — | — | — | — | **Yes** |
| Multi-agent teams (parallel, contract-first) | — | — | — | — | — | **Yes** |
| External sync (GitHub / JIRA / ADO) | — | — | — | — | — | **Yes** |
| Append-only ledger (claims, evidence, no lost work) | — | — | — | — | — | **Yes** |
| LSP code intelligence (198x faster) | — | — | — | — | — | **Yes** |
| Cross-tool handoff (any vendor, any subscription) | — | — | — | — | — | **Yes** |

Cursor tells AI "use Tailwind." SpecWeave tells AI "build a checkout flow against these five acceptance criteria, prove the tests pass, review the diff, then close."

<br/>

## Key Features

**Spec-First Planning** — Every feature starts as `spec.md` (Problem, Scope, ACs, Approach) plus `tasks.md`. Configuration, not prompting.

**Evidence, not vibes** — `specweave task done --run "<test>"` refuses a failing command and stores the exit code and output tail in the ledger.

**Multi-agent, any vendor** — A worktree per agent, claims through `ledger.jsonl`, one closure. Coordination happens only through committed files.

```
┌──────────────────┬──────────────────┬──────────────────┐
│  Agent 1 (auth)  │ Agent 2 (payments)│ Agent 3 (catalog)│
│  T-01..T-04      │  T-05..T-08      │  T-09..T-12      │
│  ████████░░ 80%  │  ██████░░░░ 60%  │  ████░░░░░░ 40%  │
└──────────────────┴──────────────────┴──────────────────┘
```

**LSP Code Intelligence** — 198x faster than grep, 0 false positives. Semantic references, definitions, and types.

**10 skills, not 51** — see [The ten skills](#the-ten-skills) above. Plus five standalone skills for non-Claude tools.

**External Sync** — `specweave sync push|pull|status|setup`. GitHub is first-class; Jira and Azure DevOps are opt-in.

**Enterprise Ready** — Compliance audit trails. Brownfield analysis. Multi-repo workspaces.

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

## Documentation

**[spec-weave.com](https://spec-weave.com)** — [SpecWeave 2.0](https://spec-weave.com/docs/guides/specweave-2) · [commands](https://spec-weave.com/docs/reference/commands) · [skills](https://spec-weave.com/docs/reference/skills) · [configuration](https://spec-weave.com/docs/reference/configuration)

## Contributing

Inside this repo dependency install scripts are disabled (`.npmrc`): run `npm ci`, then `npm run setup` (rebuilds the allowlisted native deps), and `npm run security:scan` before pushing — see [SECURITY.md](SECURITY.md).

## Community

[Discord](https://discord.gg/UYg4BGJ65V) · [YouTube](https://www.youtube.com/@antonabyzov) · [GitHub Issues](https://github.com/anton-abyzov/specweave/issues)

## License

MIT — [github.com/anton-abyzov/specweave](https://github.com/anton-abyzov/specweave)
