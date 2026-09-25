---
sidebar_position: 0
title: SpecWeave 3.0
description: What changed in SpecWeave 3.0, what was removed, and how to upgrade.
---

# SpecWeave 3.0

> **One file per increment, one instruction file for every tool, and handoff in two words.**

3.0 came out of an audit of 2.3: a third of the code was unreachable, the two instruction files said the same thing twice, `tasks.md` was rewritten with state the ledger already held, and handing work to another tool or account took several reads and a pasted prompt. 3.0 fixes those and deletes the rest.

## What changed

| Area | 2.x | 3.0 |
|---|---|---|
| Increment | `spec.md` + `tasks.md` + `metadata.json` | One `spec.md` with a `## Tasks` section; state only in `ledger.jsonl` |
| Acceptance criteria | Ticked by hand at close | Met when the tasks covering them are done |
| Next task | `task next` printed the id | `task next`, `claim` and `pickup` print the AC text |
| Instructions | `CLAUDE.md` and `AGENTS.md`, about 3,300 tokens together | `AGENTS.md` about 800 tokens; `CLAUDE.md` is `@AGENTS.md` plus Claude-only lines |
| Handoff | A doc path and a prompt to paste | "hand off" and "pick up"; the work travels through Git ([guide](./cross-tool-handoff.md)) |
| Evidence | Scattered reports | `specweave report`: HTML timeline from the ledger |
| Memory | None across tools | `.specweave/memory/`, committed, in the Claude Code Projects format |
| Skills | 12 plugin skills and 6 portable skills that drifted | 11 skills from one source for Claude Code, Codex and Grok |
| `init` | Docs scaffold, background job, git hook, TDD defaults, global settings write | `AGENTS.md`, `CLAUDE.md`, skills, config; a git hook only with `--git-hooks` |
| Sync | Status changes could create or close issues | Only `specweave sync` touches GitHub, Jira or ADO |

## New increment

```markdown
# Login form

## Problem
Users cannot sign in on mobile; the form overflows below 360px.

## Scope
In: the login form. Out: sign-up and password reset.

## Acceptance Criteria
- [ ] AC-01: The form fits a 320px screen without horizontal scroll
- [ ] AC-02: A wrong password shows an inline error

## Approach
src/login/form.tsx, then its test. Keep the existing validation.

## Tasks

### T-01 Responsive form
- AC: AC-01 | Files: src/login/form.tsx, src/login/form.test.tsx | Test: npm test -- form

### T-02 Inline error
- AC: AC-02 | Files: src/login/form.tsx | Test: npm test -- form
```

## What was removed

About 280,000 lines, 140,000 of them tests of code nothing reached. These commands are gone: `living-docs`, `jobs`, `sync-living-docs`, `docs`, the hidden `sync-*` aliases and `validate-jira`, `analytics`, `analytics-push`, `cache`, `commits`, `interview`, `decision-log`, `export-skills`, `detect-intent`, `detect-project`, `scan-skill`, `scan-plugins`, `judge-skill`, `session`, `health` (use `doctor`), `status-line`, `evaluate-completion`, `install`, `list`, `hook`, `resolve-structure` and `migrate-to-umbrella`.

## Upgrade

```bash
npm i -g specweave@3
specweave update
```

- `specweave update` rewrites the managed parts of `AGENTS.md` and `CLAUDE.md`, keeps your own sections, and backs up the previous files under `.specweave/backups/`. If your old `CLAUDE.md` kept a Commands table that `AGENTS.md` now carries, you can delete it.
- Existing increments with `tasks.md` keep working. `specweave task render --write` refreshes a legacy `tasks.md` from the ledger if you want the old board.
- Scripts that expected `tasks.md` in a new increment, the TDD fields in `metadata.json`, or a tracker call on status change need updating.
