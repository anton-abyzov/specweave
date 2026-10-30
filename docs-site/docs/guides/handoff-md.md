---
title: "handoff.md: what goes in an AI agent handoff"
description: "What a handoff.md file is, what to put in it so Codex, Cursor or another Claude Code session can continue a task, a copyable template, and how to generate it."
slug: /guides/handoff-md
keywords: [handoff.md, claude code handoff, claude code handoff prompt, claude code handoff skill, ai agent handoff, handoff document]
---

# handoff.md: what goes in an AI agent handoff

`handoff.md` is a short Markdown file that tells the next AI coding agent where the last one stopped. Each tool keeps its session in its own format, and a Claude Code session on another machine doesn't have it at all, so anything not written down is lost when you switch. A good handoff is under a page: the reason you stopped, what is done, what you decided, which files have uncommitted edits, and the one next step.

## What handoff.md is

It is a plain file in the repository, not a feature of any one tool. Any agent that can read a file can use it, and because it lives in git, a cloud session sees it the same way your laptop does. SpecWeave writes it for you with `specweave handoff`; you can also write one by hand.

It is not a transcript. A transcript is long, full of dead ends, and leaves out your uncommitted edits and which tasks actually passed their tests. The handoff keeps only what the next agent needs to act.

## What to put in it

These are the fields `specweave handoff` writes, in this order, and they work just as well in a hand-written file:

- **Header.** Who wrote it (for example `claude@laptop`), when, the branch and commit, whether the working tree has uncommitted files, and which task claims are still held or were released.
- **Where I left off.** Why you stopped ("out of usage"), a one-line summary, and progress: tasks done out of total and acceptance criteria met.
- **Done / Pending.** One row per task with its state, who did it and the evidence, such as the test command that passed.
- **Decisions.** Choices already made, so the next agent doesn't reopen them.
- **Files touched.** The uncommitted files and where the full diff is. Use repo-relative paths, so they resolve on any machine.
- **Next steps.** The exact next action, not a goal.
- **Resume.** The commands that continue the work, and optionally how to reopen the original transcript in its own tool.

Keep secrets out of it. `specweave handoff` scrubs secrets from the free-text fields and the diff before it writes anything; a hand-written file has no such guard.

## Template

Copy this into `handoff.md` when you write one by hand. It is a simplified version of the generated file, which also ends with a `Doc format v2` marker:

```markdown
# Handoff — 0042 Resumable checkout
agent: claude@laptop · 2026-10-28T14:05Z · branch feat/restore @ 3f2a9c1 · tree: 3 uncommitted · redactions: 0
active claims: none · released: T-02

## Where I left off
Why: out of usage
Draft restore works; expiry not started.
Increment 0042 (active) · tasks 1/3 done · ACs 1/4

## Done / Pending
| Task | State | By | Evidence / note |
|---|---|---|---|
| T-01 Save the draft | done | claude@laptop | npm test → exit 0 |
| T-02 Restore the draft on return | open | | |
| T-03 Expire drafts after 24 hours | open | | |

## Decisions
- Drafts never store card data.
- Restore only within 24 hours.

## Files touched
src/restore.js, src/restore.test.js, src/cart.js (uncommitted)
Full diff: .specweave/increments/0042-resumable-checkout/handoff.diff

## Next steps
Finish src/restore.js so the restore test passes, then start T-03.

## Resume
1. Run `specweave pickup` (or read this file and the spec).
2. Claim T-02, implement it, and prove it with its test.
```

## Generate it with specweave handoff

```bash
npm install -g specweave
specweave handoff --reason "out of usage" --next "finish the restore test"
```

Besides writing `handoff.md`, the command releases your task claims, writes the uncommitted diff to `handoff.diff`, and pushes your branch plus a snapshot of the uncommitted edits when the repository has an `origin` remote. Optional flags add to the document: `--summary`, `--decision` (repeatable) and `--gotcha`. [Commands](/docs/reference/commands) lists them all.

In the next tool, `specweave pickup` fetches the handoff, applies the edits and prints the next task with its acceptance criteria. Without the CLI, `npx vskill i handoff` installs a self-contained skill that writes a compatible file from your git state.

`specweave handoff` never overwrites a `handoff.md` a person wrote. The generated document ends with a `Doc format v2` marker; a file without it is treated as yours, and the generated one goes to `handoff.auto.md` beside it. Anything between `<!-- keep -->` and `<!-- /keep -->` in a generated document survives the next handoff.

## Where it lives

SpecWeave keeps one handoff per increment, at `.specweave/increments/{id}/handoff.md`, next to the increment's `spec.md` and `ledger.jsonl`. Because the folder is in git, the handoff is portable by design: any tool, any account. [Handoff and pickup](/docs/guides/cross-tool-handoff/#cross-tool-resume-matrix) compares this with how each tool stores its own sessions.

`specweave handoff --all` also writes `.specweave/handoffs/<date>-INDEX.md` with one row per active increment, for switching accounts with many threads open.

## handoff.md vs AGENTS.md vs a native resume

| | `handoff.md` | `AGENTS.md` | Native resume (`claude -r`, `codex resume`) |
|---|---|---|---|
| Holds | The state of one piece of work | Rules for every session in the repository | One tool's full transcript |
| Changes | At every handoff | Rarely | Every turn |
| Read by | Any agent | Most coding agents | Only the tool that wrote it |
| Includes uncommitted edits | Via the diff and pushed snapshot | No | No |

Use all three for what each does well: `AGENTS.md` tells every agent to run `specweave pickup` first, the handoff carries the work, and a native resume is there if you want to reread the original conversation in the same tool. [AGENTS.md vs CLAUDE.md](/docs/guides/agents-md-vs-claude-md/) covers the instruction file.

## Common questions

**Is handoff.md a Claude Code feature?** No. It is a file convention. SpecWeave generates it, and any agent can read it.

**Can I ask Claude Code to write it with a prompt instead?** Yes, but the agent may stop before writing it when the usage limit hits. `specweave handoff` runs in a terminal without the agent, and SpecWeave's limit hook can write it by itself; see [Auto-handoff rules](/docs/guides/auto-handoff/).

**Should I commit it?** You can. With [`git.autoCommitIncrement`](/docs/reference/configuration#git) on, `specweave handoff` commits the increment's `spec.md`, `ledger.jsonl` and `metadata.json`, plus `handoff.md` when the repository already tracks it, so a plain `git pull` on another machine brings them in.

## See also

- [Claude Code handoff to Codex, recorded](/tutorials/handoff-claude-to-codex/): a real handoff as a video tutorial.
- [Switch from Claude Code to Codex mid-task](/docs/guides/switch-claude-code-to-codex/)
- [Switch from Claude Code to OpenCode mid-task](/docs/guides/switch-claude-code-to-opencode/)
- [Switch from Claude Code to Cursor mid-task](/docs/guides/switch-claude-code-to-cursor/)
- [Compare AI coding tools](/docs/compare/)
