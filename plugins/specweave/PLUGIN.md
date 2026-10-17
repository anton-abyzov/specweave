# SpecWeave plugin (`sw`)

The Claude Code surface for SpecWeave: **6 core skills, 5 optional skills, 2 default hooks,
1 closer agent**.
The skills are generated from `skills/sw-<name>/` at the repository root (the one source
every tool shares); edit them there, never here.
Everything deterministic lives in the `specweave` CLI; a skill exists only where a
procedure needs model judgement. There is no `commands/` namespace in 2.0.

## Skills

Core, loaded by the plugin:

| Skill | What it does |
|---|---|
| `sw:increment` | Settle the user's decisions, then plan one `spec.md` (Problem, Scope, ACs, Approach, Decisions, Tasks) |
| `sw:do` | Work the increment task by task through the ledger, alone, unattended or in parallel lanes |
| `sw:auto` | User-invoked entry to sw:do's unattended mode, driven by the Stop hook |
| `sw:done` | Close it: ledger check → `specweave verify` → review → `specweave complete` |
| `sw:review` | Adversarial review by a fresh context or another model family; every finding cites `path:line` |
| `sw:handoff` | "Hand off" here, "pick up" in any other tool, account or machine |

Optional, shipped in `skills-optional/` and installed into a project as `sw-<name>` only
when `.specweave/config.json` enables it (`specweave skills enable <name>`) or the project
detects it:

| Skill | What it does | Detected by |
|---|---|---|
| `sw:grill-me` | Interview the user in rounds until every decision is settled | `planning.deepInterview: deep` |
| `sw:glossary` | GLOSSARY.md: each domain term across business, data, code and UI | `GLOSSARY.md` |
| `sw:sync` | GitHub / Jira / ADO: push, pull, status, setup | a configured tracker |
| `sw:project` | Shared goal, memory, work items and briefs across tools | `.specweave/project/hub.json` |
| `sw:jev` | Delegate closed-set decisions to Jev (TypeSafe System One) | `jev.enabled` |

`skills-catalog.json` is the list (generated from `skills/catalog.json`).

## Hooks

Two by default, both exec-form `node hooks/run.mjs <event>` (no shell, Windows-safe):

| Hook | Job |
|---|---|
| `SessionStart` | Inject the active increment + next task as context |
| `Stop` | Drive the unattended loop (`sw:auto`); `{}` for every ordinary session |

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

- Claude Code 2.1.0+, Node.js 20.12+, Git
- The `specweave` CLI on PATH (`npm i -g specweave`). Skills degrade to documented
  manual steps when it is absent; they never silently no-op.

## Install

```bash
claude plugin install sw@specweave     # or: specweave refresh-plugins
```
