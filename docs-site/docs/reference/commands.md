---
sidebar_position: 2
title: Commands
description: Every specweave CLI command in SpecWeave 3.0, grouped by what you use it for, with the flags that matter.
---

# Commands reference

The `specweave` CLI is the source of truth. Skills such as `/sw:do` or `$sw-handoff` call these commands and add the judgement steps; see the [skills reference](/docs/reference/skills).

Most commands that take an increment id accept the short number (`0042`) and fall back to the single active increment when you leave it out. Run `specweave <command> --help` for the full flag list.

## The loop

| Step | Command |
|------|---------|
| Start a session | `specweave pickup` |
| Plan | `specweave create-increment "Add login form"` |
| Work | `specweave task next`, `task claim T-01`, `task done T-01 --run "npm test"` |
| Check | `specweave verify` |
| Close | `specweave complete 0042` |
| Stop | `specweave handoff --reason "out of tokens"` |

## Setup

| Command | Purpose | Useful flags |
|---------|---------|--------------|
| `specweave init [project-name]` | Set up `.specweave/`, `AGENTS.md`, `CLAUDE.md` and the skills for your tool. | `-a, --adapter <tool>`, `-q, --quick` (no prompts), `-f, --force` (fresh start), `-l, --language <lang>` |
| `specweave update` | Update the CLI, instruction files, config and plugins in one step. This is the upgrade path from 2.x. | `--check` (dry run), `--no-self`, `--no-plugins`, `-f, --force` |
| `specweave update-instructions` | Rewrite `AGENTS.md` and `CLAUDE.md` with a merge that keeps your own sections. | `--dry-run`, `-v, --verbose` |
| `specweave refresh-plugins` | Reinstall the SpecWeave skills for the configured tool. | `--force`, `--plugin <name>`, `-q, --quiet` |
| `specweave uninstall` | Remove SpecWeave from the project. | `--keep-data` (archive `.specweave/`), `--dry-run`, `--global`, `-f, --force` |

## Increments

| Command | Purpose | Useful flags |
|---------|---------|--------------|
| `specweave create-increment [title]` | Create `.specweave/increments/NNNN-slug/` with `metadata.json` and `spec.md`. The number is reserved atomically. | `--with-plan` (also `plan.md`), `--planned` (create as planned, not active), `--supersedes <id>`, `--parent <id>`, `--type <type>`, `--priority <P1\|P2\|P3>`, `--json` |
| `specweave next-id` | Print the next free increment number. Prefer `create-increment`. | `--name <slug>`, `--project <id>` |
| `specweave start <id>` | Move a planned or paused increment to active. | |
| `specweave pause <id>` | Pause an active increment. | `-r, --reason <text>` |
| `specweave resume <id>` | Resume a paused, abandoned or not-yet-started increment. | |
| `specweave abandon <id>` | Abandon an increment. | `-r, --reason <text>`, `-f, --force` |
| `specweave complete [id] [more-ids...]` | Close one or more increments. Blocks without a passing `reports/verify.json` unless you give a reason. Alias: `done`. | `-r, --reason <text>`, `--all --reason <text>` (close every task-complete increment), `-y, --yes` |
| `specweave status` | Status overview of all increments. Alias: `progress`. | `-v, --verbose`, `-t, --type <type>` |
| `specweave archive [increments...]` | Move completed increments to the archive folder. | `--keep-last <n>` (default 5), `--older-than <days>`, `--archive-completed`, `--dry-run` |
| `specweave check-discipline` | Status counts, the advisory WIP note and metadata consistency. | `--json`, `-v, --verbose` |

Status changes never call GitHub, Jira or Azure DevOps. See [increment status reference](/docs/guides/increment-status-reference) for the states.

## Tasks and verification

`specweave task <action> [task] [increment]` works the append-only ledger. Task definitions live in the `## Tasks` section of `spec.md` (or a legacy `tasks.md`); state lives only in `ledger.jsonl`.

| Action | Purpose |
|--------|---------|
| `task whoami` | Print this agent's id, such as `claude@laptop` or `codex@cloud`. |
| `task list` | Every task with status, owner and evidence. `--json` for scripts. |
| `task next` | The first open task whose dependencies are done and whose files no one else holds. Prints the task with the text of its acceptance criteria. |
| `task claim T-01` | Claim a task. Exit 3 means someone else holds it, 4 means a file overlap with a live claim, 6 means unmet dependencies. `--force` overrides. |
| `task done T-01 --run "<cmd>"` | Run the task's test, store the exit code and output tail as evidence, and mark it done. Exit 5 when the command fails. The full output goes to `reports/task-T-01.log`. `--evidence "<text>"` if you already have proof. |
| `task release T-01` | Give a claim back. `--all-mine` releases every claim you hold. |
| `task block T-01 --reason "<why>"` | Mark a task blocked. |
| `task skip T-01 --reason "<why>"` | Mark a task as not needed. Final; the reason is required. |
| `task render` | Print the task board. `--write` refreshes a legacy `tasks.md`. |

| Command | Purpose | Useful flags |
|---------|---------|--------------|
| `specweave verify [id]` | Run the project's test, lint and build commands and write `reports/verify.md` and `reports/verify.json`. `verify.json` is what `complete` checks. | `--cmd <command>` (repeatable), `--json` |
| `specweave qa <id>` | Risk-scored quality assessment. It is not the review and not the closure gate. | `--gate`, `--pre`, `--ci` (exit 1 on fail), `--no-ai` |
| `specweave generate-rubric <id>` | Write or refresh `rubric.md`, a quality contract tied to the acceptance criteria. | `--refresh` |

## Handoff

