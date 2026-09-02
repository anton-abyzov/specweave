# SpecWeave plugins index

**Plugins**: 1 (`sw`) · **Skills**: 10 · **Commands**: 0 · **Hooks**: 4

The 1.x `commands/` namespace is gone: anything deterministic is a `specweave`
CLI subcommand, and the model-judgement procedures are the 10 skills below.

| Plugin | Triggers | Description |
|---|---|---|
| **specweave** (`sw`) | increment, spec, tasks, plan, implement, close, review, team, handoff, sync, GitHub, Jira, ADO, auto, brainstorm, qa | Increment lifecycle: plan → work the ledger → verify → review → complete, with cross-tool handoff and tracker sync |

## Quick lookup

| User intent | Skill |
|---|---|
| "Plan a feature" / "let's build X" | `sw:increment` |
| "Implement" / "continue increment" | `sw:do` |
| "We're done" / "close it" | `sw:done` |
| "Review this" / "grill the code" | `sw:review` |
| "Parallel agents" / "split this up" | `sw:team` |
| "Handoff" / "continue in another tool" | `sw:handoff` |
| "Push to GitHub" / "import issues" | `sw:sync` |
| "Run until done" | `sw:auto` |
| "What are our options" | `sw:brainstorm` |
| "Quality check" / "risk assessment" | `sw:qa` |

## Not in the plugin

`tdd-cycle`, `e2e`, `debug`, `diagrams`, `release-expert` live in `skills-optional/`
and install per-project with vskill. See `skills-optional/README.md`.

Deterministic operations are CLI: `specweave status | task | verify | complete | qa |
handoff | sync | docs | doctor | gc`.
