---
sidebar_position: 1
title: FAQ
description: Short answers about SpecWeave 3.0 - supported tools, switching tools or accounts, where state lives, trackers, tasks.md, living docs, upgrading and cost.
---

# Frequently Asked Questions

## What is SpecWeave, in one paragraph?

A small CLI and a set of skills that keep AI coding work in plain files in your repository. Each piece of work is an increment: one `spec.md` with the problem, scope, acceptance criteria, approach and tasks, plus an append-only `ledger.jsonl` that records who claimed and finished each task and with what evidence. Because everything is in git, any AI tool can continue where another one stopped. See [SpecWeave 3.0](/docs/guides/specweave-3) for what the current version changed.

## Which AI tools does it work with?

Any tool that can read files and run a shell command.

- **Claude Code** reads `CLAUDE.md`, which imports `AGENTS.md`. The `sw` plugin adds skills such as `/sw:increment`, `/sw:do` and `/sw:handoff`, and the same skills are installed into `.claude/skills/` for cloud sessions and Claude Code Projects threads.
- **Codex, Grok, Cursor, GitHub Copilot and Gemini CLI** read `AGENTS.md`. Codex also gets the skills in `.agents/skills/` and invokes them as `$sw-do`, `$sw-handoff` and so on.
- **Anything else** (OpenCode, Aider, a plain terminal) can follow the same loop by running `specweave pickup`, `specweave task ...` and `specweave handoff`, or by installing the portable skills with `npx vskill install anton-abyzov/specweave/sw-do`.

You do not need slash commands. Asking in plain words ("plan this as an increment", "continue", "hand off") works in every tool, because `AGENTS.md` tells the agent which command to run. See [Other AI tools](/docs/integrations/generic-ai-tools).

## I ran out of tokens. How do I continue in another tool or account?

Say "hand off" in the session that is stopping. The agent runs:

```bash
specweave handoff --reason "out of tokens"
```

That releases your task claims, records the handoff in the increment's ledger, writes `handoff.md` with repo-relative paths, scrubs secrets, and pushes the branch plus a snapshot of your uncommitted edits (to `wip/<branch>` and a shared `specweave-handoff` branch). Nothing needs copying.

In the next tool or account, open the same repository and say "pick up". The agent runs `specweave pickup`, which fetches the waiting handoff, brings this checkout up to it (fast-forwarding the branch and applying the uncommitted edits, only when your working tree is clean), and prints the active increment, the next task with its acceptance criteria, branch state, the last handoff, recent notes and the project memory index in one read. In Claude Code the SessionStart hook prints a short version of this automatically.

This works the same for a cloud session (a Claude Code Projects thread, Codex cloud), another machine or a second subscription, because the handoff travels through your git remote. Use `specweave handoff --no-push` to keep it local, or `specweave pickup --no-apply` to see what is waiting without changing your checkout. `specweave report` writes an HTML timeline of which tool did what on the increment. Full details: [Cross-tool handoff](/docs/guides/cross-tool-handoff).

## Where does the state live?

In the repository, under `.specweave/`:

| Path | What it holds |
|---|---|
| `.specweave/increments/NNNN-slug/spec.md` | Problem, Scope, Acceptance Criteria, Approach, Open questions, Tasks |
| `.specweave/increments/NNNN-slug/ledger.jsonl` | Append-only events: claim, done, release, skip, block, plus note, session, handoff and pickup |
| `.specweave/increments/NNNN-slug/metadata.json` | Machine state such as status and timestamps, written only by the CLI |
| `.specweave/increments/NNNN-slug/reports/` | `verify.md` and `verify.json` from `specweave verify`, task run logs |
| `.specweave/memory/` | `MEMORY.md` index plus one file per durable fact, committed |
| `.specweave/config.json` | Project settings |
| `.specweave/state/` | Local runtime files, not committed |

Nothing important lives only inside one tool's chat history. See the [ledger](/docs/glossary/terms/ledger) and [metadata.json](/docs/glossary/terms/metadata-json) entries in the glossary.

