---
title: Portable projects
description: Shared context, artifacts, routines and worker briefs for code, research and content across AI tools.
---

# Portable projects

The project hub sits on top of the intent board and the task ledger: a shared goal, context, artifacts and routines that every tool can read. Use it for software, research, writing, design briefs or operations. A local folder is enough; Git and an umbrella repository are optional.

## Create a project

```bash
mkdir research-project && cd research-project
specweave project init --name "Research" --goal "Produce a sourced decision brief"
specweave project show
specweave dashboard
```

`project init` preserves existing configuration and project context. It appends a small managed pointer to `AGENTS.md` and installs the portable `$sw-project` skill if absent. In an existing umbrella, use the umbrella root. Pass `--root /absolute/path` to select a folder explicitly.

Open **Project hub** in the [dashboard](/docs/guides/dashboard). Edit the shared brief, add work, link outputs and prepare worker briefs. The board remains the source of assignment state. Card state alone does not prove verification.

## Delegate with fresh context

```bash
specweave project work-add --title "Compare options" --summary "Read primary sources and write a decision brief"
specweave project brief --harness codex
specweave project brief --intent <intent-id> --harness codex
```

Give the generated brief to a native task or subagent when the user authorizes delegation. `--harness claude` and `--harness generic` use the same portable state. A brief is a snapshot, with its revision and preparation time; ask workers to reread the current files before acting. It does not start an agent or silently transfer private conversation history.

Use `work-update --intent <id> --revision <current-revision> --state active` to update an assignment; the states are `backlog`, `active`, `blocked`, `review` and `done`. Record a real execution with `work-record --intent <id> --revision <current-revision> --harness codex --session <real-session-id>` (add `--model`, `--effort` and `--note` when you know them). Do not invent native session IDs, model usage or billing. See [Models and execution context](/docs/guides/model-selection).

## Artifacts and reusable routines

```bash
specweave project set --revision <hub-revision> --context-file context.md
specweave project artifact-add --revision <hub-revision> --title "Decision brief" --location reports/decision.md --intent <intent-id>
specweave project routine-add --revision <hub-revision> --title "Source review" --cadence "Mondays, 9am America/New_York" --instructions-file routine.md
specweave project brief --routine <routine-id> --harness codex
```

Read the current revision with `project show` before each mutation. Concurrent changes return a conflict (exit code 3) instead of overwriting another writer. The dashboard retains a stale draft and offers an explicit action to apply it against the newly loaded revision after review.

Artifacts are references to existing project-relative files or HTTPS links. They do not upload files; deleting a reference does not delete its file. Linked local files must remain inside the project, including after resolving symlinks. Only file artifacts can use the dashboard's attachment download endpoint.

Routines store reusable instructions and a requested cadence. **They are not active schedules.** Use the host's native automation capability to create a schedule after authorization. SpecWeave does not run a second background scheduler.

## Codex setup and migration

For an existing project configured for Codex, run `specweave refresh-plugins`. Native core skills use flat names such as `.agents/skills/sw-project/SKILL.md` and `$sw-project`. Companion scripts and templates are installed too. Installation verifies the actual destination; a global package hash is not evidence that this project has the files.

Existing `.codex/skills` and unnamespaced custom skills remain untouched. Before replacing a changed namespaced skill, the installer preserves its previous directory under `.specweave/state/skill-backups/` and prints the backup path. Review legacy duplicates yourself. Init preserves an existing `$sw-project` skill; refresh is the explicit upgrade operation.

Native Codex skills, tasks, subagents, connectors and hooks depend on the current host surface and configuration. Hooks require host trust review; SpecWeave does not install or approve them for Codex. The project CLI and generated briefs work without hooks.

## What stays portable

| State | Location |
|---|---|
| Name, goal, shared context, artifact and routine references | `.specweave/project/hub.json` |
| Work assignments and execution references | `.specweave/intents/board.jsonl` |
| Scoped implementation and verified task evidence | `.specweave/increments/` |
| Decisions every tool and account should know | `.specweave/memory/` |
| Durable tool instructions | `AGENTS.md` and installed native skills |

The hub is a local coordination layer. Design editors, mobile apps, cloud execution, hidden memory and subscription accounting stay features of each native product; copying them would create another runtime and weaken portability. Existing increments and intent history need no migration.

## See also

- [Dashboard](/docs/guides/dashboard)
- [Cross-tool handoff](/docs/guides/cross-tool-handoff)
- [Codex, Grok, Cursor and other tools](/docs/integrations/generic-ai-tools)
