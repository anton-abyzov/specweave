<h1 align="center">SpecWeave</h1>

<p align="center">
  <strong>Change agents. Keep the thread.</strong><br/>
  Plan work as small specs, hand it between Claude, Codex, Grok and any other tool in two words, and close it with evidence.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/specweave"><img src="https://img.shields.io/npm/v/specweave?color=brightgreen" alt="npm" /></a>
  <img src="https://img.shields.io/badge/skills-11-8B5CF6" alt="11 skills" />
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

`init` writes `AGENTS.md` (read by Codex, Grok, Cursor, Gemini and Copilot), a two-line `CLAUDE.md` that imports it, and the skills for Claude Code and Codex. Nothing else runs in the background.

## Out of tokens? Say "hand off"

```text
you (in Claude, account 1):   hand off
you (in Codex, or account 2): pick up
```

That is the whole handoff. "Hand off" runs `specweave handoff`: it releases your task claims, records why you stopped, and pushes your branch plus a snapshot of your uncommitted edits. "Pick up" runs `specweave pickup` in any other tool, account, machine or cloud session (a Claude Code Projects thread, a Codex cloud task): it brings that work into the checkout and prints the next task with its acceptance criteria. Nothing to copy, no paths to paste.

`specweave report` writes an HTML timeline of who did what on an increment (tools, sessions, handoffs, pickups, test evidence), straight from the ledger.

## The loop

| # | Say or run | What happens |
|---|---|---|
| 1 | "pick up" · `specweave pickup` | The open increment, the next task with its acceptance criteria, claims held by others, branch state, notes and project memory, in one read. |
| 2 | `/sw:increment` · `specweave create-increment "<title>"` | One `spec.md`: Problem, Scope, Acceptance Criteria, Approach and the Tasks. |
| 3 | `/sw:do` · `specweave task claim T-01` → `task done T-01 --run "<test>"` | Work a task. `done` refuses a failing test and stores the evidence in the ledger. |
| 4 | `specweave verify` · `/sw:review` | Runs your test, lint and build; a fresh-context review cites `path:line`. |
| 5 | `/sw:done` · `specweave complete <id>` | Closes on a green verify. Acceptance criteria are met when their tasks are done; nobody ticks boxes. |
| 6 | "hand off" · `specweave handoff` | Stop anywhere; the next tool picks up. |

An increment is one folder, `.specweave/increments/NNNN-slug/`, with one file you read (`spec.md`) and one the CLI appends to (`ledger.jsonl`). Increments from 2.x with a `tasks.md` keep working unchanged.

## Works the way Claude Code Projects work

| Claude Code Projects | SpecWeave |
|---|---|
| A thread: one session, one branch, one PR | One increment |
| The thread's checklist | The `## Tasks` of that increment's `spec.md`, state in `ledger.jsonl` |
| Project memory (`MEMORY.md` + one file per fact) | `.specweave/memory/`, same format, committed, so every tool and account sees it |
| Threads passing notes | `specweave note "<text>"` on another increment |

Project memory in claude.ai stays with one account. `.specweave/memory/` travels with the code, so Codex, Grok and a second Claude subscription start from the same decisions.

## The eleven skills

The CLI is the product and runs in any tool or in CI. The skills expose it to coding agents: `/sw:<name>` in Claude Code, `sw-<name>` in `.claude/skills/` (for Projects threads, where plugins do not load) and `.agents/skills/` (Codex, Grok).

| Skill | Use it for |
|-------|------------|
| `increment` | Plan the work as one `spec.md`. |
| `do` | Claim a task, implement it, close it with evidence. |
| `auto` | The same loop, unattended, until the tasks run out. |
| `team` | A worktree per agent, claims arbitrated by the ledger. |
| `review` | Fresh-context adversarial review; findings cite `path:line`. |
| `done` | Verify, review check, `specweave complete`. |
| `handoff` | "Hand off" and "pick up". |
| `sync` | GitHub, Jira and Azure DevOps, only when you run it. |
| `project` | Shared goals, artifacts and briefs across tools. |
| `brainstorm` | Framed alternatives, ending in a pick. |
| `jev` | Closed-set decisions in about 250 ms via Jev. |

## Upgrade to 3.0

```bash
npm i -g specweave@3
specweave update
```

`specweave update` rewrites `AGENTS.md` into the lean form, turns `CLAUDE.md` into an import of it, keeps your own sections, and backs up the old files under `.specweave/backups/`. Existing increments need no migration. See **[SpecWeave 3.0](https://spec-weave.com/docs/guides/specweave-3)** for what changed and what was removed.

<br/>

## Built With SpecWeave

Examples from the maintainer's portfolio. These are usage examples, not controlled productivity measurements.

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

**Spec-First Planning** — Every feature starts as one `spec.md`: Problem, Scope, ACs, Approach and Tasks.

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

**11 skills, one source** — the same skills for Claude Code, Codex and Grok; see [The eleven skills](#the-eleven-skills).

**External Sync** — `specweave sync push|pull|status|setup`. GitHub is first-class; Jira and Azure DevOps are opt-in. Nothing calls a tracker unless you run sync.

**Enterprise Ready** — Compliance audit trails. Brownfield analysis. Multi-repo workspaces.

**Dashboard** — `specweave dashboard` shows intents, increments and evidence from local files, with no model calls.

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

**[spec-weave.com](https://spec-weave.com)** — [SpecWeave 3.0](https://spec-weave.com/docs/guides/specweave-3) · [handoff](https://spec-weave.com/docs/guides/cross-tool-handoff) · [commands](https://spec-weave.com/docs/reference/commands) · [skills](https://spec-weave.com/docs/reference/skills) · [configuration](https://spec-weave.com/docs/reference/configuration)

## Contributing

Inside this repo dependency install scripts are disabled (`.npmrc`): run `npm ci`, then `npm run setup` (rebuilds the allowlisted native deps), and `npm run security:scan` before pushing — see [SECURITY.md](https://github.com/anton-abyzov/specweave/blob/develop/SECURITY.md).

## Community

[Discord](https://discord.gg/UYg4BGJ65V) · [YouTube](https://www.youtube.com/@antonabyzov) · [GitHub Issues](https://github.com/anton-abyzov/specweave/issues)

## License

MIT — [github.com/anton-abyzov/specweave](https://github.com/anton-abyzov/specweave)
