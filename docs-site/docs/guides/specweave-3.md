---
sidebar_position: 0
title: SpecWeave 3.0
description: What changed in SpecWeave 3.0, why, and how to upgrade from 2.x.
---

# SpecWeave 3.0

> **One file per increment, one instruction file for every tool, and one command each to hand work off and pick it up.**

3.0 is about two things: keeping AI-assisted work to software engineering standards, and letting you switch between Claude Code, Codex, Grok, Cursor or a second subscription without losing your place. It is a major version because commands were removed and new increments change shape. Existing projects keep working.

## What changed

### An increment is one file

New increments are a single `spec.md`:

```markdown
# Keep checkout resumable

## Problem
A customer who leaves checkout loses their choices.

## Scope
Cart and shipping choice. Not payment details.

## Acceptance Criteria
- AC-01 Returning within 24 hours restores the cart and shipping choice
- AC-02 A paid order is never restored

## Approach
Store a draft keyed by customer; clear it when payment succeeds.

## Tasks
- T-01 Save the checkout draft (AC-01)
- T-02 Restore it on return (AC-01, AC-02)
- T-03 Drop drafts after payment (AC-02)
```

There is no `tasks.md`, no template comments to delete, and no state written back into markdown. State lives only in the append-only `ledger.jsonl`. `metadata.json` stays as machine state that agents do not need to read. `plan.md` is still available for a genuinely large design.

Increments created with 2.x, with a separate `tasks.md`, keep working unchanged.

### The CLI hands each task its criteria

`specweave task next` and `specweave task claim` print the task together with the text of the acceptance criteria it covers, so the agent does not reread the whole spec for every task. An acceptance criterion counts as met when every task that covers it is done, so nobody ticks checkboxes by hand at close.

### One instruction file

`AGENTS.md` is the single instruction file, and it is about 700 tokens. `CLAUDE.md` imports it with `@AGENTS.md` and holds only what is specific to Claude Code. In 2.x, `init` wrote the same rules into both files, about 3,300 tokens together, and tools that read both read them twice.

### Handoff and pickup

- `specweave handoff` releases your task claims, records decisions and open questions in the ledger, and writes a handoff with repo-relative paths. With `--push` it commits work in progress to a `wip/` branch, so a cloud session can see it.
- `specweave pickup` prints everything a fresh session needs in one read: the active increment, the next task with its criteria, branch state, the last handoff, unread notes and the project memory index.

See [Cross-tool handoff](./cross-tool-handoff.md).

### Project memory travels with the code

A committed `.specweave/memory/` folder uses the same format as Claude Code project memory: a `MEMORY.md` index and one file per fact. Decisions made under one account or tool are there for the next one. See [Claude Code Projects and threads](./claude-code-projects.md).

### One skill set for every tool

The portable skills are the only source. The Claude Code plugin, the project copies in `.claude/skills/` and the Codex copies in `.agents/skills/` are generated from them. There are 11: increment, do, auto, team, review, done, sync, handoff, project, brainstorm and jev. `qa` folded into `review`, and `task` into `do`. Project skills are namespaced (`sw-do`, `sw-review` and so on), so they no longer collide with other skills.

### A lighter `init`

`init` no longer scaffolds placeholder docs, starts a background job, installs a git hook (ask for one with `--git-hooks`), writes TDD and coverage defaults, adds your lockfile to `.gitignore` or edits your global Claude settings. It installs skills for Claude Code and Codex in the same run, so switching tools mid-work needs no reinstall.

### Sync does nothing behind your back

Changing an increment's status (start, pause, resume, complete) no longer creates or closes issues. Only `specweave sync push` and the explicit close-on-complete setting touch a tracker. GitHub stays first-class; Jira and Azure DevOps stay supported and opt-in.

## Removed commands

`living-docs`, `jobs`, `sync-living-docs`, `docs`, the hidden `sync-*` aliases, `validate-jira`, `analytics`, `analytics-push`, `cache`, `commits`, `interview`, `decision-log`, `export-skills`, `detect-intent`, `detect-project`, `scan-skill`, `scan-plugins`, `judge-skill`, `session`, `health` (use `doctor`), `status-line`, `evaluate-completion`, `install`, `list`, `hook`, `resolve-structure` and `migrate-to-umbrella`.

Code that nothing reached is gone too, with its tests.

## Upgrade from 2.x

```bash
npm install -g specweave@3
cd your-project
specweave update
```

`specweave update` rewrites `AGENTS.md` and `CLAUDE.md` into the new form and keeps your own sections. Open increments keep their `tasks.md`; new ones use the single-file layout. If you scripted against a removed command, the list above says what replaced it where something did.

## Why

The changes come from an audit of 2.3.0 that measured a real project end to end. The short version: a third of the code was unreachable, the two instruction files were 85% the same text, `tasks.md` was two thirds derived state, resuming in a new tool took four or five reads, and a handoff never reached a cloud session because it was never committed.
