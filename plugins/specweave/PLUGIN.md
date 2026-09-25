# SpecWeave plugin (`sw`)

The Claude Code surface for SpecWeave: **11 skills, 2 default hooks, 1 closer agent**.
The skills are generated from `skills/sw-<name>/` at the repository root (the one source
every tool shares); edit them there, never here.
Everything deterministic lives in the `specweave` CLI; a skill exists only where a
procedure needs model judgement. There is no `commands/` namespace in 2.0.

## Skills

| Skill | What it does |
|---|---|
| `sw:increment` | Plan a unit of work → one `spec.md` (Problem, Scope, ACs, Approach, Tasks) |
| `sw:do` | Work the increment task by task through the ledger, with evidence per task |
| `sw:done` | Close it: ledger check → `specweave verify` → optional review → `specweave complete` |
| `sw:review` | Adversarial fresh-context review and quality check; every finding cites `path:line` |
| `sw:team` | Several agents on one increment: a worktree each, claims through the ledger |
| `sw:handoff` | "Hand off" here, "pick up" in any other tool, account or machine |
| `sw:sync` | GitHub / Jira / ADO: push, pull, status, setup |
| `sw:auto` | Unattended loop driven by the Stop hook |
| `sw:brainstorm` | Expand the option space before committing to one |
| `sw:project` | Shared goal, memory, work items and briefs across tools |
| `sw:jev` | Delegate closed-set decisions to Jev (TypeSafe System One): routing, command safety, screening |

Optional procedures (tdd-cycle, e2e, debug, diagrams, release-expert) are **not** in the
plugin — they ship from `skills-optional/` via
`npx vskill install anton-abyzov/specweave/skills-optional/<name>`.

## Hooks

Two by default, both exec-form `node hooks/run.mjs <event>` (no shell, Windows-safe):

| Hook | Job |
|---|---|
| `SessionStart` | Inject the active increment + next task as context |
| `Stop` | Drive the `sw:auto` loop; `{}` for every ordinary session |

`PreToolUse` is **not** registered by default — `hooks.json` ships `SessionStart` and
`Stop` only, exactly as in 2.1.0. `PreToolUse` and `PreCompact` stay callable
compatibility handlers.

The Jev Bash guard is opted into **one project at a time**:
`specweave jev setup --guard-bash` sets `jev.guards.bash` in `.specweave/config.json`,
writes the marker `.specweave/state/jev-guard.enabled`, and registers a project-level
hook in that project's `.claude/settings.json` (`hooks.PreToolUse`, matcher `Bash`,
command `node "<installed specweave>/plugins/specweave/hooks/run.mjs" pre-tool-use`).
`specweave jev setup --no-guard-bash` removes all three, and `specweave jev doctor` shows
the marker and the project hook. This is a Claude Code surface only; other tools call
`specweave jev guard "<command>"` explicitly before running anything unattended.

## Agents

| Agent | Purpose |
|---|---|
| `sw:sw-closer` | Runs closure in a fresh context after implementation finishes |

## Requirements

- Claude Code 2.1.0+, Node.js 18+, Git
- The `specweave` CLI on PATH (`npm i -g specweave`). Skills degrade to documented
  manual steps when it is absent; they never silently no-op.

## Install

```bash
claude plugin install sw@specweave     # or: specweave refresh-plugins
```