## Can two agents work on the same increment?

Yes. Each agent claims a task before editing (`specweave task claim T-02`). The earliest live claim wins, and a claim that overlaps another claim's `Files` is refused unless you pass `--force`. A claim older than the lease (2 hours by default, `tasks.leaseHours` in config) is stale and can be taken over. Give each agent its own branch and worktree. If two branches both append to `ledger.jsonl`, `init` has set `merge=union` in `.gitattributes`, so git keeps every line from both sides.

## Do I need Jira, GitHub Issues or Azure DevOps?

No. SpecWeave works with no tracker at all, and that is the default.

If you want issues, GitHub is first-class and Jira and Azure DevOps are opt-in. Sync never runs behind your back: starting, pausing or completing an increment does not touch a tracker. Only `specweave sync push`, and the explicit close-on-complete setting, write to one.

```bash
specweave sync setup      # connect a provider
specweave sync status     # check token, account and health
specweave sync push 0042  # push one increment
```

See [GitHub sync](/docs/guides/github-sync) and [Jira and Azure DevOps](/docs/guides/jira-ado-sync).

## What happened to tasks.md?

New increments do not have one. Tasks live in the `## Tasks` section of `spec.md`:

```markdown
### T-01 Save the checkout draft
- AC: AC-01 | Files: src/checkout/draft.ts, src/checkout/draft.test.ts | Test: npm test -- draft
```

Task state is never written back into markdown; it lives only in `ledger.jsonl`. An acceptance criterion counts as met when every task that covers it is done, so nobody ticks checkboxes at close.

Increments created with 2.x keep their `tasks.md`, and the CLI still reads it. See [tasks.md (legacy)](/docs/glossary/terms/tasks-md).

## What happened to living docs?

Living docs are gone as a feature in 3.0, along with the `living-docs`, `sync-living-docs` and `docs` commands. They generated a second copy of every spec that drifted from the code and cost tokens to maintain. What outlives an increment now goes in two places: the Approach section of its `spec.md`, and one-file-per-fact notes in `.specweave/memory/`. Any `.specweave/docs/` folder you already have stays as ordinary files.

## How do I upgrade from 2.x?

```bash
npm install -g specweave@3
cd your-project
specweave update
```

`specweave update` rewrites `AGENTS.md` and `CLAUDE.md` into the 3.0 form and keeps your own sections, migrates `config.json`, adds the ledger `merge=union` line to `.gitattributes`, refreshes the SpecWeave-managed pre-commit hook if you have one, and refreshes the plugin. Open increments keep working as they are. Run `specweave doctor` afterwards. If you scripted against a command that was removed, the list is in [SpecWeave 3.0](/docs/guides/specweave-3#removed-commands).

## What does it cost?

SpecWeave is open source under the MIT license and free. You pay for the AI tool you already use. The core loop (`pickup`, `task`, `verify`, `complete`, `handoff`) makes no model calls. The exceptions are optional: the AI pass in `specweave qa` (skip it with `--no-ai`), and Jev, which is opt-in and runs under your own provider key (see [Jev](/docs/guides/jev-system-one)). For a local view of Claude Code token usage, open `specweave dashboard`; see [Usage and cost estimates](/docs/reference/cost-tracking) for what it can and cannot measure.

## Does it work on an existing codebase?

Yes. `specweave init` adds `.specweave/`, `AGENTS.md` and `CLAUDE.md` and does not touch your code. Start with an increment for the next change you were going to make anyway. See [Brownfield projects](/docs/workflows/brownfield).

## Something is broken. Where do I start?

Run `specweave doctor`, then see [Troubleshooting](/docs/guides/troubleshooting).

## See also

- [Getting started](/docs/getting-started)
- [What is an increment](/docs/guides/core-concepts/what-is-an-increment)
- [Claude Code Projects and threads](/docs/guides/claude-code-projects)
- [Glossary](/docs/glossary/overview)
