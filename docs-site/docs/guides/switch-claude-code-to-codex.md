---
title: "Switch from Claude Code to Codex without losing your place"
description: "A step-by-step guide to moving a half-finished task from Claude Code to Codex, and back: what carries over, the two commands that do it, and what to check before you switch."
slug: /guides/switch-claude-code-to-codex
keywords: [switch from claude code to codex, move from claude code to codex, continue claude code session in codex, claude code to codex handoff, codex to claude code, switch ai coding tools mid task, claude code out of usage switch to codex]
---

# Switch from Claude Code to Codex without losing your place

Switching tools at the start of a task is easy. Switching halfway through is where work gets lost: Codex can't read Claude Code's session, so the plan, the decisions and your uncommitted edits stay behind. This guide moves all of that through git in two commands, and works the same in the other direction.

## What carries over, and what doesn't

| | Carries over with SpecWeave | Stays behind |
|---|---|---|
| **The plan** | `spec.md`: problem, scope, acceptance criteria, approach, tasks | |
| **Progress** | Which tasks are claimed and done, with the test output that proved them (`ledger.jsonl`) | |
| **Your code** | Your branch, plus a snapshot of uncommitted and untracked edits | |
| **Where you stopped** | `handoff.md` with the reason, the exact next step and notes | |
| **Instructions and skills** | One `AGENTS.md` both tools read, and the same skills in both skill folders | |
| **The conversation** | | Claude Code's transcript. Neither tool can read the other's, and the next agent doesn't need it |

## Before the first switch (once per repository)

```bash
npm install -g specweave
cd your-project
specweave init
```

`init` writes `AGENTS.md`, which Codex reads, and a `CLAUDE.md` that imports it, so both tools get the same instructions. It installs the same skills into `.claude/skills/` for Claude Code and `.agents/skills/` for Codex. Commit these files. See [AGENTS.md vs CLAUDE.md](/docs/guides/agents-md-vs-claude-md/) for why one file is enough.

The repository needs a git remote (`origin`) if the two tools run on different machines or one of them runs in the cloud. On one laptop, the handoff can also stay local with `--no-push`.

## Step 1: hand off in Claude Code

Tell Claude Code "hand off", or run it yourself:

```bash
specweave handoff --reason "out of usage" --next "finish the restore test"
```

This:

- releases your task claims, so Codex can take the same tasks;
- writes `handoff.md` with where you stopped and the next step;
- pushes your branch and a snapshot of your uncommitted edits, without changing your working tree;
- scrubs secrets from the note and the diff before writing anything.

If the limit has already hit and Claude Code won't answer, run the command in a terminal. It doesn't need the agent.

## Step 2: pick up in Codex

Open Codex in the same repository, on any machine or in Codex cloud, and say "pick up", or run:

```bash
specweave pickup
```

`pickup` fetches the handoff, brings your branch up to date, applies the handed-off edits, and prints everything Codex needs in one read:

```text
Picked up the handoff from claude@laptop 2m ago (out of usage): applied 7 uncommitted files.
Increment 0001-resumable-checkout "Resumable checkout" (active) · tasks 1/2 done · ACs 0/2 met
Next: T-02 Restore the draft on return
  AC-01: Returning within 24 hours restores the cart and shipping choice
  AC-02: A paid order is never restored
  Files: src/restore.js | Test: npm test
```

If your checkout has its own uncommitted changes, `pickup` changes nothing and says what to do first. `specweave pickup --no-apply` only shows what is waiting.

## Step 3: keep working, then switch back

Codex claims the next task and finishes it with its test:

```bash
specweave task claim T-02
specweave task done T-02 --run "npm test"
```

The ledger records that Codex did it (`codex@laptop`), next to Claude Code's earlier entries. When your Claude Code limit resets, say "hand off" in Codex and "pick up" in Claude Code. Nothing about the steps changes.

## Let it switch for you

On your own machine, turn on automatic handoff once:

```bash
specweave auto-handoff on
```

At 90 percent of the five-hour or weekly window, Claude Code (and Codex, if `~/.codex` exists) stops once, runs the handoff, and tells you to say "pick up" in the other tool. If Claude Code hits the limit in the middle of a turn, a hook writes the handoff without the model. See [Auto-handoff rules](/docs/guides/auto-handoff/) for each tool.

## Other directions

The same two commands work:

- **Codex to Claude Code**, when Codex is the one out of usage.
- **Claude Code to a second Claude account.** Claude Code's project memory belongs to one account, so the second one starts cold without a handoff.
- **To Grok Build, Gemini CLI, Cursor or Copilot.** Anything that reads `AGENTS.md` or runs a shell. See [Codex, Grok Build, Cursor and Gemini CLI](/docs/integrations/generic-ai-tools/).
- **Cloud to laptop and back.** A Claude Code Projects thread or a Codex cloud task sees the handoff through git like your laptop does. See [Claude Code Projects and threads](/docs/guides/claude-code-projects/).

## Without the CLI

If you only want the handoff, install the self-contained skill:

```bash
npx vskill i handoff
```

It needs only `git` and a shell. If `specweave` is installed it uses it; otherwise it writes a compatible `handoff.md` from your git state.

## Common questions

**Can I paste the Claude Code conversation into Codex instead?** You can, but a transcript is long, full of dead ends, and doesn't include your uncommitted edits or which tasks really passed their tests. The spec plus the handoff is a few hundred lines Codex can act on.

**Does Codex need its own setup?** No. `specweave init` already wrote `AGENTS.md` and `.agents/skills/`, which Codex reads.

**What if both tools edit the same task?** A task claim has a lease. `handoff` releases yours, so the next tool can claim it straight away; a claim that was never released expires after two hours, or `specweave task claim <id> --force` takes it over.

## See also

- [Handoff and pickup](/docs/guides/cross-tool-handoff/): every option and a recorded run
- [Auto-handoff rules](/docs/guides/auto-handoff/)
- [Claude Code vs Codex: use both](/docs/guides/claude-code-vs-codex/)
- [Claude Code usage limit reached: what to do next](/docs/guides/claude-code-usage-limit/)
