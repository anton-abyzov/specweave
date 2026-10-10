---
id: handoff
title: Handoff and pickup
sidebar_label: Handoff
description: How a SpecWeave session stops cleanly so another tool, account or machine can continue - specweave handoff, specweave pickup and what they record.
---

# Handoff and pickup

A **handoff** is how a session stops so that another one can continue: in another AI tool, under another account, on another machine or in a cloud thread. **Pickup** is the other half: the new session reads everything it needs in one command.

No AI tool can read another tool's chat history. A handoff puts what matters into git instead.

## In plain words

You do not need to copy prompts or remember flags. In the session that is stopping, say "hand off" (or "I'm out of tokens"). In the next session, in any tool or account, say "pick up". `AGENTS.md` tells every tool which command to run for each.

## Hand off

```bash
specweave handoff --reason "out of tokens"
```

It:

1. releases your task claims in the [ledger](/docs/glossary/terms/ledger), so the next agent is not locked out (`--keep-claims` to keep them);
2. appends a `handoff` event to the ledger with the reason;
3. writes `handoff.md` and `handoff.diff` in the increment folder, with repo-relative paths so they resolve anywhere;
4. scrubs secrets from the free-text fields and the diff;
5. pushes the branch, and a snapshot commit of your uncommitted edits to `wip/<branch>` and the shared `specweave-handoff` branch, so a cloud session, another machine or another account can reach it. Your own branch, index and working tree are left as they were.

Useful options: `--next "the exact next step"`, `--decision "..."` (repeatable), `--gotcha "..."`, `--no-push` to keep everything on this machine, and `--inline` to print a self-contained prompt for a session that cannot reach your git remote.

## Pick up

```bash
specweave pickup
```

It fetches the latest handoff and, when this checkout's working tree is clean, fast-forwards the branch to it and applies the handed-off edits, unstaged. It records a `pickup` event in the ledger, then prints the active increment, the next task with the text of its acceptance criteria, claims held by others, the branch and whether it is ahead of or behind its upstream, the last handoff, recent notes, and the project memory index.

If the checkout has uncommitted changes or its branch has diverged, it applies nothing and says what to do. `specweave pickup --no-apply` only shows what is waiting. In Claude Code the SessionStart hook prints a compact summary at the start of every session.

## Evidence of who did what

```bash
specweave report 0042
```

writes an HTML timeline of the increment from its ledger: which tools and sessions worked on it, each handoff and pickup, and the evidence for every finished task. By default it goes to `reports/handoff-report.html` in the increment folder.

## Leaving a note instead

To tell whoever works on an increment next something, without stopping, append a note:

```bash
specweave note "the restore endpoint is now /resume" 0042
```

`pickup` shows it to the next session. This is how two Claude Code Projects threads, or two tools, pass messages without editing each other's files.

## Related

- [Cross-tool handoff](/docs/guides/cross-tool-handoff): the full guide, including each tool's own resume command
- [Claude Code Projects and threads](/docs/guides/claude-code-projects)
- [Ledger](/docs/glossary/terms/ledger)
- [Increment](/docs/glossary/terms/increments)
