---
sidebar_position: 2
title: Commands
description: Every specweave CLI command and every sw skill in SpecWeave 2.0.
---

# Commands reference

Two surfaces, one behaviour:

- **`specweave <cmd>`** — the CLI. Deterministic, scriptable, works in any tool or CI.
- **`/sw:<skill>`** — Claude Code skills that wrap the CLI and add the judgement steps (writing the spec, reviewing the diff).

The CLI is the source of truth. When a skill and the CLI disagree, the CLI is right.

---

## The loop

| Step | CLI | Skill |
|------|-----|-------|
| Plan | `specweave create-increment "<title>"` | `/sw:increment` |
| Work | `specweave task next` / `claim` / `done` | `/sw:do` |
| Verify | `specweave verify [id]` | — |
| Review | — | `/sw:review` |
| Close | `specweave complete <id>` | `/sw:done` |
| Hand off | `specweave handoff [id]` | `/sw:handoff` |

---

## Increment lifecycle

| Command | Does |
|---------|------|
| `specweave create-increment [title]` | Create the increment folder (`metadata.json`, `spec.md`, `tasks.md`). `--supersedes NNNN` abandons the increment it replaces. |
| `specweave next-id` | Print the next free increment number. Prefer `create-increment`, which reserves it atomically. |
| `specweave status` | Increment status overview (alias: `progress`). |
| `specweave list` | List available and installed components. |
| `specweave pause <id>` / `resume <id>` / `abandon <id>` | Status transitions. Never edit `metadata.json` by hand. |
| `specweave complete [id] [more-ids…]` | Close one or more increments. Blocks without a green `verify.json` unless `--reason`. `--all --reason "<why>"` for batch triage. |
| `specweave archive [increments…]` | Archive completed increments. |
| `specweave check-discipline` | Status counts, the advisory WIP note, and metadata consistency. |

## Tasks and the ledger

`specweave task <action> [task] [increment]` — the multi-vendor task ledger. State lives only in `ledger.jsonl`; every write re-renders the `SW:BOARD` block in `tasks.md`.

| Action | Does |
|--------|------|
| `task whoami` | Print this agent's id. |
| `task list` | Table: task, status, owner, evidence. `--json` for machines. |
| `task next` | First open task with dependencies met and no `Files` overlap. |
| `task claim T-01` | Append a claim. Exit 3 = lost race, exit 4 = `Files` overlap, exit 6 = unmet dependencies. `--force` overrides. |
| `task done T-01 --run "<cmd>"` | Run the test command through the OS shell, store exit code and output tail as evidence, append `done`. Exit 5 when the command fails. Auto-claims when nobody holds a live claim. `--evidence "<text>"` if you already have proof. |
| `task release T-01` / `task release --all-mine` | Drop claims. |
| `task block T-01 --note "<why>"` | Mark blocked. |
| `task skip T-01 --reason "<why>"` | Terminal, reason mandatory. |
| `task render` | Rewrite the derived state lines and the `SW:BOARD` table in `tasks.md`. |

## Verification and quality

| Command | Does |
|---------|------|
| `specweave verify [id]` | Run `testing.commands[]` (or auto-detected test/lint/build), collect the AC table and ledger summary, write `reports/verify.md` + `reports/verify.json`. `verify.json.ok` is the only closure gate. |
| `specweave qa <id>` | Risk-scored quality assessment. Not the review, not the gate. |
| `specweave generate-rubric <id>` | Generate or refresh the AC-tied rubric under the increment's `reports/`. |
| `specweave doctor` | Full project health check: config shape, instruction-file references, hooks, hygiene. |
| `specweave health` | Quick deployment health check (config, plugins, sync connectivity). |
| `specweave gc` | Purge stale `.specweave/state` files. Dry run by default; `--yes` to delete. |

## Handoff and sessions

| Command | Does |
|---------|------|
| `specweave handoff [id]` | Write a portable, secret-scrubbed handoff doc plus the diff. |
| `specweave session start` / `session end` | Session lifecycle. |
| `specweave status-line` | Current increment status line. |
| `specweave decision-log` | Query the structured decision log. |

## Autonomous execution

| Command | Does |
|---------|------|
| `specweave auto [increment-ids…]` | Start unattended execution. The Stop hook is the loop. |
| `specweave auto-status` | Session status and progress. |
| `specweave cancel-auto` | Cancel a running auto session. |
| `specweave evaluate-completion <id>` | Decide whether an auto session should be considered complete. |

## Sync

`specweave sync push | pull | status | setup` — see the [`specweave sync` reference](/docs/reference/sync-cli).

## Project and workspace

| Command | Does |
|---------|------|
| `specweave init [project-name]` | Initialise a SpecWeave project. |
| `specweave update` | Update the CLI, instruction files, config and plugins. The 2.0 upgrade path. |
| `specweave update-instructions` | Rewrite `CLAUDE.md` / `AGENTS.md` with a smart merge that preserves your content. |
| `specweave refresh-plugins` | Refresh the plugins. |
| `specweave get <source>` | Clone and register an existing repository into the workspace. |
| `specweave context` / `context projects` | Workspace context; project and board values for `spec.md`. |
| `specweave uninstall` | Remove SpecWeave from the current project. |

## Git helpers

| Command | Does |
|---------|------|
| `specweave save [message]` | Auto-generate a commit message, commit and sync with the remote. |
| `specweave commits` | Show the last two commits. |
| `specweave branch-name <id>` | Print the computed branch name for an increment. |
| `specweave link-pr` | Link a pull request to external tickets. |

## Docs

| Command | Does |
|---------|------|
| `specweave docs preview` | Documentation preview server with hot reload. |
| `specweave docs build` | Build the static documentation site. |
| `specweave docs validate` | Validate documentation without starting a server. |
| `specweave docs public` | Preview public-scope docs only. |
| `specweave docs kill` | Stop all running documentation servers. |
| `specweave docs status` | Documentation status. |
| `specweave docs sync [id]` | Sync living documentation for an increment. |
| `specweave living-docs` | Launch or resume the Living Docs Builder. |

## Observability

| Command | Does |
|---------|------|
| `specweave dashboard` | Real-time observability dashboard in the browser. |
| `specweave analytics` | Usage analytics (commands, skills, agents). |
| `specweave hooks log` | Recent hook warnings, errors and blocks from `.specweave/logs/hooks.jsonl`. |
| `specweave jobs` | Monitor background jobs. |
| `specweave cache` | Manage the dashboard cache. |

## Code intelligence

`specweave lsp refs | def | hover | symbols | search | warmup | status | setup` — see [LSP integration](/docs/guides/lsp-integration).

## Skills and security

| Command | Does |
|---------|------|
| `specweave scan-skill <file>` | Pattern-scan a skill file for security issues. |
| `specweave scan-plugins` | Batch-scan every plugin `SKILL.md`. |
| `specweave judge-skill <file>` | Pattern scan plus LLM judgement. |
| `specweave export-skills` | Export skills to the Agent Skills open standard. |
| `specweave install [component]` | Install agents/skills into `.claude/`. |

---

## Removed in 2.0

The `commands/` plugin namespace (73 files) and the per-provider `sw-github:` / `sw-jira:` / `sw-ado:` namespaces are gone. The `specweave increment <action>` verb is retained for compatibility; new work should use `create-increment`, `status`, `pause`, `resume`, `abandon` and `complete` directly.

See [SpecWeave 2.0](/docs/guides/specweave-2#what-was-removed-and-why) for the full list and the evidence behind it.
