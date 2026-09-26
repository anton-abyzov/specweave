---
title: Glossary
description: The terms SpecWeave 3.0 uses, with a one-line definition each and links to the longer entries.
---

# Glossary

The words SpecWeave uses, as they apply to 3.0. Terms with their own page link to it.

## Work and files

| Term | Meaning |
|---|---|
| [Increment](/docs/glossary/terms/increments) | One unit of work in `.specweave/increments/NNNN-slug/`: a `spec.md`, a `ledger.jsonl` and a `metadata.json`. |
| [spec.md](/docs/glossary/terms/spec-md) | The one file an agent reads: Problem, Scope, Acceptance Criteria, Approach, Open questions and Tasks. |
| [AC-ID](/docs/glossary/terms/ac-id) | The id of an acceptance criterion, such as `AC-01`. Tasks name the ACs they cover. |
| Task | A `### T-01 Title` heading in the Tasks section of `spec.md`, followed by one line naming the ACs it covers, the Files it changes and its Test command. |
| [Ledger](/docs/glossary/terms/ledger) | `ledger.jsonl`, the append-only log of claims, completions and notes. The only place task state lives. |
| [metadata.json](/docs/glossary/terms/metadata-json) | Machine state for an increment (status, type, timestamps), written only by the CLI. |
| [tasks.md (legacy)](/docs/glossary/terms/tasks-md) | The separate task file of increments created before 3.0. Still read, never created. |
| plan.md | Optional design overflow for a large increment, created with `specweave create-increment --with-plan`. |
| Project memory | `.specweave/memory/`: a `MEMORY.md` index plus one file per durable fact, committed so every tool and account sees it. |
| `AGENTS.md` | The single instruction file every tool reads. `CLAUDE.md` imports it with `@AGENTS.md`. |

## Working on tasks

| Term | Meaning |
|---|---|
| Claim | A ledger event saying an agent is working on a task. The earliest live claim wins. |
| Stale claim | A claim older than the lease (2 hours by default, `tasks.leaseHours`). Anyone may take it over. |
| Evidence | What `specweave task done` stores: a commit sha, or the real output of the command given with `--run`. |
| Agent id | Who made a ledger event, as `<tool>@<host>` (for example `codex@laptop`, or `claude@cloud` in a cloud session). Override with `SPECWEAVE_TOOL`, `SPECWEAVE_HOST` or `SPECWEAVE_AGENT`. |
| [Handoff](/docs/glossary/terms/handoff) | Stopping cleanly so another tool, account or machine can continue: `specweave handoff`, which pushes the work through your git remote. |
| Pickup | Starting a session from where the last one stopped: `specweave pickup` brings in the waiting handoff and prints everything in one read. |
| Note | A message left in an increment's ledger for whoever works on it next: `specweave note "text" 0042`. |

## Closing work

| Term | Meaning |
|---|---|
| Verify | `specweave verify` runs the project's test, lint and build commands and checks the ACs, writing `reports/verify.md` and `reports/verify.json`. |
| [Quality gate](/docs/glossary/terms/quality-gate) | The check `specweave complete` makes before closing: a passing `verify.json`, or an explicit `--reason`. |
| Status | One of `planned`, `active`, `paused`, `completed`, `abandoned`, changed only by CLI commands. See [increment status reference](/docs/guides/increment-status-reference). |
| Supersede | Replacing an open increment with a new one: `specweave create-increment "title" --supersedes 0042`. |

## Tools and integrations

| Term | Meaning |
|---|---|
| Skill | A `SKILL.md` file an AI tool loads on demand. SpecWeave's are increment, do, auto, team, review, done, sync, handoff, project, brainstorm and jev. See [skills reference](/docs/reference/skills). |
| Auto mode | Unattended execution of an increment's tasks: `/sw:auto` or `specweave auto`. See [autonomous execution](/docs/guides/autonomous-execution). |
| Sync | Pushing increments to GitHub Issues, Jira or Azure DevOps. Only runs on `specweave sync push`. See [GitHub sync](/docs/guides/github-sync). |
| Jev | An opt-in fast classifier for decisions with a fixed set of answers. See [Jev](/docs/guides/jev-system-one). |
| Hook | A script Claude Code runs at a session event. SpecWeave uses SessionStart (a short pickup) and Stop (auto mode only). |

## Removed in 3.0

Living docs, the separate `tasks.md` for new increments, and a set of commands were removed in 3.0. See [SpecWeave 3.0](/docs/guides/specweave-3#removed-commands) for the list.
