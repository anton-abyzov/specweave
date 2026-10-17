# SpecWeave plugins index

**Plugins**: 1 (`sw`) · **Skills**: 6 core + 5 optional · **Commands**: 0 · **Hooks**: 2 default

The 1.x `commands/` namespace is gone: anything deterministic is a `specweave`
CLI subcommand, and the model-judgement procedures are the skills below.

| Plugin | Triggers | Description |
|---|---|---|
| **specweave** (`sw`) | increment, spec, tasks, plan, implement, close, review, parallel, handoff, sync, GitHub, Jira, ADO, auto, grill me, glossary, ubiquitous language, project, jev, system one | Increment lifecycle: plan → work the ledger → verify → review → complete, with cross-tool handoff, tracker sync and closed-set decisions delegated to Jev |

## Quick lookup

| User intent | Skill |
|---|---|
| "Plan a feature" / "let's build X" | `sw:increment` |
| "Implement" / "continue increment" | `sw:do` |
| "We're done" / "close it" | `sw:done` |
| "Review this" / "quality check" / "grill the code" | `sw:review` |
| "Parallel agents" / "split this up" | `sw:do` (parallel lanes) |
| "Hand off" / "pick up" / "out of tokens" | `sw:handoff` |
| "Push to GitHub" / "import issues" (optional) | `sw:sync` |
| "Run until done" | `sw:auto` |
| "Grill me" / "interview me" (optional) | `sw:grill-me` |
| "Glossary" / "what does Order mean here" (optional) | `sw:glossary` |
| "Project brief" / "what is this project about" (optional) | `sw:project` |
| "Jev" / "system one" / a decision whose answers can all be enumerated first (optional) | `sw:jev` |

## Hooks

Two by default, registered in `specweave/hooks/hooks.json` as exec-form
`node hooks/run.mjs <event>`: `SessionStart` and `Stop`. Each one fails open.
`PreToolUse` is not a default hook — the Jev Bash guard is turned on per project by
`specweave jev setup --guard-bash`, which writes `jev.guards.bash`, the marker
`.specweave/state/jev-guard.enabled`, and a `PreToolUse` entry (matcher `Bash`) in that
project's `.claude/settings.json`. `--no-guard-bash` removes all three.

## Optional skills

`grill-me`, `glossary`, `sync`, `project` and `jev` ship in
`plugins/specweave/skills-optional/` and install per project when enabled or detected:
`specweave skills` lists them, `specweave skills enable <name>` turns one on.

Deterministic operations are CLI: `specweave pickup | task | verify | complete |
handoff | note | report | sync | doctor | jev | skills | glossary | review`.
