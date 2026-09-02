# SpecWeave plugin (`sw`)

The Claude Code surface for SpecWeave: **10 skills, 4 hooks, 1 closer agent**.
Everything deterministic lives in the `specweave` CLI; a skill exists only where a
procedure needs model judgement. There is no `commands/` namespace in 2.0.

## Skills

| Skill | What it does |
|---|---|
| `sw:increment` | Plan a unit of work → `spec.md` (Problem, Scope, ACs, Approach) + `tasks.md` |
| `sw:do` | Work the increment task by task through the ledger, with evidence per task |
| `sw:done` | Close it: ledger check → `specweave verify` → optional review → `specweave complete` |
| `sw:review` | Adversarial fresh-context review; every finding cites `path:line` |
| `sw:team` | Several agents on one increment: a worktree each, claims through the ledger |
| `sw:handoff` | Portable, secret-scrubbed handoff doc so the work continues in any tool |
| `sw:sync` | GitHub / Jira / ADO: push, pull, status, setup |
| `sw:auto` | Unattended loop driven by the Stop hook |
| `sw:brainstorm` | Expand the option space before committing to one |
| `sw:qa` | Risk-scored quality assessment (`specweave qa`) |

Optional procedures (tdd-cycle, e2e, debug, diagrams, release-expert) are **not** in the
plugin — they ship from `skills-optional/` via
`npx vskill install anton-abyzov/specweave/skills-optional/<name>`.

## Hooks

Four, all exec-form `node hooks/run.mjs <event>` (no shell, Windows-safe):

| Hook | Job |
|---|---|
| `SessionStart` | Inject the active increment + next task as context |
| `PreToolUse` (Write\|Edit) | Guard writes under `.specweave/increments/` |
| `Stop` | Drive the `sw:auto` loop; `{}` for every ordinary session |
| `PreCompact` | Write a handoff doc before context is compacted |

## Agents

| Agent | Purpose |
|---|---|
| `sw:sw-closer` | Runs closure in a fresh context after implementation finishes |

Team lane templates live in `skills/team/agents/` and are loaded by `specweave team`.

## Requirements

- Claude Code 2.1.0+, Node.js 18+, Git
- The `specweave` CLI on PATH (`npm i -g specweave`). Skills degrade to documented
  manual steps when it is absent; they never silently no-op.

## Install

```bash
claude plugin install sw@specweave     # or: specweave refresh-plugins
```
