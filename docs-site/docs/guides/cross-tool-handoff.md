---
title: Hand off and pick up
description: Move work between Claude Code, Codex, Grok and other tools or accounts with two words, "hand off" and "pick up".
---

# Hand off and pick up

> **Out of tokens? Say "hand off". In the next tool or account, say "pick up".**

No AI coding tool can read another's session, and project memory in one Claude account does not reach a second account, Codex or Grok. The only thing every tool and every account shares is the Git repository. SpecWeave puts the work state there, so switching tools costs two words.

## How it works

```text
Claude, account 1                                   Codex, Grok, account 2, or a cloud thread
─────────────────                                   ─────────────────────────────────────────
"hand off"                                          "pick up"
 └ specweave handoff --reason "out of tokens"         └ specweave pickup
    · releases your task claims                          · fetches specweave-handoff
    · records a handoff event in ledger.jsonl            · moves this branch to the handed-off commit
    · writes handoff.md and the HTML report              · applies the uncommitted edits
    · pushes your branch                                 · records a pickup event
    · pushes a snapshot of uncommitted edits  ───────►   · prints the next task with its ACs
      to specweave-handoff and wip/<branch>
```

`AGENTS.md` tells every tool to run `specweave handoff` when you say "hand off", "I'm out of tokens" or "switching accounts", and `specweave pickup` when you say "pick up", "continue" or "continue from the other account". Claude Code reads the same rules through `CLAUDE.md`, which imports `AGENTS.md`.

## The commands

```bash
specweave handoff                         # the common case: no flags needed
specweave handoff --reason "out of tokens"
specweave handoff --no-push               # keep it local (same machine, another tool)
specweave handoff --inline                # print a paste-able prompt (no Git remote at all)

specweave pickup                          # apply the latest handoff, then show the next task
specweave pickup --no-apply               # only show what is waiting
specweave pickup 0042                     # focus on one increment

specweave note "T-03 needs the config base URL" 0042   # leave a message for whoever is next
specweave report 0042                     # HTML timeline of who did what
```

## What pickup will and will not do

- It applies a handoff only to a clean working tree, so it never overwrites edits it has not seen. If you have local changes it says so and changes nothing.
- It fast-forwards the current branch to the handed-off commit. A fresh cloud thread on its own branch works, because that branch starts from the same base. If the branches have diverged, it tells you which branch to merge.
- If your uncommitted edits are exactly the ones you handed off earlier (you are back on the first machine), it stashes them before applying the newer work. They are never deleted.
- It records a `pickup` event and the session in the increment's ledger, and refreshes the HTML report.

## The HTML report

`specweave report` writes `reports/handoff-report.html` in the increment folder. It shows the tools and sessions involved, every claim, finish (with its test evidence), handoff and pickup in time order, the task board and the acceptance criteria. It is generated from `ledger.jsonl` alone, and `handoff` and `pickup` refresh it automatically.

## Older increments

Increments from 2.x with a `tasks.md` and no `ledger.jsonl` work as they are. Pickup reads task state from the `tasks.md` checkboxes until the first ledger event, and handoff creates the ledger when it records the handoff. No migration step is needed.

## Identity

Each ledger event is signed `<tool>@<host>`, for example `claude@mbp` or `codex@cloud`. The tool is detected from the environment (Claude Code, Codex, Grok, Cursor, Gemini CLI, Copilot, OpenCode), and every cloud container is `cloud`, so a cloud session keeps its own claims. Set `SPECWEAVE_TOOL`, `SPECWEAVE_HOST` or `SPECWEAVE_AGENT` to override, for example to tell two Claude subscriptions on one Mac apart (`SPECWEAVE_TOOL=claude-work`).

<!-- SEO long-tail keywords (one phrase per line for exact-match indexing):
switch from Claude Code to Codex mid-task
out of tokens Claude continue elsewhere
continue from another Claude account
hand off work between AI coding tools
continue coding after running out of tokens
move work from Claude to Codex or Grok
-->