| Command | Purpose | Useful flags |
|---------|---------|--------------|
| `specweave handoff [id]` | Release your claims, record the handoff in the ledger, write `handoff.md` plus `handoff.diff` with secrets scrubbed, and push. The push sends the branch and a snapshot of uncommitted edits to the `specweave-handoff` ref and `wip/<branch>`, so any tool, machine or account can pick it up. Without a git remote the push is skipped. | `--reason <text>`, `--next <step>`, `--no-push` (keep it local), `--summary <text>`, `--decision <text>` (repeatable), `--gotcha <text>`, `--keep-claims`, `--inline`, `--json` |
| `specweave pickup [id]` | Fetch the latest handoff and apply it to this checkout: fast-forward the branch and restore the uncommitted edits, only when the working tree is clean and the history allows it; otherwise it explains why and changes nothing. Then print the open increment, the next task with its criteria, claims, branch state, notes and the memory index. Records a `pickup` event in the ledger. | `--no-apply` (only show the waiting handoff), `--json` |
| `specweave report [id]` | Write an HTML timeline of who did what on an increment: tools, sessions, handoffs, pickups and task evidence. Default output `reports/handoff-report.html`; `handoff` and `pickup` refresh it too. | `--out <file>` |
| `specweave note "<text>" [id]` | Leave a message in the increment's ledger. `pickup` shows it to whoever comes next. | |

See [cross-tool handoff](/docs/guides/cross-tool-handoff) for the full flow.

## Autonomy

| Command | Purpose | Useful flags |
|---------|---------|--------------|
| `specweave auto [ids...]` | Start unattended execution. The Stop hook feeds the session back into the loop until the tasks are done. | `--dry-run`, `--all-backlog`, `--reset` |
| `specweave auto-status` | Status of the running auto session. | `--json`, `--verbose` |
| `specweave cancel-auto` | Stop the auto session. | `--force` |
| `specweave team [description]` | Launch Claude Code with agent teams in split panes. | `--mode <tmux\|in-process>`, `--no-increment` |
| `specweave jev <action>` | Jev (System One) for closed-set decisions: `doctor`, `setup`, `ask`, `route`, `task`, `guard`, `screen`, `failure`, `browse`, `usage`. | `--json`, `--provider <name>` (setup) |

See [autonomous execution](/docs/guides/autonomous-execution), [agent teams](/docs/guides/agent-teams-and-swarms) and [Jev](/docs/guides/jev-system-one).

## Sync

| Command | Purpose |
|---------|---------|
| `specweave sync push [id]` | Push progress to the configured tracker. The only command that writes to one. |
| `specweave sync pull` | Report tracker changes, or import issues as increments. |
| `specweave sync status` | Token, account, provider health and sync gaps. |
| `specweave sync setup` | Connect GitHub, Jira or Azure DevOps. |
| `specweave link-pr --increment <id> --pr-url <url> --pr-number <n>` | Link a pull request to the increment's Jira or Azure DevOps ticket. |
| `specweave branch-name <id>` | Print the branch name for an increment, including a ticket key when one is linked. |

Flags are in the [`specweave sync` reference](/docs/reference/sync-cli).

## Maintenance

| Command | Purpose | Useful flags |
|---------|---------|--------------|
| `specweave doctor` | Project health check: config, instruction files, hooks, installation. | `--fix`, `--fix-status` (repair `metadata.json` and `spec.md` status mismatches), `--quick`, `--json` |
| `specweave gc` | Find stale `.specweave/state` files and report worktree size. Dry run by default. | `-y, --yes` (delete), `--json` |
| `specweave hooks log` | Recent hook warnings, errors and blocks from `.specweave/logs/hooks.jsonl`. | `--last <n>`, `--blocks-only`, `--errors-only`, `--hook <name>` |
| `specweave dashboard` | Open the local dashboard in the browser. | `-p, --port <n>` (default 3456), `--no-browser` |

## Other

| Command | Purpose | Useful flags |
|---------|---------|--------------|
| `specweave save [message]` | Generate a commit message, commit, sync with the remote and push. | `--dry-run`, `--no-push`, `--sync <rebase\|merge\|none>`, `-i, --interactive` |
| `specweave lsp <action>` | Code intelligence: `refs`, `def`, `hover`, `symbols`, `search`, `warmup`, `status`, `setup`. See [LSP integration](/docs/guides/lsp-integration). | |
| `specweave get <source>` | Clone a repository into the workspace and register it. Accepts `owner/repo`, a URL, or an org with `--all`. | `--branch <name>`, `--all`, `--pattern <glob>`, `--no-init` |
| `specweave context projects` | Print the project and board values an increment can use. | |
| `specweave project <action>` | Portable project hub: `init`, `show`, `set`, `brief`, `work-add`, `work-update`, `work-record`, `artifact-add`, `artifact-remove`, `routine-add`, `routine-remove`. See [portable projects](/docs/guides/portable-projects). | `--harness <codex\|claude\|generic>`, `--json` |

## Removed in 3.0

These commands no longer exist. Living docs are gone as a feature.

`living-docs`, `jobs`, `sync-living-docs`, `docs`, the `sync-progress`, `sync-retry`, `sync-status`, `sync-health`, `sync-gaps` and `sync-setup` aliases (use `specweave sync`), `validate-jira`, `analytics`, `analytics-push`, `cache`, `commits`, `interview`, `decision-log`, `export-skills`, `detect-intent`, `detect-project`, `scan-skill`, `scan-plugins`, `judge-skill`, `session`, `health` (use `doctor`), `status-line`, `evaluate-completion`, `install`, `list`, `hook`, `resolve-structure`, `migrate-to-umbrella`.

See [SpecWeave 3.0](/docs/guides/specweave-3) for why they went and what replaces them.
