---
title: "Switch from Claude Code to OpenCode mid-task"
description: "Move a half-finished Claude Code task to OpenCode: what carries over (AGENTS.md, skills, git state), what does not, and the two commands that hand it off."
slug: /guides/switch-claude-code-to-opencode
keywords: [switch from claude code to opencode, claude code to opencode, move from claude code to opencode, opencode agents.md, opencode claude.md, opencode skills]
---

# Switch from Claude Code to OpenCode mid-task

Run `specweave handoff` in Claude Code, open OpenCode in the same repository and run `specweave pickup`. OpenCode reads the same `AGENTS.md` and the same skill folders as Claude Code, so the instructions carry over by themselves; the handoff carries the plan, the progress and your uncommitted edits.

The OpenCode behaviour on this page comes from OpenCode's own docs, checked 2026-10-28: [Rules](https://opencode.ai/docs/rules/), [Agent skills](https://opencode.ai/docs/skills/) and the [CLI reference](https://opencode.ai/docs/cli/). OpenCode changes quickly, so follow the links for the current state.

## What carries over

| | Carries over | How |
|---|---|---|
| **Instructions** | Yes | OpenCode reads `AGENTS.md` in the project root, and falls back to `CLAUDE.md` when there is no `AGENTS.md` ([Rules](https://opencode.ai/docs/rules/)) |
| **Skills** | Yes | OpenCode looks for `SKILL.md` skills in `.opencode/skills/`, `.claude/skills/` and `.agents/skills/` in the project, and the matching folders in your home directory ([Agent skills](https://opencode.ai/docs/skills/)) |
| **The plan and progress** | With SpecWeave | `spec.md` and the append-only `ledger.jsonl`, in git |
| **Your code** | With SpecWeave | Your branch, plus a pushed snapshot of uncommitted and untracked edits |
| **Where you stopped** | With SpecWeave | [`handoff.md`](/docs/guides/handoff-md/) with the reason, the next step and decisions |

`specweave init` installs its skills into both `.claude/skills/` and `.agents/skills/`, and OpenCode reads both, so there is nothing to reinstall ([Codex, Grok, Cursor and other tools](/docs/integrations/generic-ai-tools/)).

## What does not carry over

The Claude Code conversation. Claude Code keeps it in its own session store, and OpenCode can't read it. OpenCode's own `opencode --session <id>` (short form `-s`) continues an OpenCode session only, and `opencode export` writes OpenCode session data as JSON ([CLI](https://opencode.ai/docs/cli/)). The [cross-tool resume matrix](/docs/guides/cross-tool-handoff/#cross-tool-resume-matrix) shows how each tool stores its sessions.

The next agent doesn't need the transcript. It needs the spec, the next task and your edits, and those travel through git.

## Hand off from Claude Code

Once per repository:

```bash
npm install -g specweave
specweave init
```

Then, when you want to switch, tell Claude Code "hand off" or run it in a terminal:

```bash
specweave handoff --reason "out of usage" --next "finish the restore test"
```

This releases your task claims, writes `handoff.md`, and pushes your branch with a snapshot of your uncommitted edits when the repository has an `origin` remote. If Claude Code has already hit its limit and won't answer, run the command yourself: it doesn't need the agent.

## Pick up in OpenCode

Open OpenCode in the same repository, on this machine or another, and say "pick up", or run:

```bash
specweave pickup
```

`pickup` fetches the handoff, brings your branch up to date, applies the handed-off edits, and prints the next task with its acceptance criteria, files and test. The `AGENTS.md` that `specweave init` wrote tells every agent to run `pickup` first, so OpenCode starts from the same place Claude Code stopped.

Claim the task, implement it, and prove it with its test:

```bash
specweave task claim T-02
specweave task done T-02 --run "npm test"
```

When your Claude Code limit resets, say "hand off" in OpenCode and "pick up" in Claude Code.

## CLAUDE.md-only setups

If your repository has only a `CLAUDE.md`, OpenCode reads it as a fallback, so you can switch without changes. Two things to watch, both from [OpenCode's rules page](https://opencode.ai/docs/rules/):

- Once an `AGENTS.md` exists, OpenCode reads that instead of `CLAUDE.md`. Put the shared rules in `AGENTS.md` and make `CLAUDE.md` import it with `@AGENTS.md`, so both tools load the same text. [AGENTS.md vs CLAUDE.md](/docs/guides/agents-md-vs-claude-md/) shows the setup.
- `OPENCODE_DISABLE_CLAUDE_CODE=1` turns off all of OpenCode's `.claude` support, and `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS=1` turns off only `.claude/skills`. With either set, keep your skills in `.agents/skills/` as well.

## Common questions

**Does OpenCode need its own setup for SpecWeave?** No. It reads `AGENTS.md` and `.agents/skills/`, which `specweave init` already wrote.

**Can I paste the Claude Code conversation into OpenCode instead?** You can, but it is long and leaves out your uncommitted edits and which tasks passed their tests. See [What goes in handoff.md](/docs/guides/handoff-md/).

**Does it work the other way?** Yes. The same two commands move a task from OpenCode back to Claude Code, or on to Codex.

## See also

- [Claude Code handoff to Codex, recorded](/tutorials/handoff-claude-to-codex/): the same two commands in a real run.
- [Switch from Claude Code to Codex mid-task](/docs/guides/switch-claude-code-to-codex/)
- [Switch from Claude Code to Cursor mid-task](/docs/guides/switch-claude-code-to-cursor/)
- [Claude Code handoff: continue in any agent](/docs/guides/cross-tool-handoff/)
- [SpecWithCode vs OpenCode and T3 Code](/docs/compare/specwithcode-vs-opencode-t3-code/)
- [Compare AI coding tools](/docs/compare/)
