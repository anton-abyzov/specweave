---
title: "Switch from Claude Code to Cursor mid-task"
description: "Move a half-finished Claude Code task to Cursor: how Cursor reads AGENTS.md and rules, where skills go, and how to hand off the spec, tasks and edits."
slug: /guides/switch-claude-code-to-cursor
keywords: [switch from claude code to cursor, claude code to cursor, move from claude code to cursor, cursor agents.md, cursor skills, cursor rules]
---

# Switch from Claude Code to Cursor mid-task

Run `specweave handoff` in Claude Code, open the same repository in Cursor and run `specweave pickup`. Cursor reads `AGENTS.md` and loads skills from the folders Claude Code uses, so the instructions carry over; the handoff carries the plan, the progress and your uncommitted edits.

The Cursor behaviour on this page comes from Cursor's own docs, checked 2026-10-28: [Rules](https://cursor.com/docs/context/rules) and [Agent Skills](https://cursor.com/docs/context/skills). Cursor changes quickly, so follow the links for the current state.

## What Cursor reads

- **`AGENTS.md`**, in the project root and in subfolders. Instructions from nested `AGENTS.md` files are combined with those of their parent folders.
- **Project rules** in `.cursor/rules/`, which must use the `.mdc` extension.
- **User rules**, set in Cursor's settings, which apply to every project.

Cursor applies Team Rules first, then Project Rules, then User Rules ([Rules](https://cursor.com/docs/context/rules)). Cursor's rules page doesn't mention `CLAUDE.md`, so keep the shared instructions in `AGENTS.md` and have `CLAUDE.md` import it with `@AGENTS.md`. [AGENTS.md vs CLAUDE.md](/docs/guides/agents-md-vs-claude-md/) shows the setup.

## Skills in Cursor

Cursor loads skills from `.agents/skills/` and `.cursor/skills/` in the project and from the same folders in your home directory. For compatibility it also loads them from `.claude/skills/` and `.codex/skills/` ([Agent Skills](https://cursor.com/docs/context/skills)).

The agent decides when a skill is relevant from its description, or you can type `/` in Agent chat and pick the skill by name. `specweave init` installs SpecWeave's skills into `.claude/skills/` and `.agents/skills/`, so they are already there; in Cursor they run as `/sw-do`, `/sw-handoff` and so on ([Codex, Grok, Cursor and other tools](/docs/integrations/generic-ai-tools/)).

## Hand off

Once per repository:

```bash
npm install -g specweave
specweave init
```

Then, when you want to switch, tell Claude Code "hand off" or run it in a terminal:

```bash
specweave handoff --reason "out of usage" --next "finish the restore test"
```

This releases your task claims, writes [`handoff.md`](/docs/guides/handoff-md/), and pushes your branch with a snapshot of your uncommitted edits when the repository has an `origin` remote. If Claude Code has already hit its limit and won't answer, run the command yourself: it doesn't need the agent.

## Pick up in Cursor

Open the repository in Cursor and tell the agent "pick up", or run it in a terminal in the project folder:

```bash
specweave pickup
```

`pickup` fetches the handoff, brings your branch up to date, applies the handed-off edits, and prints the next task with its acceptance criteria, files and test. Then claim the task and prove it with its test:

```bash
specweave task claim T-02
specweave task done T-02 --run "npm test"
```

SpecWeave detects Cursor, so the ledger records the work under Cursor's name next to Claude Code's earlier entries. Cursor's chat history stays inside Cursor and can't be exported to another tool, which is why the handoff lives in git ([cross-tool resume matrix](/docs/guides/cross-tool-handoff/#cross-tool-resume-matrix)).

When your Claude Code limit resets, say "hand off" in Cursor and "pick up" in Claude Code.

## Common questions

**Do I need Cursor rules for SpecWeave?** No. `AGENTS.md` is enough; Cursor reads it alongside any `.mdc` rules you already have.

**Will Cursor see the Claude Code conversation?** No. Neither tool can read the other's chat history. The next agent works from the spec, the ledger and `handoff.md`.

**Does it work the other way?** Yes. The same two commands move a task from Cursor back to Claude Code, or on to Codex or OpenCode.

## See also

- [Claude Code handoff to Codex, recorded](/tutorials/handoff-claude-to-codex/): the same two commands in a real run.
- [Switch from Claude Code to Codex mid-task](/docs/guides/switch-claude-code-to-codex/)
- [Switch from Claude Code to OpenCode mid-task](/docs/guides/switch-claude-code-to-opencode/)
- [Claude Code handoff: continue in any agent](/docs/guides/cross-tool-handoff/)
- [Compare AI coding tools](/docs/compare/)
